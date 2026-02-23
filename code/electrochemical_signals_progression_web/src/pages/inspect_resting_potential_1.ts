import '../style.css';

interface SimParams {
  T: number;
  dt: number;
  numParticles: number;
  boxWidth: number;
  boxHeight: number;
  wallThickness: number;
  diffusionSd: number;
  electricStrength: number;
  electricStrengthDepol: number;
  repulsionStrength: number;
  channelYMin: number;
  channelYMax: number;
  negX: number;
  negY: number;
  initialLeftFrac: number;
  depolStartFrac: number;
  depolEndFrac: number;
}

interface DisplayParams {
  pointSize: number;
  playbackSpeed: number;
  targetFps: number;
  traceYLimit: number;
}

interface SimResult {
  x: Float32Array;
  y: Float32Array;
  frames: number;
  numParticles: number;
  dt: number;
  t: Float32Array;
  boxWidth: number;
  boxHeight: number;
  leftWall: number;
  rightWall: number;
  channelYMin: number;
  channelYMax: number;
  negX: number;
  negY: number;
  depolStart: number;
  depolEnd: number;
  V: Float32Array;
}

class Rng {
  private state: number;
  private spare: number | null = null;
  constructor(seed: number) { this.state = seed >>> 0 || 1; }
  next(): number { let x = this.state; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.state = x >>> 0; return this.state / 0x100000000; }
  uniform(min: number, max: number): number { return min + (max - min) * this.next(); }
  normal(mean = 0, sd = 1): number {
    if (this.spare !== null) { const out = this.spare; this.spare = null; return mean + sd * out; }
    let u = 0, v = 0; while (u <= Number.EPSILON) u = this.next(); while (v <= Number.EPSILON) v = this.next();
    const mag = Math.sqrt(-2 * Math.log(u));
    const z0 = mag * Math.cos(2 * Math.PI * v); const z1 = mag * Math.sin(2 * Math.PI * v);
    this.spare = z1; return mean + sd * z0;
  }
}

const defaultSim: SimParams = {
  T: 2400,
  dt: 1,
  numParticles: 140,
  boxWidth: 200,
  boxHeight: 200,
  wallThickness: 4,
  diffusionSd: 0.1,
  electricStrength: 0.1,
  electricStrengthDepol: 0.2,
  repulsionStrength: 0.05,
  channelYMin: -10,
  channelYMax: 10,
  negX: -80,
  negY: 0,
  initialLeftFrac: 0.65,
  depolStartFrac: 1/3,
  depolEndFrac: 2/3
};

const defaultDisplay: DisplayParams = { pointSize: 2.2, playbackSpeed: 1, targetFps: 30, traceYLimit: 120 };

function clamp(v: number, min: number, max: number): number { return Math.min(max, Math.max(min, v)); }
function randomSeed(): number { return (Math.random() * 0xffffffff) >>> 0; }
function getEl<T extends Element>(s: string): T { const el = document.querySelector<T>(s); if (!el) throw new Error(`Missing ${s}`); return el; }
function setNumberInput(input: HTMLInputElement, value: number, digits = 3): void { input.value = Number.isInteger(value) ? String(value) : Number(value.toFixed(digits)).toString(); }
function normalizeBounds(a: number, b: number, boxHeight: number): [number, number] {
  const half = boxHeight / 2; const lo = clamp(Math.min(a, b), -half, half); const hi = clamp(Math.max(a, b), -half, half); return hi - lo < 0.5 ? [lo, Math.min(half, lo + 0.5)] : [lo, hi];
}

