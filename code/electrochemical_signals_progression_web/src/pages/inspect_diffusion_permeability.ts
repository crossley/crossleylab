import '../style.css';
import {
  DEFAULT_DIFFUSION_SD,
  DEFAULT_NUM_PARTICLES,
  MAX_PARTICLES,
  SIM_COLORS,
  centeredChannelBounds,
  drawMembraneWall
} from './sim_shared';

interface SimParams {
  T: number;
  dt: number;
  numParticles: number;
  boxWidth: number;
  boxHeight: number;
  wallThickness: number;
  diffusionSd: number;
  narrowChannelWidth: number;
  wideChannelWidth: number;
}

interface DisplayParams {
  pointSize: number;
  playbackSpeed: number;
  targetFps: number;
}

interface LiveState {
  x: Float32Array;
  y: Float32Array;
  numParticles: number;
  dt: number;
  simTime: number;
  stepCount: number;
  boxWidth: number;
  boxHeight: number;
  leftWall: number;
  rightWall: number;
  channelYMin: number;
  channelYMax: number;
  leftCount: number;
  rightCount: number;
}

interface TraceHistory {
  times: number[];
  leftFrac: number[];
  rightFrac: number[];
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
  T: 1000,
  dt: 1,
  numParticles: Math.round(DEFAULT_NUM_PARTICLES / 2),
  boxWidth: 100,
  boxHeight: 60,
  wallThickness: 4,
  diffusionSd: DEFAULT_DIFFUSION_SD,
  narrowChannelWidth: 10,
  wideChannelWidth: 30
};

const defaultDisplay: DisplayParams = {
  pointSize: 2.5,
  playbackSpeed: 1,
  targetFps: 30
};

const TRACE_HISTORY_MAX_POINTS = 4000;

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

function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

function getEl<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}

function setNumberInput(input: HTMLInputElement, value: number, digits = 3): void {
  input.value = Number.isInteger(value) ? String(value) : Number(value.toFixed(digits)).toString();
}

function normalizeSimParams(params: SimParams): SimParams {
  const boxWidth = clamp(params.boxWidth, 20, 500);
  const boxHeight = clamp(params.boxHeight, 20, 500);
  const wallThickness = clamp(params.wallThickness, 0.5, Math.min(50, boxWidth - 2));
  return {
    T: clamp(Math.round(params.T), 100, 20000),
    dt: clamp(params.dt, 0.05, 20),
    numParticles: clamp(Math.round(params.numParticles), 1, MAX_PARTICLES),
    boxWidth,
    boxHeight,
    wallThickness,
    diffusionSd: clamp(params.diffusionSd, 0, 20),
    narrowChannelWidth: clamp(params.narrowChannelWidth, 0.5, boxHeight - 2),
    wideChannelWidth: clamp(params.wideChannelWidth, 0.5, boxHeight - 2)
  };
}

function countSides(state: LiveState): { left: number; right: number } {
  let left = 0;
  let right = 0;
  for (let i = 0; i < state.numParticles; i += 1) {
    const x = state.x[i];
    if (x < state.leftWall) left += 1;
    else if (x > state.rightWall) right += 1;
  }
  return { left, right };
}

function createState(params: { dt: number; numParticles: number; boxWidth: number; boxHeight: number; wallThickness: number; channelWidth: number }, seed: number): LiveState {
  const rng = new Rng(seed);
  const leftWall = -params.wallThickness / 2;
  const rightWall = params.wallThickness / 2;
  const [channelYMin, channelYMax] = centeredChannelBounds(params.channelWidth, params.boxHeight);
  const x = new Float32Array(params.numParticles);
  const y = new Float32Array(params.numParticles);
  for (let i = 0; i < params.numParticles; i += 1) {
    x[i] = rng.uniform(-params.boxWidth / 2 + 1, leftWall - 1);
    y[i] = rng.uniform(-params.boxHeight / 2 + 1, params.boxHeight / 2 - 1);
  }
  const state: LiveState = {
    x,
    y,
    numParticles: params.numParticles,
    dt: params.dt,
    simTime: 0,
    stepCount: 0,
    boxWidth: params.boxWidth,
    boxHeight: params.boxHeight,
    leftWall,
    rightWall,
    channelYMin,
    channelYMax,
    leftCount: 0,
    rightCount: 0
  };
  const counts = countSides(state);
  state.leftCount = counts.left;
  state.rightCount = counts.right;
  return state;
}

