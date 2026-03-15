import '../style.css';
import {
  DEFAULT_DIFFUSION_SD,
  DEFAULT_NUM_PARTICLES,
  MAX_PARTICLES,
  SIM_COLORS,
  fieldColor,
  pointFieldDrift
} from './sim_shared';

interface SimParams {
  T: number;
  dt: number;
  numParticles: number;
  diffusionSd: number;
  initClusterSd: number;
  source0Attraction: number;
  source1Attraction: number;
  source2Attraction: number;
  source3Attraction: number;
  fixedAnionX: number;
  fixedAnionY: number;
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
  fixedAnionX: number;
  fixedAnionY: number;
}

interface FieldSource {
  x: number;
  y: number;
  strength: number;
}

interface FieldSourcePosition {
  x: number;
  y: number;
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
  initClusterSd: 0.1,
  source0Attraction: 0.15,
  source1Attraction: 0.15,
  source2Attraction: 0.15,
  source3Attraction: 0.15,
  fixedAnionX: -20,
  fixedAnionY: 0
};

const defaultDisplay: DisplayParams = {
  axisLimit: 50,
  pointSize: 2.5,
  playbackSpeed: 1,
  targetFps: 30
};

const EXTRA_FIELD_SOURCES: readonly FieldSourcePosition[] = [
  { x: 20, y: 0 },
  { x: 0, y: 20 },
  { x: 0, y: -20 }
];

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
  return {
    x,
    y,
    numParticles,
    dt,
    simTime: 0,
    stepCount: 0,
    fixedAnionX: clamp(params.fixedAnionX, -500, 500),
    fixedAnionY: clamp(params.fixedAnionY, -500, 500)
  };
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

function getFieldSources(state: LiveState): FieldSource[] {
  return [
    { x: state.fixedAnionX, y: state.fixedAnionY, strength: -simParams.source0Attraction },
    { x: EXTRA_FIELD_SOURCES[0].x, y: EXTRA_FIELD_SOURCES[0].y, strength: -simParams.source1Attraction },
    { x: EXTRA_FIELD_SOURCES[1].x, y: EXTRA_FIELD_SOURCES[1].y, strength: -simParams.source2Attraction },
    { x: EXTRA_FIELD_SOURCES[2].x, y: EXTRA_FIELD_SOURCES[2].y, strength: -simParams.source3Attraction }
  ];
}

function stepState(state: LiveState, params: SimParams, display: DisplayParams, rng: Rng): void {
  const chamberHalfExtent = Math.max(1, display.axisLimit);
  const fieldSources = getFieldSources(state).map((source) => ({ ...source, strength: clamp(source.strength, -10, 10) }));
  for (let i = 0; i < state.numParticles; i += 1) {
    let driftX = 0;
    let driftY = 0;
    for (const source of fieldSources) {
      const dx = source.x - state.x[i];
      const dy = source.y - state.y[i];
      const [sourceDriftX, sourceDriftY] = pointFieldDrift(dx, dy, source.strength, 1);
      driftX += sourceDriftX;
      driftY += sourceDriftY;
    }
    state.x[i] = reflectIntoBounds(
      state.x[i] + (rng.normal(0, params.diffusionSd) + driftX) * state.dt,
      -chamberHalfExtent,
      chamberHalfExtent
    );
    state.y[i] = reflectIntoBounds(
      state.y[i] + (rng.normal(0, params.diffusionSd) + driftY) * state.dt,
      -chamberHalfExtent,
      chamberHalfExtent
    );
  }
  state.stepCount += 1;
  state.simTime = state.stepCount * state.dt;
}

