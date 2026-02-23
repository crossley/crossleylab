import '../style.css';

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

interface Trajectory {
  x: Float32Array;
  y: Float32Array;
  frames: number;
  numParticles: number;
  dt: number;
  totalTime: number;
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
  numParticles: 100,
  diffusionSd: 0.5,
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

function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

function simulate(params: SimParams, seed: number): Trajectory {
  const T = clamp(Math.round(params.T), 20, 20000);
  const dt = clamp(params.dt, 0.05, 20);
  const numParticles = clamp(Math.round(params.numParticles), 1, 5000);
  const diffusionSd = clamp(params.diffusionSd, 0, 20);
  const initClusterSd = clamp(params.initClusterSd, 0, 20);

  const frameCount = Math.max(2, Math.floor(T / dt));
  const x = new Float32Array(frameCount * numParticles);
  const y = new Float32Array(frameCount * numParticles);
  const rng = new Rng(seed);

  for (let p = 0; p < numParticles; p += 1) {
    x[p] = rng.normal(0, initClusterSd);
    y[p] = rng.normal(0, initClusterSd);
  }

  for (let i = 1; i < frameCount; i += 1) {
    const prev = (i - 1) * numParticles;
    const curr = i * numParticles;
    for (let p = 0; p < numParticles; p += 1) {
      const dxdt = rng.normal(0, diffusionSd);
      const dydt = rng.normal(0, diffusionSd);
      x[curr + p] = x[prev + p] + dxdt * dt;
      y[curr + p] = y[prev + p] + dydt * dt;
    }
  }

  return {
    x,
    y,
    frames: frameCount,
    numParticles,
    dt,
    totalTime: T
  };
}

function getEl<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}