function resizeState(state: LiveState, nextCount: number, rng: Rng): LiveState {
  if (nextCount === state.numParticles) return state;
  const x = new Float32Array(nextCount);
  const y = new Float32Array(nextCount);
  const keep = Math.min(state.numParticles, nextCount);
  x.set(state.x.subarray(0, keep));
  y.set(state.y.subarray(0, keep));
  for (let i = keep; i < nextCount; i += 1) {
    x[i] = rng.uniform(-state.boxWidth / 2 + 1, state.leftWall - 1);
    y[i] = rng.uniform(-state.boxHeight / 2 + 1, state.boxHeight / 2 - 1);
  }
  return { ...state, x, y, numParticles: nextCount };
}

function enforceGeometry(state: LiveState): void {
  const halfW = state.boxWidth / 2;
  const halfH = state.boxHeight / 2;
  for (let i = 0; i < state.numParticles; i += 1) {
    state.x[i] = reflectIntoBounds(state.x[i], -halfW, halfW);
    state.y[i] = reflectIntoBounds(state.y[i], -halfH, halfH);
    const inWall = state.x[i] > state.leftWall && state.x[i] < state.rightWall;
    const inChannel = state.y[i] >= state.channelYMin && state.y[i] <= state.channelYMax;
    if (inWall && !inChannel) state.x[i] = state.x[i] < 0 ? state.leftWall : state.rightWall;
  }
  const counts = countSides(state);
  state.leftCount = counts.left;
  state.rightCount = counts.right;
}

function trimTrace(trace: TraceHistory, currentTime: number, traceWindowMs: number): void {
  const minTime = Math.max(0, currentTime - traceWindowMs);
  while (trace.times.length > 1 && trace.times[0] < minTime) {
    trace.times.shift();
    trace.leftFrac.shift();
    trace.rightFrac.shift();
  }
}

function stepState(state: LiveState, diffusionSd: number, rng: Rng): void {
  const halfW = state.boxWidth / 2;
  const halfH = state.boxHeight / 2;
  for (let i = 0; i < state.numParticles; i += 1) {
    const xPrev = state.x[i];
    const yPrev = state.y[i];
    const xTrial = reflectIntoBounds(xPrev + rng.normal(0, diffusionSd) * state.dt, -halfW, halfW);
    const yNew = reflectIntoBounds(yPrev + rng.normal(0, diffusionSd) * state.dt, -halfH, halfH);
    let xNew = xTrial;
    const tryingToCrossLeft = xPrev < state.leftWall && xTrial >= state.leftWall;
    const tryingToCrossRight = xPrev > state.rightWall && xTrial <= state.rightWall;
    const inChannel = yNew >= state.channelYMin && yNew <= state.channelYMax;
    if ((tryingToCrossLeft || tryingToCrossRight) && !inChannel) {
      xNew = tryingToCrossLeft
        ? reflectIntoBounds(2 * state.leftWall - xTrial, -halfW, halfW)
        : reflectIntoBounds(2 * state.rightWall - xTrial, -halfW, halfW);
    } else if (!inChannel && xTrial > state.leftWall && xTrial < state.rightWall) {
      xNew = xPrev < 0 ? state.leftWall : state.rightWall;
    }
    state.x[i] = xNew;
    state.y[i] = yNew;
  }
  state.stepCount += 1;
  state.simTime = state.stepCount * state.dt;
  const counts = countSides(state);
  state.leftCount = counts.left;
  state.rightCount = counts.right;
}

