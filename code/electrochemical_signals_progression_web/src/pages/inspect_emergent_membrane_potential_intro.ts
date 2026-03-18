import '../style.css';
import { applyStoredTheme, initThemeToggle } from '../theme';

applyStoredTheme();

import { DEFAULT_DIFFUSION_SD, drawMembraneWall, MAX_PARTICLES, SIM_COLORS,
  getCanvasColors,
} from './sim_shared';

type IonType = 0 | 1;

interface ParticleState {
  x: Float32Array;
  y: Float32Array;
  charges: Int8Array;
  types: Uint8Array;
  side: Int8Array;
  numParticles: number;
  stepCount: number;
  simTime: number;
}

interface SimParams {
  dt: number;
  boxWidth: number;
  boxHeight: number;
  diffusionSd: number;
  posLeft: number;
  posRight: number;
  negLeft: number;
  negRight: number;
}

interface DisplayParams {
  pointSize: number;
  playbackSpeed: number;
  targetFps: number;
  traceWindowMs: number;
}

interface TraceHistory {
  times: number[];
  values: number[];
}

class Rng {
  private state: number;
  private spare: number | null = null;

  constructor(seed: number) {
    this.state = seed >>> 0 || 1;
  }

  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 0x100000000;
  }

  uniform(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  normal(mean = 0, sd = 1): number {
    if (this.spare !== null) {
      const out = this.spare;
      this.spare = null;
      return mean + sd * out;
    }
    let u = 0;
    let v = 0;
    while (u <= Number.EPSILON) u = this.next();
    while (v <= Number.EPSILON) v = this.next();
    const mag = Math.sqrt(-2 * Math.log(u));
    const z0 = mag * Math.cos(2 * Math.PI * v);
    const z1 = mag * Math.sin(2 * Math.PI * v);
    this.spare = z1;
    return mean + sd * z0;
  }
}

const defaultSim: SimParams = {
  dt: 1,
  boxWidth: 120,
  boxHeight: 90,
  diffusionSd: DEFAULT_DIFFUSION_SD,
  posLeft: 1000,
  posRight: 1000,
  negLeft: 1000,
  negRight: 1000
};

const defaultDisplay: DisplayParams = {
  pointSize: 2.1,
  playbackSpeed: 1,
  targetFps: 30,
  traceWindowMs: 2200
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function reflectIntoBounds(value: number, min: number, max: number): number {
  let next = value;
  while (next < min || next > max) {
    if (next < min) next = min + (min - next);
    if (next > max) next = max - (next - max);
  }
  return clamp(next, min, max);
}

function getEl<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}

function setNumberInput(input: HTMLInputElement, value: number, digits = 2): void {
  input.value = Number.isInteger(value) ? String(value) : Number(value.toFixed(digits)).toString();
}

function syncCanvasSize(canvas: HTMLCanvasElement): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

function normalizeSimParams(params: SimParams): SimParams {
  const posLeft = clamp(Math.round(params.posLeft), 0, MAX_PARTICLES);
  const posRight = clamp(Math.round(params.posRight), 0, MAX_PARTICLES);
  const negLeft = clamp(Math.round(params.negLeft), 0, MAX_PARTICLES);
  const negRight = clamp(Math.round(params.negRight), 0, MAX_PARTICLES);
  const total = posLeft + posRight + negLeft + negRight;
  const scale = total > MAX_PARTICLES ? MAX_PARTICLES / total : 1;
  return {
    dt: clamp(params.dt, 0.05, 20),
    boxWidth: clamp(params.boxWidth, 60, 220),
    boxHeight: clamp(params.boxHeight, 50, 180),
    diffusionSd: clamp(params.diffusionSd, 0, 8),
    posLeft: Math.round(posLeft * scale),
    posRight: Math.round(posRight * scale),
    negLeft: Math.round(negLeft * scale),
    negRight: Math.round(negRight * scale)
  };
}