function setNumberInput(
  input: HTMLInputElement,
  value: number,
  digits = 3
): void {
  if (Number.isInteger(value)) {
    input.value = String(value);
    return;
  }
  input.value = Number(value.toFixed(digits)).toString();
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

function drawFrame(
  canvas: HTMLCanvasElement,
  traj: Trajectory,
  frame: number,
  display: DisplayParams
): void {
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

  ctx.save();
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
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(180, 220, 255, 0.28)';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(halfW, 0);
  ctx.lineTo(halfW, height);
  ctx.moveTo(0, halfH);
  ctx.lineTo(width, halfH);
  ctx.stroke();
  ctx.restore();

  const offset = clamp(Math.floor(frame), 0, traj.frames - 1) * traj.numParticles;
  const radius = Math.max(0.8, display.pointSize) * dpr;
  ctx.fillStyle = 'rgba(66, 200, 255, 0.9)';
  for (let p = 0; p < traj.numParticles; p += 1) {
    const x = halfW + traj.x[offset + p] * sx;
    const y = halfH - traj.y[offset + p] * sy;
    if (x < -radius || x > width + radius || y < -radius || y > height + radius) {
      continue;
    }
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(232, 243, 255, 0.92)';
  ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.fillText('2D Diffusion of Particles', 12 * dpr, 20 * dpr);
}

const app = getEl<HTMLDivElement>('#app');
app.innerHTML = `
  <div class="site-shell">
    <div class="nav-line">
      <a href="./index.html">Back to index</a>
      <span>•</span>
      <span>Page: <code>inspect_diffusion_1</code></span>
    </div>

    <header class="page-head">
      <p class="eyebrow">Diffusion and Membrane Geometry Foundations</p>
      <h1>inspect_diffusion_1</h1>
      <p class="subtitle">
        Pure 2D Brownian diffusion with no barriers or forces. This web version
        preserves the Python script's core update rule while adding replay,
        seeded reruns, and adjustable simulation/display parameters.
      </p>
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
              <div class="field"><label for="playback-speed">Playback speed</label><input id="playback-speed" type="number" min="0.1" max="8" step="0.1" /></div>
              <div class="field"><label for="seed">Seed</label><input id="seed" type="number" min="0" max="4294967295" step="1" /></div>
            </div>
          </div>

          <details>
            <summary>Advanced Controls</summary>
            <div class="group" style="margin-top: 8px;">
              <div class="control-grid">
                <div class="field"><label for="total-time">Total time T (ms)</label><input id="total-time" type="number" min="20" max="20000" step="10" /></div>
                <div class="field"><label for="dt">dt (ms)</label><input id="dt" type="number" min="0.05" max="20" step="0.05" /></div>
                <div class="field"><label for="init-cluster-sd">Initial cluster SD</label><input id="init-cluster-sd" type="number" min="0" max="20" step="0.05" /></div>
                <div class="field"><label for="axis-limit">Axis limit (+/-)</label><input id="axis-limit" type="number" min="5" max="500" step="1" /></div>
                <div class="field"><label for="point-size">Point size</label><input id="point-size" type="number" min="0.5" max="8" step="0.25" /></div>
                <div class="field"><label for="target-fps">Playback FPS</label><input id="target-fps" type="number" min="1" max="120" step="1" /></div>
              </div>
            </div>
          </details>

          <div class="group">
            <p class="group-label">Status</p>
            <dl class="status-list">
              <dt>Frame</dt><dd id="status-frame">0</dd>
              <dt>Time (ms)</dt><dd id="status-time">0.0</dd>
              <dt>Frames total</dt><dd id="status-frames-total">0</dd>
              <dt>Particles</dt><dd id="status-particles">0</dd>
              <dt>dt</dt><dd id="status-dt">0</dd>
              <dt>Step SD (x/y)</dt><dd id="status-step-sd">0</dd>
              <dt>Seed</dt><dd id="status-seed">0</dd>
            </dl>
          </div>

          <div class="group">
            <p class="group-label">Equation (Euler Update)</p>
            <div class="equation-card">
              <pre class="equation" id="equation-block"></pre>
              <p>
                <code>diffusionSd</code> controls the standard deviation of the sampled random
                rate terms <code>dxdt</code> and <code>dydt</code>. In this implementation, the
                resulting per-step displacement spread is <code>diffusionSd × dt</code>.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <section class="panel canvas-panel">
        <div class="canvas-head">
          <h2>Particle Animation</h2>
          <span class="tiny">Qualitative browser port of <code>inspect_diffusion_1.py</code></span>
        </div>
        <canvas id="sim-canvas" aria-label="2D diffusion particle simulation"></canvas>
        <div class="legend">
          <span><span class="swatch" style="background: #42c8ff"></span>Brownian particles</span>
          <span>No boundaries, no forces, no interactions</span>
        </div>
      </section>
    </div>
  </div>
`;

const canvas = getEl<HTMLCanvasElement>('#sim-canvas');

const inputs = {
  numParticles: getEl<HTMLInputElement>('#num-particles'),
  diffusionSd: getEl<HTMLInputElement>('#diffusion-sd'),
  playbackSpeed: getEl<HTMLInputElement>('#playback-speed'),
  seed: getEl<HTMLInputElement>('#seed'),
  totalTime: getEl<HTMLInputElement>('#total-time'),
  dt: getEl<HTMLInputElement>('#dt'),
  initClusterSd: getEl<HTMLInputElement>('#init-cluster-sd'),
  axisLimit: getEl<HTMLInputElement>('#axis-limit'),
  pointSize: getEl<HTMLInputElement>('#point-size'),
  targetFps: getEl<HTMLInputElement>('#target-fps')
};

const statusEls = {
  frame: getEl<HTMLElement>('#status-frame'),
  time: getEl<HTMLElement>('#status-time'),
  framesTotal: getEl<HTMLElement>('#status-frames-total'),
  particles: getEl<HTMLElement>('#status-particles'),
  dt: getEl<HTMLElement>('#status-dt'),
  stepSd: getEl<HTMLElement>('#status-step-sd'),
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
let trajectory = simulate(simParams, currentSeed);
let isPlaying = true;
let playheadFrame = 0;
let lastAnimationTs = performance.now();

function writeInputs(): void {
  setNumberInput(inputs.numParticles, simParams.numParticles, 0);
  setNumberInput(inputs.diffusionSd, simParams.diffusionSd, 3);
  setNumberInput(inputs.playbackSpeed, displayParams.playbackSpeed, 2);
  setNumberInput(inputs.seed, currentSeed, 0);
  setNumberInput(inputs.totalTime, simParams.T, 0);
  setNumberInput(inputs.dt, simParams.dt, 3);
  setNumberInput(inputs.initClusterSd, simParams.initClusterSd, 3);
  setNumberInput(inputs.axisLimit, displayParams.axisLimit, 0);
  setNumberInput(inputs.pointSize, displayParams.pointSize, 2);
  setNumberInput(inputs.targetFps, displayParams.targetFps, 0);
}

function readInputsForSimulation(): SimParams {
  return {
    T: clamp(Number(inputs.totalTime.value) || defaultSim.T, 20, 20000),
    dt: clamp(Number(inputs.dt.value) || defaultSim.dt, 0.05, 20),
    numParticles: clamp(Math.round(Number(inputs.numParticles.value) || defaultSim.numParticles), 1, 5000),
    diffusionSd: clamp(Number(inputs.diffusionSd.value) || 0, 0, 20),
    initClusterSd: clamp(Number(inputs.initClusterSd.value) || 0, 0, 20)
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

function updateStatus(frameIndex: number): void {
  statusEls.frame.textContent = `${frameIndex + 1}`;
  statusEls.time.textContent = (frameIndex * trajectory.dt).toFixed(1);
  statusEls.framesTotal.textContent = `${trajectory.frames}`;
  statusEls.particles.textContent = `${trajectory.numParticles}`;
  statusEls.dt.textContent = trajectory.dt.toFixed(2);
  statusEls.stepSd.textContent = (simParams.diffusionSd * simParams.dt).toFixed(3);
  statusEls.seed.textContent = `${currentSeed >>> 0}`;
}

function updateEquationText(): void {
  const sigma = simParams.diffusionSd;
  const dt = simParams.dt;
  const stepSd = sigma * dt;
  equationBlock.innerHTML = [
    '<span class="accent">Pedagogical stochastic-rate form</span>',
    'dx/dt = ξ_x(t),   dy/dt = ξ_y(t)',
    'ξ_x, ξ_y ~ Normal(0, σ²),  where σ = diffusionSd',
    '',
    '<span class="accent-2">Euler step used in this simulation</span>',
    'x[i+1] = x[i] + dxdt[i] · dt',
    'y[i+1] = y[i] + dydt[i] · dt',
    'dxdt[i], dydt[i] ~ Normal(0, diffusionSd²)',
    '',
    `Current: diffusionSd = ${sigma.toFixed(3)}, dt = ${dt.toFixed(3)}`,
    `Per-step displacement SD = diffusionSd × dt = ${stepSd.toFixed(3)}`
  ].join('\n');
}

function rerunFromInputs(rewind = true): void {
  simParams = readInputsForSimulation();
  displayParams = readInputsForDisplay();
  currentSeed = clamp(Math.floor(Number(inputs.seed.value) || currentSeed), 0, 0xffffffff) >>> 0;
  trajectory = simulate(simParams, currentSeed);
  if (rewind) playheadFrame = 0;
  writeInputs();
  updateEquationText();
}

function refreshDisplayFromInputs(): void {
  displayParams = readInputsForDisplay();
  writeInputs();
  updateEquationText();
}

function setPlaying(next: boolean): void {
  isPlaying = next;
  buttons.togglePlay.textContent = isPlaying ? 'Pause' : 'Play';
}

writeInputs();
updateEquationText();
updateStatus(0);
drawFrame(canvas, trajectory, 0, displayParams);

buttons.togglePlay.addEventListener('click', () => {
  setPlaying(!isPlaying);
});

buttons.rerun.addEventListener('click', () => {
  rerunFromInputs(true);
});

buttons.rewind.addEventListener('click', () => {
  playheadFrame = 0;
  updateStatus(0);
  drawFrame(canvas, trajectory, 0, displayParams);
});

buttons.resetDefaults.addEventListener('click', () => {
  simParams = { ...defaultSim };
  displayParams = { ...defaultDisplay };
  currentSeed = randomSeed();
  writeInputs();
  rerunFromInputs(true);
  setPlaying(true);
});

buttons.randomSeed.addEventListener('click', () => {
  currentSeed = randomSeed();
  setNumberInput(inputs.seed, currentSeed, 0);
  rerunFromInputs(true);
});

const simulationInputKeys: Array<keyof typeof inputs> = [
  'numParticles',
  'diffusionSd',
  'seed',
  'totalTime',
  'dt',
  'initClusterSd'
];

for (const key of simulationInputKeys) {
  inputs[key].addEventListener('change', () => {
    rerunFromInputs(key !== 'seed');
  });
}

const displayInputKeys: Array<keyof typeof inputs> = [
  'playbackSpeed',
  'axisLimit',
  'pointSize',
  'targetFps'
];

for (const key of displayInputKeys) {
  inputs[key].addEventListener('change', () => {
    refreshDisplayFromInputs();
  });
}

window.addEventListener('resize', () => {
  drawFrame(canvas, trajectory, Math.floor(playheadFrame), displayParams);
});

function animate(now: number): void {
  const dtSec = (now - lastAnimationTs) / 1000;
  lastAnimationTs = now;

  if (isPlaying && trajectory.frames > 0) {
    playheadFrame += dtSec * displayParams.targetFps * displayParams.playbackSpeed;
    if (playheadFrame >= trajectory.frames) {
      playheadFrame %= trajectory.frames;
    }
  }

  const frameIndex = clamp(Math.floor(playheadFrame), 0, Math.max(0, trajectory.frames - 1));
  updateStatus(frameIndex);
  drawFrame(canvas, trajectory, frameIndex, displayParams);
  requestAnimationFrame(animate);
}

requestAnimationFrame((ts) => {
  lastAnimationTs = ts;
  animate(ts);
});