function getExtent(state: LiveState): number {
  let maxAbs = 1;
  for (let i = 0; i < state.numParticles; i += 1) {
    maxAbs = Math.max(maxAbs, Math.abs(state.x[i]), Math.abs(state.y[i]));
  }
  return maxAbs;
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
  syncCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#03060b';
  ctx.fillRect(0, 0, width, height);

  const dpr = window.devicePixelRatio || 1;
  const axis = Math.max(1, display.axisLimit);
  const halfW = width / 2;
  const halfH = height / 2;
  const sx = width / (2 * axis);
  const sy = height / (2 * axis);

  ctx.strokeStyle = 'rgba(120, 170, 255, 0.12)';
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

  ctx.strokeStyle = 'rgba(180, 220, 255, 0.28)';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(halfW, 0);
  ctx.lineTo(halfW, height);
  ctx.moveTo(0, halfH);
  ctx.lineTo(width, halfH);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(214, 236, 255, 0.42)';
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

  for (const source of getFieldSources(state)) {
    ctx.fillStyle = fieldColor(source.strength);
    ctx.beginPath();
    ctx.arc(halfW + source.x * sx, halfH - source.y * sy, 4 * dpr, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(232, 243, 255, 0.92)';
}

const app = getEl<HTMLDivElement>('#app');
app.innerHTML = `
  <div class="site-shell">
    <div class="nav-line">
      <a href="./index.html">Back to index</a>
      <span>•</span>
      <span>Page: <code>inspect_emergent_field_attraction</code></span>
    </div>

    <header class="page-head">
      <p class="eyebrow">Point-Source Electrical Drift</p>
      <h1>Free Diffusion with Electrical Attraction</h1>
      <ul class="key-points">
        <li>Diffusion spreads particles; electrical drift attracts or repels them.</li>
        <li>Stronger field or weaker diffusion produces tighter clustering.</li>
        <li>Weaker field or stronger diffusion produces broader spread.</li>
        <li>At equilibrium, diffusion and electrical forces balance, producing a stable distribution.</li>
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
              <div class="field"><label for="source0-attraction">Electric strength 1 (+ attract, - repel)</label><input id="source0-attraction" type="number" min="-10" max="10" step="0.01" /></div>
              <div class="field"><label for="source1-attraction">Electric strength 2 (+ attract, - repel)</label><input id="source1-attraction" type="number" min="-10" max="10" step="0.01" /></div>
              <div class="field"><label for="source2-attraction">Electric strength 3 (+ attract, - repel)</label><input id="source2-attraction" type="number" min="-10" max="10" step="0.01" /></div>
              <div class="field"><label for="source3-attraction">Electric strength 4 (+ attract, - repel)</label><input id="source3-attraction" type="number" min="-10" max="10" step="0.01" /></div>
              <div class="field"><label for="playback-speed">Playback speed</label><input id="playback-speed" type="number" min="0.1" max="8" step="0.1" /></div>
              <div class="field"><label for="seed">Seed</label><input id="seed" type="number" min="0" max="4294967295" step="1" /></div>
            </div>
          </div>

          <details>
            <summary>Advanced Controls</summary>
            <div class="group" style="margin-top: 8px;">
              <div class="control-grid">
                <div class="field"><label for="total-time">Status window T (ms)</label><input id="total-time" type="number" min="100" max="20000" step="10" /></div>
                <div class="field"><label for="dt">dt (ms)</label><input id="dt" type="number" min="0.05" max="20" step="0.05" /></div>
                <div class="field"><label for="init-cluster-sd">Initial cluster SD</label><input id="init-cluster-sd" type="number" min="0" max="20" step="0.05" /></div>
                <div class="field"><label for="neg-x">Field source x</label><input id="neg-x" type="number" step="1" /></div>
                <div class="field"><label for="neg-y">Field source y</label><input id="neg-y" type="number" step="1" /></div>
                <div class="field"><label for="axis-limit">Axis limit (+/-)</label><input id="axis-limit" type="number" min="5" max="500" step="1" /></div>
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
              <dt>Particles</dt><dd id="status-particles">0</dd>
              <dt>dt</dt><dd id="status-dt">0</dd>
              <dt>Step SD (x/y)</dt><dd id="status-step-sd">0</dd>
              <dt>Cloud Extent</dt><dd id="status-extent">0</dd>
              <dt>Seed</dt><dd id="status-seed">0</dd>
            </dl>
          </div>

          <div class="group">
            <p class="group-label">Equation (Euler Update)</p>
            <div class="equation-card">
              <pre class="equation" id="equation-block"></pre>
              <p>
                <code>diffusionSd</code> controls the sampled Brownian rate terms.
                The particles are treated as positive, so negative field strengths
                attract them toward the source and positive field strengths repel them.
              </p>
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
  source0Attraction: getEl<HTMLInputElement>('#source0-attraction'),
  source1Attraction: getEl<HTMLInputElement>('#source1-attraction'),
  source2Attraction: getEl<HTMLInputElement>('#source2-attraction'),
  source3Attraction: getEl<HTMLInputElement>('#source3-attraction'),
  playbackSpeed: getEl<HTMLInputElement>('#playback-speed'),
  seed: getEl<HTMLInputElement>('#seed'),
  totalTime: getEl<HTMLInputElement>('#total-time'),
  dt: getEl<HTMLInputElement>('#dt'),
  initClusterSd: getEl<HTMLInputElement>('#init-cluster-sd'),
  fixedAnionX: getEl<HTMLInputElement>('#neg-x'),
  fixedAnionY: getEl<HTMLInputElement>('#neg-y'),
  axisLimit: getEl<HTMLInputElement>('#axis-limit'),
  pointSize: getEl<HTMLInputElement>('#point-size'),
  targetFps: getEl<HTMLInputElement>('#target-fps')
};

const statusEls = {
  frame: getEl<HTMLElement>('#status-frame'),
  time: getEl<HTMLElement>('#status-time'),
  particles: getEl<HTMLElement>('#status-particles'),
  dt: getEl<HTMLElement>('#status-dt'),
  stepSd: getEl<HTMLElement>('#status-step-sd'),
  extent: getEl<HTMLElement>('#status-extent'),
  seed: getEl<HTMLElement>('#status-seed')
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
let isPlaying = true;
let lastAnimationTs = performance.now();
let stepAccumulator = 0;

function writeInputs(): void {
  setNumberInput(inputs.numParticles, simParams.numParticles, 0);
  setNumberInput(inputs.diffusionSd, simParams.diffusionSd, 3);
  setNumberInput(inputs.source0Attraction, simParams.source0Attraction, 3);
  setNumberInput(inputs.source1Attraction, simParams.source1Attraction, 3);
  setNumberInput(inputs.source2Attraction, simParams.source2Attraction, 3);
  setNumberInput(inputs.source3Attraction, simParams.source3Attraction, 3);
  setNumberInput(inputs.playbackSpeed, displayParams.playbackSpeed, 2);
  setNumberInput(inputs.seed, currentSeed, 0);
  setNumberInput(inputs.totalTime, simParams.T, 0);
  setNumberInput(inputs.dt, simParams.dt, 3);
  setNumberInput(inputs.initClusterSd, simParams.initClusterSd, 3);
  setNumberInput(inputs.fixedAnionX, simParams.fixedAnionX, 1);
  setNumberInput(inputs.fixedAnionY, simParams.fixedAnionY, 1);
  setNumberInput(inputs.axisLimit, displayParams.axisLimit, 0);
  setNumberInput(inputs.pointSize, displayParams.pointSize, 2);
  setNumberInput(inputs.targetFps, displayParams.targetFps, 0);
}

function readInputsForSimulation(): SimParams {
  return {
    T: clamp(Number(inputs.totalTime.value) || defaultSim.T, 100, 20000),
    dt: clamp(Number(inputs.dt.value) || defaultSim.dt, 0.05, 20),
    numParticles: clamp(Math.round(Number(inputs.numParticles.value) || defaultSim.numParticles), 1, MAX_PARTICLES),
    diffusionSd: clamp(Number(inputs.diffusionSd.value) || 0, 0, 20),
    initClusterSd: clamp(Number(inputs.initClusterSd.value) || 0, 0, 20),
    source0Attraction: clamp(Number(inputs.source0Attraction.value) || 0, -10, 10),
    source1Attraction: clamp(Number(inputs.source1Attraction.value) || 0, -10, 10),
    source2Attraction: clamp(Number(inputs.source2Attraction.value) || 0, -10, 10),
    source3Attraction: clamp(Number(inputs.source3Attraction.value) || 0, -10, 10),
    fixedAnionX: Number(inputs.fixedAnionX.value) || defaultSim.fixedAnionX,
    fixedAnionY: Number(inputs.fixedAnionY.value) || defaultSim.fixedAnionY
  };
}

function readInputsForDisplay(): DisplayParams {
  return {
    axisLimit: clamp(Number(inputs.axisLimit.value) || defaultDisplay.axisLimit, 5, 500),
    pointSize: clamp(Number(inputs.pointSize.value) || defaultDisplay.pointSize, 0.5, 8),
    playbackSpeed: clamp(Number(inputs.playbackSpeed.value) || defaultDisplay.playbackSpeed, 0.1, 8),
    targetFps: clamp(Math.round(Number(inputs.targetFps.value) || defaultDisplay.targetFps), 1, 120)
  };
}

function updateStatus(): void {
  statusEls.frame.textContent = `${state.stepCount}`;
  statusEls.time.textContent = state.simTime.toFixed(1);
  statusEls.particles.textContent = `${state.numParticles}`;
  statusEls.dt.textContent = state.dt.toFixed(2);
  statusEls.stepSd.textContent = (simParams.diffusionSd * simParams.dt).toFixed(3);
  statusEls.extent.textContent = getExtent(state).toFixed(1);
  statusEls.seed.textContent = `${currentSeed >>> 0}`;
}

function updateEquationText(): void {
  const sigma = simParams.diffusionSd;
  const dt = simParams.dt;
  const stepSd = sigma * dt;
  const attractionValues = [
    simParams.source0Attraction,
    simParams.source1Attraction,
    simParams.source2Attraction,
    simParams.source3Attraction
  ];
  const strengths = [
    -simParams.source0Attraction,
    -simParams.source1Attraction,
    -simParams.source2Attraction,
    -simParams.source3Attraction
  ];
  equationBlock.innerHTML = [
    '<span class="accent">Pedagogical stochastic-rate form</span>',
    'dx/dt = ξ_x(t) + drift_x,   dy/dt = ξ_y(t) + drift_y',
    'ξ_x, ξ_y ~ Normal(0, σ²),  where σ = diffusionSd',
    'drift = Σ_s [ -electric_strength_s · (field_source_s - pos) / (||field_source_s - pos|| + ε) ]',
    '',
    '<span class="accent-2">Euler step used in this simulation</span>',
    'x_trial = x_old + (dxdt + drift_x) · dt',
    'y_trial = y_old + (dydt + drift_y) · dt',
    'x_new = reflect(x_trial, -L, L)',
    'y_new = reflect(y_trial, -L, L)',
    'dxdt, dydt ~ Normal(0, diffusionSd²)',
    '',
    '<span class="accent-2">Reflective chamber rule</span>',
    'Particles bounce off the chamber walls instead of leaving the visible box.',
    '',
    'UI convention: positive attraction attracts positive charge, negative attraction repels it.',
    `Current: diffusionSd = ${sigma.toFixed(3)}, dt = ${dt.toFixed(3)}, attraction = [${attractionValues.map((v) => v.toFixed(3)).join(', ')}]`,
    `Mapped electric_strength = [${strengths.map((v) => v.toFixed(3)).join(', ')}]`,
    `Per-step displacement SD = diffusionSd × dt = ${stepSd.toFixed(3)}`
  ].join('\n');
}

function rebuildFromInputs(): void {
  simParams = readInputsForSimulation();
  displayParams = readInputsForDisplay();
  currentSeed = clamp(Math.floor(Number(inputs.seed.value) || currentSeed), 0, 0xffffffff) >>> 0;
  rng = new Rng(currentSeed);
  state = createState(simParams, currentSeed);
  stepAccumulator = 0;
  writeInputs();
  updateEquationText();
}

function applyLiveSimParams(): void {
  const next = readInputsForSimulation();
  const nextSeed = clamp(Math.floor(Number(inputs.seed.value) || currentSeed), 0, 0xffffffff) >>> 0;
  if (nextSeed !== currentSeed) {
    currentSeed = nextSeed;
    rng = new Rng(currentSeed);
  }
  simParams = next;
  state = resizeState(state, simParams.numParticles, rng, simParams.initClusterSd);
  state.dt = simParams.dt;
  state.fixedAnionX = simParams.fixedAnionX;
  state.fixedAnionY = simParams.fixedAnionY;
  writeInputs();
  updateEquationText();
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
  updateStatus();
  drawFrame(canvas, state, displayParams);
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
buttons.resetDefaults.addEventListener('click', () => {
  simParams = { ...defaultSim };
  displayParams = { ...defaultDisplay };
  currentSeed = randomSeed();
  writeInputs();
  rebuildFromInputs();
  setPlaying(true);
  render();
});
buttons.randomSeed.addEventListener('click', () => {
  currentSeed = randomSeed();
  setNumberInput(inputs.seed, currentSeed, 0);
  rebuildFromInputs();
  setPlaying(true);
  render();
});

for (const key of ['numParticles', 'diffusionSd', 'source0Attraction', 'source1Attraction', 'source2Attraction', 'source3Attraction', 'seed', 'totalTime', 'dt', 'initClusterSd', 'fixedAnionX', 'fixedAnionY'] as const) {
  inputs[key].addEventListener('change', () => {
    applyLiveSimParams();
    render();
  });
}

for (const key of ['playbackSpeed', 'axisLimit', 'pointSize', 'targetFps'] as const) {
  inputs[key].addEventListener('change', () => {
    refreshDisplayFromInputs();
    render();
  });
}

window.addEventListener('resize', () => render());

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