function simulate(params: SimParams, seed: number): SimResult {
  const T = clamp(Math.round(params.T), 50, 20000);
  const dt = clamp(params.dt, 0.05, 20);
  const numParticles = clamp(Math.round(params.numParticles), 10, 300);
  const boxWidth = clamp(params.boxWidth, 40, 500);
  const boxHeight = clamp(params.boxHeight, 40, 500);
  const wallThickness = clamp(params.wallThickness, 0.5, Math.min(50, boxWidth - 2));
  const diffusionSd = clamp(params.diffusionSd, 0, 20);
  const electricStrength = clamp(params.electricStrength, 0, 10);
  const electricStrengthDepol = clamp(params.electricStrengthDepol, 0, 10);
  const repulsionStrength = clamp(params.repulsionStrength, 0, 10);
  const [channelYMin, channelYMax] = normalizeBounds(params.channelYMin, params.channelYMax, boxHeight);
  const leftWall = -wallThickness / 2;
  const rightWall = wallThickness / 2;
  const negX = clamp(params.negX, -boxWidth / 2, boxWidth / 2);
  const negY = clamp(params.negY, -boxHeight / 2, boxHeight / 2);
  const initialLeftFrac = clamp(params.initialLeftFrac, 0, 1);
  const frames = Math.max(2, Math.floor(T / dt));
  const depolStart = clamp(Math.floor(frames * clamp(params.depolStartFrac, 0, 1)), 0, frames - 1);
  const depolEnd = clamp(Math.floor(frames * clamp(params.depolEndFrac, 0, 1)), depolStart, frames - 1);

  const x = new Float32Array(frames * numParticles);
  const y = new Float32Array(frames * numParticles);
  const t = new Float32Array(frames);
  const V = new Float32Array(frames);
  const rng = new Rng(seed);
  for (let i = 0; i < frames; i += 1) t[i] = i * dt;

  const nLeft = Math.floor(numParticles * initialLeftFrac);
  for (let p = 0; p < numParticles; p += 1) {
    const onLeft = p < nLeft;
    x[p] = onLeft ? rng.uniform(-boxWidth / 2 + 1, leftWall - 1) : rng.uniform(rightWall + 1, boxWidth / 2 - 1);
    y[p] = rng.uniform(channelYMin - 5, channelYMax + 5);
  }

  const repelX = new Float32Array(numParticles);
  const repelY = new Float32Array(numParticles);
  for (let i = 1; i < frames; i += 1) {
    const prev = (i - 1) * numParticles;
    const curr = i * numParticles;
    repelX.fill(0);
    repelY.fill(0);

    for (let j = 0; j < numParticles; j += 1) {
      const xj = x[prev + j]; const yj = y[prev + j];
      let fx = 0; let fy = 0;
      for (let k = 0; k < numParticles; k += 1) {
        if (k === j) continue;
        const dxjk = xj - x[prev + k]; const dyjk = yj - y[prev + k];
        const d2 = dxjk * dxjk + dyjk * dyjk + 1e-3;
        const inv = 1 / d2;
        fx += dxjk * inv; fy += dyjk * inv;
      }
      repelX[j] = repulsionStrength * fx;
      repelY[j] = repulsionStrength * fy;
    }

    for (let p = 0; p < numParticles; p += 1) {
      const xPrev = x[prev + p]; const yPrev = y[prev + p];
      const dxdt = rng.normal(0, diffusionSd); const dydt = rng.normal(0, diffusionSd);
      const dx = negX - xPrev; const dy = negY - yPrev;
      const dist = Math.sqrt(dx * dx + dy * dy) + 1e-3;
      const attractX = electricStrength * dx / dist; const attractY = electricStrength * dy / dist;

      let depolX = 0; let depolY = 0;
      if (i >= depolStart && i <= depolEnd) {
        const ddx = xPrev - negX; const ddy = yPrev - negY;
        const dDist = Math.sqrt(ddx * ddx + ddy * ddy) + 1e-3;
        depolX = electricStrengthDepol * ddx / dDist;
        depolY = electricStrengthDepol * ddy / dDist;
      }

      let xNew = xPrev + (dxdt + attractX + repelX[p] + depolX) * dt;
      const yNew = clamp(yPrev + (dydt + attractY + repelY[p] + depolY) * dt, -boxHeight / 2, boxHeight / 2);
      const tryingToCrossLeft = xPrev > rightWall && xNew <= rightWall;
      const tryingToCrossRight = xPrev < leftWall && xNew >= leftWall;
      const inChannel = yPrev >= channelYMin && yPrev <= channelYMax;
      if ((tryingToCrossLeft || tryingToCrossRight) && !inChannel) xNew = xPrev;
      x[curr + p] = xNew; y[curr + p] = yNew;
    }

    let countLeft = 0, countRight = 0;
    for (let p = 0; p < numParticles; p += 1) {
      const xp = x[curr + p];
      if (xp < leftWall) countLeft += 1;
      else if (xp > rightWall) countRight += 1;
    }
    V[i] = -(countLeft - countRight);
  }

  return { x, y, frames, numParticles, dt, t, boxWidth, boxHeight, leftWall, rightWall, channelYMin, channelYMax, negX, negY, depolStart, depolEnd, V };
}

