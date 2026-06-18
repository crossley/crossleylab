import '../style.css';
import { applyStoredTheme, initThemeToggle } from '../theme';

type ModelKind =
  | 'passive_k'
  | 'passive_two_ion'
  | 'smooth_na'
  | 'active_na'
  | 'active_na_k'
  | 'active_na_k_leak';

export interface LessonPageConfig {
  slug: string;
  title: string;
  eyebrow: string;
  intro: string;
  previousStep: string;
  equationLabel: string;
  equation: string;
  modelKind: ModelKind;
  pulseAmplitudes: number[];
  defaultParams?: Partial<SimParams>;
  controls: ControlSpec[];
  questions: GuidedQuestion[];
}

interface GuidedQuestion {
  prompt: string;
  answer: string;
}

interface ControlSpec {
  key: NumericControlKey;
  label: string;
  min: number;
  max: number;
  step: number;
  digits?: number;
  help?: string;
}

type NumericControlKey =
  | 'dt'
  | 'T'
  | 'KIn'
  | 'KOut'
  | 'NaIn'
  | 'NaOut'
  | 'gK'
  | 'gNa'
  | 'gNaMax'
  | 'gKMax'
  | 'gL'
  | 'EL'
  | 'tau'
  | 'vHalfNa'
  | 'slopeNa';

interface SimParams {
  T: number;
  dt: number;
  KIn: number;
  KOut: number;
  NaIn: number;
  NaOut: number;
  tau: number;
  gK: number;
  gNa: number;
  gKMax: number;
  gNaMax: number;
  gL: number;
  EL: number;
  vHalfNa: number;
  slopeNa: number;
  pulseWidthFrac: number;
  pulseStartFrac: number;
}

interface Trace {
  time: number[];
  voltage: number[];
  input: number[];
  IK: number[];
  INa: number[];
  IL: number[];
  gK: number[];
  gNa: number[];
  m: number[];
  h: number[];
  n: number[];
  amplitude: number;
}

interface LiveTraceState {
  amplitude: number;
  params: SimParams;
  modelKind: ModelKind;
  totalSteps: number;
  currentStep: number;
  time: number[];
  input: number[];
  voltage: number[];
  IK: number[];
  INa: number[];
  IL: number[];
  gK: number[];
  gNa: number[];
  m: number[];
  h: number[];
  n: number[];
}

interface PlotSeries {
  label: string;
  color: string;
  values: number[];
}

interface PlotSpec {
  id: string;
  title: string;
  yLabel: string;
  seriesForTrace: (trace: Trace) => PlotSeries | null;
}

interface AxisDomain {
  min: number;
  max: number;
}

const DEFAULT_PARAMS: SimParams = {
  T: 10000,
  dt: 1,
  KIn: 140,
  KOut: 5,
  NaIn: 15,
  NaOut: 145,
  tau: 10,
  gK: 0.3,
  gNa: 0.1,
  gKMax: 10,
  gNaMax: 15,
  gL: 0.1,
  EL: -65,
  vHalfNa: -40,
  slopeNa: 6,
  pulseWidthFrac: 1 / 3,
  pulseStartFrac: 1 / 3
};

