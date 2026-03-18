import '../style.css';
import { applyStoredTheme, initThemeToggle } from '../theme';

applyStoredTheme();

import {
  DEFAULT_DIFFUSION_SD,
  DEFAULT_NUM_PARTICLES,
  DEFAULT_POTENTIAL_SCALE,
  DEFAULT_CHARGE_WALL_INSET,
  drawMembraneWall,
  MAX_PARTICLES,
  SIM_COLORS,
  centeredChannelBounds,
  pointFieldDrift,
  getCanvasColors,
} from './sim_shared';

interface SimParams {
  T: number;
  dt: number;
  numParticles: number;
  boxWidth: number;
  boxHeight: number;
  wallThickness: number;
  diffusionSd: number;
  electricStrength: number;
  channelWidth: number;
  channelPermeability: number;
  voltageScale: number;
  nernstScale: number;
  fixedAnionInset: number;
}

interface DisplayParams {
  pointSize: number;
  playbackSpeed: number;
  targetFps: number;
  traceYLimit: number;
}

interface LiveState {
  x: Float32Array;
  y: Float32Array;
  fixedX: Float32Array;
  fixedY: Float32Array;
  fixedCount: number;
  numParticles: number;
  dt: number;
  simTime: number;
  stepCount: number;
  boxWidth: number;
  boxHeight: number;
  leftWall: number;
  rightWall: number;
  fixedAnionLayerX: number;
  channelYMin: number;
  channelYMax: number;
  initialLeftCount: number;
  initialRightCount: number;
  leftCount: number;
  rightCount: number;
  vProxy: number;
  vNernst: number;
}

interface TraceHistory {
  times: number[];
  actual: number[];
  nernst: number[];
}

class Rng {
  private state: number;
  private spare: number | null = null;
  constructor(seed: number) { this.state = seed >>> 0 || 1; }
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 0x100000000;
  }
  uniform(min: number, max: number): number { return min + (max - min) * this.next(); }
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
  T: 2400,
  dt: 1,
  numParticles: DEFAULT_NUM_PARTICLES,
  boxWidth: 200,
  boxHeight: 200,
  wallThickness: 4,
  diffusionSd: DEFAULT_DIFFUSION_SD,
  electricStrength: -0.05,
  channelWidth: 16,
  channelPermeability: 0.5,
  voltageScale: DEFAULT_POTENTIAL_SCALE,
  nernstScale: DEFAULT_POTENTIAL_SCALE,
  fixedAnionInset: DEFAULT_CHARGE_WALL_INSET
};

const defaultDisplay: DisplayParams = { pointSize: 2.2, playbackSpeed: 1, targetFps: 30, traceYLimit: 20 };
const TRACE_HISTORY_MAX_POINTS = 4000;
const MOBILE_FIELD_SAMPLES = 80;
const MOBILE_FIELD_WEIGHT = 0.35;