function drawTrace(canvas: HTMLCanvasElement, sim: SimResult, frameIndex: number, yLimit: number): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#03060b'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(120,170,255,0.10)'; ctx.lineWidth = 1;
  for (let i = 1; i < 10; i += 1) {
    const gx = (w * i) / 10; const gy = (h * i) / 10;
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  }
  const padL = 34 * dpr, padR = 10 * dpr, padT = 18 * dpr, padB = 18 * dpr;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const tMax = sim.t[sim.t.length - 1] || 1;
  const xMap = (tt: number) => padL + (tt / tMax) * plotW;
  const yMap = (yy: number) => padT + (1 - (yy + yLimit) / (2 * yLimit)) * plotH;
  ctx.strokeStyle = 'rgba(180,220,255,0.28)'; ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(padL, padT, plotW, plotH);
  ctx.beginPath(); ctx.moveTo(padL, yMap(0)); ctx.lineTo(padL + plotW, yMap(0)); ctx.stroke();
  ctx.strokeStyle = '#c68dff'; ctx.lineWidth = 1.7 * dpr;
  ctx.beginPath();
  const last = clamp(frameIndex, 0, sim.frames - 1);
  for (let i = 0; i <= last; i += 1) {
    const px = xMap(sim.t[i]); const py = yMap(sim.V[i]);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(232,243,255,0.92)'; ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.fillText('Membrane Potential Proxy', 12 * dpr, 14 * dpr);
}

function drawParticles(canvas: HTMLCanvasElement, sim: SimResult, frameIndex: number, pointSize: number): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#03060b'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(120,170,255,0.10)'; ctx.lineWidth = 1;
  for (let i = 1; i < 10; i += 1) {
    const gx = (w * i) / 10; const gy = (h * i) / 10;
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  }
  const toPx = (x: number, y: number): [number, number] => [((x + sim.boxWidth / 2) / sim.boxWidth) * w, h - ((y + sim.boxHeight / 2) / sim.boxHeight) * h];
  const [wl] = toPx(sim.leftWall, 0); const [wr] = toPx(sim.rightWall, 0);
  const [, cTop] = toPx(0, sim.channelYMax); const [, cBottom] = toPx(0, sim.channelYMin);
  ctx.fillStyle = 'rgba(200,220,255,0.08)'; ctx.fillRect(wl, 0, wr - wl, h);
  ctx.fillStyle = 'rgba(159,255,106,0.10)'; ctx.fillRect(wl, cTop, wr - wl, cBottom - cTop);
  ctx.strokeStyle = 'rgba(190,225,255,0.45)'; ctx.lineWidth = 1.5 * dpr;
  for (const xWall of [sim.leftWall, sim.rightWall]) {
    const [xpx] = toPx(xWall, 0); const [, yt] = toPx(0, sim.boxHeight / 2); const [, yct] = toPx(0, sim.channelYMax); const [, ycb] = toPx(0, sim.channelYMin); const [, yb] = toPx(0, -sim.boxHeight / 2);
    ctx.beginPath(); ctx.moveTo(xpx, yt); ctx.lineTo(xpx, yct); ctx.moveTo(xpx, ycb); ctx.lineTo(xpx, yb); ctx.stroke();
  }
  const [nx, ny] = toPx(sim.negX, sim.negY);
  ctx.fillStyle = 'rgba(255,96,96,0.95)'; ctx.beginPath(); ctx.arc(nx, ny, 4 * dpr, 0, Math.PI * 2); ctx.fill();
  if (frameIndex >= sim.depolStart && frameIndex <= sim.depolEnd) {
    ctx.fillStyle = 'rgba(114,255,178,0.95)'; ctx.beginPath(); ctx.arc(nx, ny, 7 * dpr, 0, Math.PI * 2); ctx.fill();
  }
  const idx = clamp(frameIndex, 0, sim.frames - 1) * sim.numParticles;
  const r = Math.max(0.8, pointSize) * dpr; ctx.fillStyle = 'rgba(245,178,72,0.92)';
  for (let p = 0; p < sim.numParticles; p += 1) { const [px, py] = toPx(sim.x[idx + p], sim.y[idx + p]); ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(232,243,255,0.92)'; ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`; ctx.fillText('Ion Movement with Channel', 12 * dpr, 14 * dpr);
}