function createTraceHistory(state: LiveState, traceWindowMs: number): TraceHistory {
  const trace: TraceHistory = { times: [], leftFrac: [], rightFrac: [] };
  pushTracePoint(trace, state, traceWindowMs);
  return trace;
}

function pushTracePoint(trace: TraceHistory, state: LiveState, traceWindowMs: number): void {
  trace.times.push(state.simTime);
  trace.leftFrac.push(state.leftCount / state.numParticles);
  trace.rightFrac.push(state.rightCount / state.numParticles);
  const minTime = Math.max(0, state.simTime - traceWindowMs);
  while (trace.times.length > 1 && trace.times[0] < minTime) {
    trace.times.shift();
    trace.leftFrac.shift();
    trace.rightFrac.shift();
  }
  while (trace.times.length > TRACE_HISTORY_MAX_POINTS) {
    trace.times.shift();
    trace.leftFrac.shift();
    trace.rightFrac.shift();
  }
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

function worldToCanvas(x: number, y: number, state: LiveState, w: number, h: number): [number, number] {
  const px = ((x + state.boxWidth / 2) / state.boxWidth) * w;
  const py = h - ((y + state.boxHeight / 2) / state.boxHeight) * h;
  return [px, py];
}

function drawState(canvas: HTMLCanvasElement, state: LiveState, pointSize: number): void {
  syncCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#03060b';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(120, 170, 255, 0.10)';
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

  const [wl] = worldToCanvas(state.leftWall, 0, state, w, h);
  const [wr] = worldToCanvas(state.rightWall, 0, state, w, h);
  const [, yTop] = worldToCanvas(0, state.channelYMax, state, w, h);
  const [, yBottom] = worldToCanvas(0, state.channelYMin, state, w, h);
  drawMembraneWall(ctx, {
    leftX: wl,
    rightX: wr,
    height: h,
    dpr,
    channels: [{ top: yTop, bottom: yBottom }]
  });

  ctx.strokeStyle = 'rgba(120, 170, 255, 0.2)';
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(0.5 * dpr, 0.5 * dpr, w - dpr, h - dpr);

  ctx.fillStyle = SIM_COLORS.particle;
  const r = Math.max(0.8, pointSize) * dpr;
  for (let i = 0; i < state.numParticles; i += 1) {
    const [px, py] = worldToCanvas(state.x[i], state.y[i], state, w, h);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

}

function drawSideTrace(canvas: HTMLCanvasElement, trace: TraceHistory, currentTime: number, traceWindowMs: number, title: string): void {
  syncCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#03060b';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(120, 170, 255, 0.10)';
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

  const labelPadL = 52 * dpr;
  const labelPadB = 24 * dpr;
  const edgePad = 12 * dpr;
  const maxPlotW = Math.max(1, w - labelPadL - edgePad * 2);
  const maxPlotH = Math.max(1, h - labelPadB - edgePad * 2);
  const plotSize = Math.max(1, Math.min(maxPlotW, maxPlotH));
  const padL = labelPadL + (maxPlotW - plotSize) / 2 + edgePad;
  const padT = edgePad + (maxPlotH - plotSize) / 2;
  const plotW = plotSize;
  const plotH = plotSize;
  const startTime = Math.max(0, currentTime - traceWindowMs);
  const tRange = Math.max(traceWindowMs, 1);
  const xMap = (tt: number) => padL + ((tt - startTime) / tRange) * plotW;
  const yMap = (frac: number) => padT + (1 - frac) * plotH;

  ctx.strokeStyle = 'rgba(180, 220, 255, 0.28)';
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(padL, padT, plotW, plotH);

  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  ctx.fillStyle = 'rgba(208, 228, 255, 0.86)';
  ctx.font = `${10 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const tick of yTicks) {
    const y = yMap(tick);
    ctx.strokeStyle = tick === 0.5 ? 'rgba(180, 220, 255, 0.28)' : 'rgba(150, 190, 255, 0.16)';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.fillText(tick.toFixed(2), padL - 6 * dpr, y);
  }

  const series = [
    { data: trace.leftFrac, color: SIM_COLORS.outsideTrace },
    { data: trace.rightFrac, color: SIM_COLORS.insideTrace }
  ];
  for (const seriesEntry of series) {
    ctx.strokeStyle = seriesEntry.color;
    ctx.lineWidth = 1.8 * dpr;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < trace.times.length; i += 1) {
      if (trace.times[i] < startTime) continue;
      const px = xMap(trace.times[i]);
      const py = yMap(seriesEntry.data[i]);
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    if (started) ctx.stroke();
  }

  if (title.trim()) {
    ctx.fillStyle = 'rgba(232, 243, 255, 0.92)';
    ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  ctx.fillStyle = 'rgba(232, 243, 255, 0.78)';
  ctx.font = `${11 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.save();
  ctx.translate(20 * dpr, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('fraction of particles in compartment (left/right)', 0, 0);
  ctx.restore();
}

const app = getEl<HTMLDivElement>('#app');
app.innerHTML = `
  <div class="site-shell">
    <div class="nav-line">
      <a href="./index.html">Back to index</a>
      <span>•</span>
      <span>Page: <code>inspect_diffusion_permeability</code></span>
    </div>
    <header class="page-head">
      <p class="eyebrow">Electrochemical Signalling in Nerve Cells</p>
      <h1>Narrow vs Wide Pore Diffusion</h1>
      <ul class="key-points">
        <li>Pore width is a proxy for permeability.</li>
        <li>Wider pores allow faster cross-membrane particle flow.</li>
        <li>Permeability changes how quickly equilibrium is reached.</li>
      </ul>
    </header>

    <div class="sim-layout">
      <aside class="controls">
        <div class="panel">
          <div class="group">
            <p class="group-label">Basic Controls</p>
            <div class="button-row">
              <button id="toggle-play" class="primary">Pause</button>
              <button id="rerun">Rerun</button>
              <button id="reset-defaults" class="warn">Reset Defaults</button>
            </div>
            <div class="button-row">
              <button id="rewind">Rewind</button>
              <button id="random-seed">Randomize Seed</button>
            </div>
            <div class="control-grid">
              <div class="field"><label for="num-particles">Particles</label><input id="num-particles" type="number" min="1" max="5000" step="1" /></div>
              <div class="field"><label for="diffusion-sd">Diffusion SD</label><input id="diffusion-sd" type="number" min="0" max="20" step="0.05" /></div>
              <div class="field"><label for="narrow-channel-width">Narrow pore width</label><input id="narrow-channel-width" type="number" min="0.5" step="0.5" /></div>
              <div class="field"><label for="wide-channel-width">Wide pore width</label><input id="wide-channel-width" type="number" min="0.5" step="0.5" /></div>
              <div class="field"><label for="playback-speed">Playback speed</label><input id="playback-speed" type="number" min="0.1" max="8" step="0.1" /></div>
              <div class="field"><label for="seed">Seed</label><input id="seed" type="number" min="0" max="4294967295" step="1" /></div>
            </div>
          </div>
          <details>
            <summary>Advanced Controls</summary>
            <div class="group" style="margin-top: 8px;">
              <div class="control-grid">
                <div class="field"><label for="total-time">Trace window T (ms)</label><input id="total-time" type="number" min="100" max="20000" step="10" /></div>
                <div class="field"><label for="dt">dt (ms)</label><input id="dt" type="number" min="0.05" max="20" step="0.05" /></div>
                <div class="field"><label for="box-width">Box width</label><input id="box-width" type="number" min="20" max="500" step="1" /></div>
                <div class="field"><label for="box-height">Box height</label><input id="box-height" type="number" min="20" max="500" step="1" /></div>
                <div class="field"><label for="wall-thickness">Wall thickness</label><input id="wall-thickness" type="number" min="0.5" max="50" step="0.5" /></div>
                <div class="field"><label for="point-size">Point size</label><input id="point-size" type="number" min="0.5" max="8" step="0.25" /></div>
                <div class="field"><label for="target-fps">Playback FPS</label><input id="target-fps" type="number" min="1" max="120" step="1" /></div>
              </div>
            </div>
          </details>
          <div class="group">
            <p class="group-label">Status</p>
            <dl class="status-list">
              <dt>Step</dt><dd id="status-frame">0</dd>
              <dt>Time (ms)</dt><dd id="status-time">0.0</dd>
              <dt>Narrow Right</dt><dd id="status-narrow-right">0</dd>
              <dt>Wide Right</dt><dd id="status-wide-right">0</dd>
              <dt>Narrow Left</dt><dd id="status-narrow-left">0</dd>
              <dt>Wide Left</dt><dd id="status-wide-left">0</dd>
              <dt>dt</dt><dd id="status-dt">0</dd>
              <dt>Step SD</dt><dd id="status-step-sd">0</dd>
              <dt>Seed</dt><dd id="status-seed">0</dd>
              <dt>Trace Samples</dt><dd id="status-frames">0</dd>
            </dl>
          </div>
          <div class="group">
            <p class="group-label">Equation + Comparison Logic</p>
            <div class="equation-card">
              <pre class="equation" id="equation-block"></pre>
              <p>
                Both panels use the same diffusion and the same random seed. The only difference is the centered pore width,
                so the comparison isolates permeability as a geometric property of the membrane.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <section class="panel canvas-panel">
        <div class="canvas-grid-2">
          <div class="canvas-column">
            <div class="canvas-subpanel">
              <canvas id="narrow-canvas" class="square-canvas" aria-label="Narrow pore diffusion comparison"></canvas>
            </div>
            <div class="canvas-subpanel">
              <canvas id="wide-canvas" class="square-canvas" aria-label="Wide pore diffusion comparison"></canvas>
            </div>
          </div>
          <div class="canvas-column">
            <div class="canvas-subpanel">
              <canvas id="narrow-trace-canvas" class="trace-canvas square-canvas"></canvas>
            </div>
            <div class="canvas-subpanel">
              <canvas id="wide-trace-canvas" class="trace-canvas square-canvas"></canvas>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
`;

const narrowCanvas = getEl<HTMLCanvasElement>('#narrow-canvas');
const wideCanvas = getEl<HTMLCanvasElement>('#wide-canvas');
const narrowTraceCanvas = getEl<HTMLCanvasElement>('#narrow-trace-canvas');
const wideTraceCanvas = getEl<HTMLCanvasElement>('#wide-trace-canvas');
const equationBlock = getEl<HTMLElement>('#equation-block');

const inputs = {
  numParticles: getEl<HTMLInputElement>('#num-particles'),
  diffusionSd: getEl<HTMLInputElement>('#diffusion-sd'),
  narrowChannelWidth: getEl<HTMLInputElement>('#narrow-channel-width'),
  wideChannelWidth: getEl<HTMLInputElement>('#wide-channel-width'),
  playbackSpeed: getEl<HTMLInputElement>('#playback-speed'),
  seed: getEl<HTMLInputElement>('#seed'),
  totalTime: getEl<HTMLInputElement>('#total-time'),
  dt: getEl<HTMLInputElement>('#dt'),
  boxWidth: getEl<HTMLInputElement>('#box-width'),
  boxHeight: getEl<HTMLInputElement>('#box-height'),
  wallThickness: getEl<HTMLInputElement>('#wall-thickness'),
  pointSize: getEl<HTMLInputElement>('#point-size'),
  targetFps: getEl<HTMLInputElement>('#target-fps')
};

const statusEls = {
  frame: getEl<HTMLElement>('#status-frame'),
  time: getEl<HTMLElement>('#status-time'),
  narrowLeft: getEl<HTMLElement>('#status-narrow-left'),
  narrowRight: getEl<HTMLElement>('#status-narrow-right'),
  wideLeft: getEl<HTMLElement>('#status-wide-left'),
  wideRight: getEl<HTMLElement>('#status-wide-right'),
  dt: getEl<HTMLElement>('#status-dt'),
  stepSd: getEl<HTMLElement>('#status-step-sd'),
  seed: getEl<HTMLElement>('#status-seed'),
  frames: getEl<HTMLElement>('#status-frames')
};

const buttons = {
  togglePlay: getEl<HTMLButtonElement>('#toggle-play'),
  rerun: getEl<HTMLButtonElement>('#rerun'),
  resetDefaults: getEl<HTMLButtonElement>('#reset-defaults'),
  rewind: getEl<HTMLButtonElement>('#rewind'),
  randomSeed: getEl<HTMLButtonElement>('#random-seed')
};

let simParams: SimParams = { ...defaultSim };
let displayParams: DisplayParams = { ...defaultDisplay };
let currentSeed = randomSeed();
let narrowRng = new Rng(currentSeed);
let wideRng = new Rng(currentSeed);
let narrowState = createState({ dt: defaultSim.dt, numParticles: defaultSim.numParticles, boxWidth: defaultSim.boxWidth, boxHeight: defaultSim.boxHeight, wallThickness: defaultSim.wallThickness, channelWidth: defaultSim.narrowChannelWidth }, currentSeed);
let wideState = createState({ dt: defaultSim.dt, numParticles: defaultSim.numParticles, boxWidth: defaultSim.boxWidth, boxHeight: defaultSim.boxHeight, wallThickness: defaultSim.wallThickness, channelWidth: defaultSim.wideChannelWidth }, currentSeed);
let narrowTrace = createTraceHistory(narrowState, simParams.T);
let wideTrace = createTraceHistory(wideState, simParams.T);
let isPlaying = true;
let lastTs = performance.now();
let stepAccumulator = 0;

function writeInputs(): void {
  setNumberInput(inputs.numParticles, simParams.numParticles, 0);
  setNumberInput(inputs.diffusionSd, simParams.diffusionSd, 3);
  setNumberInput(inputs.narrowChannelWidth, simParams.narrowChannelWidth, 2);
  setNumberInput(inputs.wideChannelWidth, simParams.wideChannelWidth, 2);
  setNumberInput(inputs.playbackSpeed, displayParams.playbackSpeed, 2);
  setNumberInput(inputs.seed, currentSeed, 0);
  setNumberInput(inputs.totalTime, simParams.T, 0);
  setNumberInput(inputs.dt, simParams.dt, 3);
  setNumberInput(inputs.boxWidth, simParams.boxWidth, 1);
  setNumberInput(inputs.boxHeight, simParams.boxHeight, 1);
  setNumberInput(inputs.wallThickness, simParams.wallThickness, 2);
  setNumberInput(inputs.pointSize, displayParams.pointSize, 2);
  setNumberInput(inputs.targetFps, displayParams.targetFps, 0);
}

function readSimInputs(): SimParams {
  const boxHeight = clamp(Number(inputs.boxHeight.value) || defaultSim.boxHeight, 20, 500);
  return normalizeSimParams({
    T: clamp(Number(inputs.totalTime.value) || defaultSim.T, 100, 20000),
    dt: clamp(Number(inputs.dt.value) || defaultSim.dt, 0.05, 20),
    numParticles: clamp(Math.round(Number(inputs.numParticles.value) || defaultSim.numParticles), 1, MAX_PARTICLES),
    boxWidth: clamp(Number(inputs.boxWidth.value) || defaultSim.boxWidth, 20, 500),
    boxHeight,
    wallThickness: clamp(Number(inputs.wallThickness.value) || defaultSim.wallThickness, 0.5, 50),
    diffusionSd: clamp(Number(inputs.diffusionSd.value) || defaultSim.diffusionSd, 0, 20),
    narrowChannelWidth: clamp(Number(inputs.narrowChannelWidth.value) || defaultSim.narrowChannelWidth, 0.5, boxHeight - 2),
    wideChannelWidth: clamp(Number(inputs.wideChannelWidth.value) || defaultSim.wideChannelWidth, 0.5, boxHeight - 2)
  });
}

function readDisplayInputs(): DisplayParams {
  return {
    pointSize: clamp(Number(inputs.pointSize.value) || defaultDisplay.pointSize, 0.5, 8),
    playbackSpeed: clamp(Number(inputs.playbackSpeed.value) || defaultDisplay.playbackSpeed, 0.1, 8),
    targetFps: clamp(Math.round(Number(inputs.targetFps.value) || defaultDisplay.targetFps), 1, 120)
  };
}

function rebuildFromInputs(): void {
  simParams = readSimInputs();
  displayParams = readDisplayInputs();
  currentSeed = clamp(Math.floor(Number(inputs.seed.value) || currentSeed), 0, 0xffffffff) >>> 0;
  narrowRng = new Rng(currentSeed);
  wideRng = new Rng(currentSeed);
  narrowState = createState({ dt: simParams.dt, numParticles: simParams.numParticles, boxWidth: simParams.boxWidth, boxHeight: simParams.boxHeight, wallThickness: simParams.wallThickness, channelWidth: simParams.narrowChannelWidth }, currentSeed);
  wideState = createState({ dt: simParams.dt, numParticles: simParams.numParticles, boxWidth: simParams.boxWidth, boxHeight: simParams.boxHeight, wallThickness: simParams.wallThickness, channelWidth: simParams.wideChannelWidth }, currentSeed);
  narrowTrace = createTraceHistory(narrowState, simParams.T);
  wideTrace = createTraceHistory(wideState, simParams.T);
  stepAccumulator = 0;
  writeInputs();
  updateEquationText();
  updateWidthLabels();
}

function applyLiveSimParams(): void {
  const next = readSimInputs();
  const nextSeed = clamp(Math.floor(Number(inputs.seed.value) || currentSeed), 0, 0xffffffff) >>> 0;
  if (nextSeed !== currentSeed) {
    currentSeed = nextSeed;
    narrowRng = new Rng(currentSeed);
    wideRng = new Rng(currentSeed);
  }
  simParams = next;
  narrowState = resizeState(narrowState, simParams.numParticles, narrowRng);
  wideState = resizeState(wideState, simParams.numParticles, wideRng);
  for (const state of [narrowState, wideState]) {
    state.dt = simParams.dt;
    state.boxWidth = simParams.boxWidth;
    state.boxHeight = simParams.boxHeight;
    state.leftWall = -simParams.wallThickness / 2;
    state.rightWall = simParams.wallThickness / 2;
  }
  [narrowState.channelYMin, narrowState.channelYMax] = centeredChannelBounds(simParams.narrowChannelWidth, simParams.boxHeight);
  [wideState.channelYMin, wideState.channelYMax] = centeredChannelBounds(simParams.wideChannelWidth, simParams.boxHeight);
  enforceGeometry(narrowState);
  enforceGeometry(wideState);
  trimTrace(narrowTrace, narrowState.simTime, simParams.T);
  trimTrace(wideTrace, wideState.simTime, simParams.T);
  writeInputs();
  updateEquationText();
  updateWidthLabels();
}

function refreshDisplayFromInputs(): void {
  displayParams = readDisplayInputs();
  writeInputs();
}

function updateWidthLabels(): void {
}

function updateEquationText(): void {
  const stepSd = simParams.diffusionSd * simParams.dt;
  equationBlock.innerHTML = [
    '<span class="accent">Shared live diffusion update (both panels)</span>',
    'x_new = reflect(x_old + dxdt · dt, -W/2, W/2)',
    'y_new = reflect(y_old + dydt · dt, -H/2, H/2)',
    'dxdt, dydt ~ Normal(0, diffusionSd²)',
    '',
    '<span class="accent-2">Different only in pore width</span>',
    'Narrow pore: wall crossing is allowed only inside the centered narrow pore',
    'Wide pore: wall crossing is allowed only inside the centered wide pore',
    'Outside the pore opening, x reflects at the membrane boundary',
    '',
    `Per-step displacement SD = diffusionSd × dt = ${stepSd.toFixed(3)}`,
    `Pore widths: narrow = ${simParams.narrowChannelWidth.toFixed(1)}, wide = ${simParams.wideChannelWidth.toFixed(1)}`,
    `Trace window T = ${simParams.T.toFixed(0)} ms`
  ].join('\n');
}

function updateStatus(): void {
  statusEls.frame.textContent = `${narrowState.stepCount}`;
  statusEls.time.textContent = narrowState.simTime.toFixed(1);
  statusEls.narrowLeft.textContent = `${narrowState.leftCount}`;
  statusEls.narrowRight.textContent = `${narrowState.rightCount}`;
  statusEls.wideLeft.textContent = `${wideState.leftCount}`;
  statusEls.wideRight.textContent = `${wideState.rightCount}`;
  statusEls.dt.textContent = narrowState.dt.toFixed(2);
  statusEls.stepSd.textContent = (simParams.diffusionSd * simParams.dt).toFixed(3);
  statusEls.seed.textContent = `${currentSeed >>> 0}`;
  statusEls.frames.textContent = `${Math.min(narrowTrace.times.length, wideTrace.times.length)}`;
}

function drawCurrent(): void {
  drawState(narrowCanvas, narrowState, displayParams.pointSize);
  drawState(wideCanvas, wideState, displayParams.pointSize);
  drawSideTrace(narrowTraceCanvas, narrowTrace, narrowState.simTime, simParams.T, '');
  drawSideTrace(wideTraceCanvas, wideTrace, wideState.simTime, simParams.T, '');
}

function render(): void {
  updateStatus();
  drawCurrent();
}

function setPlaying(next: boolean): void {
  isPlaying = next;
  buttons.togglePlay.textContent = isPlaying ? 'Pause' : 'Play';
}

writeInputs();
updateWidthLabels();
updateEquationText();
render();

buttons.togglePlay.addEventListener('click', () => setPlaying(!isPlaying));
buttons.rerun.addEventListener('click', () => {
  rebuildFromInputs();
  setPlaying(true);
  render();
});
buttons.rewind.addEventListener('click', () => {
  rebuildFromInputs();
  render();
});
buttons.randomSeed.addEventListener('click', () => {
  currentSeed = randomSeed();
  setNumberInput(inputs.seed, currentSeed, 0);
  rebuildFromInputs();
  setPlaying(true);
  render();
});
buttons.resetDefaults.addEventListener('click', () => {
  simParams = { ...defaultSim };
  displayParams = { ...defaultDisplay };
  currentSeed = randomSeed();
  writeInputs();
  rebuildFromInputs();
  setPlaying(true);
  render();
});

for (const input of [
  inputs.numParticles,
  inputs.diffusionSd,
  inputs.narrowChannelWidth,
  inputs.wideChannelWidth,
  inputs.seed,
  inputs.totalTime,
  inputs.dt,
  inputs.boxWidth,
  inputs.boxHeight,
  inputs.wallThickness
] as const) {
  input.addEventListener('change', () => {
    applyLiveSimParams();
    render();
  });
}

for (const input of [inputs.playbackSpeed, inputs.pointSize, inputs.targetFps] as const) {
  input.addEventListener('change', () => {
    refreshDisplayFromInputs();
    render();
  });
}

window.addEventListener('resize', () => render());

function animate(ts: number): void {
  const dtSec = Math.max(0, (ts - lastTs) / 1000);
  lastTs = ts;
  if (isPlaying) {
    stepAccumulator += dtSec * displayParams.targetFps * displayParams.playbackSpeed;
    const stepsToRun = Math.min(120, Math.floor(stepAccumulator));
    if (stepsToRun > 0) {
      stepAccumulator -= stepsToRun;
      for (let i = 0; i < stepsToRun; i += 1) {
        stepState(narrowState, simParams.diffusionSd, narrowRng);
        stepState(wideState, simParams.diffusionSd, wideRng);
        pushTracePoint(narrowTrace, narrowState, simParams.T);
        pushTracePoint(wideTrace, wideState, simParams.T);
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