const TRACE_COLORS = ['#ff6f8f', '#42c8ff', '#9fff6a', '#ffd166', '#c792ff', '#ff9f43', '#5eead4'];
const PLOT_HEIGHT = 176;
const PLOT_WIDTH = 880;
const TARGET_WALLCLOCK_MS = 10000;
const PLOT_SPECS: PlotSpec[] = [
  {
    id: 'input',
    title: 'External Input',
    yLabel: 'Input',
    seriesForTrace: (trace) => ({ label: 'I_ext', color: '#ff9f43', values: trace.input })
  },
  {
    id: 'voltage',
    title: 'Membrane Potential',
    yLabel: 'mV',
    seriesForTrace: (trace) => ({ label: 'V', color: '#42c8ff', values: trace.voltage })
  },
  {
    id: 'ik',
    title: 'Potassium Current',
    yLabel: 'Current',
    seriesForTrace: (trace) => ({ label: 'I_K', color: '#9fff6a', values: trace.IK })
  },
  {
    id: 'ina',
    title: 'Sodium Current',
    yLabel: 'Current',
    seriesForTrace: (trace) => ({ label: 'I_Na', color: '#ff6f8f', values: trace.INa })
  },
  {
    id: 'il',
    title: 'Leak Current',
    yLabel: 'Current',
    seriesForTrace: (trace) => ({ label: 'I_L', color: '#ffd166', values: trace.IL })
  },
  {
    id: 'gk',
    title: 'Potassium Conductance',
    yLabel: 'g',
    seriesForTrace: (trace) => ({ label: 'g_K', color: '#9fff6a', values: trace.gK })
  },
  {
    id: 'gna',
    title: 'Sodium Conductance',
    yLabel: 'g',
    seriesForTrace: (trace) => ({ label: 'g_Na', color: '#ff6f8f', values: trace.gNa })
  },
  {
    id: 'm',
    title: 'Na Activation Gate',
    yLabel: 'm',
    seriesForTrace: (trace) => ({ label: 'm', color: '#f472b6', values: trace.m })
  },
  {
    id: 'h',
    title: 'Na Inactivation Gate',
    yLabel: 'h',
    seriesForTrace: (trace) => ({ label: 'h', color: '#60a5fa', values: trace.h })
  },
  {
    id: 'n',
    title: 'K Activation Gate',
    yLabel: 'n',
    seriesForTrace: (trace) => ({ label: 'n', color: '#34d399', values: trace.n })
  }
];

interface LessonCapabilities {
  plotIds: string[];
}

const CAPABILITIES: Record<ModelKind, LessonCapabilities> = {
  passive_k: { plotIds: ['input', 'voltage', 'ik'] },
  passive_two_ion: { plotIds: ['input', 'voltage', 'ik', 'ina'] },
  smooth_na: { plotIds: ['input', 'voltage', 'ik', 'ina', 'gna'] },
  active_na: { plotIds: ['input', 'voltage', 'ik', 'ina', 'gna', 'm', 'h'] },
  active_na_k: { plotIds: ['input', 'voltage', 'ik', 'ina', 'gk', 'gna', 'm', 'h', 'n'] },
  active_na_k_leak: { plotIds: ['input', 'voltage', 'ik', 'ina', 'il', 'gk', 'gna', 'm', 'h', 'n'] }
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value: number, digits = 2): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function log10Safe(value: number): number {
  return Math.log10(Math.max(value, Number.EPSILON));
}

function sigmoid(v: number, vHalf: number, slope: number): number {
  return 1 / (1 + Math.exp(-(v - vHalf) / slope));
}

function alphaM(v: number): number {
  const shifted = v + 40;
  const denom = 1 - Math.exp(-shifted / 10);
  return Math.abs(denom) < 1e-6 ? 1 : (0.1 * shifted) / denom;
}

function betaM(v: number): number {
  return 4 * Math.exp(-(v + 65) / 18);
}

function alphaH(v: number): number {
  return 0.07 * Math.exp(-(v + 65) / 20);
}

function betaH(v: number): number {
  return 1 / (1 + Math.exp(-(v + 35) / 10));
}

function alphaN(v: number): number {
  const shifted = v + 55;
  const denom = 1 - Math.exp(-shifted / 10);
  return Math.abs(denom) < 1e-6 ? 0.1 : (0.01 * shifted) / denom;
}

function betaN(v: number): number {
  return 0.125 * Math.exp(-(v + 65) / 80);
}

function restingPotentialPassiveTwoIon(params: SimParams): number {
  return (params.gK * ek(params) + params.gNa * ena(params)) / (params.gK + params.gNa);
}

function ek(params: SimParams): number {
  return 61 * log10Safe(params.KOut / params.KIn);
}

function ena(params: SimParams): number {
  return 61 * log10Safe(params.NaOut / params.NaIn);
}

function initPulse(t: number[], amplitude: number, params: SimParams): number[] {
  const N = t.length;
  const pulse = new Array<number>(N).fill(0);
  const start = Math.floor(N * params.pulseStartFrac);
  const width = Math.floor(N * params.pulseWidthFrac);
  const end = Math.min(N, start + width);
  for (let i = start; i < end; i += 1) {
    pulse[i] = amplitude;
  }
  return pulse;
}