function createState(params: SimParams): ParticleState {
  const rng = new Rng(1);
  const numParticles = params.posLeft + params.posRight + params.negLeft + params.negRight;
  const x = new Float32Array(numParticles);
  const y = new Float32Array(numParticles);
  const charges = new Int8Array(numParticles);
  const types = new Uint8Array(numParticles);
  const side = new Int8Array(numParticles);
  const halfW = params.boxWidth / 2;
  const halfH = params.boxHeight / 2;
  const leftWall = -2;
  const rightWall = 2;
  let index = 0;

  const placeGroup = (count: number, ionType: IonType, charge: number, sideValue: -1 | 1): void => {
    const minX = sideValue < 0 ? -halfW + 1 : rightWall + 1;
    const maxX = sideValue < 0 ? leftWall - 1 : halfW - 1;
    for (let i = 0; i < count; i += 1) {
      x[index] = rng.uniform(minX, maxX);
      y[index] = rng.uniform(-halfH + 1, halfH - 1);
      charges[index] = charge;
      types[index] = ionType;
      side[index] = sideValue;
      index += 1;
    }
  };

  placeGroup(params.posLeft, 0, 1, -1);
  placeGroup(params.posRight, 0, 1, 1);
  placeGroup(params.negLeft, 1, -1, -1);
  placeGroup(params.negRight, 1, -1, 1);

  return { x, y, charges, types, side, numParticles, stepCount: 0, simTime: 0 };
}

function computeMembranePotential(state: ParticleState): number {
  let leftCharge = 0;
  let rightCharge = 0;

  for (let i = 0; i < state.numParticles; i += 1) {
    if (state.side[i] < 0) leftCharge += state.charges[i];
    else rightCharge += state.charges[i];
  }

  // Teaching proxy: raw net charge difference across the membrane.
  // This keeps magnitude proportional to ion count (e.g., 10 ions > 5 ions).
  return rightCharge - leftCharge;
}

function stepState(state: ParticleState, params: SimParams, rng: Rng): void {
  const halfW = params.boxWidth / 2;
  const halfH = params.boxHeight / 2;
  for (let i = 0; i < state.numParticles; i += 1) {
    const xPrev = state.x[i];
    const yPrev = state.y[i];
    const xMin = state.side[i] < 0 ? -halfW : 2;
    const xMax = state.side[i] < 0 ? -2 : halfW;
    state.x[i] = reflectIntoBounds(xPrev + rng.normal(0, params.diffusionSd) * params.dt, xMin, xMax);
    state.y[i] = reflectIntoBounds(yPrev + rng.normal(0, params.diffusionSd) * params.dt, -halfH, halfH);
  }
  state.stepCount += 1;
  state.simTime = state.stepCount * params.dt;
}

function pushTrace(trace: TraceHistory, value: number, time: number, traceWindowMs: number): void {
  trace.times.push(time);
  trace.values.push(value);
  const minTime = Math.max(0, time - traceWindowMs);
  while (trace.times.length > 1 && trace.times[0] < minTime) {
    trace.times.shift();
    trace.values.shift();
  }
}