function clamp(v: number, min: number, max: number): number { return Math.min(max, Math.max(min, v)); }
function reflectIntoBounds(value: number, min: number, max: number): number {
  let next = value;
  while (next < min || next > max) {
    if (next < min) next = min + (min - next);
    if (next > max) next = max - (next - max);
  }
  return clamp(next, min, max);
}
function randomSeed(): number { return (Math.random() * 0xffffffff) >>> 0; }
function getEl<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}
function setNumberInput(input: HTMLInputElement, value: number, digits = 3): void {
  input.value = Number.isInteger(value) ? String(value) : Number(value.toFixed(digits)).toString();
}
function fixedAnionLayerXNearMembrane(boxWidth: number, wallThickness: number, membraneOffset: number): number {
  const halfW = boxWidth / 2;
  const leftMembraneFace = -wallThickness / 2;
  return clamp(leftMembraneFace - membraneOffset, -halfW + 0.5, halfW - 0.5);
}
function targetFixedAnionCount(numParticles: number): number {
  return clamp(Math.round(numParticles * 0.08), 24, 180);
}
function layoutFixedAnionLayer(
  fixedX: Float32Array,
  fixedY: Float32Array,
  fixedCount: number,
  boxWidth: number,
  boxHeight: number,
  leftWall: number,
  rng: Rng
): void {
  const halfW = boxWidth / 2;
  const xMin = clamp(-halfW + 1, -halfW + 0.5, leftWall - 0.5);
  const xMax = clamp(leftWall - 0.5, xMin, leftWall - 0.5);
  const yMin = -boxHeight / 2 + 1;
  const yMax = boxHeight / 2 - 1;
  for (let i = 0; i < fixedCount; i += 1) {
    // Uniform random placement across intracellular area.
    fixedX[i] = rng.uniform(xMin, xMax);
    fixedY[i] = rng.uniform(yMin, yMax);
  }
}
function normalizeSimParams(params: SimParams): SimParams {
  const boxWidth = clamp(params.boxWidth, 40, 500);
  const boxHeight = clamp(params.boxHeight, 40, 500);
  const wallThickness = clamp(params.wallThickness, 0.5, Math.min(50, boxWidth - 2));
  return {
    T: clamp(Math.round(params.T), 100, 20000),
    dt: clamp(params.dt, 0.05, 20),
    numParticles: clamp(Math.round(params.numParticles), 10, MAX_PARTICLES),
    boxWidth,
    boxHeight,
    wallThickness,
    diffusionSd: clamp(params.diffusionSd, 0, 20),
    electricStrength: params.electricStrength,
    channelWidth: clamp(params.channelWidth, 0.5, boxHeight - 2),
    channelPermeability: clamp(params.channelPermeability, 0, 1),
    voltageScale: clamp(params.voltageScale, 1, 500),
    nernstScale: clamp(params.nernstScale, 1, 500),
    fixedAnionInset: clamp(params.fixedAnionInset, 0.5, Math.max(0.5, boxWidth - 1))
  };
}

function sampledMobileFieldSources(state: LiveState, rng: Rng, maxSamples: number): number[] {
  if (state.numParticles <= maxSamples) return Array.from({ length: state.numParticles }, (_, i) => i);
  const step = Math.max(1, Math.floor(state.numParticles / maxSamples));
  const offset = Math.floor(rng.next() * step);
  const out: number[] = [];
  for (let i = offset; i < state.numParticles && out.length < maxSamples; i += step) out.push(i);
  while (out.length < maxSamples) out.push(Math.floor(rng.next() * state.numParticles));
  return out;
}

function countSides(state: LiveState): void {
  let left = 0;
  let right = 0;
  for (let i = 0; i < state.numParticles; i += 1) {
    const x = state.x[i];
    if (x < state.leftWall) left += 1;
    else if (x > state.rightWall) right += 1;
  }
  state.leftCount = left;
  state.rightCount = right;
}

function updateVoltages(state: LiveState, params: SimParams): void {
  countSides(state);
  state.vNernst = params.nernstScale * Math.log((state.rightCount + 0.5) / (state.leftCount + 0.5));
  // Use the same concentration-ratio relation for the simulated Vm proxy so the
  // teaching trace and Nernst prediction are directly comparable.
  state.vProxy = state.vNernst;
}

function createState(params: SimParams, seed: number): LiveState {
  const p = normalizeSimParams(params);
  const rng = new Rng(seed);
  const [channelYMin, channelYMax] = centeredChannelBounds(p.channelWidth, p.boxHeight);
  const leftWall = -p.wallThickness / 2;
  const rightWall = p.wallThickness / 2;
  const x = new Float32Array(p.numParticles);
  const y = new Float32Array(p.numParticles);
  const fixedCount = targetFixedAnionCount(p.numParticles);
  const fixedX = new Float32Array(fixedCount);
  const fixedY = new Float32Array(fixedCount);
  for (let i = 0; i < p.numParticles; i += 1) {
    x[i] = rng.uniform(rightWall + 1, p.boxWidth / 2 - 1);
    y[i] = rng.uniform(-p.boxHeight / 2 + 1, p.boxHeight / 2 - 1);
  }
  const fixedAnionLayerX = fixedAnionLayerXNearMembrane(
    p.boxWidth,
    p.wallThickness,
    p.fixedAnionInset
  );
  layoutFixedAnionLayer(fixedX, fixedY, fixedCount, p.boxWidth, p.boxHeight, leftWall, rng);
  const state: LiveState = {
    x,
    y,
    fixedX,
    fixedY,
    fixedCount,
    numParticles: p.numParticles,
    dt: p.dt,
    simTime: 0,
    stepCount: 0,
    boxWidth: p.boxWidth,
    boxHeight: p.boxHeight,
    leftWall,
    rightWall,
    fixedAnionLayerX,
    channelYMin,
    channelYMax,
    initialLeftCount: 0,
    initialRightCount: p.numParticles,
    leftCount: 0,
    rightCount: p.numParticles,
    vProxy: 0,
    vNernst: 0
  };
  updateVoltages(state, p);
  return state;
}