function initialVoltage(params: SimParams, modelKind: ModelKind): number {
  const EK = ek(params);
  const ENa = ena(params);
  if (modelKind === 'passive_k') return EK;
  if (modelKind === 'passive_two_ion') return restingPotentialPassiveTwoIon(params);
  if (modelKind === 'smooth_na') {
    const gNa0 = params.gNaMax * sigmoid(-65, params.vHalfNa, params.slopeNa);
    return (params.gK * EK + gNa0 * ENa) / (params.gK + gNa0);
  }
  return -65;
}

function createLiveTraceState(params: SimParams, modelKind: ModelKind, amplitude: number): LiveTraceState {
  const N = Math.max(2, Math.floor(params.T / params.dt));
  const t = Array.from({ length: N }, (_, i) => i * params.dt);
  const input = initPulse(t, amplitude, params);
  const voltage = new Array<number>(N).fill(0);
  const IK = new Array<number>(N).fill(0);
  const INa = new Array<number>(N).fill(0);
  const IL = new Array<number>(N).fill(0);
  const gKArr = new Array<number>(N).fill(0);
  const gNaArr = new Array<number>(N).fill(0);
  const m = new Array<number>(N).fill(0);
  const h = new Array<number>(N).fill(1);
  const n = new Array<number>(N).fill(0);

  voltage[0] = initialVoltage(params, modelKind);

  if (modelKind === 'active_na' || modelKind === 'active_na_k' || modelKind === 'active_na_k_leak') {
    m[0] = alphaM(voltage[0]) / (alphaM(voltage[0]) + betaM(voltage[0]));
    h[0] = alphaH(voltage[0]) / (alphaH(voltage[0]) + betaH(voltage[0]));
  }
  if (modelKind === 'active_na_k' || modelKind === 'active_na_k_leak') {
    n[0] = alphaN(voltage[0]) / (alphaN(voltage[0]) + betaN(voltage[0]));
  }

  return {
    amplitude,
    params: { ...params },
    modelKind,
    totalSteps: N,
    currentStep: 1,
    time: t,
    input,
    voltage,
    IK,
    INa,
    IL,
    gK: gKArr,
    gNa: gNaArr,
    m,
    h,
    n
  };
}

function maxInternalStepMs(modelKind: ModelKind): number {
  if (modelKind === 'passive_k' || modelKind === 'passive_two_ion') return 0.25;
  return 0.05;
}