const app = getEl<HTMLDivElement>('#app');
app.innerHTML = `
  <div class="site-shell">
    <div class="nav-line"><a href="./index.html">Back to index</a><span>•</span><span>Page: <code>inspect_resting_potential_1</code></span></div>
    <header class="page-head"><p class="eyebrow">Resting-Potential and Goldman-Style Extensions</p><h1>inspect_resting_potential_1</h1><p class="subtitle">Toy resting-potential simulation with a transient depolarizing input and a membrane-potential proxy trace.</p></header>
    <div class="sim-layout">
      <aside class="controls"><div class="panel">
        <div class="group"><p class="group-label">Basic Controls</p>
          <div class="button-row"><button id="toggle-play" class="primary">Pause</button><button id="rerun">Rerun</button><button id="reset-defaults" class="warn">Reset Defaults</button></div>
          <div class="button-row"><button id="rewind">Rewind</button><button id="random-seed">Randomize Seed</button></div>
          <div class="control-grid">
            <div class="field"><label for="num-particles">Particles</label><input id="num-particles" type="number" min="10" max="300" step="1" /></div>
            <div class="field"><label for="diffusion-sd">Diffusion SD</label><input id="diffusion-sd" type="number" min="0" max="20" step="0.01" /></div>
            <div class="field"><label for="electric-strength">Base electric strength</label><input id="electric-strength" type="number" min="0" max="10" step="0.01" /></div>
            <div class="field"><label for="electric-strength-depol">Depol strength</label><input id="electric-strength-depol" type="number" min="0" max="10" step="0.01" /></div>
            <div class="field"><label for="repulsion-strength">Repulsion strength</label><input id="repulsion-strength" type="number" min="0" max="10" step="0.01" /></div>
            <div class="field"><label for="channel-y-min">Channel y min</label><input id="channel-y-min" type="number" step="0.5" /></div>
            <div class="field"><label for="channel-y-max">Channel y max</label><input id="channel-y-max" type="number" step="0.5" /></div>
            <div class="field"><label for="playback-speed">Playback speed</label><input id="playback-speed" type="number" min="0.1" max="8" step="0.1" /></div>
            <div class="field"><label for="seed">Seed</label><input id="seed" type="number" min="0" max="4294967295" step="1" /></div>
          </div>
        </div>
        <details><summary>Advanced Controls</summary><div class="group" style="margin-top:8px;"><div class="control-grid">
          <div class="field"><label for="total-time">Total time T (ms)</label><input id="total-time" type="number" min="50" max="20000" step="10" /></div>
          <div class="field"><label for="dt">dt (ms)</label><input id="dt" type="number" min="0.05" max="20" step="0.05" /></div>
          <div class="field"><label for="box-width">Box width</label><input id="box-width" type="number" min="40" max="500" step="1" /></div>
          <div class="field"><label for="box-height">Box height</label><input id="box-height" type="number" min="40" max="500" step="1" /></div>
          <div class="field"><label for="wall-thickness">Wall thickness</label><input id="wall-thickness" type="number" min="0.5" max="50" step="0.5" /></div>
          <div class="field"><label for="neg-x">Source x</label><input id="neg-x" type="number" step="1" /></div>
          <div class="field"><label for="neg-y">Source y</label><input id="neg-y" type="number" step="1" /></div>
          <div class="field"><label for="initial-left-frac">Initial left fraction</label><input id="initial-left-frac" type="number" min="0" max="1" step="0.01" /></div>
          <div class="field"><label for="depol-start-frac">Depol start frac</label><input id="depol-start-frac" type="number" min="0" max="1" step="0.01" /></div>
          <div class="field"><label for="depol-end-frac">Depol end frac</label><input id="depol-end-frac" type="number" min="0" max="1" step="0.01" /></div>
          <div class="field"><label for="trace-ylim">Trace y-limit</label><input id="trace-ylim" type="number" min="10" max="500" step="1" /></div>
          <div class="field"><label for="point-size">Point size</label><input id="point-size" type="number" min="0.5" max="8" step="0.25" /></div>
          <div class="field"><label for="target-fps">Playback FPS</label><input id="target-fps" type="number" min="1" max="120" step="1" /></div>
        </div></div></details>
        <div class="group"><p class="group-label">Status</p><dl class="status-list">
          <dt>Frame</dt><dd id="status-frame">0</dd><dt>Time (ms)</dt><dd id="status-time">0.0</dd>
          <dt>V proxy</dt><dd id="status-v">0</dd><dt>dt</dt><dd id="status-dt">0</dd>
          <dt>Step SD</dt><dd id="status-step-sd">0</dd><dt>Seed</dt><dd id="status-seed">0</dd>
        </dl></div>
        <div class="group"><p class="group-label">Equation + Transient Depolarization</p><div class="equation-card"><pre class="equation" id="equation-block"></pre><p>Middle-run depolarizing input is modeled as a temporary repulsive source at the same position as the negative source.</p></div></div>
      </div></aside>
      <section class="panel canvas-panel">
        <div class="canvas-head"><h2>Resting-Potential Toy Model With Transient Depolarization</h2><span class="tiny">Qualitative browser port of <code>inspect_resting_potential_1.py</code></span></div>
        <div class="canvas-grid-2">
          <div class="canvas-subpanel"><div class="subhead"><h3>Particle Dynamics</h3><span class="tiny">Green marker appears during depolarizing input window</span></div><canvas id="particle-canvas"></canvas></div>
          <div class="canvas-subpanel"><div class="subhead"><h3>Membrane Potential Proxy</h3><span class="tiny">V = -(#left - #right)</span></div><canvas id="trace-canvas"></canvas></div>
        </div>
        <div class="legend"><span><span class="swatch" style="background:#f5b248"></span>Particles</span><span><span class="swatch" style="background:#ff6060"></span>Negative source</span><span><span class="swatch" style="background:#72ffb2"></span>Depolarizing source (active window)</span></div>
      </section>
    </div>
  </div>
`;

