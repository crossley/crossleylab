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
  electricStrength: number;
  repulsionStrength: number;
  negX: number;
  negY: number;
}

interface DisplayParams {
  pointSize: number;
  playbackSpeed: number;
  targetFps: number;
}

interface SimResult {
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
  electricStrength: 0.3,
  repulsionStrength: 0.2,
  negX: -35,
  negY: 0
};

const defaultDisplay: DisplayParams = {
  pointSize: 2.4,
  playbackSpeed: 1,
  targetFps: 30
};

function clamp(v: number, min: number, max: number): number { return Math.min(max, Math.max(min, v)); }
function normalizeBounds(a: number, b: number, boxHeight: number): [number, number] {
  const half = boxHeight / 2;
  const lo = clamp(Math.min(a, b), -half, half);
  const hi = clamp(Math.max(a, b), -half, half);
  return hi - lo < 0.5 ? [lo, Math.min(half, lo + 0.5)] : [lo, hi];
}
function randomSeed(): number { return (Math.random() * 0xffffffff) >>> 0; }
function getEl<T extends Element>(s: string): T { const el = document.querySelector<T>(s); if (!el) throw new Error(`Missing ${s}`); return el; }
function setNumberInput(input: HTMLInputElement, value: number, digits = 3): void {
  input.value = Number.isInteger(value) ? String(value) : Number(value.toFixed(digits)).toString();
}