function stepLiveTrace(state: LiveTraceState): boolean {
  if (state.currentStep >= state.totalSteps) return false;

  const { params, modelKind } = state;
  const i = state.currentStep;
  const EK = ek(params);
  const ENa = ena(params);
  const substeps = Math.max(1, Math.ceil(params.dt / maxInternalStepMs(modelKind)));
  const hdt = params.dt / substeps;
  let vp = state.voltage[i - 1];
  let mp = state.m[i - 1];
  let hp = state.h[i - 1];
  let np = state.n[i - 1];
  let ik = 0;
  let ina = 0;
  let il = 0;
  let gk = 0;
  let gna = 0;

  for (let s = 0; s < substeps; s += 1) {
    const inputValue = state.input[i - 1];

    if (modelKind === 'passive_k') {
      ik = (EK - vp) / params.tau;
      gk = 1 / params.tau;
      vp = vp + (ik + inputValue) * hdt;
      continue;
    }

    if (modelKind === 'passive_two_ion') {
      ik = params.gK * (EK - vp);
      ina = params.gNa * (ENa - vp);
      gk = params.gK;
      gna = params.gNa;
      vp = vp + (ik + ina + inputValue) * hdt;
      continue;
    }

    if (modelKind === 'smooth_na') {
      gna = params.gNaMax * sigmoid(vp, params.vHalfNa, params.slopeNa);
      gk = params.gK;
      ik = params.gK * (EK - vp);
      ina = gna * (ENa - vp);
      vp = vp + (ik + ina + inputValue) * hdt;
      continue;
    }

    const am = alphaM(vp);
    const bm = betaM(vp);
    const ah = alphaH(vp);
    const bh = betaH(vp);
    const tauM = 1 / (am + bm);
    const tauH = 1 / (ah + bh);
    const mInf = am * tauM;
    const hInf = ah * tauH;
    mp = mp + ((mInf - mp) / tauM) * hdt;
    hp = hp + ((hInf - hp) / tauH) * hdt;

    if (modelKind === 'active_na') {
      gna = params.gNaMax * mp ** 3 * hp;
      gk = params.gK;
      ik = params.gK * (EK - vp);
      ina = gna * (ENa - vp);
      vp = vp + (ik + ina + inputValue) * hdt;
      continue;
    }

    const an = alphaN(vp);
    const bn = betaN(vp);
    const tauN = 1 / (an + bn);
    const nInf = an * tauN;
    np = np + ((nInf - np) / tauN) * hdt;

    gna = params.gNaMax * mp ** 3 * hp;
    gk = params.gKMax * np ** 4;

    if (modelKind === 'active_na_k') {
      ik = gk * (EK - vp);
      ina = gna * (ENa - vp);
      vp = vp + (ik + ina + inputValue) * hdt;
      continue;
    }

    ik = gk * (vp - EK);
    ina = gna * (vp - ENa);
    il = params.gL * (vp - params.EL);
    vp = vp + (-(ik + ina + il) + inputValue) * hdt;
  }

  state.voltage[i] = vp;
  state.IK[i] = ik;
  state.INa[i] = ina;
  state.IL[i] = il;
  state.gK[i] = gk;
  state.gNa[i] = gna;
  state.m[i] = mp;
  state.h[i] = hp;
  state.n[i] = np;
  state.currentStep += 1;
  return true;
}

function traceFromState(state: LiveTraceState): Trace {
  const end = Math.max(1, state.currentStep);
  return {
    time: state.time.slice(0, end),
    input: state.input.slice(0, end),
    voltage: state.voltage.slice(0, end),
    IK: state.IK.slice(0, end),
    INa: state.INa.slice(0, end),
    IL: state.IL.slice(0, end),
    gK: state.gK.slice(0, end),
    gNa: state.gNa.slice(0, end),
    m: state.m.slice(0, end),
    h: state.h.slice(0, end),
    n: state.n.slice(0, end),
    amplitude: state.amplitude
  };
}

function runModel(params: SimParams, modelKind: ModelKind, pulseAmplitudes: number[]): LiveTraceState[] {
  return pulseAmplitudes.map((amp) => createLiveTraceState(params, modelKind, amp));
}