const particleCanvas = getEl<HTMLCanvasElement>('#particle-canvas');
const traceCanvas = getEl<HTMLCanvasElement>('#trace-canvas');
const equationBlock = getEl<HTMLElement>('#equation-block');
const inputs = {
  numParticles: getEl<HTMLInputElement>('#num-particles'), diffusionSd: getEl<HTMLInputElement>('#diffusion-sd'), electricStrength: getEl<HTMLInputElement>('#electric-strength'), electricStrengthDepol: getEl<HTMLInputElement>('#electric-strength-depol'), repulsionStrength: getEl<HTMLInputElement>('#repulsion-strength'),
  channelYMin: getEl<HTMLInputElement>('#channel-y-min'), channelYMax: getEl<HTMLInputElement>('#channel-y-max'), playbackSpeed: getEl<HTMLInputElement>('#playback-speed'), seed: getEl<HTMLInputElement>('#seed'), totalTime: getEl<HTMLInputElement>('#total-time'), dt: getEl<HTMLInputElement>('#dt'), boxWidth: getEl<HTMLInputElement>('#box-width'), boxHeight: getEl<HTMLInputElement>('#box-height'), wallThickness: getEl<HTMLInputElement>('#wall-thickness'), negX: getEl<HTMLInputElement>('#neg-x'), negY: getEl<HTMLInputElement>('#neg-y'), initialLeftFrac: getEl<HTMLInputElement>('#initial-left-frac'), depolStartFrac: getEl<HTMLInputElement>('#depol-start-frac'), depolEndFrac: getEl<HTMLInputElement>('#depol-end-frac'), traceYLim: getEl<HTMLInputElement>('#trace-ylim'), pointSize: getEl<HTMLInputElement>('#point-size'), targetFps: getEl<HTMLInputElement>('#target-fps')
};
const statusEls = { frame: getEl<HTMLElement>('#status-frame'), time: getEl<HTMLElement>('#status-time'), v: getEl<HTMLElement>('#status-v'), dt: getEl<HTMLElement>('#status-dt'), stepSd: getEl<HTMLElement>('#status-step-sd'), seed: getEl<HTMLElement>('#status-seed') };
const buttons = { togglePlay: getEl<HTMLButtonElement>('#toggle-play'), rerun: getEl<HTMLButtonElement>('#rerun'), resetDefaults: getEl<HTMLButtonElement>('#reset-defaults'), rewind: getEl<HTMLButtonElement>('#rewind'), randomSeed: getEl<HTMLButtonElement>('#random-seed') };

