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
  channelWidth: number;
  diffusionSd: number;
}

interface DisplayParams {
  pointSize: number;
  playbackSpeed: number;
  targetFps: number;
}

interface LiveSimState {
  x: Float32Array;
  y: Float32Array;
  numParticles: number;
  dt: number;
  simTime: number;
  stepCount: number;
  leftWall: number;
  rightWall: number;
  boxWidth: number;
  boxHeight: number;
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

  normal(mean = 0, sd = 1): number {
    if (this.spare !== null) {
      const v = this.spare;
      this.spare = null;
      return mean + sd * v;
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

  uniform(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
}

const defaultSim: SimParams = {
  T: 1000,
  dt: 1,
  numParticles: DEFAULT_NUM_PARTICLES,
  boxWidth: 100,
  boxHeight: 60,
  wallThickness: 4,
  channelWidth: 10,
  diffusionSd: DEFAULT_DIFFUSION_SD
};

const defaultDisplay: DisplayParams = {
  pointSize: 2.5,
  playbackSpeed: 1,
  targetFps: 30
};

const TRACE_HISTORY_MAX_POINTS = 4000;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
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
  if (Number.isInteger(value)) {
    input.value = String(value);
    return;
  }
  input.value = Number(value.toFixed(digits)).toString();
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
    channelWidth: clamp(params.channelWidth, 0.5, boxHeight - 2),
    diffusionSd: clamp(params.diffusionSd, 0, 20)
  };
}

function countSides(state: LiveSimState): { left: number; right: number } {
  let left = 0;
  let right = 0;
  for (let i = 0; i < state.numParticles; i += 1) {
    const x = state.x[i];
    if (x < state.leftWall) left += 1;
    else if (x > state.rightWall) right += 1;
  }
  return { left, right };
}

function createState(params: SimParams, seed: number): LiveSimState {
  const normalized = normalizeSimParams(params);
  const rng = new Rng(seed);
  const [channelYMin, channelYMax] = centeredChannelBounds(normalized.channelWidth, normalized.boxHeight);
  const leftWall = -normalized.wallThickness / 2;
  const rightWall = normalized.wallThickness / 2;
  const x = new Float32Array(normalized.numParticles);
  const y = new Float32Array(normalized.numParticles);

  for (let i = 0; i < normalized.numParticles; i += 1) {
    x[i] = rng.uniform(-normalized.boxWidth / 2 + 1, leftWall - 1);
    y[i] = rng.uniform(-normalized.boxHeight / 2 + 1, normalized.boxHeight / 2 - 1);
  }

  const state: LiveSimState = {
    x,
    y,
    numParticles: normalized.numParticles,
    dt: normalized.dt,
    simTime: 0,
    stepCount: 0,
    leftWall,
    rightWall,
    boxWidth: normalized.boxWidth,
    boxHeight: normalized.boxHeight,
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

function resizeState(state: LiveSimState, nextCount: number, rng: Rng): LiveSimState {
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

function enforceGeometry(state: LiveSimState): void {
  const halfW = state.boxWidth / 2;
  const halfH = state.boxHeight / 2;
  for (let i = 0; i < state.numParticles; i += 1) {
    state.x[i] = reflectIntoBounds(state.x[i], -halfW, halfW);
    state.y[i] = reflectIntoBounds(state.y[i], -halfH, halfH);
    const inWall = state.x[i] > state.leftWall && state.x[i] < state.rightWall;
    const inChannel = state.y[i] >= state.channelYMin && state.y[i] <= state.channelYMax;
    if (inWall && !inChannel) {
      state.x[i] = state.x[i] < 0 ? state.leftWall : state.rightWall;
    }
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

function stepState(state: LiveSimState, params: SimParams, rng: Rng): void {
  const halfW = state.boxWidth / 2;
  const halfH = state.boxHeight / 2;
  for (let i = 0; i < state.numParticles; i += 1) {
    const xPrev = state.x[i];
    const yPrev = state.y[i];
    const dxdt = rng.normal(0, params.diffusionSd);
    const dydt = rng.normal(0, params.diffusionSd);

    const xTrial = reflectIntoBounds(xPrev + dxdt * state.dt, -halfW, halfW);
    const yNew = reflectIntoBounds(yPrev + dydt * state.dt, -halfH, halfH);
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

function pushTracePoint(trace: TraceHistory, state: LiveSimState, traceWindowMs: number): void {
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

function createTraceHistory(state: LiveSimState, traceWindowMs: number): TraceHistory {
  const trace: TraceHistory = { times: [], leftFrac: [], rightFrac: [] };
  pushTracePoint(trace, state, traceWindowMs);
  return trace;
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

function worldToCanvas(x: number, y: number, state: LiveSimState, width: number, height: number): [number, number] {
  const px = ((x + state.boxWidth / 2) / state.boxWidth) * width;
  const py = height - ((y + state.boxHeight / 2) / state.boxHeight) * height;
  return [px, py];
}

function drawFrame(canvas: HTMLCanvasElement, state: LiveSimState, display: DisplayParams): void {
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
    const x = (w * i) / 10;
    const y = (h * i) / 10;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const [wallLeftPx] = worldToCanvas(state.leftWall, 0, state, w, h);
  const [wallRightPx] = worldToCanvas(state.rightWall, 0, state, w, h);
  const [, channelTopPx] = worldToCanvas(0, state.channelYMax, state, w, h);
  const [, channelBottomPx] = worldToCanvas(0, state.channelYMin, state, w, h);
  drawMembraneWall(ctx, {
    leftX: wallLeftPx,
    rightX: wallRightPx,
    height: h,
    dpr,
    channels: [{ top: channelTopPx, bottom: channelBottomPx }]
  });

  ctx.strokeStyle = 'rgba(120, 170, 255, 0.2)';
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(0.5 * dpr, 0.5 * dpr, w - dpr, h - dpr);

  const r = Math.max(0.8, display.pointSize) * dpr;
  ctx.fillStyle = SIM_COLORS.particle;
  for (let i = 0; i < state.numParticles; i += 1) {
    const [px, py] = worldToCanvas(state.x[i], state.y[i], state, w, h);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

}

function drawSideTrace(
  canvas: HTMLCanvasElement,
  trace: TraceHistory,
  currentTime: number,
  traceWindowMs: number,
  title: string
): void {
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

  const padL = 62 * dpr;
  const padR = 12 * dpr;
  const padT = 18 * dpr;
  const padB = 22 * dpr;
  const plotW = Math.max(1, w - padL - padR);
  const plotH = Math.max(1, h - padT - padB);
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
  for (const s of series) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.8 * dpr;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < trace.times.length; i += 1) {
      if (trace.times[i] < startTime) continue;
      const px = xMap(trace.times[i]);
      const py = yMap(s.data[i]);
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
      <span>Page: <code>inspect_diffusion_pore</code></span>
    </div>

    <header class="page-head">
      <p class="eyebrow">Electrochemical Signalling in Nerve Cells</p>
      <h1>Diffusion Through a Membrane Pore</h1>
      <ul class="key-points">
        <li>A concentration gradient is a difference in particle distribution, not a force.</li>
        <li>Diffusion causes net movement from high to low concentration.</li>
        <li>The membrane blocks crossing except at the pore.</li>
        <li>Try different Diffusion SD values and observe how quickly equilibrium is approached.</li>
        <li>Change channel width and compare how it alters the time to equilibrium.</li>
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
              <div class="field"><label for="channel-width">Channel width</label><input id="channel-width" type="number" min="0.5" step="0.5" /></div>
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
              <dt>Particles Left</dt><dd id="status-left">0</dd>
              <dt>Particles Right</dt><dd id="status-right">0</dd>
              <dt>dt</dt><dd id="status-dt">0</dd>
              <dt>Step SD (x/y)</dt><dd id="status-step-sd">0</dd>
              <dt>Seed</dt><dd id="status-seed">0</dd>
              <dt>Trace Samples</dt><dd id="status-frames">0</dd>
            </dl>
          </div>

          <div class="group">
            <p class="group-label">Equation + Rule</p>
            <div class="equation-card">
              <pre class="equation" id="equation-block"></pre>
              <p>
                <code>diffusionSd</code> sets the SD of the sampled rate terms
                <code>dxdt</code>, <code>dydt</code>. The membrane/channel affects only whether the x-step is accepted.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <section class="panel canvas-panel diffusion-pore-panel">
        <div class="canvas-two-col">
          <div class="canvas-subpanel">
            <canvas id="sim-canvas" aria-label="Diffusion through membrane channel simulation"></canvas>
          </div>
          <div class="canvas-subpanel">
            <canvas id="trace-canvas" class="trace-canvas pore-trace-canvas" aria-label="Compartment fraction trace"></canvas>
          </div>
        </div>
      </section>
    </div>
  </div>
`;

const canvas = getEl<HTMLCanvasElement>('#sim-canvas');
const traceCanvas = getEl<HTMLCanvasElement>('#trace-canvas');

const inputs = {
  numParticles: getEl<HTMLInputElement>('#num-particles'),
  diffusionSd: getEl<HTMLInputElement>('#diffusion-sd'),
  channelWidth: getEl<HTMLInputElement>('#channel-width'),
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
  left: getEl<HTMLElement>('#status-left'),
  right: getEl<HTMLElement>('#status-right'),
  dt: getEl<HTMLElement>('#status-dt'),
  stepSd: getEl<HTMLElement>('#status-step-sd'),
  seed: getEl<HTMLElement>('#status-seed'),
  frames: getEl<HTMLElement>('#status-frames')
};

const equationBlock = getEl<HTMLElement>('#equation-block');

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
let rng = new Rng(currentSeed);
let state = createState(simParams, currentSeed);
let trace = createTraceHistory(state, simParams.T);
let isPlaying = true;
let lastTs = performance.now();
let stepAccumulator = 0;

function writeInputs(): void {
  setNumberInput(inputs.numParticles, simParams.numParticles, 0);
  setNumberInput(inputs.diffusionSd, simParams.diffusionSd, 3);
  setNumberInput(inputs.channelWidth, simParams.channelWidth, 2);
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
    channelWidth: clamp(Number(inputs.channelWidth.value) || defaultSim.channelWidth, 0.5, boxHeight - 2),
    diffusionSd: clamp(Number(inputs.diffusionSd.value) || 0, 0, 20)
  });
}

function readDisplayInputs(): DisplayParams {
  return {
    pointSize: clamp(Number(inputs.pointSize.value) || defaultDisplay.pointSize, 0.5, 8),
    playbackSpeed: clamp(Number(inputs.playbackSpeed.value) || defaultDisplay.playbackSpeed, 0.1, 8),
    targetFps: clamp(Math.round(Number(inputs.targetFps.value) || defaultDisplay.targetFps), 1, 120)
  };
}

function updateEquationText(): void {
  const sigma = simParams.diffusionSd;
  const dt = simParams.dt;
  const stepSd = sigma * dt;
  equationBlock.innerHTML = [
    '<span class="accent">Live diffusion update</span>',
    'x_new = reflect(x_old + dxdt · dt, -W/2, W/2)',
    'y_new = reflect(y_old + dydt · dt, -H/2, H/2)',
    'dxdt, dydt ~ Normal(0, diffusionSd²)',
    '',
    '<span class="accent-2">Membrane / channel crossing rule</span>',
    'Wall crossing is allowed only through the centered pore with width = channel_width.',
    'Outside that width, x reflects at the membrane boundary.',
    '',
    `Current: diffusionSd = ${sigma.toFixed(3)}, dt = ${dt.toFixed(3)}`,
    `Per-step displacement SD (before wall rule) = diffusionSd × dt = ${stepSd.toFixed(3)}`,
    `Trace window T = ${simParams.T.toFixed(0)} ms`
  ].join('\n');
}

function updateStatus(): void {
  statusEls.frame.textContent = `${state.stepCount}`;
  statusEls.time.textContent = state.simTime.toFixed(1);
  statusEls.left.textContent = `${state.leftCount}`;
  statusEls.right.textContent = `${state.rightCount}`;
  statusEls.dt.textContent = state.dt.toFixed(2);
  statusEls.stepSd.textContent = (simParams.diffusionSd * simParams.dt).toFixed(3);
  statusEls.seed.textContent = `${currentSeed >>> 0}`;
  statusEls.frames.textContent = `${trace.times.length}`;
}

function rebuildFromInputs(): void {
  simParams = readSimInputs();
  displayParams = readDisplayInputs();
  currentSeed = clamp(Math.floor(Number(inputs.seed.value) || currentSeed), 0, 0xffffffff) >>> 0;
  rng = new Rng(currentSeed);
  state = createState(simParams, currentSeed);
  trace = createTraceHistory(state, simParams.T);
  stepAccumulator = 0;
  writeInputs();
  updateEquationText();
}

function applyLiveSimParams(): void {
  const next = readSimInputs();
  const nextSeed = clamp(Math.floor(Number(inputs.seed.value) || currentSeed), 0, 0xffffffff) >>> 0;
  if (nextSeed !== currentSeed) {
    currentSeed = nextSeed;
    rng = new Rng(currentSeed);
  }
  simParams = next;
  state = resizeState(state, simParams.numParticles, rng);
  state.dt = simParams.dt;
  state.boxWidth = simParams.boxWidth;
  state.boxHeight = simParams.boxHeight;
  state.leftWall = -simParams.wallThickness / 2;
  state.rightWall = simParams.wallThickness / 2;
  [state.channelYMin, state.channelYMax] = centeredChannelBounds(simParams.channelWidth, simParams.boxHeight);
  enforceGeometry(state);
  trimTrace(trace, state.simTime, simParams.T);
  writeInputs();
  updateEquationText();
}

function refreshDisplayFromInputs(): void {
  displayParams = readDisplayInputs();
  writeInputs();
}

function setPlaying(next: boolean): void {
  isPlaying = next;
  buttons.togglePlay.textContent = isPlaying ? 'Pause' : 'Play';
}

function render(): void {
  updateStatus();
  drawFrame(canvas, state, displayParams);
  drawSideTrace(traceCanvas, trace, state.simTime, simParams.T, '');
}

writeInputs();
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

const simKeys: Array<keyof typeof inputs> = [
  'numParticles',
  'diffusionSd',
  'channelWidth',
  'seed',
  'totalTime',
  'dt',
  'boxWidth',
  'boxHeight',
  'wallThickness'
];
for (const key of simKeys) {
  inputs[key].addEventListener('change', () => {
    applyLiveSimParams();
    render();
  });
}

for (const key of ['playbackSpeed', 'pointSize', 'targetFps'] as const) {
  inputs[key].addEventListener('change', () => {
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
        stepState(state, simParams, rng);
        pushTracePoint(trace, state, simParams.T);
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