function plotSvg(
  series: PlotSeries[],
  time: number[],
  title: string,
  yLabel: string,
  totalDuration: number,
  yDomain?: AxisDomain
): string {
  const margin = { top: 16, right: 16, bottom: 28, left: 54 };
  const innerWidth = PLOT_WIDTH - margin.left - margin.right;
  const innerHeight = PLOT_HEIGHT - margin.top - margin.bottom;
  const allValues = series.flatMap((item) => item.values);
  const yMinRaw = yDomain ? yDomain.min : Math.min(...allValues);
  const yMaxRaw = yDomain ? yDomain.max : Math.max(...allValues);
  const pad = yMaxRaw === yMinRaw ? Math.max(1, Math.abs(yMaxRaw) * 0.2 || 1) : (yMaxRaw - yMinRaw) * 0.12;
  const yMin = yMinRaw - pad;
  const yMax = yMaxRaw + pad;
  const xMin = 0;
  const xMax = Math.max(totalDuration, time[time.length - 1] ?? 0, 1);

  const xScale = (value: number): number =>
    margin.left + ((value - xMin) / Math.max(1e-9, xMax - xMin)) * innerWidth;
  const yScale = (value: number): number =>
    margin.top + innerHeight - ((value - yMin) / Math.max(1e-9, yMax - yMin)) * innerHeight;

  const yTicks = Array.from({ length: 4 }, (_, i) => yMin + ((yMax - yMin) * i) / 3);
  const xTicks = Array.from({ length: 5 }, (_, i) => xMin + ((xMax - xMin) * i) / 4);

  const paths = series
    .map((item) => {
      const d = item.values
        .map((value, idx) => `${idx === 0 ? 'M' : 'L'} ${xScale(time[idx]).toFixed(2)} ${yScale(value).toFixed(2)}`)
        .join(' ');
      return `<path d="${d}" fill="none" stroke="${item.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />`;
    })
    .join('');

  const guides = yTicks
    .map((tick) => {
      const y = yScale(tick).toFixed(2);
      return `<g>
        <line x1="${margin.left}" x2="${PLOT_WIDTH - margin.right}" y1="${y}" y2="${y}" class="plot-gridline" />
        <text x="${margin.left - 8}" y="${Number(y) + 4}" class="plot-axis">${formatNumber(tick, 1)}</text>
      </g>`;
    })
    .join('');

  const xAxis = xTicks
    .map((tick) => {
      const x = xScale(tick).toFixed(2);
      return `<g>
        <line x1="${x}" x2="${x}" y1="${margin.top}" y2="${margin.top + innerHeight}" class="plot-gridline plot-gridline-vert" />
        <text x="${x}" y="${PLOT_HEIGHT - 8}" text-anchor="middle" class="plot-axis">${formatNumber(tick, 0)}</text>
      </g>`;
    })
    .join('');

  const legend = series
    .map(
      (item, idx) =>
        `<g transform="translate(${margin.left + idx * 138}, ${14})">
          <line x1="0" x2="16" y1="0" y2="0" stroke="${item.color}" stroke-width="3" />
          <text x="22" y="4" class="plot-legend">${item.label}</text>
        </g>`
    )
    .join('');

  const currentTime = time[time.length - 1] ?? 0;
  const cursorX = xScale(currentTime).toFixed(2);

  return `
    <div class="plot-card">
      <div class="subhead">
        <h3>${title}</h3>
        <span class="tiny">${yLabel}</span>
      </div>
      <svg class="plot-svg" viewBox="0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}" role="img" aria-label="${title}">
        <rect x="${margin.left}" y="${margin.top}" width="${innerWidth}" height="${innerHeight}" class="plot-frame"></rect>
        ${guides}
        ${xAxis}
        ${paths}
        <line x1="${cursorX}" x2="${cursorX}" y1="${margin.top}" y2="${margin.top + innerHeight}" class="plot-cursor" />
        ${legend}
        <text x="${margin.left}" y="${PLOT_HEIGHT - 8}" class="plot-axis-label">Time (ms)</text>
        <text x="16" y="${margin.top + 16}" class="plot-axis-label">${yLabel}</text>
      </svg>
    </div>`;
}

function getEquationHtml(text: string): string {
  return text.replace(/\n/g, '<br />');
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, '&quot;');
}

function plotAreaHtml(config: LessonPageConfig): string {
  const specs = CAPABILITIES[config.modelKind].plotIds
    .map((id) => PLOT_SPECS.find((plot) => plot.id === id))
    .filter((plot): plot is PlotSpec => Boolean(plot));

  return specs
    .map((plot) => `<div data-plot-id="${plot.id}"></div>`)
    .join('');
}

function controlsHtml(config: LessonPageConfig): string {
  return config.controls
    .map((control) => {
      const digits = control.digits ?? 2;
      return `
        <div class="field">
          <label for="${control.key}">${control.label}</label>
          <input
            id="${control.key}"
            data-control-key="${control.key}"
            type="number"
            min="${control.min}"
            max="${control.max}"
            step="${control.step}"
            data-digits="${digits}"
          />
        </div>
        ${control.help ? `<p class="field-help">${control.help}</p>` : ''}`;
    })
    .join('');
}

function questionsHtml(questions: GuidedQuestion[]): string {
  return questions
    .map(
      (question) => `
        <li>
          ${question.prompt}
          <details>
            <summary>Show answer</summary>
            <div class="answer-body"><p>${question.answer}</p></div>
          </details>
        </li>`
    )
    .join('');
}