let simParams: SimParams = { ...defaultSim };
let displayParams: DisplayParams = { ...defaultDisplay };
let currentSeed = randomSeed();
let sim = simulate(simParams, currentSeed);
let isPlaying = true;
let playhead = 0;
let lastTs = performance.now();

function writeInputs(): void {
  setNumberInput(inputs.numParticles, simParams.numParticles, 0); setNumberInput(inputs.diffusionSd, simParams.diffusionSd, 3); setNumberInput(inputs.electricStrength, simParams.electricStrength, 3); setNumberInput(inputs.electricStrengthDepol, simParams.electricStrengthDepol, 3); setNumberInput(inputs.repulsionStrength, simParams.repulsionStrength, 3);
  setNumberInput(inputs.channelYMin, simParams.channelYMin, 2); setNumberInput(inputs.channelYMax, simParams.channelYMax, 2); setNumberInput(inputs.playbackSpeed, displayParams.playbackSpeed, 2); setNumberInput(inputs.seed, currentSeed, 0); setNumberInput(inputs.totalTime, simParams.T, 0); setNumberInput(inputs.dt, simParams.dt, 3);
  setNumberInput(inputs.boxWidth, simParams.boxWidth, 1); setNumberInput(inputs.boxHeight, simParams.boxHeight, 1); setNumberInput(inputs.wallThickness, simParams.wallThickness, 2); setNumberInput(inputs.negX, simParams.negX, 1); setNumberInput(inputs.negY, simParams.negY, 1); setNumberInput(inputs.initialLeftFrac, simParams.initialLeftFrac, 2);
  setNumberInput(inputs.depolStartFrac, simParams.depolStartFrac, 2); setNumberInput(inputs.depolEndFrac, simParams.depolEndFrac, 2); setNumberInput(inputs.traceYLim, displayParams.traceYLimit, 0); setNumberInput(inputs.pointSize, displayParams.pointSize, 2); setNumberInput(inputs.targetFps, displayParams.targetFps, 0);
}
function readSimInputs(): SimParams {
  const boxHeight = clamp(Number(inputs.boxHeight.value) || defaultSim.boxHeight, 40, 500); const boxWidth = clamp(Number(inputs.boxWidth.value) || defaultSim.boxWidth, 40, 500);
  return {
    T: clamp(Number(inputs.totalTime.value) || defaultSim.T, 50, 20000), dt: clamp(Number(inputs.dt.value) || defaultSim.dt, 0.05, 20), numParticles: clamp(Math.round(Number(inputs.numParticles.value) || defaultSim.numParticles), 10, 300), boxWidth, boxHeight,
    wallThickness: clamp(Number(inputs.wallThickness.value) || defaultSim.wallThickness, 0.5, 50), diffusionSd: clamp(Number(inputs.diffusionSd.value) || 0, 0, 20), electricStrength: clamp(Number(inputs.electricStrength.value) || 0, 0, 10), electricStrengthDepol: clamp(Number(inputs.electricStrengthDepol.value) || 0, 0, 10), repulsionStrength: clamp(Number(inputs.repulsionStrength.value) || 0, 0, 10),
    channelYMin: clamp(Number(inputs.channelYMin.value) || 0, -boxHeight / 2, boxHeight / 2), channelYMax: clamp(Number(inputs.channelYMax.value) || 0, -boxHeight / 2, boxHeight / 2),
    negX: clamp(Number(inputs.negX.value) || defaultSim.negX, -boxWidth / 2, boxWidth / 2), negY: clamp(Number(inputs.negY.value) || defaultSim.negY, -boxHeight / 2, boxHeight / 2),
    initialLeftFrac: clamp(Number(inputs.initialLeftFrac.value) || defaultSim.initialLeftFrac, 0, 1), depolStartFrac: clamp(Number(inputs.depolStartFrac.value) || defaultSim.depolStartFrac, 0, 1), depolEndFrac: clamp(Number(inputs.depolEndFrac.value) || defaultSim.depolEndFrac, 0, 1)
  };
}
function readDisplayInputs(): DisplayParams { return { pointSize: clamp(Number(inputs.pointSize.value) || defaultDisplay.pointSize, 0.5, 8), playbackSpeed: clamp(Number(inputs.playbackSpeed.value) || defaultDisplay.playbackSpeed, 0.1, 8), targetFps: clamp(Math.round(Number(inputs.targetFps.value) || defaultDisplay.targetFps), 1, 120), traceYLimit: clamp(Number(inputs.traceYLim.value) || defaultDisplay.traceYLimit, 10, 500) }; }
function updateEquationText(): void {
  const stepSd = simParams.diffusionSd * simParams.dt;
  equationBlock.innerHTML = [
    '<span class="accent">Euler update with base attraction + repulsion + transient depolarizing input</span>',
    'attract = electric_strength · (neg_pos - pos) / (||neg_pos - pos|| + ε)',
    'repel = repulsion_strength · Σ_k≠j (pos_j - pos_k) / (||pos_j - pos_k||² + ε)',
    'During depolarizing window: depol_force = electric_strength_depol · (pos - depol_pos) / (||pos - depol_pos|| + ε)',
    'x_new = x_old + (dxdt + attract_x + repel_x + depol_x) · dt',
    'y_new = clamp(y_old + (dydt + attract_y + repel_y + depol_y) · dt, -H/2, H/2)',
    'dxdt, dydt ~ Normal(0, diffusionSd²)',
    '',
    '<span class="accent-2">Membrane rule + voltage proxy</span>',
    'Wall crossing only if y_old ∈ [channel_y_min, channel_y_max] ; else x_new := x_old',
    'V_proxy = -(#left - #right)',
    `Per-step Brownian displacement SD = diffusionSd × dt = ${stepSd.toFixed(3)}`
  ].join('\n');
}
function updateStatus(frameIndex: number): void {
  statusEls.frame.textContent = `${frameIndex + 1}`; statusEls.time.textContent = sim.t[frameIndex].toFixed(1); statusEls.v.textContent = sim.V[frameIndex].toFixed(0); statusEls.dt.textContent = sim.dt.toFixed(2); statusEls.stepSd.textContent = (simParams.diffusionSd * simParams.dt).toFixed(3); statusEls.seed.textContent = `${currentSeed >>> 0}`;
}
function draw(frameIndex: number): void { drawParticles(particleCanvas, sim, frameIndex, displayParams.pointSize); drawTrace(traceCanvas, sim, frameIndex, displayParams.traceYLimit); }
function rerunFromInputs(rewind = true): void {
  simParams = readSimInputs(); displayParams = readDisplayInputs(); currentSeed = clamp(Math.floor(Number(inputs.seed.value) || currentSeed), 0, 0xffffffff) >>> 0; sim = simulate(simParams, currentSeed);
  simParams = { ...simParams, boxWidth: sim.boxWidth, boxHeight: sim.boxHeight, wallThickness: sim.rightWall - sim.leftWall, channelYMin: sim.channelYMin, channelYMax: sim.channelYMax, negX: sim.negX, negY: sim.negY, depolStartFrac: sim.depolStart / Math.max(1, sim.frames - 1), depolEndFrac: sim.depolEnd / Math.max(1, sim.frames - 1) };
  if (rewind) playhead = 0; writeInputs(); updateEquationText();
}
function refreshDisplayFromInputs(): void { displayParams = readDisplayInputs(); writeInputs(); }
function setPlaying(next: boolean): void { isPlaying = next; buttons.togglePlay.textContent = isPlaying ? 'Pause' : 'Play'; }

