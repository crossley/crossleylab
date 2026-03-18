import '../style.css';
import {
  DEFAULT_DIFFUSION_SD,
  DEFAULT_NUM_PARTICLES,
  MAX_PARTICLES,
  SIM_COLORS,
  getCanvasColors,
} from './sim_shared';

interface SimParams {
  T: number;
  dt: number;
  numParticles: number;
  diffusionSd: number;
  initClusterSd: number;
}

interface DisplayParams {
  axisLimit: number;
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
  numParticles: DEFAULT_NUM_PARTICLES,
  diffusionSd: DEFAULT_DIFFUSION_SD,
  initClusterSd: 0.1
};

const defaultDisplay: DisplayParams = {
  axisLimit: 50,
  pointSize: 2.5,
  playbackSpeed: 1,
  targetFps: 30
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

function createState(params: SimParams, seed: number): LiveState {
  const dt = clamp(params.dt, 0.05, 20);
  const numParticles = clamp(Math.round(params.numParticles), 1, MAX_PARTICLES);
  const initClusterSd = clamp(params.initClusterSd, 0, 20);
  const rng = new Rng(seed);
  const x = new Float32Array(numParticles);
  const y = new Float32Array(numParticles);
  for (let i = 0; i < numParticles; i += 1) {
    x[i] = rng.normal(0, initClusterSd);
    y[i] = rng.normal(0, initClusterSd);
  }
  return { x, y, numParticles, dt, simTime: 0, stepCount: 0 };
}

function resizeState(state: LiveState, nextCount: number, rng: Rng, initClusterSd: number): LiveState {
  if (nextCount === state.numParticles) return state;
  const x = new Float32Array(nextCount);
  const y = new Float32Array(nextCount);
  const keep = Math.min(state.numParticles, nextCount);
  x.set(state.x.subarray(0, keep));
  y.set(state.y.subarray(0, keep));
  for (let i = keep; i < nextCount; i += 1) {
    x[i] = rng.normal(0, initClusterSd);
    y[i] = rng.normal(0, initClusterSd);
  }
  return { ...state, x, y, numParticles: nextCount };
}

function enforceChamberBounds(state: LiveState, axisLimit: number): void {
  const chamberHalfExtent = Math.max(1, axisLimit);
  for (let i = 0; i < state.numParticles; i += 1) {
    state.x[i] = reflectIntoBounds(state.x[i], -chamberHalfExtent, chamberHalfExtent);
    state.y[i] = reflectIntoBounds(state.y[i], -chamberHalfExtent, chamberHalfExtent);
  }
}

function stepState(state: LiveState, params: SimParams, display: DisplayParams, rng: Rng): void {
  const chamberHalfExtent = Math.max(1, display.axisLimit);
  for (let i = 0; i < state.numParticles; i += 1) {
    state.x[i] = reflectIntoBounds(
      state.x[i] + rng.normal(0, params.diffusionSd) * state.dt,
      -chamberHalfExtent,
      chamberHalfExtent
    );
    state.y[i] = reflectIntoBounds(
      state.y[i] + rng.normal(0, params.diffusionSd) * state.dt,
      -chamberHalfExtent,
      chamberHalfExtent
    );
  }
  state.stepCount += 1;
  state.simTime = state.stepCount * state.dt;
}

function syncCanvasSize(canvas: HTMLCanvasElement): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function drawFrame(canvas: HTMLCanvasElement, state: LiveState, display: DisplayParams): void {
  const cc = getCanvasColors();
  syncCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const dpr = window.devicePixelRatio || 1;
  const axis = Math.max(1, display.axisLimit);
  const halfW = width / 2;
  const halfH = height / 2;
  const sx = width / (2 * axis);
  const sy = height / (2 * axis);

  ctx.strokeStyle = cc.gridA;
  ctx.lineWidth = 1;
  const gridStep = axis >= 80 ? 20 : axis >= 40 ? 10 : 5;
  for (let g = -Math.floor(axis / gridStep) * gridStep; g <= axis; g += gridStep) {
    const x = halfW + g * sx;
    const y = halfH - g * sy;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = cc.gridB;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(halfW, 0);
  ctx.lineTo(halfW, height);
  ctx.moveTo(0, halfH);
  ctx.lineTo(width, halfH);
  ctx.stroke();

  ctx.strokeStyle = cc.gridC;
  ctx.lineWidth = 1.25 * dpr;
  ctx.strokeRect(0.75 * dpr, 0.75 * dpr, width - 1.5 * dpr, height - 1.5 * dpr);

  const radius = Math.max(0.8, display.pointSize) * dpr;
  ctx.fillStyle = SIM_COLORS.particle;
  for (let i = 0; i < state.numParticles; i += 1) {
    const x = halfW + state.x[i] * sx;
    const y = halfH - state.y[i] * sy;
    if (x < -radius || x > width + radius || y < -radius || y > height + radius) continue;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = cc.ink;
  ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
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
      <p class="eyebrow">Electrochemical Signalling in Nerve Cells</p>
      <h1>Free Diffusion</h1>
      <p class="teaching-label">Key concepts</p>
      <ul class="key-points">
        <li>Particles undergo continuous random motion from thermal collisions — this is Brownian motion.</li>
        <li>Individual particle paths are unpredictable; the overall distribution is not.</li>
        <li>Over time, the distribution becomes uniform — this is diffusion.</li>
      </ul>
      <p class="teaching-label questions">Questions to explore</p>
      <ul class="guided-questions">
        <li>What happens to the spreading rate when you increase Diffusion SD?</li>
        <li>Does increasing the number of particles change the final distribution?</li>
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
              <div class="field"><label for="num-particles">Particles</label><input id="num-particles" type="number" min="1" max="5000" step="1" /></div>
              <div class="field"><label for="diffusion-sd">Diffusion SD</label><input id="diffusion-sd" type="number" min="0" max="20" step="0.05" /></div>
              <div class="field"><label for="playback-speed">Playback speed</label><input id="playback-speed" type="number" min="0.1" max="8" step="0.1" /></div>
            </div>
          </div>

        </div>
      </aside>

      <section class="panel canvas-panel">
        <canvas id="sim-canvas" aria-label="2D diffusion particle simulation"></canvas>
      </section>
    </div>
  </div>
`;

const canvas = getEl<HTMLCanvasElement>('#sim-canvas');

const inputs = {
  numParticles: getEl<HTMLInputElement>('#num-particles'),
  diffusionSd: getEl<HTMLInputElement>('#diffusion-sd'),
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
let isPlaying = true;
let lastAnimationTs = performance.now();
let stepAccumulator = 0;

function writeInputs(): void {
  setNumberInput(inputs.numParticles, simParams.numParticles, 0);
  setNumberInput(inputs.diffusionSd, simParams.diffusionSd, 3);
  setNumberInput(inputs.playbackSpeed, displayParams.playbackSpeed, 2);
}

function readInputsForSimulation(): SimParams {
  return {
    T: defaultSim.T,
    dt: defaultSim.dt,
    numParticles: clamp(Math.round(Number(inputs.numParticles.value) || defaultSim.numParticles), 1, MAX_PARTICLES),
    diffusionSd: clamp(Number(inputs.diffusionSd.value) || 0, 0, 20),
    initClusterSd: defaultSim.initClusterSd
  };
}

function readInputsForDisplay(): DisplayParams {
  return {
    axisLimit: defaultDisplay.axisLimit,
    pointSize: defaultDisplay.pointSize,
    playbackSpeed: clamp(Number(inputs.playbackSpeed.value) || defaultDisplay.playbackSpeed, 0.1, 8),
    targetFps: defaultDisplay.targetFps
  };
}

function rebuildFromInputs(): void {
  simParams = readInputsForSimulation();
  displayParams = readInputsForDisplay();
  rng = new Rng(currentSeed);
  state = createState(simParams, currentSeed);
  stepAccumulator = 0;
  writeInputs();
}

function applyLiveSimParams(): void {
  simParams = readInputsForSimulation();
  state = resizeState(state, simParams.numParticles, rng, simParams.initClusterSd);
  state.dt = simParams.dt;
  writeInputs();
}

function refreshDisplayFromInputs(): void {
  displayParams = readInputsForDisplay();
  enforceChamberBounds(state, displayParams.axisLimit);
  writeInputs();
}

function setPlaying(next: boolean): void {
  isPlaying = next;
  buttons.togglePlay.textContent = isPlaying ? 'Pause' : 'Play';
}

function render(): void {
  drawFrame(canvas, state, displayParams);
}

writeInputs();
render();

buttons.togglePlay.addEventListener('click', () => setPlaying(!isPlaying));
buttons.rerun.addEventListener('click', () => {
  currentSeed = randomSeed();
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

for (const key of ['numParticles', 'diffusionSd'] as const) {
  inputs[key].addEventListener('change', () => {
    applyLiveSimParams();
    render();
  });
}

inputs.playbackSpeed.addEventListener('change', () => {
  refreshDisplayFromInputs();
  render();
});

window.addEventListener('resize', () => render());

getEl<HTMLButtonElement>('#theme-toggle').addEventListener('click', () => {
  const isLight = document.documentElement.classList.toggle('light');
  getEl<HTMLButtonElement>('#theme-toggle').textContent = isLight ? '☽' : '☀';
});

function animate(now: number): void {
  const dtSec = Math.max(0, (now - lastAnimationTs) / 1000);
  lastAnimationTs = now;
  if (isPlaying) {
    stepAccumulator += dtSec * displayParams.targetFps * displayParams.playbackSpeed;
    const stepsToRun = Math.min(120, Math.floor(stepAccumulator));
    if (stepsToRun > 0) {
      stepAccumulator -= stepsToRun;
      for (let i = 0; i < stepsToRun; i += 1) {
        stepState(state, simParams, displayParams, rng);
      }
    }
  }
  render();
  requestAnimationFrame(animate);
}

requestAnimationFrame((ts) => {
  lastAnimationTs = ts;
  animate(ts);
});