function buildShell(config: LessonPageConfig): string {
  const pulseOptions = config.pulseAmplitudes
    .map((value, idx) => `<option value="${idx}">${formatNumber(value, 3)}</option>`)
    .join('');

  return `
    <div class="site-shell">
      <div class="nav-line">
        <a href="./">← Back to lessons</a>
        <div class="spacer"></div>
        <button id="theme-toggle" class="theme-btn">☀</button>
      </div>

      <header class="page-head">
        <p class="teaching-label">COGS3020 Week 06</p>
        <h1 class="landing-title">${config.title}</h1>
        <p class="eyebrow">${config.eyebrow}</p>
      </header>

      <section class="panel lesson-group">
        <h2 class="section-title">Conceptual Frame</h2>
        <div class="guide-step">
          <p>${config.intro}</p>
          <p><strong>What changed from the previous page?</strong> ${config.previousStep}</p>
        </div>
      </section>

      <section class="panel lesson-group">
        <h2 class="section-title">${config.equationLabel}</h2>
        <div class="equation-card">
          <pre class="equation">${getEquationHtml(config.equation)}</pre>
        </div>
      </section>

      <section class="sim-layout">
        <div class="controls">
          <div class="panel">
            <div class="group">
              <p class="group-label">Simulation Controls</p>
              <div class="control-grid">
                ${controlsHtml(config)}
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="group">
              <p class="group-label">Playback</p>
              <div class="field">
                <label for="focus-trace">Highlighted pulse amplitude</label>
                <select id="focus-trace">${pulseOptions}</select>
              </div>
              <label class="checkbox-field">
                <input id="overlay-traces" type="checkbox" checked />
                <span>Run and show all predefined pulse amplitudes together</span>
              </label>
              <div class="field">
                <label for="playback-speed">Playback speed</label>
                <select id="playback-speed">
                  <option value="0.5">0.5×</option>
                  <option value="1" selected>1×</option>
                  <option value="2">2×</option>
                  <option value="4">4×</option>
                  <option value="8">8×</option>
                </select>
              </div>
              <div class="button-row">
                <button id="run-btn" class="primary">Start simulation</button>
                <button id="pause-btn">Pause</button>
                <button id="reset-btn">Reset defaults</button>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="group">
              <p class="group-label">Reference Values</p>
              <dl id="metrics" class="status-list"></dl>
            </div>
          </div>
        </div>

        <div class="canvas-panel">
          ${plotAreaHtml(config)}
        </div>
      </section>

      <section class="panel lesson-group">
        <h2 class="section-title">Guided Questions</h2>
        <ol class="guided-questions">
          ${questionsHtml(config.questions)}
        </ol>
      </section>
    </div>`;
}

function getControlValues(inputs: HTMLInputElement[], params: SimParams): SimParams {
  const next = { ...params };
  for (const input of inputs) {
    const key = input.dataset.controlKey as NumericControlKey;
    if (!key) continue;
    const value = Number(input.value);
    if (!Number.isFinite(value)) continue;
    next[key] = value as never;
  }
  return next;
}

function setInputsFromParams(inputs: HTMLInputElement[], params: SimParams): void {
  for (const input of inputs) {
    const key = input.dataset.controlKey as NumericControlKey;
    if (!key) continue;
    const digits = Number(input.dataset.digits ?? '2');
    input.value = formatNumber(params[key], digits);
  }
}

function metricsHtml(params: SimParams, trace: Trace): string {
  const finalV = trace.voltage[trace.voltage.length - 1];
  const peakV = Math.max(...trace.voltage);
  return `
    <dt>E_K</dt><dd>${formatNumber(ek(params), 2)} mV</dd>
    <dt>E_Na</dt><dd>${formatNumber(ena(params), 2)} mV</dd>
    <dt>Current V</dt><dd>${formatNumber(finalV, 2)} mV</dd>
    <dt>Peak V</dt><dd>${formatNumber(peakV, 2)} mV</dd>
    <dt>Pulse</dt><dd>${formatNumber(trace.amplitude, 3)}</dd>
    <dt>Sim time</dt><dd>${formatNumber(trace.time[trace.time.length - 1] ?? 0, 1)} ms</dd>`;
}