function stepState(state: LiveState, params: SimParams, rng: Rng): void {
  const halfW = state.boxWidth / 2;
  const halfH = state.boxHeight / 2;
  const mobileSources = sampledMobileFieldSources(state, rng, MOBILE_FIELD_SAMPLES);
  const perFixedStrength = params.electricStrength / Math.max(1, state.fixedCount);
  const perMobileStrength = -MOBILE_FIELD_WEIGHT * params.electricStrength / Math.max(1, mobileSources.length);
  const driftFromChargeField = (x: number, y: number, selfIndex: number): [number, number] => {
    let driftX = 0;
    let driftY = 0;
    for (let k = 0; k < state.fixedCount; k += 1) {
      const [dxPart, dyPart] = pointFieldDrift(state.fixedX[k] - x, state.fixedY[k] - y, perFixedStrength, 1);
      driftX += dxPart;
      driftY += dyPart;
    }
    for (let s = 0; s < mobileSources.length; s += 1) {
      const srcIdx = mobileSources[s];
      if (srcIdx === selfIndex) continue;
      const [dxPart, dyPart] = pointFieldDrift(state.x[srcIdx] - x, state.y[srcIdx] - y, perMobileStrength, 1);
      driftX += dxPart;
      driftY += dyPart;
    }
    return [driftX, driftY];
  };
  for (let i = 0; i < state.numParticles; i += 1) {
    const xPrev = state.x[i];
    const yPrev = state.y[i];
    const [driftX, driftY] = driftFromChargeField(xPrev, yPrev, i);
    const xTrial = reflectIntoBounds(xPrev + (rng.normal(0, params.diffusionSd) + driftX) * state.dt, -halfW, halfW);
    const yTrial = reflectIntoBounds(yPrev + (rng.normal(0, params.diffusionSd) + driftY) * state.dt, -halfH, halfH);
    let xNew = xTrial;
    const tryingToCrossLeft = xPrev > state.rightWall && xTrial <= state.rightWall;
    const tryingToCrossRight = xPrev < state.leftWall && xTrial >= state.leftWall;
    const inChannel = yTrial >= state.channelYMin && yTrial <= state.channelYMax;
    if ((tryingToCrossLeft || tryingToCrossRight) && !inChannel) {
      xNew = tryingToCrossLeft
        ? reflectIntoBounds(2 * state.rightWall - xTrial, -halfW, halfW)
        : reflectIntoBounds(2 * state.leftWall - xTrial, -halfW, halfW);
    } else if ((tryingToCrossLeft || tryingToCrossRight) && inChannel && rng.next() > params.channelPermeability) {
      xNew = tryingToCrossLeft
        ? reflectIntoBounds(2 * state.rightWall - xTrial, -halfW, halfW)
        : reflectIntoBounds(2 * state.leftWall - xTrial, -halfW, halfW);
    } else if (!inChannel && xTrial > state.leftWall && xTrial < state.rightWall) {
      xNew = xPrev < 0 ? state.leftWall : state.rightWall;
    }
    state.x[i] = xNew;
    state.y[i] = yTrial;
  }
  state.stepCount += 1;
  state.simTime = state.stepCount * state.dt;
  updateVoltages(state, params);
}