function simulate(params: SimParams, seed: number): SimResult {
  const T = clamp(Math.round(params.T), 20, 20000);
  const dt = clamp(params.dt, 0.05, 20);
  const numParticles = clamp(Math.round(params.numParticles), 1, 1000);
  const boxWidth = clamp(params.boxWidth, 20, 500);
  const boxHeight = clamp(params.boxHeight, 20, 500);
  const wallThickness = clamp(params.wallThickness, 0.5, Math.min(50, boxWidth - 2));
  const diffusionSd = clamp(params.diffusionSd, 0, 20);
  const electricStrength = clamp(params.electricStrength, 0, 10);
  const repulsionStrength = clamp(params.repulsionStrength, 0, 10);
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

  const repelX = new Float32Array(numParticles);
  const repelY = new Float32Array(numParticles);

  for (let i = 1; i < frames; i += 1) {
    const prev = (i - 1) * numParticles;
    const curr = i * numParticles;

    repelX.fill(0);
    repelY.fill(0);

    for (let j = 0; j < numParticles; j += 1) {
      const xj = x[prev + j];
      const yj = y[prev + j];
      let fx = 0;
      let fy = 0;
      for (let k = 0; k < numParticles; k += 1) {
        if (k === j) continue;
        const dx = xj - x[prev + k];
        const dy = yj - y[prev + k];
        const d2 = dx * dx + dy * dy + 1e-3;
        const invD2 = 1 / d2;
        fx += dx * invD2;
        fy += dy * invD2;
      }
      repelX[j] = repulsionStrength * fx;
      repelY[j] = repulsionStrength * fy;
    }

    for (let p = 0; p < numParticles; p += 1) {
      const xPrev = x[prev + p];
      const yPrev = y[prev + p];
      const dxdt = rng.normal(0, diffusionSd);
      const dydt = rng.normal(0, diffusionSd);
      const dx = negX - xPrev;
      const dy = negY - yPrev;
      const dist = Math.sqrt(dx * dx + dy * dy) + 1e-3;
      const attractX = electricStrength * dx / dist;
      const attractY = electricStrength * dy / dist;
      let xNew = xPrev + (dxdt + attractX + repelX[p]) * dt;
      const yNew = clamp(yPrev + (dydt + attractY + repelY[p]) * dt, -boxHeight / 2, boxHeight / 2);

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
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
}
function worldToCanvas(x: number, y: number, sim: SimResult, w: number, h: number): [number, number] {
  return [((x + sim.boxWidth / 2) / sim.boxWidth) * w, h - ((y + sim.boxHeight / 2) / sim.boxHeight) * h];
}

function drawFrame(canvas: HTMLCanvasElement, sim: SimResult, frame: number, display: DisplayParams): void {
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

  const [wl] = worldToCanvas(sim.leftWall, 0, sim, w, h);
  const [wr] = worldToCanvas(sim.rightWall, 0, sim, w, h);
  const [, cTop] = worldToCanvas(0, sim.channelYMax, sim, w, h);
  const [, cBottom] = worldToCanvas(0, sim.channelYMin, sim, w, h);
  ctx.fillStyle = 'rgba(200,220,255,0.08)';
  ctx.fillRect(wl, 0, wr - wl, h);
  ctx.fillStyle = 'rgba(159,255,106,0.10)';
  ctx.fillRect(wl, cTop, wr - wl, cBottom - cTop);

  ctx.strokeStyle = 'rgba(190,225,255,0.45)';
  ctx.lineWidth = 1.5 * dpr;
  for (const xWall of [sim.leftWall, sim.rightWall]) {
    const [xpx] = worldToCanvas(xWall, 0, sim, w, h);
    const [, yt] = worldToCanvas(0, sim.boxHeight / 2, sim, w, h);
    const [, yct] = worldToCanvas(0, sim.channelYMax, sim, w, h);
    const [, ycb] = worldToCanvas(0, sim.channelYMin, sim, w, h);
    const [, yb] = worldToCanvas(0, -sim.boxHeight / 2, sim, w, h);
    ctx.beginPath();
    ctx.moveTo(xpx, yt); ctx.lineTo(xpx, yct);
    ctx.moveTo(xpx, ycb); ctx.lineTo(xpx, yb);
    ctx.stroke();
  }

  const [negPx, negPy] = worldToCanvas(sim.negX, sim.negY, sim, w, h);
  ctx.fillStyle = 'rgba(66,200,255,0.95)';
  ctx.beginPath(); ctx.arc(negPx, negPy, 4 * dpr, 0, Math.PI * 2); ctx.fill();

  const offset = clamp(frame, 0, sim.frames - 1) * sim.numParticles;
  const r = Math.max(0.8, display.pointSize) * dpr;
  ctx.fillStyle = 'rgba(245,178,72,0.92)';
  for (let p = 0; p < sim.numParticles; p += 1) {
    const [px, py] = worldToCanvas(sim.x[offset + p], sim.y[offset + p], sim, w, h);
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = 'rgba(232,243,255,0.92)';
  ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.fillText('Repulsion + Electrical Gradient Through Channel', 12 * dpr, 20 * dpr);
}

function sideCounts(sim: SimResult, frame: number): { left: number; right: number } {
  const idx = clamp(frame, 0, sim.frames - 1) * sim.numParticles;
  let left = 0; let right = 0;
  for (let p = 0; p < sim.numParticles; p += 1) {
    const x = sim.x[idx + p];
    if (x < sim.leftWall) left += 1;
    else if (x > sim.rightWall) right += 1;
  }
  return { left, right };
}

const app = getEl<HTMLDivElement>('#app');
app.innerHTML = `
  <div class="site-shell">
    <div class="nav-line"><a href="./index.html">Back to index</a><span>•</span><span>Page: <code>inspect_electrochemical_2</code></span></div>
    <header class="page-head">
      <p class="eyebrow">Adding Electrical and Interaction Forces</p>
      <h1>inspect_electrochemical_2</h1>
      <p class="subtitle">Electrically biased diffusion through a channel with particle-particle repulsion (crowding term).</p>
    </header>
    <div class="sim-layout">
      <aside class="controls">
        <div class="panel">
          <div class="group">
            <p class="group-label">Basic Controls</p>
            <div class="button-row"><button id="toggle-play" class="primary">Pause</button><button id="rerun">Rerun</button><button id="reset-defaults" class="warn">Reset Defaults</button></div>
            <div class="button-row"><button id="rewind">Rewind</button><button id="random-seed">Randomize Seed</button></div>
            <div class="control-grid">
              <div class="field"><label for="num-particles">Particles</label><input id="num-particles" type="number" min="1" max="1000" step="1" /></div>
              <div class="field"><label for="diffusion-sd">Diffusion SD</label><input id="diffusion-sd" type="number" min="0" max="20" step="0.05" /></div>
              <div class="field"><label for="electric-strength">Electric strength</label><input id="electric-strength" type="number" min="0" max="10" step="0.01" /></div>
              <div class="field"><label for="repulsion-strength">Repulsion strength</label><input id="repulsion-strength" type="number" min="0" max="10" step="0.01" /></div>
              <div class="field"><label for="channel-y-min">Channel y min</label><input id="channel-y-min" type="number" step="0.5" /></div>
              <div class="field"><label for="channel-y-max">Channel y max</label><input id="channel-y-max" type="number" step="0.5" /></div>
              <div class="field"><label for="playback-speed">Playback speed</label><input id="playback-speed" type="number" min="0.1" max="8" step="0.1" /></div>
              <div class="field"><label for="seed">Seed</label><input id="seed" type="number" min="0" max="4294967295" step="1" /></div>
            </div>
          </div>
          <details><summary>Advanced Controls</summary><div class="group" style="margin-top:8px;"><div class="control-grid">
            <div class="field"><label for="total-time">Total time T (ms)</label><input id="total-time" type="number" min="20" max="20000" step="10" /></div>
            <div class="field"><label for="dt">dt (ms)</label><input id="dt" type="number" min="0.05" max="20" step="0.05" /></div>
            <div class="field"><label for="box-width">Box width</label><input id="box-width" type="number" min="20" max="500" step="1" /></div>
            <div class="field"><label for="box-height">Box height</label><input id="box-height" type="number" min="20" max="500" step="1" /></div>
            <div class="field"><label for="wall-thickness">Wall thickness</label><input id="wall-thickness" type="number" min="0.5" max="50" step="0.5" /></div>
            <div class="field"><label for="neg-x">Neg charge x</label><input id="neg-x" type="number" step="1" /></div>
            <div class="field"><label for="neg-y">Neg charge y</label><input id="neg-y" type="number" step="1" /></div>
            <div class="field"><label for="point-size">Point size</label><input id="point-size" type="number" min="0.5" max="8" step="0.25" /></div>
            <div class="field"><label for="target-fps">Playback FPS</label><input id="target-fps" type="number" min="1" max="120" step="1" /></div>
          </div></div></details>
          <div class="group"><p class="group-label">Status</p><dl class="status-list">
            <dt>Frame</dt><dd id="status-frame">0</dd><dt>Time (ms)</dt><dd id="status-time">0.0</dd>
            <dt>Left</dt><dd id="status-left">0</dd><dt>Right</dt><dd id="status-right">0</dd>
            <dt>dt</dt><dd id="status-dt">0</dd><dt>Step SD</dt><dd id="status-step-sd">0</dd>
            <dt>Seed</dt><dd id="status-seed">0</dd><dt>Frames total</dt><dd id="status-frames">0</dd>
          </dl></div>
          <div class="group"><p class="group-label">Equation + Force Terms</p><div class="equation-card"><pre class="equation" id="equation-block"></pre>
            <p>Brownian motion and electric drift are combined with a pairwise repulsion term (O(N²) in this implementation).</p>
          </div></div>
        </div>
      </aside>
      <section class="panel canvas-panel">
        <div class="canvas-head"><h2>Single-Channel Electro-Diffusion With Repulsion</h2><span class="tiny">Qualitative browser port of <code>inspect_electrochemical_2.py</code></span></div>
        <canvas id="sim-canvas" aria-label="Electrochemical diffusion with repulsion"></canvas>
        <div class="legend"><span><span class="swatch" style="background:#f5b248"></span>Particles</span><span><span class="swatch" style="background:#42c8ff"></span>Negative attractor</span><span><span class="swatch" style="background:#9fff6a"></span>Open channel</span></div>
      </section>
    </div>
  </div>
`;

const canvas = getEl<HTMLCanvasElement>('#sim-canvas');
const equationBlock = getEl<HTMLElement>('#equation-block');
const inputs = {
  numParticles: getEl<HTMLInputElement>('#num-particles'), diffusionSd: getEl<HTMLInputElement>('#diffusion-sd'),
  electricStrength: getEl<HTMLInputElement>('#electric-strength'), repulsionStrength: getEl<HTMLInputElement>('#repulsion-strength'),
  channelYMin: getEl<HTMLInputElement>('#channel-y-min'), channelYMax: getEl<HTMLInputElement>('#channel-y-max'),
  playbackSpeed: getEl<HTMLInputElement>('#playback-speed'), seed: getEl<HTMLInputElement>('#seed'), totalTime: getEl<HTMLInputElement>('#total-time'), dt: getEl<HTMLInputElement>('#dt'),
  boxWidth: getEl<HTMLInputElement>('#box-width'), boxHeight: getEl<HTMLInputElement>('#box-height'), wallThickness: getEl<HTMLInputElement>('#wall-thickness'),
  negX: getEl<HTMLInputElement>('#neg-x'), negY: getEl<HTMLInputElement>('#neg-y'), pointSize: getEl<HTMLInputElement>('#point-size'), targetFps: getEl<HTMLInputElement>('#target-fps')
};
const statusEls = {
  frame: getEl<HTMLElement>('#status-frame'), time: getEl<HTMLElement>('#status-time'), left: getEl<HTMLElement>('#status-left'), right: getEl<HTMLElement>('#status-right'),
  dt: getEl<HTMLElement>('#status-dt'), stepSd: getEl<HTMLElement>('#status-step-sd'), seed: getEl<HTMLElement>('#status-seed'), frames: getEl<HTMLElement>('#status-frames')
};
const buttons = {
  togglePlay: getEl<HTMLButtonElement>('#toggle-play'), rerun: getEl<HTMLButtonElement>('#rerun'), resetDefaults: getEl<HTMLButtonElement>('#reset-defaults'),
  rewind: getEl<HTMLButtonElement>('#rewind'), randomSeed: getEl<HTMLButtonElement>('#random-seed')
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
  setNumberInput(inputs.diffusionSd, simParams.diffusionSd, 3);
  setNumberInput(inputs.electricStrength, simParams.electricStrength, 3);
  setNumberInput(inputs.repulsionStrength, simParams.repulsionStrength, 3);
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
    numParticles: clamp(Math.round(Number(inputs.numParticles.value) || defaultSim.numParticles), 1, 1000),
    boxWidth, boxHeight,
    wallThickness: clamp(Number(inputs.wallThickness.value) || defaultSim.wallThickness, 0.5, 50),
    diffusionSd: clamp(Number(inputs.diffusionSd.value) || 0, 0, 20),
    channelYMin: clamp(Number(inputs.channelYMin.value) || 0, -boxHeight / 2, boxHeight / 2),
    channelYMax: clamp(Number(inputs.channelYMax.value) || 0, -boxHeight / 2, boxHeight / 2),
    electricStrength: clamp(Number(inputs.electricStrength.value) || 0, 0, 10),
    repulsionStrength: clamp(Number(inputs.repulsionStrength.value) || 0, 0, 10),
    negX: clamp(Number(inputs.negX.value) || defaultSim.negX, -boxWidth / 2, boxWidth / 2),
    negY: clamp(Number(inputs.negY.value) || defaultSim.negY, -boxHeight / 2, boxHeight / 2)
  };
}
function readDisplayInputs(): DisplayParams {
  return { pointSize: clamp(Number(inputs.pointSize.value) || defaultDisplay.pointSize, 0.5, 8), playbackSpeed: clamp(Number(inputs.playbackSpeed.value) || defaultDisplay.playbackSpeed, 0.1, 8), targetFps: clamp(Math.round(Number(inputs.targetFps.value) || defaultDisplay.targetFps), 1, 120) };
}
function updateEquationText(): void {
  const stepSd = simParams.diffusionSd * simParams.dt;
  equationBlock.innerHTML = [
    '<span class="accent">Euler step with drift + repulsion</span>',
    'attract = electric_strength · (neg_pos - pos) / (||neg_pos - pos|| + ε)',
    'repel_j = repulsion_strength · Σ_k≠j (pos_j - pos_k) / (||pos_j - pos_k||² + ε)',
    'x_new = x_old + (dxdt + attract_x + repel_x) · dt',
    'y_new = clamp(y_old + (dydt + attract_y + repel_y) · dt, -H/2, H/2)',
    'dxdt, dydt ~ Normal(0, diffusionSd²)',
    '',
    '<span class="accent-2">Channel rule</span>',
    'Wall crossing only if y_old ∈ [channel_y_min, channel_y_max] ; else x_new := x_old',
    '',
    `Per-step Brownian displacement SD = diffusionSd × dt = ${stepSd.toFixed(3)}`,
    `electric_strength = ${simParams.electricStrength.toFixed(3)}, repulsion_strength = ${simParams.repulsionStrength.toFixed(3)}`
  ].join('\n');
}
function updateStatus(frameIndex: number): void {
  const c = sideCounts(simResult, frameIndex);
  statusEls.frame.textContent = `${frameIndex + 1}`;
  statusEls.time.textContent = (frameIndex * simResult.dt).toFixed(1);
  statusEls.left.textContent = `${c.left}`;
  statusEls.right.textContent = `${c.right}`;
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
  simParams = { ...simParams, boxWidth: simResult.boxWidth, boxHeight: simResult.boxHeight, wallThickness: simResult.rightWall - simResult.leftWall, channelYMin: simResult.channelYMin, channelYMax: simResult.channelYMax, negX: simResult.negX, negY: simResult.negY };
  if (rewind) playhead = 0;
  writeInputs(); updateEquationText();
}
function refreshDisplayFromInputs(): void { displayParams = readDisplayInputs(); writeInputs(); }
function setPlaying(next: boolean): void { isPlaying = next; buttons.togglePlay.textContent = isPlaying ? 'Pause' : 'Play'; }

writeInputs(); updateEquationText(); updateStatus(0); drawFrame(canvas, simResult, 0, displayParams);
buttons.togglePlay.addEventListener('click', () => setPlaying(!isPlaying));
buttons.rerun.addEventListener('click', () => rerunFromInputs(true));
buttons.rewind.addEventListener('click', () => { playhead = 0; updateStatus(0); drawFrame(canvas, simResult, 0, displayParams); });
buttons.randomSeed.addEventListener('click', () => { currentSeed = randomSeed(); setNumberInput(inputs.seed, currentSeed, 0); rerunFromInputs(true); });
buttons.resetDefaults.addEventListener('click', () => { simParams = { ...defaultSim }; displayParams = { ...defaultDisplay }; currentSeed = randomSeed(); writeInputs(); rerunFromInputs(true); setPlaying(true); });

const simKeys: Array<keyof typeof inputs> = ['numParticles','diffusionSd','electricStrength','repulsionStrength','channelYMin','channelYMax','seed','totalTime','dt','boxWidth','boxHeight','wallThickness','negX','negY'];
for (const key of simKeys) inputs[key].addEventListener('change', () => rerunFromInputs(key !== 'seed'));
for (const key of ['playbackSpeed','pointSize','targetFps'] as const) inputs[key].addEventListener('change', () => refreshDisplayFromInputs());
window.addEventListener('resize', () => drawFrame(canvas, simResult, Math.floor(playhead), displayParams));

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
requestAnimationFrame((ts) => { lastTs = ts; animate(ts); });