writeInputs(); updateEquationText(); updateStatus(0); draw(0);
buttons.togglePlay.addEventListener('click', () => setPlaying(!isPlaying));
buttons.rerun.addEventListener('click', () => rerunFromInputs(true));
buttons.rewind.addEventListener('click', () => { playhead = 0; updateStatus(0); draw(0); });
buttons.randomSeed.addEventListener('click', () => { currentSeed = randomSeed(); setNumberInput(inputs.seed, currentSeed, 0); rerunFromInputs(true); });
buttons.resetDefaults.addEventListener('click', () => { simParams = { ...defaultSim }; displayParams = { ...defaultDisplay }; currentSeed = randomSeed(); writeInputs(); rerunFromInputs(true); setPlaying(true); });
const simEls = [inputs.numParticles, inputs.diffusionSd, inputs.electricStrength, inputs.electricStrengthDepol, inputs.repulsionStrength, inputs.channelYMin, inputs.channelYMax, inputs.seed, inputs.totalTime, inputs.dt, inputs.boxWidth, inputs.boxHeight, inputs.wallThickness, inputs.negX, inputs.negY, inputs.initialLeftFrac, inputs.depolStartFrac, inputs.depolEndFrac];
for (const el of simEls) el.addEventListener('change', () => rerunFromInputs(el !== inputs.seed));
for (const el of [inputs.playbackSpeed, inputs.traceYLim, inputs.pointSize, inputs.targetFps]) el.addEventListener('change', () => refreshDisplayFromInputs());
window.addEventListener('resize', () => draw(Math.floor(playhead)));
function animate(ts: number): void {
  const dtSec = (ts - lastTs) / 1000; lastTs = ts;
  if (isPlaying && sim.frames > 0) { playhead += dtSec * displayParams.targetFps * displayParams.playbackSpeed; if (playhead >= sim.frames) playhead %= sim.frames; }
  const frameIndex = clamp(Math.floor(playhead), 0, Math.max(0, sim.frames - 1)); updateStatus(frameIndex); draw(frameIndex); requestAnimationFrame(animate);
}
requestAnimationFrame((ts) => { lastTs = ts; animate(ts); });