function createTrace(state: LiveState, traceWindowMs: number): TraceHistory {
  const trace: TraceHistory = { times: [], actual: [], nernst: [] };
  pushTrace(trace, state, traceWindowMs);
  return trace;
}
function pushTrace(trace: TraceHistory, state: LiveState, traceWindowMs: number): void {
  trace.times.push(state.simTime);
  trace.actual.push(state.vProxy);
  trace.nernst.push(state.vNernst);
  const minTime = Math.max(0, state.simTime - traceWindowMs);
  while (trace.times.length > 1 && trace.times[0] < minTime) {
    trace.times.shift();
    trace.actual.shift();
    trace.nernst.shift();
  }
  while (trace.times.length > TRACE_HISTORY_MAX_POINTS) {
    trace.times.shift();
    trace.actual.shift();
    trace.nernst.shift();
  }
}
function computeDynamicYLimit(trace: TraceHistory, startTime: number, minLimit: number): number {
  let maxAbs = 0;
  for (let i = 0; i < trace.times.length; i += 1) {
    if (trace.times[i] < startTime) continue;
    maxAbs = Math.max(maxAbs, Math.abs(trace.actual[i]), Math.abs(trace.nernst[i]));
  }
  return Math.max(minLimit, Math.max(1, maxAbs * 1.15));
}