function renderPlots(
  plotRoots: HTMLElement[],
  config: LessonPageConfig,
  traces: Trace[],
  focusedIndex: number,
  overlayAll: boolean,
  totalDuration: number,
  yDomains: Map<string, AxisDomain>
): void {
  const specs = CAPABILITIES[config.modelKind].plotIds
    .map((id) => PLOT_SPECS.find((plot) => plot.id === id))
    .filter((plot): plot is PlotSpec => Boolean(plot));

  specs.forEach((plot, idx) => {
    const activeTraces = overlayAll ? traces : [traces[focusedIndex]];
    const series = activeTraces
      .map((trace, traceIdx) => {
        const base = plot.seriesForTrace(trace);
        if (!base) return null;
        return {
          label: overlayAll ? `${base.label} · pulse ${formatNumber(trace.amplitude, 3)}` : base.label,
          color: overlayAll ? TRACE_COLORS[traceIdx % TRACE_COLORS.length] : base.color,
          values: base.values
        };
      })
      .filter((item): item is PlotSeries => Boolean(item));

    plotRoots[idx].innerHTML = plotSvg(
      series,
      traces[focusedIndex].time,
      plot.title,
      plot.yLabel,
      totalDuration,
      yDomains.get(plot.id)
    );
  });
}

function cloneLiveTraceState(state: LiveTraceState): LiveTraceState {
  return {
    amplitude: state.amplitude,
    params: { ...state.params },
    modelKind: state.modelKind,
    totalSteps: state.totalSteps,
    currentStep: state.currentStep,
    time: [...state.time],
    input: [...state.input],
    voltage: [...state.voltage],
    IK: [...state.IK],
    INa: [...state.INa],
    IL: [...state.IL],
    gK: [...state.gK],
    gNa: [...state.gNa],
    m: [...state.m],
    h: [...state.h],
    n: [...state.n]
  };
}

function computeYDomains(
  config: LessonPageConfig,
  states: LiveTraceState[],
  overlayAll: boolean,
  focusedIndex: number
): Map<string, AxisDomain> {
  const previewStates = states.map((state) => cloneLiveTraceState(state));
  for (const preview of previewStates) {
    while (stepLiveTrace(preview)) {
      // Run to completion to estimate stable plot bounds before visible playback starts.
    }
  }

  const traces = previewStates.map((state) => traceFromState(state));
  const activeTraces = overlayAll ? traces : [traces[focusedIndex]];
  const specs = CAPABILITIES[config.modelKind].plotIds
    .map((id) => PLOT_SPECS.find((plot) => plot.id === id))
    .filter((plot): plot is PlotSpec => Boolean(plot));

  const domains = new Map<string, AxisDomain>();
  for (const plot of specs) {
    const values = activeTraces
      .map((trace) => plot.seriesForTrace(trace))
      .filter((series): series is PlotSeries => Boolean(series))
      .flatMap((series) => series.values);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = max === min ? Math.max(1, Math.abs(max) * 0.2 || 1) : (max - min) * 0.12;
    domains.set(plot.id, { min: min - pad, max: max + pad });
  }
  return domains;
}

