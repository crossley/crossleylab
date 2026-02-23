import '../style.css';

interface SimParams {
  T: number;
  dt: number;
  numParticles: number;
  boxWidth: number;
  boxHeight: number;
  wallThickness: number;
  channelYMin: number;
  channelYMax: number;
  diffusionSd: number;
}

interface DisplayParams {
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
  leftWall: number;
  rightWall: number;
  boxWidth: number;
  boxHeight: number;
  channelYMin: number;
  channelYMax: number;
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
  numParticles: 100,
  boxWidth: 100,
  boxHeight: 60,
  wallThickness: 4,
  channelYMin: -10,
  channelYMax: 10,
  diffusionSd: 0.3
};

const defaultDisplay: DisplayParams = {
  pointSize: 2.5,
  playbackSpeed: 1,
  targetFps: 30
};

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
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

function normalizeChannelBounds(a: number, b: number, boxHeight: number): [number, number] {
  const halfH = boxHeight / 2;
  const lo = clamp(Math.min(a, b), -halfH, halfH);
  const hi = clamp(Math.max(a, b), -halfH, halfH);
  if (hi - lo < 0.5) {
    return [lo, Math.min(halfH, lo + 0.5)];
  }
  return [lo, hi];
}

function simulate(params: SimParams, seed: number): Trajectory {
  const T = clamp(Math.round(params.T), 20, 20000);
  const dt = clamp(params.dt, 0.05, 20);
  const numParticles = clamp(Math.round(params.numParticles), 1, 5000);
  const boxWidth = clamp(params.boxWidth, 20, 500);
  const boxHeight = clamp(params.boxHeight, 20, 500);
  const wallThickness = clamp(params.wallThickness, 0.5, Math.min(50, boxWidth - 2));
  const diffusionSd = clamp(params.diffusionSd, 0, 20);
  const [channelYMin, channelYMax] = normalizeChannelBounds(params.channelYMin, params.channelYMax, boxHeight);
  const leftWall = -wallThickness / 2;
  const rightWall = wallThickness / 2;

  const frames = Math.max(2, Math.floor(T / dt));
  const x = new Float32Array(frames * numParticles);
  const y = new Float32Array(frames * numParticles);
  const rng = new Rng(seed);

  for (let p = 0; p < numParticles; p += 1) {
    x[p] = rng.uniform(-boxWidth / 2 + 1, 0);
    y[p] = rng.uniform(-boxHeight / 2 + 1, boxHeight / 2 - 1);
  }

  for (let i = 1; i < frames; i += 1) {
    const prev = (i - 1) * numParticles;
    const curr = i * numParticles;
    for (let p = 0; p < numParticles; p += 1) {
      const dxdt = rng.normal(0, diffusionSd);
      const dydt = rng.normal(0, diffusionSd);
      const xPrev = x[prev + p];
      const yPrev = y[prev + p];

      let xNew = xPrev + dxdt * dt;
      let yNew = clamp(yPrev + dydt * dt, -boxHeight / 2, boxHeight / 2);

      const tryingToCrossLeft = xPrev < leftWall && xNew >= leftWall;
      const tryingToCrossRight = xPrev > rightWall && xNew <= rightWall;
      const inChannel = yPrev >= channelYMin && yPrev <= channelYMax;
      if ((tryingToCrossLeft || tryingToCrossRight) && !inChannel) {
        xNew = xPrev;
      }

      x[curr + p] = xNew;
      y[curr + p] = yNew;
    }
  }

  return {
    x,
    y,
    frames,
    numParticles,
    dt,
    totalTime: T,
    leftWall,
    rightWall,
    boxWidth,
    boxHeight,
    channelYMin,
    channelYMax
  };
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

function worldToCanvas(x: number, y: number, traj: Trajectory, width: number, height: number): [number, number] {
  const px = ((x + traj.boxWidth / 2) / traj.boxWidth) * width;
  const py = height - ((y + traj.boxHeight / 2) / traj.boxHeight) * height;
  return [px, py];
}

function drawFrame(canvas: HTMLCanvasElement, traj: Trajectory, frame: number, display: DisplayParams): void {
  syncCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#03060b';
  ctx.fillRect(0, 0, w, h);

  // Grid
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

  // Wall region shading
  const [wallLeftPx] = worldToCanvas(traj.leftWall, 0, traj, w, h);
  const [wallRightPx] = worldToCanvas(traj.rightWall, 0, traj, w, h);
  ctx.fillStyle = 'rgba(200, 220, 255, 0.08)';
  ctx.fillRect(wallLeftPx, 0, wallRightPx - wallLeftPx, h);

  // Channel opening highlight
  const [, channelTopPx] = worldToCanvas(0, traj.channelYMax, traj, w, h);
  const [, channelBottomPx] = worldToCanvas(0, traj.channelYMin, traj, w, h);
  ctx.fillStyle = 'rgba(159, 255, 106, 0.10)';
  ctx.fillRect(wallLeftPx, channelTopPx, wallRightPx - wallLeftPx, channelBottomPx - channelTopPx);

  // Wall edges (broken around the channel)
  ctx.strokeStyle = 'rgba(190, 225, 255, 0.45)';
  ctx.lineWidth = 1.5 * dpr;
  for (const xWall of [traj.leftWall, traj.rightWall]) {
    const [xPx] = worldToCanvas(xWall, 0, traj, w, h);
    const [, yTop] = worldToCanvas(0, traj.boxHeight / 2, traj, w, h);
    const [, yChanTop] = worldToCanvas(0, traj.channelYMax, traj, w, h);
    const [, yChanBottom] = worldToCanvas(0, traj.channelYMin, traj, w, h);
    const [, yBottom] = worldToCanvas(0, -traj.boxHeight / 2, traj, w, h);
    ctx.beginPath();
    ctx.moveTo(xPx, yTop);
    ctx.lineTo(xPx, yChanTop);
    ctx.moveTo(xPx, yChanBottom);
    ctx.lineTo(xPx, yBottom);
    ctx.stroke();
  }

  // Box boundary
  ctx.strokeStyle = 'rgba(120, 170, 255, 0.2)';
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(0.5 * dpr, 0.5 * dpr, w - dpr, h - dpr);

  // Particles
  const offset = clamp(Math.floor(frame), 0, traj.frames - 1) * traj.numParticles;
  const r = Math.max(0.8, display.pointSize) * dpr;
  ctx.fillStyle = 'rgba(66, 200, 255, 0.92)';
  for (let p = 0; p < traj.numParticles; p += 1) {
    const [px, py] = worldToCanvas(traj.x[offset + p], traj.y[offset + p], traj, w, h);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(232, 243, 255, 0.92)';
  ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.fillText('Diffusion Through a Channel', 12 * dpr, 20 * dpr);
}

function countSides(traj: Trajectory, frame: number): { left: number; right: number } {
  const idx = clamp(frame, 0, traj.frames - 1) * traj.numParticles;
  let left = 0;
  let right = 0;
  for (let p = 0; p < traj.numParticles; p += 1) {
    const x = traj.x[idx + p];
    if (x < traj.leftWall) left += 1;
    else if (x > traj.rightWall) right += 1;
  }
  return { left, right };
}

const app = getEl<HTMLDivElement>('#app');
app.innerHTML = `
  <div class="site-shell">
    <div class="nav-line">
      <a href="./index.html">Back to index</a>
      <span>•</span>
      <span>Page: <code>inspect_diffusion_2</code></span>
    </div>

    <header class="page-head">
      <p class="eyebrow">Diffusion and Membrane Geometry Foundations</p>
      <h1>inspect_diffusion_2</h1>
      <p class="subtitle">
        Diffusion in a two-compartment box with a membrane-like wall and one open channel.
        Crossing attempts are blocked outside the channel by reverting x (reflection).
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
              <div class="field"><label for="channel-y-min">Channel y min</label><input id="channel-y-min" type="number" step="0.5" /></div>
              <div class="field"><label for="channel-y-max">Channel y max</label><input id="channel-y-max" type="number" step="0.5" /></div>
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
              <dt>Frame</dt><dd id="status-frame">0</dd>
              <dt>Time (ms)</dt><dd id="status-time">0.0</dd>
              <dt>Particles Left</dt><dd id="status-left">0</dd>
              <dt>Particles Right</dt><dd id="status-right">0</dd>
              <dt>dt</dt><dd id="status-dt">0</dd>
              <dt>Step SD (x/y)</dt><dd id="status-step-sd">0</dd>
              <dt>Seed</dt><dd id="status-seed">0</dd>
              <dt>Frames total</dt><dd id="status-frames">0</dd>
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

      <section class="panel canvas-panel">
        <div class="canvas-head">
          <h2>Particle Animation</h2>
          <span class="tiny">Qualitative browser port of <code>inspect_diffusion_2.py</code></span>
        </div>
        <canvas id="sim-canvas" aria-label="Diffusion through membrane channel simulation"></canvas>
        <div class="legend">
          <span><span class="swatch" style="background: #42c8ff"></span>Diffusing particles</span>
          <span><span class="swatch" style="background: #9fff6a"></span>Open channel</span>
          <span>Wall blocks crossing attempts outside channel</span>
        </div>
      </section>
    </div>
  </div>
`;

const canvas = getEl<HTMLCanvasElement>('#sim-canvas');

const inputs = {
  numParticles: getEl<HTMLInputElement>('#num-particles'),
  diffusionSd: getEl<HTMLInputElement>('#diffusion-sd'),
  channelYMin: getEl<HTMLInputElement>('#channel-y-min'),
  channelYMax: getEl<HTMLInputElement>('#channel-y-max'),
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
let trajectory = simulate(simParams, currentSeed);
let isPlaying = true;
let playhead = 0;
let lastTs = performance.now();

function writeInputs(): void {
  setNumberInput(inputs.numParticles, simParams.numParticles, 0);
  setNumberInput(inputs.diffusionSd, simParams.diffusionSd, 3);
  setNumberInput(inputs.channelYMin, simParams.channelYMin, 2);
  setNumberInput(inputs.channelYMax, simParams.channelYMax, 2);
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
  return {
    T: clamp(Number(inputs.totalTime.value) || defaultSim.T, 20, 20000),
    dt: clamp(Number(inputs.dt.value) || defaultSim.dt, 0.05, 20),
    numParticles: clamp(Math.round(Number(inputs.numParticles.value) || defaultSim.numParticles), 1, 5000),
    boxWidth: clamp(Number(inputs.boxWidth.value) || defaultSim.boxWidth, 20, 500),
    boxHeight,
    wallThickness: clamp(Number(inputs.wallThickness.value) || defaultSim.wallThickness, 0.5, 50),
    channelYMin: clamp(Number(inputs.channelYMin.value) || 0, -boxHeight / 2, boxHeight / 2),
    channelYMax: clamp(Number(inputs.channelYMax.value) || 0, -boxHeight / 2, boxHeight / 2),
    diffusionSd: clamp(Number(inputs.diffusionSd.value) || 0, 0, 20)
  };
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
    '<span class="accent">Euler diffusion update</span>',
    'x_new = x_old + dxdt · dt',
    'y_new = clamp(y_old + dydt · dt, -H/2, H/2)',
    'dxdt, dydt ~ Normal(0, diffusionSd²)',
    '',
    '<span class="accent-2">Membrane / channel crossing rule</span>',
    'If x-step crosses wall boundary and y_old is outside [channel_y_min, channel_y_max]:',
    '    x_new := x_old   (blocked / reflected in x)',
    '',
    `Current: diffusionSd = ${sigma.toFixed(3)}, dt = ${dt.toFixed(3)}`,
    `Per-step displacement SD (before wall rule) = diffusionSd × dt = ${stepSd.toFixed(3)}`
  ].join('\n');
}

function updateStatus(frameIndex: number): void {
  const sideCounts = countSides(trajectory, frameIndex);
  statusEls.frame.textContent = `${frameIndex + 1}`;
  statusEls.time.textContent = (frameIndex * trajectory.dt).toFixed(1);
  statusEls.left.textContent = `${sideCounts.left}`;
  statusEls.right.textContent = `${sideCounts.right}`;
  statusEls.dt.textContent = trajectory.dt.toFixed(2);
  statusEls.stepSd.textContent = (simParams.diffusionSd * simParams.dt).toFixed(3);
  statusEls.seed.textContent = `${currentSeed >>> 0}`;
  statusEls.frames.textContent = `${trajectory.frames}`;
}

function rerunFromInputs(rewind = true): void {
  simParams = readSimInputs();
  displayParams = readDisplayInputs();
  currentSeed = (clamp(Math.floor(Number(inputs.seed.value) || currentSeed), 0, 0xffffffff) >>> 0);
  trajectory = simulate(simParams, currentSeed);
  // Write normalized values back (e.g. channel bounds)
  simParams = {
    ...simParams,
    boxWidth: trajectory.boxWidth,
    boxHeight: trajectory.boxHeight,
    wallThickness: trajectory.rightWall - trajectory.leftWall,
    channelYMin: trajectory.channelYMin,
    channelYMax: trajectory.channelYMax
  };
  if (rewind) playhead = 0;
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

writeInputs();
updateEquationText();
updateStatus(0);
drawFrame(canvas, trajectory, 0, displayParams);

buttons.togglePlay.addEventListener('click', () => setPlaying(!isPlaying));
buttons.rerun.addEventListener('click', () => rerunFromInputs(true));
buttons.rewind.addEventListener('click', () => {
  playhead = 0;
  updateStatus(0);
  drawFrame(canvas, trajectory, 0, displayParams);
});
buttons.randomSeed.addEventListener('click', () => {
  currentSeed = randomSeed();
  setNumberInput(inputs.seed, currentSeed, 0);
  rerunFromInputs(true);
});
buttons.resetDefaults.addEventListener('click', () => {
  simParams = { ...defaultSim };
  displayParams = { ...defaultDisplay };
  currentSeed = randomSeed();
  writeInputs();
  rerunFromInputs(true);
  setPlaying(true);
});

const simKeys: Array<keyof typeof inputs> = [
  'numParticles',
  'diffusionSd',
  'channelYMin',
  'channelYMax',
  'seed',
  'totalTime',
  'dt',
  'boxWidth',
  'boxHeight',
  'wallThickness'
];
for (const key of simKeys) {
  inputs[key].addEventListener('change', () => rerunFromInputs(key !== 'seed'));
}

for (const key of ['playbackSpeed', 'pointSize', 'targetFps'] as const) {
  inputs[key].addEventListener('change', () => refreshDisplayFromInputs());
}

window.addEventListener('resize', () => {
  drawFrame(canvas, trajectory, Math.floor(playhead), displayParams);
});

function animate(ts: number): void {
  const dtSec = (ts - lastTs) / 1000;
  lastTs = ts;
  if (isPlaying && trajectory.frames > 0) {
    playhead += dtSec * displayParams.targetFps * displayParams.playbackSpeed;
    if (playhead >= trajectory.frames) playhead %= trajectory.frames;
  }
  const frameIndex = clamp(Math.floor(playhead), 0, Math.max(0, trajectory.frames - 1));
  updateStatus(frameIndex);
  drawFrame(canvas, trajectory, frameIndex, displayParams);
  requestAnimationFrame(animate);
}

requestAnimationFrame((ts) => {
  lastTs = ts;
  animate(ts);
});