function drawTrace(canvas: HTMLCanvasElement, trace: TraceHistory, currentTime: number, traceWindowMs: number, minYLimit: number): void {
  const cc = getCanvasColors();
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = cc.gridA;
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i += 1) {
    const gx = (w * i) / 10;
    const gy = (h * i) / 10;
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  }
  const padL = 36 * dpr;
  const padR = 10 * dpr;
  const padT = 18 * dpr;
  const padB = 18 * dpr;
  const plotW = Math.max(1, w - padL - padR);
  const plotH = Math.max(1, h - padT - padB);
  const startTime = Math.max(0, currentTime - traceWindowMs);
  const yLimit = computeDynamicYLimit(trace, startTime, minYLimit);
  const xMap = (tt: number) => padL + ((tt - startTime) / Math.max(traceWindowMs, 1)) * plotW;
  const yMap = (yy: number) => padT + (1 - (yy + yLimit) / Math.max(1e-6, 2 * yLimit)) * plotH;
  ctx.strokeStyle = cc.gridB;
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(padL, padT, plotW, plotH);
  ctx.beginPath();
  ctx.moveTo(padL, yMap(0));
  ctx.lineTo(padL + plotW, yMap(0));
  ctx.stroke();
  const series = [
    { data: trace.actual, color: SIM_COLORS.totalTrace, dashed: false },
    { data: trace.nernst, color: SIM_COLORS.predictionTrace, dashed: true }
  ];
  for (const s of series) {
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.7 * dpr;
    if (s.dashed) ctx.setLineDash([5 * dpr, 4 * dpr]);
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < trace.times.length; i += 1) {
      if (trace.times[i] < startTime) continue;
      const px = xMap(trace.times[i]);
      const py = yMap(s.data[i]);
      if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
    }
    if (started) ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = cc.ink;
  ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.fillStyle = cc.inkDim;
  ctx.font = `${11 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.save();
  ctx.translate(12 * dpr, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('membrane potential proxy (mV-scaled)', 0, 0);
  ctx.restore();
}

function drawParticles(canvas: HTMLCanvasElement, state: LiveState, pointSize: number): void {
  const cc = getCanvasColors();
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = cc.gridA;
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i += 1) {
    const gx = (w * i) / 10;
    const gy = (h * i) / 10;
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  }
  const toPx = (x: number, y: number): [number, number] => [((x + state.boxWidth / 2) / state.boxWidth) * w, h - ((y + state.boxHeight / 2) / state.boxHeight) * h];
  const [wl] = toPx(state.leftWall, 0);
  const [wr] = toPx(state.rightWall, 0);
  const [, cTop] = toPx(0, state.channelYMax);
  const [, cBottom] = toPx(0, state.channelYMin);
  drawMembraneWall(ctx, {
    leftX: wl,
    rightX: wr,
    height: h,
    dpr,
    channels: [{ top: cTop, bottom: cBottom }]
  });
  const membraneWidth = Math.max(1, wr - wl);
  const yTop = Math.min(cTop, cBottom);
  const yBottom = Math.max(cTop, cBottom);
  const bandHeight = Math.max(1, yBottom - yTop);
  const openHeight = Math.max(1 * dpr, bandHeight * clamp(simParams.channelPermeability, 0, 1));
  const openY = yTop + (bandHeight - openHeight) / 2;
  ctx.fillStyle = 'rgba(8, 16, 26, 0.85)';
  ctx.fillRect(wl, yTop, membraneWidth, bandHeight);
  ctx.fillStyle = SIM_COLORS.ionA;
  ctx.globalAlpha = 0.15 + 0.55 * clamp(simParams.channelPermeability, 0, 1);
  ctx.fillRect(wl, openY, membraneWidth, openHeight);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = SIM_COLORS.ionA;
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(wl, yTop, membraneWidth, bandHeight);
  const r = Math.max(0.8, pointSize) * dpr;
  ctx.fillStyle = SIM_COLORS.fieldNegative;
  const fixedR = Math.max(0.7, pointSize * 0.8) * dpr;
  for (let i = 0; i < state.fixedCount; i += 1) {
    const [px, py] = toPx(state.fixedX[i], state.fixedY[i]);
    ctx.fillRect(px - fixedR, py - fixedR, 2 * fixedR, 2 * fixedR);
  }
  ctx.fillStyle = SIM_COLORS.ionA;
  for (let i = 0; i < state.numParticles; i += 1) {
    const [px, py] = toPx(state.x[i], state.y[i]);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
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
      <h1>The Nernst Equation</h1>
      <p class="teaching-label">Key concepts</p>
      <ul class="key-points">
        <li>With a concentration gradient, K⁺ tends to diffuse out; electrical force pulls K⁺ in.</li>
        <li>At equilibrium, diffusion and electrical force exactly balance — this balance sets the membrane potential.</li>
        <li>The Nernst equation predicts this equilibrium voltage from the concentration ratio alone.</li>
        <li>Nernst potential does <em>not</em> depend on permeability — only on the concentration gradient.</li>
      </ul>
      <p class="teaching-label questions">Questions to explore</p>
      <ul class="guided-questions">
        <li>Does changing channel permeability change the Nernst potential?</li>
        <li>What happens to V<sub>m</sub> if you increase the pump rate?</li>
      </ul>
    </header>
    <div class="sim-layout">
      <aside class="controls">
        <div class="panel">
          <div class="group">
            <div class="button-row"><button id="toggle-play" class="primary">Pause</button><button id="rerun">Rerun</button><button id="reset-defaults" class="warn">Reset Defaults</button></div>
            <div class="control-grid">
              <div class="field"><label for="num-particles">Particles</label><input id="num-particles" type="number" min="10" max="5000" step="1" /></div>
              <div class="field"><label for="diffusion-sd">Diffusion SD</label><input id="diffusion-sd" type="number" min="0" max="20" step="0.01" /></div>
              <div class="field"><label for="electric-strength">Electric strength</label><input id="electric-strength" type="number" /></div>
              <div class="field"><label for="channel-permeability">Channel permeability</label><input id="channel-permeability" type="number" min="0" max="1" step="0.01" /></div>
              <div class="field"><label for="playback-speed">Playback speed</label><input id="playback-speed" type="number" min="0.1" max="8" step="0.1" /></div>
            </div>
          </div>
        </div>
      </aside>
      <section class="panel canvas-panel">
        <div class="canvas-grid-2">
          <div class="canvas-subpanel"><canvas id="particle-canvas"></canvas></div>
          <div class="canvas-subpanel"><canvas id="trace-canvas"></canvas></div>
        </div>
      </section>
    </div>
  </div>
`;

const particleCanvas = getEl<HTMLCanvasElement>('#particle-canvas');
const traceCanvas = getEl<HTMLCanvasElement>('#trace-canvas');
const inputs = {
  numParticles: getEl<HTMLInputElement>('#num-particles'),
  diffusionSd: getEl<HTMLInputElement>('#diffusion-sd'),
  electricStrength: getEl<HTMLInputElement>('#electric-strength'),
  channelPermeability: getEl<HTMLInputElement>('#channel-permeability'),
  playbackSpeed: getEl<HTMLInputElement>('#playback-speed')
};
const buttons = {
  togglePlay: getEl<HTMLButtonElement>('#toggle-play'),
  rerun: getEl<HTMLButtonElement>('#rerun'),
  resetDefaults: getEl<HTMLButtonElement>('#reset-defaults')
};

