import '../style.css';

interface SimParams {
  T: number;
  dt: number;
  numParticles: number;
  boxWidth: number;
  boxHeight: number;
  wallThickness: number;
  diffusionSd: number;
  channelYMin: number;
  channelYMax: number;
  negX: number;
  negY: number;
  weakStrength: number;
  strongStrength: number;
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
  boxWidth: number;
  boxHeight: number;
  leftWall: number;
  rightWall: number;
  channelYMin: number;
  channelYMax: number;
  negX: number;
  negY: number;
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
  numParticles: 100,
  boxWidth: 100,
  boxHeight: 60,
  wallThickness: 4,
  diffusionSd: 0.5,
  channelYMin: -10,
  channelYMax: 10,
  negX: -45,
  negY: 0,
  weakStrength: 0.001,
  strongStrength: 0.1
};

const defaultDisplay: DisplayParams = {
  pointSize: 2.4,
  playbackSpeed: 1,
  targetFps: 30
};

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function normalizeBounds(a: number, b: number, boxHeight: number): [number, number] {
  const half = boxHeight / 2;
  const lo = clamp(Math.min(a, b), -half, half);
  const hi = clamp(Math.max(a, b), -half, half);
  return hi - lo < 0.5 ? [lo, Math.min(half, lo + 0.5)] : [lo, hi];
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

function simulateStrength(params: SimParams, electricStrength: number, seed: number): Trajectory {
  const T = clamp(Math.round(params.T), 20, 20000);
  const dt = clamp(params.dt, 0.05, 20);
  const numParticles = clamp(Math.round(params.numParticles), 1, 5000);
  const boxWidth = clamp(params.boxWidth, 20, 500);
  const boxHeight = clamp(params.boxHeight, 20, 500);
  const wallThickness = clamp(params.wallThickness, 0.5, Math.min(50, boxWidth - 2));
  const diffusionSd = clamp(params.diffusionSd, 0, 20);
  const [channelYMin, channelYMax] = normalizeBounds(params.channelYMin, params.channelYMax, boxHeight);
  const leftWall = -wallThickness / 2;
  const rightWall = wallThickness / 2;
  const negX = clamp(params.negX, -boxWidth / 2, boxWidth / 2);
  const negY = clamp(params.negY, -boxHeight / 2, boxHeight / 2);
  const frames = Math.max(2, Math.floor(T / dt));

  const x = new Float32Array(frames * numParticles);
  const y = new Float32Array(frames * numParticles);
  const rng = new Rng(seed);

  for (let p = 0; p < numParticles; p += 1) {
    x[p] = rng.uniform(rightWall + 1, boxWidth / 2 - 1);
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
      const dx = negX - xPrev;
      const dy = negY - yPrev;
      const dist = Math.sqrt(dx * dx + dy * dy) + 1e-3;
      const forceX = electricStrength * dx / dist;
      const forceY = electricStrength * dy / dist;

      let xNew = xPrev + (dxdt + forceX) * dt;
      const yNew = clamp(yPrev + (dydt + forceY) * dt, -boxHeight / 2, boxHeight / 2);

      const tryingToCrossLeft = xPrev > rightWall && xNew <= rightWall;
      const tryingToCrossRight = xPrev < leftWall && xNew >= leftWall;
      const inChannel = yPrev >= channelYMin && yPrev <= channelYMax;
      if ((tryingToCrossLeft || tryingToCrossRight) && !inChannel) xNew = xPrev;

      x[curr + p] = xNew;
      y[curr + p] = yNew;
    }
  }

  return { x, y, frames, numParticles, dt, boxWidth, boxHeight, leftWall, rightWall, channelYMin, channelYMax, negX, negY };
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

function worldToCanvas(x: number, y: number, t: Trajectory, w: number, h: number): [number, number] {
  return [((x + t.boxWidth / 2) / t.boxWidth) * w, h - ((y + t.boxHeight / 2) / t.boxHeight) * h];
}

function drawPanel(canvas: HTMLCanvasElement, traj: Trajectory, frame: number, pointSize: number, title: string): void {
  syncCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#03060b';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(120,170,255,0.10)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i += 1) {
    const gx = (w * i) / 10;
    const gy = (h * i) / 10;
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  }

  const [wl] = worldToCanvas(traj.leftWall, 0, traj, w, h);
  const [wr] = worldToCanvas(traj.rightWall, 0, traj, w, h);
  const [, cTop] = worldToCanvas(0, traj.channelYMax, traj, w, h);
  const [, cBottom] = worldToCanvas(0, traj.channelYMin, traj, w, h);
  ctx.fillStyle = 'rgba(200,220,255,0.08)';
  ctx.fillRect(wl, 0, wr - wl, h);
  ctx.fillStyle = 'rgba(159,255,106,0.10)';
  ctx.fillRect(wl, cTop, wr - wl, cBottom - cTop);

  ctx.strokeStyle = 'rgba(190,225,255,0.45)';
  ctx.lineWidth = 1.5 * dpr;
  for (const xWall of [traj.leftWall, traj.rightWall]) {
    const [xpx] = worldToCanvas(xWall, 0, traj, w, h);
    const [, yt] = worldToCanvas(0, traj.boxHeight / 2, traj, w, h);
    const [, yct] = worldToCanvas(0, traj.channelYMax, traj, w, h);
    const [, ycb] = worldToCanvas(0, traj.channelYMin, traj, w, h);
    const [, yb] = worldToCanvas(0, -traj.boxHeight / 2, traj, w, h);
    ctx.beginPath();
    ctx.moveTo(xpx, yt); ctx.lineTo(xpx, yct);
    ctx.moveTo(xpx, ycb); ctx.lineTo(xpx, yb);
    ctx.stroke();
  }

  const [negPx, negPy] = worldToCanvas(traj.negX, traj.negY, traj, w, h);
  ctx.fillStyle = 'rgba(66,200,255,0.95)';
  ctx.beginPath();
  ctx.arc(negPx, negPy, 4 * dpr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(66,200,255,0.4)';
  ctx.beginPath();
  ctx.arc(negPx, negPy, 10 * dpr, 0, Math.PI * 2);
  ctx.stroke();

  const offset = clamp(frame, 0, traj.frames - 1) * traj.numParticles;
  const r = Math.max(0.8, pointSize) * dpr;
  ctx.fillStyle = 'rgba(245, 178, 72, 0.92)';
  for (let p = 0; p < traj.numParticles; p += 1) {
    const [px, py] = worldToCanvas(traj.x[offset + p], traj.y[offset + p], traj, w, h);
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = 'rgba(232,243,255,0.92)';
  ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.fillText(title, 12 * dpr, 20 * dpr);
}

function sideCounts(traj: Trajectory, frame: number): { left: number; right: number } {
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
      <span>Page: <code>inspect_electrochemical_1</code></span>
    </div>
    <header class="page-head">
      <p class="eyebrow">Adding Electrical and Interaction Forces</p>
      <h1>inspect_electrochemical_1</h1>
      <p class="subtitle">
        Side-by-side comparison of weak vs strong electrical attraction superimposed on diffusion through a single channel.
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
              <div class="field"><label for="weak-strength">Weak field strength</label><input id="weak-strength" type="number" min="0" max="5" step="0.001" /></div>
              <div class="field"><label for="strong-strength">Strong field strength</label><input id="strong-strength" type="number" min="0" max="5" step="0.001" /></div>
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
                <div class="field"><label for="neg-x">Neg charge x</label><input id="neg-x" type="number" step="1" /></div>
                <div class="field"><label for="neg-y">Neg charge y</label><input id="neg-y" type="number" step="1" /></div>
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
              <dt>Weak Left</dt><dd id="status-weak-left">0</dd>
              <dt>Strong Left</dt><dd id="status-strong-left">0</dd>
              <dt>Weak Right</dt><dd id="status-weak-right">0</dd>
              <dt>Strong Right</dt><dd id="status-strong-right">0</dd>
              <dt>dt</dt><dd id="status-dt">0</dd>
              <dt>Step SD</dt><dd id="status-step-sd">0</dd>
              <dt>Seed</dt><dd id="status-seed">0</dd>
              <dt>Frames total</dt><dd id="status-frames">0</dd>
            </dl>
          </div>
          <div class="group">
            <p class="group-label">Equation + Drift Term</p>
            <div class="equation-card">
              <pre class="equation" id="equation-block"></pre>
              <p>
                <code>diffusionSd</code> controls the Brownian random-rate term; the electric field adds a distance-normalized drift toward the negative attractor.
              </p>
            </div>
          </div>
        </div>
      </aside>
      <section class="panel canvas-panel">
        <div class="canvas-head">
          <h2>Weak vs Strong Electrical Gradient</h2>
          <span class="tiny">Qualitative browser port of <code>inspect_electrochemical_1.py</code></span>
        </div>
        <div class="canvas-grid-2">
          <div class="canvas-subpanel">
            <div class="subhead"><h3>Weak Field</h3><span class="tiny" id="weak-label"></span></div>
            <canvas id="weak-canvas" aria-label="Weak electrical gradient simulation"></canvas>
          </div>
          <div class="canvas-subpanel">
            <div class="subhead"><h3>Strong Field</h3><span class="tiny" id="strong-label"></span></div>
            <canvas id="strong-canvas" aria-label="Strong electrical gradient simulation"></canvas>
          </div>
        </div>
        <div class="legend">
          <span><span class="swatch" style="background: #f5b248"></span>Particles</span>
          <span><span class="swatch" style="background: #42c8ff"></span>Negative attractor</span>
          <span><span class="swatch" style="background: #9fff6a"></span>Open channel</span>
        </div>
      </section>
    </div>
  </div>
`;

const weakCanvas = getEl<HTMLCanvasElement>('#weak-canvas');
const strongCanvas = getEl<HTMLCanvasElement>('#strong-canvas');
const equationBlock = getEl<HTMLElement>('#equation-block');
const weakLabel = getEl<HTMLElement>('#weak-label');
const strongLabel = getEl<HTMLElement>('#strong-label');

const inputs = {
  numParticles: getEl<HTMLInputElement>('#num-particles'),
  diffusionSd: getEl<HTMLInputElement>('#diffusion-sd'),
  weakStrength: getEl<HTMLInputElement>('#weak-strength'),
  strongStrength: getEl<HTMLInputElement>('#strong-strength'),
  channelYMin: getEl<HTMLInputElement>('#channel-y-min'),
  channelYMax: getEl<HTMLInputElement>('#channel-y-max'),
  playbackSpeed: getEl<HTMLInputElement>('#playback-speed'),
  seed: getEl<HTMLInputElement>('#seed'),
  totalTime: getEl<HTMLInputElement>('#total-time'),
  dt: getEl<HTMLInputElement>('#dt'),
  boxWidth: getEl<HTMLInputElement>('#box-width'),
  boxHeight: getEl<HTMLInputElement>('#box-height'),
  wallThickness: getEl<HTMLInputElement>('#wall-thickness'),
  negX: getEl<HTMLInputElement>('#neg-x'),
  negY: getEl<HTMLInputElement>('#neg-y'),
  pointSize: getEl<HTMLInputElement>('#point-size'),
  targetFps: getEl<HTMLInputElement>('#target-fps')
};

const statusEls = {
  frame: getEl<HTMLElement>('#status-frame'),
  time: getEl<HTMLElement>('#status-time'),
  weakLeft: getEl<HTMLElement>('#status-weak-left'),
  weakRight: getEl<HTMLElement>('#status-weak-right'),
  strongLeft: getEl<HTMLElement>('#status-strong-left'),
  strongRight: getEl<HTMLElement>('#status-strong-right'),
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
let weakTraj = simulateStrength(simParams, simParams.weakStrength, currentSeed);
let strongTraj = simulateStrength(simParams, simParams.strongStrength, currentSeed);
let isPlaying = true;
let playhead = 0;
let lastTs = performance.now();

function writeInputs(): void {
  setNumberInput(inputs.numParticles, simParams.numParticles, 0);
  setNumberInput(inputs.diffusionSd, simParams.diffusionSd, 3);
  setNumberInput(inputs.weakStrength, simParams.weakStrength, 3);
  setNumberInput(inputs.strongStrength, simParams.strongStrength, 3);
  setNumberInput(inputs.channelYMin, simParams.channelYMin, 2);
  setNumberInput(inputs.channelYMax, simParams.channelYMax, 2);
  setNumberInput(inputs.playbackSpeed, displayParams.playbackSpeed, 2);
  setNumberInput(inputs.seed, currentSeed, 0);
  setNumberInput(inputs.totalTime, simParams.T, 0);
  setNumberInput(inputs.dt, simParams.dt, 3);
  setNumberInput(inputs.boxWidth, simParams.boxWidth, 1);
  setNumberInput(inputs.boxHeight, simParams.boxHeight, 1);
  setNumberInput(inputs.wallThickness, simParams.wallThickness, 2);
  setNumberInput(inputs.negX, simParams.negX, 1);
  setNumberInput(inputs.negY, simParams.negY, 1);
  setNumberInput(inputs.pointSize, displayParams.pointSize, 2);
  setNumberInput(inputs.targetFps, displayParams.targetFps, 0);
}

function readSimInputs(): SimParams {
  const boxHeight = clamp(Number(inputs.boxHeight.value) || defaultSim.boxHeight, 20, 500);
  const boxWidth = clamp(Number(inputs.boxWidth.value) || defaultSim.boxWidth, 20, 500);
  return {
    T: clamp(Number(inputs.totalTime.value) || defaultSim.T, 20, 20000),
    dt: clamp(Number(inputs.dt.value) || defaultSim.dt, 0.05, 20),
    numParticles: clamp(Math.round(Number(inputs.numParticles.value) || defaultSim.numParticles), 1, 5000),
    boxWidth,
    boxHeight,
    wallThickness: clamp(Number(inputs.wallThickness.value) || defaultSim.wallThickness, 0.5, 50),
    diffusionSd: clamp(Number(inputs.diffusionSd.value) || 0, 0, 20),
    channelYMin: clamp(Number(inputs.channelYMin.value) || 0, -boxHeight / 2, boxHeight / 2),
    channelYMax: clamp(Number(inputs.channelYMax.value) || 0, -boxHeight / 2, boxHeight / 2),
    negX: clamp(Number(inputs.negX.value) || defaultSim.negX, -boxWidth / 2, boxWidth / 2),
    negY: clamp(Number(inputs.negY.value) || defaultSim.negY, -boxHeight / 2, boxHeight / 2),
    weakStrength: clamp(Number(inputs.weakStrength.value) || 0, 0, 5),
    strongStrength: clamp(Number(inputs.strongStrength.value) || 0, 0, 5)
  };
}

function readDisplayInputs(): DisplayParams {
  return {
    pointSize: clamp(Number(inputs.pointSize.value) || defaultDisplay.pointSize, 0.5, 8),
    playbackSpeed: clamp(Number(inputs.playbackSpeed.value) || defaultDisplay.playbackSpeed, 0.1, 8),
    targetFps: clamp(Math.round(Number(inputs.targetFps.value) || defaultDisplay.targetFps), 1, 120)
  };
}

function updateLabels(): void {
  weakLabel.textContent = `strength = ${simParams.weakStrength.toFixed(3)}`;
  strongLabel.textContent = `strength = ${simParams.strongStrength.toFixed(3)}`;
}

function updateEquationText(): void {
  const stepSd = simParams.diffusionSd * simParams.dt;
  equationBlock.innerHTML = [
    '<span class="accent">Euler update with electrical drift</span>',
    'diff = (neg_pos - pos)',
    'force = electric_strength · diff / (||diff|| + ε)',
    'x_new = x_old + (dxdt + force_x) · dt',
    'y_new = clamp(y_old + (dydt + force_y) · dt, -H/2, H/2)',
    'dxdt, dydt ~ Normal(0, diffusionSd²)',
    '',
    '<span class="accent-2">Shared channel rule (both panels)</span>',
    'Wall crossing allowed only if y_old ∈ [channel_y_min, channel_y_max] ; else x_new := x_old',
    '',
    `Per-step Brownian displacement SD = diffusionSd × dt = ${stepSd.toFixed(3)}`,
    `Weak/strong strengths = ${simParams.weakStrength.toFixed(3)} / ${simParams.strongStrength.toFixed(3)}`
  ].join('\n');
}

function updateStatus(frameIndex: number): void {
  const w = sideCounts(weakTraj, frameIndex);
  const s = sideCounts(strongTraj, frameIndex);
  statusEls.frame.textContent = `${frameIndex + 1}`;
  statusEls.time.textContent = (frameIndex * weakTraj.dt).toFixed(1);
  statusEls.weakLeft.textContent = `${w.left}`;
  statusEls.weakRight.textContent = `${w.right}`;
  statusEls.strongLeft.textContent = `${s.left}`;
  statusEls.strongRight.textContent = `${s.right}`;
  statusEls.dt.textContent = weakTraj.dt.toFixed(2);
  statusEls.stepSd.textContent = (simParams.diffusionSd * simParams.dt).toFixed(3);
  statusEls.seed.textContent = `${currentSeed >>> 0}`;
  statusEls.frames.textContent = `${weakTraj.frames}`;
}

function drawCurrentFrame(frameIndex: number): void {
  drawPanel(weakCanvas, weakTraj, frameIndex, displayParams.pointSize, 'Weak Electrical Gradient');
  drawPanel(strongCanvas, strongTraj, frameIndex, displayParams.pointSize, 'Strong Electrical Gradient');
}

function rerunFromInputs(rewind = true): void {
  simParams = readSimInputs();
  displayParams = readDisplayInputs();
  currentSeed = clamp(Math.floor(Number(inputs.seed.value) || currentSeed), 0, 0xffffffff) >>> 0;
  weakTraj = simulateStrength(simParams, simParams.weakStrength, currentSeed);
  strongTraj = simulateStrength(simParams, simParams.strongStrength, currentSeed);
  simParams = {
    ...simParams,
    boxWidth: weakTraj.boxWidth,
    boxHeight: weakTraj.boxHeight,
    wallThickness: weakTraj.rightWall - weakTraj.leftWall,
    channelYMin: weakTraj.channelYMin,
    channelYMax: weakTraj.channelYMax,
    negX: weakTraj.negX,
    negY: weakTraj.negY
  };
  if (rewind) playhead = 0;
  writeInputs();
  updateLabels();
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
updateLabels();
updateEquationText();
updateStatus(0);
drawCurrentFrame(0);

buttons.togglePlay.addEventListener('click', () => setPlaying(!isPlaying));
buttons.rerun.addEventListener('click', () => rerunFromInputs(true));
buttons.rewind.addEventListener('click', () => {
  playhead = 0;
  updateStatus(0);
  drawCurrentFrame(0);
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
  'numParticles', 'diffusionSd', 'weakStrength', 'strongStrength', 'channelYMin', 'channelYMax',
  'seed', 'totalTime', 'dt', 'boxWidth', 'boxHeight', 'wallThickness', 'negX', 'negY'
];
for (const key of simKeys) inputs[key].addEventListener('change', () => rerunFromInputs(key !== 'seed'));
for (const key of ['playbackSpeed', 'pointSize', 'targetFps'] as const) {
  inputs[key].addEventListener('change', () => refreshDisplayFromInputs());
}
window.addEventListener('resize', () => drawCurrentFrame(Math.floor(playhead)));

function animate(ts: number): void {
  const dtSec = (ts - lastTs) / 1000;
  lastTs = ts;
  if (isPlaying && weakTraj.frames > 0) {
    playhead += dtSec * displayParams.targetFps * displayParams.playbackSpeed;
    if (playhead >= weakTraj.frames) playhead %= weakTraj.frames;
  }
  const frameIndex = clamp(Math.floor(playhead), 0, Math.max(0, weakTraj.frames - 1));
  updateStatus(frameIndex);
  drawCurrentFrame(frameIndex);
  requestAnimationFrame(animate);
}
requestAnimationFrame((ts) => { lastTs = ts; animate(ts); });
