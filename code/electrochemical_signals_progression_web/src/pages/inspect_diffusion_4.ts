import '../style.css';

type IonType = 0 | 1;

interface SimParams {
  T: number;
  dt: number;
  numParticles: number;
  type0Fraction: number;
  boxWidth: number;
  boxHeight: number;
  wallThickness: number;
  diffusionSd: number;
  type0YMin: number;
  type0YMax: number;
  type1YMin: number;
  type1YMax: number;
}

interface DisplayParams {
  pointSize: number;
  playbackSpeed: number;
  targetFps: number;
}

interface SimulationResult {
  x: Float32Array;
  y: Float32Array;
  types: Uint8Array;
  frames: number;
  numParticles: number;
  dt: number;
  boxWidth: number;
  boxHeight: number;
  leftWall: number;
  rightWall: number;
  type0YMin: number;
  type0YMax: number;
  type1YMin: number;
  type1YMax: number;
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
  dt: 3,
  numParticles: 500,
  type0Fraction: 0.5,
  boxWidth: 100,
  boxHeight: 80,
  wallThickness: 4,
  diffusionSd: 0.5,
  type0YMin: 10,
  type0YMax: 11,
  type1YMin: -30,
  type1YMax: -10
};

const defaultDisplay: DisplayParams = {
  pointSize: 2.0,
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

function simulate(params: SimParams, seed: number): SimulationResult {
  const T = clamp(Math.round(params.T), 20, 20000);
  const dt = clamp(params.dt, 0.05, 20);
  const numParticles = clamp(Math.round(params.numParticles), 1, 5000);
  const type0Fraction = clamp(params.type0Fraction, 0, 1);
  const boxWidth = clamp(params.boxWidth, 20, 500);
  const boxHeight = clamp(params.boxHeight, 20, 500);
  const wallThickness = clamp(params.wallThickness, 0.5, Math.min(50, boxWidth - 2));
  const diffusionSd = clamp(params.diffusionSd, 0, 20);
  const [type0YMin, type0YMax] = normalizeBounds(params.type0YMin, params.type0YMax, boxHeight);
  const [type1YMin, type1YMax] = normalizeBounds(params.type1YMin, params.type1YMax, boxHeight);
  const leftWall = -wallThickness / 2;
  const rightWall = wallThickness / 2;
  const frames = Math.max(2, Math.floor(T / dt));

  const x = new Float32Array(frames * numParticles);
  const y = new Float32Array(frames * numParticles);
  const types = new Uint8Array(numParticles);
  const rng = new Rng(seed);

  for (let p = 0; p < numParticles; p += 1) {
    types[p] = (rng.next() < type0Fraction ? 0 : 1) as IonType;
    x[p] = rng.uniform(-boxWidth / 2 + 1, -wallThickness / 2 - 1);
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
      const yNew = clamp(yPrev + dydt * dt, -boxHeight / 2, boxHeight / 2);
      const tryingToCrossLeft = xPrev < leftWall && xNew >= leftWall;
      const tryingToCrossRight = xPrev > rightWall && xNew <= rightWall;
      const tryingToCross = tryingToCrossLeft || tryingToCrossRight;
      const isType0 = types[p] === 0;
      const chMin = isType0 ? type0YMin : type1YMin;
      const chMax = isType0 ? type0YMax : type1YMax;
      const inChannel = yPrev >= chMin && yPrev <= chMax;
      if (tryingToCross && !inChannel) xNew = xPrev;
      x[curr + p] = xNew;
      y[curr + p] = yNew;
    }
  }

  return {
    x, y, types, frames, numParticles, dt, boxWidth, boxHeight, leftWall, rightWall,
    type0YMin, type0YMax, type1YMin, type1YMax
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

function worldToCanvas(x: number, y: number, sim: SimulationResult, w: number, h: number): [number, number] {
  const px = ((x + sim.boxWidth / 2) / sim.boxWidth) * w;
  const py = h - ((y + sim.boxHeight / 2) / sim.boxHeight) * h;
  return [px, py];
}

function drawEnvironment(ctx: CanvasRenderingContext2D, sim: SimulationResult, w: number, h: number, dpr: number): void {
  ctx.fillStyle = '#03060b';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(120, 170, 255, 0.10)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i += 1) {
    const gx = (w * i) / 10;
    const gy = (h * i) / 10;
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  }

  const [wl] = worldToCanvas(sim.leftWall, 0, sim, w, h);
  const [wr] = worldToCanvas(sim.rightWall, 0, sim, w, h);
  ctx.fillStyle = 'rgba(200, 220, 255, 0.08)';
  ctx.fillRect(wl, 0, wr - wl, h);

  const [, t0Top] = worldToCanvas(0, sim.type0YMax, sim, w, h);
  const [, t0Bottom] = worldToCanvas(0, sim.type0YMin, sim, w, h);
  const [, t1Top] = worldToCanvas(0, sim.type1YMax, sim, w, h);
  const [, t1Bottom] = worldToCanvas(0, sim.type1YMin, sim, w, h);
  ctx.fillStyle = 'rgba(255, 98, 98, 0.16)';
  ctx.fillRect(wl, t0Top, wr - wl, t0Bottom - t0Top);
  ctx.fillStyle = 'rgba(66, 200, 255, 0.14)';
  ctx.fillRect(wl, t1Top, wr - wl, t1Bottom - t1Top);

  ctx.strokeStyle = 'rgba(190, 225, 255, 0.48)';
  ctx.lineWidth = 1.5 * dpr;
  for (const xWall of [sim.leftWall, sim.rightWall]) {
    const [xpx] = worldToCanvas(xWall, 0, sim, w, h);
    const segments: Array<[number, number]> = [];
    const channels = [
      [sim.type0YMin, sim.type0YMax],
      [sim.type1YMin, sim.type1YMax]
    ].sort((a, b) => a[0] - b[0]);
    let cursor = -sim.boxHeight / 2;
    for (const [cMin, cMax] of channels) {
      if (cMin > cursor) segments.push([cursor, cMin]);
      cursor = Math.max(cursor, cMax);
    }
    if (cursor < sim.boxHeight / 2) segments.push([cursor, sim.boxHeight / 2]);
    for (const [y0, y1] of segments) {
      const [, py0] = worldToCanvas(0, y0, sim, w, h);
      const [, py1] = worldToCanvas(0, y1, sim, w, h);
      ctx.beginPath();
      ctx.moveTo(xpx, py0);
      ctx.lineTo(xpx, py1);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = 'rgba(120, 170, 255, 0.2)';
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(0.5 * dpr, 0.5 * dpr, w - dpr, h - dpr);
}

function drawFrame(canvas: HTMLCanvasElement, sim: SimulationResult, frame: number, display: DisplayParams): void {
  syncCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, w, h);
  drawEnvironment(ctx, sim, w, h, dpr);

  const offset = clamp(frame, 0, sim.frames - 1) * sim.numParticles;
  const r = Math.max(0.8, display.pointSize) * dpr;
  for (let p = 0; p < sim.numParticles; p += 1) {
    const [px, py] = worldToCanvas(sim.x[offset + p], sim.y[offset + p], sim, w, h);
    ctx.fillStyle = sim.types[p] === 0 ? 'rgba(255, 98, 98, 0.92)' : 'rgba(66, 200, 255, 0.92)';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(232, 243, 255, 0.92)';
  ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.fillText('Ion-Specific Diffusion Through Channels', 12 * dpr, 20 * dpr);
}

function countByTypeAndSide(sim: SimulationResult, frame: number) {
  const idx = clamp(frame, 0, sim.frames - 1) * sim.numParticles;
  let type0Left = 0; let type0Right = 0; let type1Left = 0; let type1Right = 0;
  for (let p = 0; p < sim.numParticles; p += 1) {
    const isType0 = sim.types[p] === 0;
    const x = sim.x[idx + p];
    if (x < sim.leftWall) {
      if (isType0) type0Left += 1; else type1Left += 1;
    } else if (x > sim.rightWall) {
      if (isType0) type0Right += 1; else type1Right += 1;
    }
  }
  return { type0Left, type0Right, type1Left, type1Right };
}

const app = getEl<HTMLDivElement>('#app');
app.innerHTML = `
  <div class="site-shell">
    <div class="nav-line">
      <a href="./index.html">Back to index</a>
      <span>•</span>
      <span>Page: <code>inspect_diffusion_4</code></span>
    </div>
    <header class="page-head">
      <p class="eyebrow">Diffusion and Membrane Geometry Foundations</p>
      <h1>inspect_diffusion_4</h1>
      <p class="subtitle">
        Two particle types diffuse under identical Brownian motion but can cross the membrane only
        through their type-specific channels. This demonstrates selective permeability.
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
              <div class="field"><label for="type0-fraction">Type 0 fraction</label><input id="type0-fraction" type="number" min="0" max="1" step="0.01" /></div>
              <div class="field"><label for="diffusion-sd">Diffusion SD</label><input id="diffusion-sd" type="number" min="0" max="20" step="0.05" /></div>
              <div class="field"><label for="type0-y-min">Type 0 y min</label><input id="type0-y-min" type="number" step="0.5" /></div>
              <div class="field"><label for="type0-y-max">Type 0 y max</label><input id="type0-y-max" type="number" step="0.5" /></div>
              <div class="field"><label for="type1-y-min">Type 1 y min</label><input id="type1-y-min" type="number" step="0.5" /></div>
              <div class="field"><label for="type1-y-max">Type 1 y max</label><input id="type1-y-max" type="number" step="0.5" /></div>
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
              <dt>Type 0 Left</dt><dd id="status-type0-left">0</dd>
              <dt>Type 0 Right</dt><dd id="status-type0-right">0</dd>
              <dt>Type 1 Left</dt><dd id="status-type1-left">0</dd>
              <dt>Type 1 Right</dt><dd id="status-type1-right">0</dd>
              <dt>dt</dt><dd id="status-dt">0</dd>
              <dt>Step SD</dt><dd id="status-step-sd">0</dd>
              <dt>Seed</dt><dd id="status-seed">0</dd>
              <dt>Frames total</dt><dd id="status-frames">0</dd>
            </dl>
          </div>
          <div class="group">
            <p class="group-label">Equation + Selective Gating Rule</p>
            <div class="equation-card">
              <pre class="equation" id="equation-block"></pre>
              <p>
                Same Euler diffusion update for all particles. Channel gating depends on particle type,
                so permeability differs even when <code>diffusionSd</code> is identical.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <section class="panel canvas-panel">
        <div class="canvas-head">
          <h2>Particle Animation</h2>
          <span class="tiny">Qualitative browser port of <code>inspect_diffusion_4.py</code></span>
        </div>
        <canvas id="sim-canvas" aria-label="Ion-specific diffusion through selective channels"></canvas>
        <div class="legend">
          <span><span class="swatch" style="background: #ff6262"></span>Type 0 (Na+-like)</span>
          <span><span class="swatch" style="background: #42c8ff"></span>Type 1 (K+-like)</span>
          <span><span class="swatch" style="background: rgba(255,98,98,0.8)"></span>Type 0 channel</span>
          <span><span class="swatch" style="background: rgba(66,200,255,0.8)"></span>Type 1 channel</span>
        </div>
      </section>
    </div>
  </div>
`;

const canvas = getEl<HTMLCanvasElement>('#sim-canvas');
const equationBlock = getEl<HTMLElement>('#equation-block');

const inputs = {
  numParticles: getEl<HTMLInputElement>('#num-particles'),
  type0Fraction: getEl<HTMLInputElement>('#type0-fraction'),
  diffusionSd: getEl<HTMLInputElement>('#diffusion-sd'),
  type0YMin: getEl<HTMLInputElement>('#type0-y-min'),
  type0YMax: getEl<HTMLInputElement>('#type0-y-max'),
  type1YMin: getEl<HTMLInputElement>('#type1-y-min'),
  type1YMax: getEl<HTMLInputElement>('#type1-y-max'),
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
  type0Left: getEl<HTMLElement>('#status-type0-left'),
  type0Right: getEl<HTMLElement>('#status-type0-right'),
  type1Left: getEl<HTMLElement>('#status-type1-left'),
  type1Right: getEl<HTMLElement>('#status-type1-right'),
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
let simResult = simulate(simParams, currentSeed);
let isPlaying = true;
let playhead = 0;
let lastTs = performance.now();

function writeInputs(): void {
  setNumberInput(inputs.numParticles, simParams.numParticles, 0);
  setNumberInput(inputs.type0Fraction, simParams.type0Fraction, 2);
  setNumberInput(inputs.diffusionSd, simParams.diffusionSd, 3);
  setNumberInput(inputs.type0YMin, simParams.type0YMin, 2);
  setNumberInput(inputs.type0YMax, simParams.type0YMax, 2);
  setNumberInput(inputs.type1YMin, simParams.type1YMin, 2);
  setNumberInput(inputs.type1YMax, simParams.type1YMax, 2);
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
    type0Fraction: clamp(Number(inputs.type0Fraction.value) || 0, 0, 1),
    boxWidth: clamp(Number(inputs.boxWidth.value) || defaultSim.boxWidth, 20, 500),
    boxHeight,
    wallThickness: clamp(Number(inputs.wallThickness.value) || defaultSim.wallThickness, 0.5, 50),
    diffusionSd: clamp(Number(inputs.diffusionSd.value) || 0, 0, 20),
    type0YMin: clamp(Number(inputs.type0YMin.value) || 0, -boxHeight / 2, boxHeight / 2),
    type0YMax: clamp(Number(inputs.type0YMax.value) || 0, -boxHeight / 2, boxHeight / 2),
    type1YMin: clamp(Number(inputs.type1YMin.value) || 0, -boxHeight / 2, boxHeight / 2),
    type1YMax: clamp(Number(inputs.type1YMax.value) || 0, -boxHeight / 2, boxHeight / 2)
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
  const stepSd = simParams.diffusionSd * simParams.dt;
  const w0 = simParams.type0YMax - simParams.type0YMin;
  const w1 = simParams.type1YMax - simParams.type1YMin;
  equationBlock.innerHTML = [
    '<span class="accent">Shared Euler diffusion update (all particles)</span>',
    'x_new = x_old + dxdt · dt',
    'y_new = clamp(y_old + dydt · dt, -H/2, H/2)',
    'dxdt, dydt ~ Normal(0, diffusionSd²)',
    '',
    '<span class="accent-2">Type-selective channel gating</span>',
    'If type = 0: permit wall crossing only when y_old ∈ [type0_y_min, type0_y_max]',
    'If type = 1: permit wall crossing only when y_old ∈ [type1_y_min, type1_y_max]',
    'Otherwise x_new := x_old',
    '',
    `Per-step displacement SD = diffusionSd × dt = ${stepSd.toFixed(3)}`,
    `Channel widths: type0 = ${w0.toFixed(1)}, type1 = ${w1.toFixed(1)}`
  ].join('\n');
}

function updateStatus(frameIndex: number): void {
  const c = countByTypeAndSide(simResult, frameIndex);
  statusEls.frame.textContent = `${frameIndex + 1}`;
  statusEls.time.textContent = (frameIndex * simResult.dt).toFixed(1);
  statusEls.type0Left.textContent = `${c.type0Left}`;
  statusEls.type0Right.textContent = `${c.type0Right}`;
  statusEls.type1Left.textContent = `${c.type1Left}`;
  statusEls.type1Right.textContent = `${c.type1Right}`;
  statusEls.dt.textContent = simResult.dt.toFixed(2);
  statusEls.stepSd.textContent = (simParams.diffusionSd * simParams.dt).toFixed(3);
  statusEls.seed.textContent = `${currentSeed >>> 0}`;
  statusEls.frames.textContent = `${simResult.frames}`;
}

function rerunFromInputs(rewind = true): void {
  simParams = readSimInputs();
  displayParams = readDisplayInputs();
  currentSeed = clamp(Math.floor(Number(inputs.seed.value) || currentSeed), 0, 0xffffffff) >>> 0;
  simResult = simulate(simParams, currentSeed);
  simParams = {
    ...simParams,
    boxWidth: simResult.boxWidth,
    boxHeight: simResult.boxHeight,
    wallThickness: simResult.rightWall - simResult.leftWall,
    type0YMin: simResult.type0YMin,
    type0YMax: simResult.type0YMax,
    type1YMin: simResult.type1YMin,
    type1YMax: simResult.type1YMax
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
drawFrame(canvas, simResult, 0, displayParams);

buttons.togglePlay.addEventListener('click', () => setPlaying(!isPlaying));
buttons.rerun.addEventListener('click', () => rerunFromInputs(true));
buttons.rewind.addEventListener('click', () => {
  playhead = 0;
  updateStatus(0);
  drawFrame(canvas, simResult, 0, displayParams);
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
  'numParticles', 'type0Fraction', 'diffusionSd', 'type0YMin', 'type0YMax', 'type1YMin', 'type1YMax',
  'seed', 'totalTime', 'dt', 'boxWidth', 'boxHeight', 'wallThickness'
];
for (const key of simKeys) {
  inputs[key].addEventListener('change', () => rerunFromInputs(key !== 'seed'));
}
for (const key of ['playbackSpeed', 'pointSize', 'targetFps'] as const) {
  inputs[key].addEventListener('change', () => refreshDisplayFromInputs());
}

window.addEventListener('resize', () => {
  drawFrame(canvas, simResult, Math.floor(playhead), displayParams);
});

function animate(ts: number): void {
  const dtSec = (ts - lastTs) / 1000;
  lastTs = ts;
  if (isPlaying && simResult.frames > 0) {
    playhead += dtSec * displayParams.targetFps * displayParams.playbackSpeed;
    if (playhead >= simResult.frames) playhead %= simResult.frames;
  }
  const frameIndex = clamp(Math.floor(playhead), 0, Math.max(0, simResult.frames - 1));
  updateStatus(frameIndex);
  drawFrame(canvas, simResult, frameIndex, displayParams);
  requestAnimationFrame(animate);
}

requestAnimationFrame((ts) => {
  lastTs = ts;
  animate(ts);
});