let simParams: SimParams = { ...defaultSim };
let displayParams: DisplayParams = { ...defaultDisplay };
let currentSeed = randomSeed();
let rng = new Rng(currentSeed);
let state = createState(simParams, currentSeed);
let trace = createTrace(state, simParams.T);
let isPlaying = true;
let lastTs = performance.now();
let stepAccumulator = 0;

function writeInputs(): void {
  setNumberInput(inputs.numParticles, simParams.numParticles, 0);
  setNumberInput(inputs.diffusionSd, simParams.diffusionSd, 3);
  setNumberInput(inputs.electricStrength, simParams.electricStrength, 3);
  setNumberInput(inputs.channelPermeability, simParams.channelPermeability, 2);
  setNumberInput(inputs.playbackSpeed, displayParams.playbackSpeed, 2);
}
function readSimInputs(): SimParams {
  const boxHeight = defaultSim.boxHeight;
  const boxWidth = defaultSim.boxWidth;
  const electricStrengthRaw = Number(inputs.electricStrength.value);
  return normalizeSimParams({
    T: defaultSim.T,
    dt: defaultSim.dt,
    numParticles: clamp(Math.round(Number(inputs.numParticles.value) || defaultSim.numParticles), 10, MAX_PARTICLES),
    boxWidth,
    boxHeight,
    wallThickness: defaultSim.wallThickness,
    diffusionSd: clamp(Number(inputs.diffusionSd.value) || 0, 0, 20),
    electricStrength: Number.isNaN(electricStrengthRaw) ? defaultSim.electricStrength : electricStrengthRaw,
    channelWidth: clamp(simParams.channelWidth, 0.5, boxHeight - 2),
    channelPermeability: clamp(Number(inputs.channelPermeability.value) || 0, 0, 1),
    voltageScale: defaultSim.voltageScale,
    nernstScale: defaultSim.nernstScale,
    fixedAnionInset: simParams.fixedAnionInset
  });
}
function readDisplayInputs(): DisplayParams {
  return {
    pointSize: defaultDisplay.pointSize,
    playbackSpeed: clamp(Number(inputs.playbackSpeed.value) || defaultDisplay.playbackSpeed, 0.1, 8),
    targetFps: defaultDisplay.targetFps,
    traceYLimit: defaultDisplay.traceYLimit
  };
}
function render(): void {
  drawParticles(particleCanvas, state, displayParams.pointSize);
  drawTrace(traceCanvas, trace, state.simTime, simParams.T, displayParams.traceYLimit);
}
function resizeState(stateRef: LiveState, targetCount: number, rngRef: Rng): LiveState {
  if (targetCount === stateRef.numParticles) return stateRef;
  const nextX = new Float32Array(targetCount);
  const nextY = new Float32Array(targetCount);
  const keep = Math.min(stateRef.numParticles, targetCount);
  nextX.set(stateRef.x.subarray(0, keep));
  nextY.set(stateRef.y.subarray(0, keep));
  const halfW = stateRef.boxWidth / 2;
  for (let i = keep; i < targetCount; i += 1) {
    nextX[i] = rngRef.uniform(stateRef.rightWall + 1, halfW - 1);
    nextY[i] = rngRef.uniform(-stateRef.boxHeight / 2 + 1, stateRef.boxHeight / 2 - 1);
  }
  stateRef.x = nextX;
  stateRef.y = nextY;
  stateRef.numParticles = targetCount;
  const nextFixedCount = targetFixedAnionCount(targetCount);
  if (nextFixedCount !== stateRef.fixedCount) {
    stateRef.fixedCount = nextFixedCount;
    stateRef.fixedX = new Float32Array(nextFixedCount);
    stateRef.fixedY = new Float32Array(nextFixedCount);
  }
  layoutFixedAnionLayer(
    stateRef.fixedX,
    stateRef.fixedY,
    stateRef.fixedCount,
    stateRef.boxWidth,
    stateRef.boxHeight,
    stateRef.leftWall,
    rngRef
  );
  stateRef.initialLeftCount = 0;
  stateRef.initialRightCount = targetCount;
  updateVoltages(stateRef, simParams);
  return stateRef;
}
function enforceGeometry(stateRef: LiveState): void {
  const halfW = stateRef.boxWidth / 2;
  const halfH = stateRef.boxHeight / 2;
  for (let i = 0; i < stateRef.numParticles; i += 1) {
    stateRef.x[i] = reflectIntoBounds(stateRef.x[i], -halfW, halfW);
    stateRef.y[i] = reflectIntoBounds(stateRef.y[i], -halfH, halfH);
    if (stateRef.x[i] > stateRef.leftWall && stateRef.x[i] < stateRef.rightWall && !(stateRef.y[i] >= stateRef.channelYMin && stateRef.y[i] <= stateRef.channelYMax)) {
      stateRef.x[i] = stateRef.x[i] < 0 ? stateRef.leftWall : stateRef.rightWall;
    }
  }
  updateVoltages(stateRef, simParams);
}
function trimTrace(traceHistory: TraceHistory, currentTime: number, traceWindowMs: number): void {
  const minTime = Math.max(0, currentTime - traceWindowMs);
  while (traceHistory.times.length > 1 && traceHistory.times[0] < minTime) {
    traceHistory.times.shift();
    traceHistory.actual.shift();
    traceHistory.nernst.shift();
  }
}
function rebuildFromInputs(): void {
  simParams = readSimInputs();
  displayParams = readDisplayInputs();
  rng = new Rng(currentSeed);
  state = createState(simParams, currentSeed);
  trace = createTrace(state, simParams.T);
  stepAccumulator = 0;
  writeInputs();
}
function applyLiveSimParams(): void {
  const next = readSimInputs();
  simParams = next;
  state = resizeState(state, simParams.numParticles, rng);
  state.dt = simParams.dt;
  state.boxWidth = simParams.boxWidth;
  state.boxHeight = simParams.boxHeight;
  state.leftWall = -simParams.wallThickness / 2;
  state.rightWall = simParams.wallThickness / 2;
  state.fixedAnionLayerX = fixedAnionLayerXNearMembrane(
    simParams.boxWidth,
    simParams.wallThickness,
    simParams.fixedAnionInset
  );
  layoutFixedAnionLayer(
    state.fixedX,
    state.fixedY,
    state.fixedCount,
    state.boxWidth,
    state.boxHeight,
    state.leftWall,
    rng
  );
  [state.channelYMin, state.channelYMax] = centeredChannelBounds(simParams.channelWidth, simParams.boxHeight);
  enforceGeometry(state);
  trimTrace(trace, state.simTime, simParams.T);
  writeInputs();
}
function refreshDisplayFromInputs(): void { displayParams = readDisplayInputs(); writeInputs(); }
function setPlaying(next: boolean): void { isPlaying = next; buttons.togglePlay.textContent = isPlaying ? 'Pause' : 'Play'; }

writeInputs();
render();
buttons.togglePlay.addEventListener('click', () => setPlaying(!isPlaying));
buttons.rerun.addEventListener('click', () => { currentSeed = randomSeed(); rebuildFromInputs(); setPlaying(true); render(); });
buttons.resetDefaults.addEventListener('click', () => { simParams = { ...defaultSim }; displayParams = { ...defaultDisplay }; currentSeed = randomSeed(); writeInputs(); rebuildFromInputs(); setPlaying(true); render(); });
for (const el of [inputs.numParticles, inputs.diffusionSd, inputs.electricStrength, inputs.channelPermeability]) {
  el.addEventListener('change', () => { applyLiveSimParams(); render(); });
}
inputs.playbackSpeed.addEventListener('change', () => { refreshDisplayFromInputs(); render(); });
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
        pushTrace(trace, state, simParams.T);
      }
    }
  }
  render();
  requestAnimationFrame(animate);
}
requestAnimationFrame((ts) => { lastTs = ts; animate(ts); });