function drawParticles(canvas: HTMLCanvasElement, state: ParticleState, params: SimParams, display: DisplayParams): void {
  const cc = getCanvasColors();
  syncCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  const halfW = params.boxWidth / 2;
  const halfH = params.boxHeight / 2;
  const toPx = (x: number, y: number): [number, number] => [((x + halfW) / params.boxWidth) * w, h - ((y + halfH) / params.boxHeight) * h];

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = cc.gridA;
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i += 1) {
    const gx = (w * i) / 10;
    const gy = (h * i) / 10;
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

  const [wl] = toPx(-2, 0);
  const [wr] = toPx(2, 0);
  drawMembraneWall(ctx, {
    leftX: wl,
    rightX: wr,
    height: h,
    dpr
  });

  const radius = Math.max(0.8, display.pointSize) * dpr;
  for (let i = 0; i < state.numParticles; i += 1) {
    const [px, py] = toPx(state.x[i], state.y[i]);
    ctx.fillStyle = state.types[i] === 0 ? SIM_COLORS.ionA : SIM_COLORS.ionB;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = cc.ink;
  ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
}

function drawTrace(canvas: HTMLCanvasElement, trace: TraceHistory, currentTime: number, traceWindowMs: number): void {
  const cc = getCanvasColors();
  syncCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, w, h);
  const padL = 36 * dpr;
  const padR = 10 * dpr;
  const padT = 18 * dpr;
  const padB = 18 * dpr;
  const plotW = Math.max(1, w - padL - padR);
  const plotH = Math.max(1, h - padT - padB);
  const startTime = Math.max(0, currentTime - traceWindowMs);
  let maxAbs = 1;
  for (let i = 0; i < trace.times.length; i += 1) {
    if (trace.times[i] >= startTime) maxAbs = Math.max(maxAbs, Math.abs(trace.values[i]));
  }
  const yLimit = Math.max(1, maxAbs * 1.15);
  const xMap = (t: number) => padL + ((t - startTime) / Math.max(1, traceWindowMs)) * plotW;
  const yMap = (v: number) => padT + (1 - (v + yLimit) / (2 * yLimit)) * plotH;
  ctx.strokeStyle = cc.gridB;
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(padL, padT, plotW, plotH);
  ctx.beginPath();
  ctx.moveTo(padL, yMap(0));
  ctx.lineTo(padL + plotW, yMap(0));
  ctx.stroke();

  ctx.save();
  ctx.fillStyle = cc.ink;
  ctx.font = `${11 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.translate(12 * dpr, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('Net Charge Difference = Net Charge Right - Net Charge Left', 0, 0);
  ctx.restore();

  ctx.strokeStyle = SIM_COLORS.totalTrace;
  ctx.lineWidth = 1.8 * dpr;
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < trace.times.length; i += 1) {
    if (trace.times[i] < startTime) continue;
    const px = xMap(trace.times[i]);
    const py = yMap(trace.values[i]);
    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else {
      ctx.lineTo(px, py);
    }
  }
  if (started) ctx.stroke();
  ctx.fillStyle = cc.ink;
}

const app = getEl<HTMLDivElement>('#app');
app.innerHTML = `
  <div class="site-shell">
    <div class="nav-line">
      <a href="./index.html">← Back</a>
      <div class="spacer"></div>
      <button id="theme-toggle" class="theme-btn">☀</button>
    </div>
    <header class="page-head">
      
      <h1>Voltage as Charge Separation</h1>
      <p class="teaching-label">Key concepts</p>
      <ul class="key-points">
        <li>Membrane potential is the net charge difference across the membrane.</li>
        <li>More positive charge on one side = positive voltage on that side.</li>
        <li>Equal charges on both sides = zero voltage.</li>
        <li>Voltage is a property of the imbalance, not the absolute number of ions.</li>
      </ul>
      <p class="teaching-label questions">Questions to explore</p>
      <ul class="guided-questions">
        <li>What combination gives the largest positive voltage?</li>
        <li>Can you produce a negative voltage?</li>
      </ul>
    </header>
    <div class="sim-layout">
      <aside class="controls">
        <div class="panel">
          <div class="group">
            <div class="button-row">
              <button id="toggle-play" class="primary">Pause</button>
              <button id="rerun">Rerun</button>
              <button id="reset-defaults" class="warn">Reset Defaults</button>
            </div>
            <div class="control-grid">
              <div class="field"><label for="pos-left">Positive ions on left</label><input id="pos-left" type="number" min="0" max="5000" step="1" /></div>
              <div class="field"><label for="pos-right">Positive ions on right</label><input id="pos-right" type="number" min="0" max="5000" step="1" /></div>
              <div class="field"><label for="neg-left">Negative ions on left</label><input id="neg-left" type="number" min="0" max="5000" step="1" /></div>
              <div class="field"><label for="neg-right">Negative ions on right</label><input id="neg-right" type="number" min="0" max="5000" step="1" /></div>
            </div>
          </div>
        </div>
      </aside>
      <section class="panel canvas-panel">
        <div class="canvas-grid-2">
          <div class="canvas-subpanel">
            <canvas id="particle-canvas"></canvas>
          </div>
          <div class="canvas-subpanel">
            <canvas id="trace-canvas"></canvas>
          </div>
        </div>
      </section>
    </div>
  </div>
`;

const particleCanvas = getEl<HTMLCanvasElement>('#particle-canvas');
const traceCanvas = getEl<HTMLCanvasElement>('#trace-canvas');
const inputs = {
  posLeft: getEl<HTMLInputElement>('#pos-left'),
  posRight: getEl<HTMLInputElement>('#pos-right'),
  negLeft: getEl<HTMLInputElement>('#neg-left'),
  negRight: getEl<HTMLInputElement>('#neg-right')
};
const buttons = {
  togglePlay: getEl<HTMLButtonElement>('#toggle-play'),
  rerun: getEl<HTMLButtonElement>('#rerun'),
  resetDefaults: getEl<HTMLButtonElement>('#reset-defaults')
};

let simParams: SimParams = { ...defaultSim };
let displayParams: DisplayParams = { ...defaultDisplay };
let rng = new Rng(1);
let state = createState(simParams);
let trace: TraceHistory = { times: [0], values: [computeMembranePotential(state)] };
let isPlaying = true;
let lastTs = performance.now();
let stepAccumulator = 0;

function writeInputs(): void {
  setNumberInput(inputs.posLeft, simParams.posLeft, 0);
  setNumberInput(inputs.posRight, simParams.posRight, 0);
  setNumberInput(inputs.negLeft, simParams.negLeft, 0);
  setNumberInput(inputs.negRight, simParams.negRight, 0);
}

function readInputs(): SimParams {
  return normalizeSimParams({
    ...simParams,
    posLeft: Number(inputs.posLeft.value) || 0,
    posRight: Number(inputs.posRight.value) || 0,
    negLeft: Number(inputs.negLeft.value) || 0,
    negRight: Number(inputs.negRight.value) || 0,
    diffusionSd: defaultSim.diffusionSd
  });
}

function rebuild(): void {
  simParams = readInputs();
  rng = new Rng(1);
  state = createState(simParams);
  trace = { times: [0], values: [computeMembranePotential(state)] };
  stepAccumulator = 0;
  writeInputs();
}

function applyLiveInputs(): void {
  const next = readInputs();
  const prevTime = state.simTime;
  const prevStep = state.stepCount;
  simParams = next;

  // Rebuild particle populations to match new concentrations but keep run time/trace continuity.
  state = createState(simParams);
  state.simTime = prevTime;
  state.stepCount = prevStep;

  pushTrace(trace, computeMembranePotential(state), state.simTime, displayParams.traceWindowMs);
  writeInputs();
}

function render(): void {
  drawParticles(particleCanvas, state, simParams, displayParams);
  drawTrace(traceCanvas, trace, state.simTime, displayParams.traceWindowMs);
}

writeInputs();
render();

buttons.togglePlay.addEventListener('click', () => {
  isPlaying = !isPlaying;
  buttons.togglePlay.textContent = isPlaying ? 'Pause' : 'Play';
});
buttons.rerun.addEventListener('click', () => {
  rebuild();
  render();
});
buttons.resetDefaults.addEventListener('click', () => {
  simParams = { ...defaultSim };
  displayParams = { ...defaultDisplay };
  rebuild();
  isPlaying = true;
  buttons.togglePlay.textContent = 'Pause';
  render();
});

for (const input of Object.values(inputs)) {
  input.addEventListener('change', () => {
    applyLiveInputs();
    render();
  });
}
window.addEventListener('resize', () => render());

initThemeToggle(getEl<HTMLButtonElement>('#theme-toggle'));

function animate(ts: number): void {
  const dtSec = Math.max(0, (ts - lastTs) / 1000);
  lastTs = ts;
  if (isPlaying) {
    stepAccumulator += dtSec * displayParams.targetFps * displayParams.playbackSpeed;
    const stepsToRun = Math.min(120, Math.floor(stepAccumulator));
    if (stepsToRun > 0) {
      stepAccumulator -= stepsToRun;
      for (let i = 0; i < stepsToRun; i += 1) {
        stepState(state, simParams, rng);
        pushTrace(trace, computeMembranePotential(state), state.simTime, displayParams.traceWindowMs);
      }
    }
  }
  render();
  requestAnimationFrame(animate);
}

requestAnimationFrame((ts) => {
  lastTs = ts;
  animate(ts);
});