export function renderLessonPage(config: LessonPageConfig): void {
  applyStoredTheme();

  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) {
    throw new Error('Missing #app root');
  }

  app.innerHTML = buildShell(config);
  initThemeToggle(document.querySelector<HTMLButtonElement>('#theme-toggle')!);

  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-control-key]'));
  const plotRoots = CAPABILITIES[config.modelKind].plotIds.map(
    (id) => document.querySelector<HTMLElement>(`[data-plot-id="${escapeAttr(id)}"]`)!
  );
  const metrics = document.querySelector<HTMLDListElement>('#metrics')!;
  const focusSelect = document.querySelector<HTMLSelectElement>('#focus-trace')!;
  const overlayInput = document.querySelector<HTMLInputElement>('#overlay-traces')!;
  const playbackSelect = document.querySelector<HTMLSelectElement>('#playback-speed')!;
  const runButton = document.querySelector<HTMLButtonElement>('#run-btn')!;
  const pauseButton = document.querySelector<HTMLButtonElement>('#pause-btn')!;
  const resetButton = document.querySelector<HTMLButtonElement>('#reset-btn')!;

  let currentParams: SimParams = { ...DEFAULT_PARAMS, ...(config.defaultParams ?? {}) };
  let liveStates = runModel(currentParams, config.modelKind, config.pulseAmplitudes);
  let animationFrame = 0;
  let lastTimestamp = 0;
  let residualMs = 0;
  let isRunning = false;
  let yDomains = new Map<string, AxisDomain>();
  setInputsFromParams(inputs, currentParams);

  const getVisibleTraces = (): Trace[] => liveStates.map((state) => traceFromState(state));

  const rerender = (): void => {
    const traces = getVisibleTraces();
    const focusedIndex = clamp(Number(focusSelect.value), 0, traces.length - 1);
    renderPlots(plotRoots, config, traces, focusedIndex, overlayInput.checked, currentParams.T, yDomains);
    metrics.innerHTML = metricsHtml(currentParams, traces[focusedIndex]);
  };

  const stopAnimation = (): void => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    isRunning = false;
    lastTimestamp = 0;
    residualMs = 0;
    runButton.textContent = 'Resume simulation';
  };

  const rebuildStates = (): void => {
    currentParams = getControlValues(inputs, currentParams);
    liveStates = runModel(currentParams, config.modelKind, config.pulseAmplitudes);
    yDomains = computeYDomains(
      config,
      liveStates,
      overlayInput.checked,
      clamp(Number(focusSelect.value), 0, liveStates.length - 1)
    );
    rerender();
  };

  const tick = (timestamp: number): void => {
    if (!isRunning) return;
    if (lastTimestamp === 0) lastTimestamp = timestamp;
    const elapsedMs = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    const playbackSpeed = Number(playbackSelect.value) || 1;
    const simMsPerWallclockMs = (currentParams.T / TARGET_WALLCLOCK_MS) * playbackSpeed;
    residualMs += elapsedMs * simMsPerWallclockMs;

    let stepped = false;
    while (residualMs >= currentParams.dt) {
      residualMs -= currentParams.dt;
      let anyAdvanced = false;
      const activeStates = overlayInput.checked ? liveStates : [liveStates[clamp(Number(focusSelect.value), 0, liveStates.length - 1)]];
      for (const state of activeStates) {
        anyAdvanced = stepLiveTrace(state) || anyAdvanced;
      }
      stepped = stepped || anyAdvanced;
      if (!anyAdvanced) {
        stopAnimation();
        break;
      }
    }

    if (stepped) rerender();
    if (isRunning) {
      animationFrame = requestAnimationFrame(tick);
    }
  };

  runButton.addEventListener('click', () => {
    const statesFinished = liveStates.every((state) => state.currentStep >= state.totalSteps);
    if (statesFinished) rebuildStates();
    if (isRunning) return;
    isRunning = true;
    runButton.textContent = 'Running...';
    animationFrame = requestAnimationFrame(tick);
  });

  pauseButton.addEventListener('click', () => {
    stopAnimation();
    rerender();
  });

  focusSelect.addEventListener('change', () => {
    yDomains = computeYDomains(
      config,
      liveStates,
      overlayInput.checked,
      clamp(Number(focusSelect.value), 0, liveStates.length - 1)
    );
    rerender();
  });
  overlayInput.addEventListener('change', () => {
    yDomains = computeYDomains(
      config,
      liveStates,
      overlayInput.checked,
      clamp(Number(focusSelect.value), 0, liveStates.length - 1)
    );
    rerender();
  });
  playbackSelect.addEventListener('change', rerender);
  inputs.forEach((input) =>
    input.addEventListener('change', () => {
      stopAnimation();
      rebuildStates();
    })
  );

  resetButton.addEventListener('click', () => {
    stopAnimation();
    currentParams = { ...DEFAULT_PARAMS, ...(config.defaultParams ?? {}) };
    setInputsFromParams(inputs, currentParams);
    focusSelect.value = '0';
    overlayInput.checked = true;
    playbackSelect.value = '1';
    liveStates = runModel(currentParams, config.modelKind, config.pulseAmplitudes);
    yDomains = computeYDomains(config, liveStates, overlayInput.checked, 0);
    runButton.textContent = 'Start simulation';
    rerender();
  });

  yDomains = computeYDomains(config, liveStates, overlayInput.checked, 0);
  rerender();
}
