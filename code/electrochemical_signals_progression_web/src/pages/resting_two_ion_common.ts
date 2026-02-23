import '../style.css';

type IonType = 0 | 1;
type FieldMode = 'point' | 'wall';

interface VariantConfig {
  pageId: string;
  title: string;
  subtitle: string;
  fieldMode: FieldMode;
  withGoldman: boolean;
  type1Color: string;
  type1Label: string;
  negMarkerLabel: string;
  defaultNumParticles: number;
  defaultRepulsionStrength: number;
  defaultElectricStrength: number;
  defaultDt?: number;
  defaultT?: number;
  defaultNegX?: number;
  goldmanScaleDefault?: number;
}

interface SimParams {
  T: number;
  dt: number;
  numParticles: number;
  type0Fraction: number;
  boxWidth: number;
  boxHeight: number;
  wallThickness: number;
  diffusionSd: number;
  electricStrength: number;
  repulsionStrength: number;
  negX: number;
  negY: number;
  type0YMin: number;
  type0YMax: number;
  type1YMin: number;
  type1YMax: number;
  initialLeftFrac: number;
  goldmanScale: number;
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
  types: Uint8Array;
  charges: Int8Array;
  frames: number;
  numParticles: number;
  dt: number;
  t: Float32Array;
  boxWidth: number;
  boxHeight: number;
  leftWall: number;
  rightWall: number;
  negX: number;
  negY: number;
  type0YMin: number;
  type0YMax: number;
  type1YMin: number;
  type1YMax: number;
  VA: Float32Array;
  VB: Float32Array;
  VTotal: Float32Array;
  VGoldman?: Float32Array;
}

class Rng {
  private state: number;
  private spare: number | null = null;
  constructor(seed: number) { this.state = seed >>> 0 || 1; }
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 0x100000000;
  }
  uniform(min: number, max: number): number { return min + (max - min) * this.next(); }
  normal(mean = 0, sd = 1): number {
    if (this.spare !== null) { const out = this.spare; this.spare = null; return mean + sd * out; }
    let u = 0; let v = 0;
    while (u <= Number.EPSILON) u = this.next();
    while (v <= Number.EPSILON) v = this.next();
    const mag = Math.sqrt(-2 * Math.log(u));
    const z0 = mag * Math.cos(2 * Math.PI * v);
    const z1 = mag * Math.sin(2 * Math.PI * v);
    this.spare = z1;
    return mean + sd * z0;
  }
}

function clamp(v: number, min: number, max: number): number { return Math.min(max, Math.max(min, v)); }
function randomSeed(): number { return (Math.random() * 0xffffffff) >>> 0; }
function getEl<T extends Element>(s: string): T { const el = document.querySelector<T>(s); if (!el) throw new Error(`Missing ${s}`); return el; }
function setNumberInput(input: HTMLInputElement, value: number, digits = 3): void {
  input.value = Number.isInteger(value) ? String(value) : Number(value.toFixed(digits)).toString();
}
function normalizeBounds(a: number, b: number, boxHeight: number): [number, number] {
  const half = boxHeight / 2;
  const lo = clamp(Math.min(a, b), -half, half);
  const hi = clamp(Math.max(a, b), -half, half);
  return hi - lo < 0.5 ? [lo, Math.min(half, lo + 0.5)] : [lo, hi];
}

function drawTraceCanvas(
  canvas: HTMLCanvasElement,
  t: Float32Array,
  frameIndex: number,
  series: Array<{ data: Float32Array; color: string; dashed?: boolean }>,
  tMax: number,
  yLimit: number,
  title: string
): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
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

  const padL = 36 * dpr;
  const padR = 10 * dpr;
  const padT = 18 * dpr;
  const padB = 18 * dpr;
  const plotW = Math.max(1, w - padL - padR);
  const plotH = Math.max(1, h - padT - padB);

  const xMap = (tt: number) => padL + (tt / Math.max(1e-6, tMax)) * plotW;
  const yMap = (yy: number) => padT + (1 - (yy + yLimit) / Math.max(1e-6, 2 * yLimit)) * plotH;

  ctx.strokeStyle = 'rgba(180,220,255,0.28)';
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(padL, padT, plotW, plotH);
  ctx.beginPath();
  ctx.moveTo(padL, yMap(0));
  ctx.lineTo(padL + plotW, yMap(0));
  ctx.stroke();

  const last = clamp(frameIndex, 0, t.length - 1);
  for (const s of series) {
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.5 * dpr;
    if (s.dashed) ctx.setLineDash([5 * dpr, 4 * dpr]);
    ctx.beginPath();
    for (let i = 0; i <= last; i += 1) {
      const px = xMap(t[i]);
      const py = yMap(s.data[i]);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(232,243,255,0.92)';
  ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.fillText(title, 12 * dpr, 14 * dpr);
}

function drawParticleCanvas(canvas: HTMLCanvasElement, sim: SimResult, frameIndex: number, pointSize: number, variant: VariantConfig): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
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

  const toPx = (x: number, y: number): [number, number] => [((x + sim.boxWidth / 2) / sim.boxWidth) * w, h - ((y + sim.boxHeight / 2) / sim.boxHeight) * h];
  const [wl] = toPx(sim.leftWall, 0);
  const [wr] = toPx(sim.rightWall, 0);
  ctx.fillStyle = 'rgba(200,220,255,0.08)';
  ctx.fillRect(wl, 0, wr - wl, h);
  const [, t0Top] = toPx(0, sim.type0YMax);
  const [, t0Bottom] = toPx(0, sim.type0YMin);
  const [, t1Top] = toPx(0, sim.type1YMax);
  const [, t1Bottom] = toPx(0, sim.type1YMin);
  ctx.fillStyle = 'rgba(245,178,72,0.14)';
  ctx.fillRect(wl, t0Top, wr - wl, t0Bottom - t0Top);
  ctx.fillStyle = variant.type1Color === '#72ffb2' ? 'rgba(114,255,178,0.14)' : 'rgba(66,200,255,0.14)';
  ctx.fillRect(wl, t1Top, wr - wl, t1Bottom - t1Top);

  ctx.strokeStyle = 'rgba(190,225,255,0.45)';
  ctx.lineWidth = 1.5 * dpr;
  for (const xWall of [sim.leftWall, sim.rightWall]) {
    const [xpx] = toPx(xWall, 0);
    const channels: Array<[number, number]> = [[sim.type0YMin, sim.type0YMax], [sim.type1YMin, sim.type1YMax]].sort((a, b) => a[0] - b[0]) as Array<[number, number]>;
    let cursor = -sim.boxHeight / 2;
    for (const [cMin, cMax] of channels) {
      if (cMin > cursor) {
        const [, py0] = toPx(0, cursor);
        const [, py1] = toPx(0, cMin);
        ctx.beginPath(); ctx.moveTo(xpx, py0); ctx.lineTo(xpx, py1); ctx.stroke();
      }
      cursor = Math.max(cursor, cMax);
    }
    if (cursor < sim.boxHeight / 2) {
      const [, py0] = toPx(0, cursor);
      const [, py1] = toPx(0, sim.boxHeight / 2);
      ctx.beginPath(); ctx.moveTo(xpx, py0); ctx.lineTo(xpx, py1); ctx.stroke();
    }
  }

  if (variant.fieldMode === 'point') {
    const [nx, ny] = toPx(sim.negX, sim.negY);
    ctx.fillStyle = 'rgba(255,96,96,0.95)';
    ctx.beginPath(); ctx.arc(nx, ny, 4 * dpr, 0, Math.PI * 2); ctx.fill();
  } else {
    const [nx] = toPx(sim.negX, 0);
    ctx.strokeStyle = 'rgba(255,96,96,0.85)';
    ctx.lineWidth = 1.5 * dpr;
    ctx.setLineDash([5 * dpr, 4 * dpr]);
    ctx.beginPath(); ctx.moveTo(nx, 0); ctx.lineTo(nx, h); ctx.stroke();
    ctx.setLineDash([]);
  }

  const idx = clamp(frameIndex, 0, sim.frames - 1) * sim.numParticles;
  const r = Math.max(0.8, pointSize) * dpr;
  for (let p = 0; p < sim.numParticles; p += 1) {
    const [px, py] = toPx(sim.x[idx + p], sim.y[idx + p]);
    const type = sim.types[p] as IonType;
    ctx.fillStyle = type === 0 ? 'rgba(245,178,72,0.92)' : variant.type1Color;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = 'rgba(232,243,255,0.92)';
  ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.fillText(variant.title, 12 * dpr, 14 * dpr);
}

function simulateTwoIon(params: SimParams, seed: number, variant: VariantConfig): SimResult {
  const T = clamp(Math.round(params.T), 50, 20000);
  const dt = clamp(params.dt, 0.05, 20);
  const numParticles = clamp(Math.round(params.numParticles), 10, 300);
  const type0Fraction = clamp(params.type0Fraction, 0, 1);
  const boxWidth = clamp(params.boxWidth, 40, 500);
  const boxHeight = clamp(params.boxHeight, 40, 500);
  const wallThickness = clamp(params.wallThickness, 0.5, Math.min(50, boxWidth - 2));
  const diffusionSd = clamp(params.diffusionSd, 0, 20);
  const electricStrength = clamp(params.electricStrength, 0, 10);
  const repulsionStrength = clamp(params.repulsionStrength, 0, 10);
  const initialLeftFrac = clamp(params.initialLeftFrac, 0, 1);
  const [type0YMin, type0YMax] = normalizeBounds(params.type0YMin, params.type0YMax, boxHeight);
  const [type1YMin, type1YMax] = normalizeBounds(params.type1YMin, params.type1YMax, boxHeight);
  const leftWall = -wallThickness / 2;
  const rightWall = wallThickness / 2;
  const negX = clamp(params.negX, -boxWidth / 2, boxWidth / 2);
  const negY = clamp(params.negY, -boxHeight / 2, boxHeight / 2);
  const frames = Math.max(2, Math.floor(T / dt));

  const x = new Float32Array(frames * numParticles);
  const y = new Float32Array(frames * numParticles);
  const types = new Uint8Array(numParticles);
  const charges = new Int8Array(numParticles);
  const t = new Float32Array(frames);
  const VA = new Float32Array(frames);
  const VB = new Float32Array(frames);
  const VTotal = new Float32Array(frames);
  const VGoldman = variant.withGoldman ? new Float32Array(frames) : undefined;
  const rng = new Rng(seed);

  for (let i = 0; i < frames; i += 1) t[i] = i * dt;

  // Type assignment first so per-type side splits and y-clustering are possible.
  const idxType0: number[] = [];
  const idxType1: number[] = [];
  for (let p = 0; p < numParticles; p += 1) {
    const type: IonType = (rng.next() < type0Fraction ? 0 : 1);
    types[p] = type;
    charges[p] = type === 0 ? 1 : -1;
    if (type === 0) idxType0.push(p); else idxType1.push(p);
  }

  const initCluster = (indices: number[], yMin: number, yMax: number): void => {
    const nLeft = Math.floor(indices.length * initialLeftFrac);
    for (let j = 0; j < indices.length; j += 1) {
      const p = indices[j];
      const onLeft = j < nLeft;
      x[p] = onLeft ? rng.uniform(-boxWidth / 2 + 1, leftWall - 1) : rng.uniform(rightWall + 1, boxWidth / 2 - 1);
      y[p] = rng.uniform(yMin, yMax);
    }
  };
  initCluster(idxType0, type0YMin, type0YMax);
  initCluster(idxType1, type1YMin, type1YMax);

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
        const dxjk = xj - x[prev + k];
        const dyjk = yj - y[prev + k];
        const d2 = dxjk * dxjk + dyjk * dyjk + 1e-3;
        const inv = 1 / d2;
        fx += dxjk * inv;
        fy += dyjk * inv;
      }
      repelX[j] = repulsionStrength * fx;
      repelY[j] = repulsionStrength * fy;
    }

    for (let p = 0; p < numParticles; p += 1) {
      const xPrev = x[prev + p];
      const yPrev = y[prev + p];
      const dxdt = rng.normal(0, diffusionSd);
      const dydt = rng.normal(0, diffusionSd);

      let attractX = 0;
      let attractY = 0;
      if (variant.fieldMode === 'point') {
        const dxp = negX - xPrev;
        const dyp = negY - yPrev;
        const dist = Math.sqrt(dxp * dxp + dyp * dyp) + 1e-3;
        const charge = charges[p];
        attractX = electricStrength * charge * dxp / dist;
        attractY = electricStrength * charge * dyp / dist;
      } else {
        const dxp = negX - xPrev;
        const dist = Math.abs(dxp) + 1e-3;
        const charge = charges[p];
        attractX = electricStrength * charge * dxp / dist;
        attractY = 0;
      }

      let xNew = xPrev + (dxdt + attractX + repelX[p]) * dt;
      const yNew = clamp(yPrev + (dydt + attractY + repelY[p]) * dt, -boxHeight / 2, boxHeight / 2);

      const tryingToCrossLeft = xPrev > rightWall && xNew <= rightWall;
      const tryingToCrossRight = xPrev < leftWall && xNew >= leftWall;
      const type = types[p] as IonType;
      const cMin = type === 0 ? type0YMin : type1YMin;
      const cMax = type === 0 ? type0YMax : type1YMax;
      const inChannel = yPrev >= cMin && yPrev <= cMax;
      if ((tryingToCrossLeft || tryingToCrossRight) && !inChannel) xNew = xPrev;

      x[curr + p] = xNew;
      y[curr + p] = yNew;
    }

    let aLeft = 0, aRight = 0, bLeft = 0, bRight = 0;
    for (let p = 0; p < numParticles; p += 1) {
      const xp = x[curr + p];
      const type = types[p] as IonType;
      if (xp < leftWall) {
        if (type === 0) aLeft += 1; else bLeft += 1;
      } else if (xp > rightWall) {
        if (type === 0) aRight += 1; else bRight += 1;
      }
    }
    VA[i] = aLeft - aRight;
    VB[i] = bLeft - bRight;
    VTotal[i] = VA[i] + VB[i];
    if (VGoldman) {
      const pA = Math.max(1e-3, type0YMax - type0YMin);
      const pB = Math.max(1e-3, type1YMax - type1YMin);
      VGoldman[i] = Math.log((pA * aRight + pB * bRight + 1e-3) / (pA * aLeft + pB * bLeft + 1e-3));
    }
  }

  return { x, y, types, charges, frames, numParticles, dt, t, boxWidth, boxHeight, leftWall, rightWall, negX, negY, type0YMin, type0YMax, type1YMin, type1YMax, VA, VB, VTotal, VGoldman };
}

export function mountTwoIonRestingPage(variant: VariantConfig): void {
  const defaultSim: SimParams = {
    T: variant.defaultT ?? 2000,
    dt: variant.defaultDt ?? 1,
    numParticles: variant.defaultNumParticles,
    type0Fraction: 0.5,
    boxWidth: 100,
    boxHeight: 100,
    wallThickness: 4,
    diffusionSd: 0.5,
    electricStrength: variant.defaultElectricStrength,
    repulsionStrength: variant.defaultRepulsionStrength,
    negX: variant.defaultNegX ?? -45,
    negY: 0,
    type0YMin: 30,
    type0YMax: 31,
    type1YMin: -40,
    type1YMax: -10,
    initialLeftFrac: 0.6,
    goldmanScale: variant.goldmanScaleDefault ?? 20
  };
  const defaultDisplay: DisplayParams = { pointSize: 2.2, playbackSpeed: 1, targetFps: 30, traceYLimit: Math.max(40, variant.defaultNumParticles) };

  const app = getEl<HTMLDivElement>('#app');
  app.innerHTML = `
    <div class="site-shell">
      <div class="nav-line"><a href="./index.html">Back to index</a><span>•</span><span>Page: <code>${variant.pageId}</code></span></div>
      <header class="page-head">
        <p class="eyebrow">Resting-Potential and Goldman-Style Extensions</p>
        <h1>${variant.pageId}</h1>
        <p class="subtitle">${variant.subtitle}</p>
      </header>
      <div class="sim-layout">
        <aside class="controls">
          <div class="panel">
            <div class="group">
              <p class="group-label">Basic Controls</p>
              <div class="button-row"><button id="toggle-play" class="primary">Pause</button><button id="rerun">Rerun</button><button id="reset-defaults" class="warn">Reset Defaults</button></div>
              <div class="button-row"><button id="rewind">Rewind</button><button id="random-seed">Randomize Seed</button></div>
              <div class="control-grid">
                <div class="field"><label for="num-particles">Particles</label><input id="num-particles" type="number" min="10" max="300" step="1" /></div>
                <div class="field"><label for="type0-fraction">Type 0 fraction</label><input id="type0-fraction" type="number" min="0" max="1" step="0.01" /></div>
                <div class="field"><label for="diffusion-sd">Diffusion SD</label><input id="diffusion-sd" type="number" min="0" max="20" step="0.05" /></div>
                <div class="field"><label for="electric-strength">Electric strength</label><input id="electric-strength" type="number" min="0" max="10" step="0.01" /></div>
                <div class="field"><label for="repulsion-strength">Repulsion strength</label><input id="repulsion-strength" type="number" min="0" max="10" step="0.01" /></div>
                <div class="field"><label for="type0-y-min">Type 0 y min</label><input id="type0-y-min" type="number" step="0.5" /></div>
                <div class="field"><label for="type0-y-max">Type 0 y max</label><input id="type0-y-max" type="number" step="0.5" /></div>
                <div class="field"><label for="type1-y-min">Type 1 y min</label><input id="type1-y-min" type="number" step="0.5" /></div>
                <div class="field"><label for="type1-y-max">Type 1 y max</label><input id="type1-y-max" type="number" step="0.5" /></div>
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
              <div class="field"><label for="neg-x">${variant.fieldMode === 'point' ? 'Neg attractor x' : 'Neg wall x'}</label><input id="neg-x" type="number" step="1" /></div>
              <div class="field"><label for="neg-y">Neg y (point mode)</label><input id="neg-y" type="number" step="1" /></div>
              <div class="field"><label for="initial-left-frac">Initial left fraction</label><input id="initial-left-frac" type="number" min="0" max="1" step="0.01" /></div>
              <div class="field"><label for="trace-ylim">Trace y-limit</label><input id="trace-ylim" type="number" min="10" max="500" step="1" /></div>
              <div class="field"><label for="point-size">Point size</label><input id="point-size" type="number" min="0.5" max="8" step="0.25" /></div>
              <div class="field"><label for="target-fps">Playback FPS</label><input id="target-fps" type="number" min="1" max="120" step="1" /></div>
              ${variant.withGoldman ? '<div class="field"><label for="goldman-scale">Goldman trace scale</label><input id="goldman-scale" type="number" min="0" max="200" step="1" /></div>' : ''}
            </div></div></details>
            <div class="group"><p class="group-label">Status</p><dl class="status-list">
              <dt>Frame</dt><dd id="status-frame">0</dd><dt>Time (ms)</dt><dd id="status-time">0.0</dd>
              <dt>V_A</dt><dd id="status-va">0</dd><dt>V_B</dt><dd id="status-vb">0</dd>
              <dt>V_total</dt><dd id="status-vt">0</dd><dt>dt</dt><dd id="status-dt">0</dd>
              <dt>Step SD</dt><dd id="status-step-sd">0</dd><dt>Seed</dt><dd id="status-seed">0</dd>
            </dl></div>
            <div class="group"><p class="group-label">Equation + Trace Readout</p><div class="equation-card"><pre class="equation" id="equation-block"></pre><p>Per-ion and total compartment imbalances are qualitative Δcharge proxies. ${variant.withGoldman ? 'Goldman line is a permeability-weighted log-ratio proxy (scaled for visualization).' : ''}</p></div></div>
          </div>
        </aside>
        <section class="panel canvas-panel">
          <div class="canvas-head"><h2>${variant.title}</h2><span class="tiny">Qualitative browser port of <code>${variant.pageId}.py</code></span></div>
          <div class="canvas-grid-2">
            <div class="canvas-subpanel"><div class="subhead"><h3>Particle Dynamics</h3><span class="tiny">${variant.negMarkerLabel}</span></div><canvas id="particle-canvas"></canvas></div>
            <div class="canvas-subpanel"><div class="subhead"><h3>Membrane Potential Proxy Traces</h3><span class="tiny">V_A / V_B / V_total${variant.withGoldman ? ' / Goldman' : ''}</span></div><canvas id="trace-canvas"></canvas></div>
          </div>
          <div class="legend">
            <span><span class="swatch" style="background:#f5b248"></span>Ion A (+)</span>
            <span><span class="swatch" style="background:${variant.type1Color}"></span>${variant.type1Label}</span>
            <span><span class="swatch" style="background:#ff6060"></span>${variant.negMarkerLabel}</span>
          </div>
        </section>
      </div>
    </div>
  `;

  const particleCanvas = getEl<HTMLCanvasElement>('#particle-canvas');
  const traceCanvas = getEl<HTMLCanvasElement>('#trace-canvas');
  const equationBlock = getEl<HTMLElement>('#equation-block');

  const inputs = {
    numParticles: getEl<HTMLInputElement>('#num-particles'),
    type0Fraction: getEl<HTMLInputElement>('#type0-fraction'),
    diffusionSd: getEl<HTMLInputElement>('#diffusion-sd'),
    electricStrength: getEl<HTMLInputElement>('#electric-strength'),
    repulsionStrength: getEl<HTMLInputElement>('#repulsion-strength'),
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
    negX: getEl<HTMLInputElement>('#neg-x'),
    negY: getEl<HTMLInputElement>('#neg-y'),
    initialLeftFrac: getEl<HTMLInputElement>('#initial-left-frac'),
    traceYLim: getEl<HTMLInputElement>('#trace-ylim'),
    pointSize: getEl<HTMLInputElement>('#point-size'),
    targetFps: getEl<HTMLInputElement>('#target-fps'),
    goldmanScale: variant.withGoldman ? getEl<HTMLInputElement>('#goldman-scale') : null
  };

  const statusEls = {
    frame: getEl<HTMLElement>('#status-frame'),
    time: getEl<HTMLElement>('#status-time'),
    va: getEl<HTMLElement>('#status-va'),
    vb: getEl<HTMLElement>('#status-vb'),
    vt: getEl<HTMLElement>('#status-vt'),
    dt: getEl<HTMLElement>('#status-dt'),
    stepSd: getEl<HTMLElement>('#status-step-sd'),
    seed: getEl<HTMLElement>('#status-seed')
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
  let sim = simulateTwoIon(simParams, currentSeed, variant);
  let isPlaying = true;
  let playhead = 0;
  let lastTs = performance.now();

  function writeInputs(): void {
    setNumberInput(inputs.numParticles, simParams.numParticles, 0);
    setNumberInput(inputs.type0Fraction, simParams.type0Fraction, 2);
    setNumberInput(inputs.diffusionSd, simParams.diffusionSd, 3);
    setNumberInput(inputs.electricStrength, simParams.electricStrength, 3);
    setNumberInput(inputs.repulsionStrength, simParams.repulsionStrength, 3);
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
    setNumberInput(inputs.negX, simParams.negX, 1);
    setNumberInput(inputs.negY, simParams.negY, 1);
    setNumberInput(inputs.initialLeftFrac, simParams.initialLeftFrac, 2);
    setNumberInput(inputs.traceYLim, displayParams.traceYLimit, 0);
    setNumberInput(inputs.pointSize, displayParams.pointSize, 2);
    setNumberInput(inputs.targetFps, displayParams.targetFps, 0);
    if (inputs.goldmanScale) setNumberInput(inputs.goldmanScale, simParams.goldmanScale, 0);
  }

  function readSimInputs(): SimParams {
    const boxHeight = clamp(Number(inputs.boxHeight.value) || defaultSim.boxHeight, 40, 500);
    const boxWidth = clamp(Number(inputs.boxWidth.value) || defaultSim.boxWidth, 40, 500);
    return {
      T: clamp(Number(inputs.totalTime.value) || defaultSim.T, 50, 20000),
      dt: clamp(Number(inputs.dt.value) || defaultSim.dt, 0.05, 20),
      numParticles: clamp(Math.round(Number(inputs.numParticles.value) || defaultSim.numParticles), 10, 300),
      type0Fraction: clamp(Number(inputs.type0Fraction.value) || 0, 0, 1),
      boxWidth,
      boxHeight,
      wallThickness: clamp(Number(inputs.wallThickness.value) || defaultSim.wallThickness, 0.5, 50),
      diffusionSd: clamp(Number(inputs.diffusionSd.value) || 0, 0, 20),
      electricStrength: clamp(Number(inputs.electricStrength.value) || 0, 0, 10),
      repulsionStrength: clamp(Number(inputs.repulsionStrength.value) || 0, 0, 10),
      negX: clamp(Number(inputs.negX.value) || defaultSim.negX, -boxWidth / 2, boxWidth / 2),
      negY: clamp(Number(inputs.negY.value) || defaultSim.negY, -boxHeight / 2, boxHeight / 2),
      type0YMin: clamp(Number(inputs.type0YMin.value) || 0, -boxHeight / 2, boxHeight / 2),
      type0YMax: clamp(Number(inputs.type0YMax.value) || 0, -boxHeight / 2, boxHeight / 2),
      type1YMin: clamp(Number(inputs.type1YMin.value) || 0, -boxHeight / 2, boxHeight / 2),
      type1YMax: clamp(Number(inputs.type1YMax.value) || 0, -boxHeight / 2, boxHeight / 2),
      initialLeftFrac: clamp(Number(inputs.initialLeftFrac.value) || defaultSim.initialLeftFrac, 0, 1),
      goldmanScale: variant.withGoldman ? clamp(Number(inputs.goldmanScale?.value) || defaultSim.goldmanScale, 0, 200) : defaultSim.goldmanScale
    };
  }

  function readDisplayInputs(): DisplayParams {
    return {
      pointSize: clamp(Number(inputs.pointSize.value) || defaultDisplay.pointSize, 0.5, 8),
      playbackSpeed: clamp(Number(inputs.playbackSpeed.value) || defaultDisplay.playbackSpeed, 0.1, 8),
      targetFps: clamp(Math.round(Number(inputs.targetFps.value) || defaultDisplay.targetFps), 1, 120),
      traceYLimit: clamp(Number(inputs.traceYLim.value) || defaultDisplay.traceYLimit, 10, 500)
    };
  }

  function updateEquationText(): void {
    const stepSd = simParams.diffusionSd * simParams.dt;
    const fieldLine = variant.fieldMode === 'point'
      ? 'attract = electric_strength · charge · (neg_pos - pos) / (||neg_pos - pos|| + ε)'
      : 'attract_x = electric_strength · charge · (neg_wall_x - x) / (|neg_wall_x - x| + ε), attract_y = 0';
    const extra = variant.withGoldman
      ? `Goldman proxy: log((P_A·A_R + P_B·B_R)/(P_A·A_L + P_B·B_L)) × ${simParams.goldmanScale.toFixed(0)}`
      : 'Traces: V_A, V_B, V_total (Δcharge proxies)';
    equationBlock.innerHTML = [
      '<span class="accent">Euler update (two-ion resting-potential toy model)</span>',
      fieldLine,
      'repel_j = repulsion_strength · Σ_k≠j (pos_j - pos_k) / (||pos_j - pos_k||² + ε)',
      'x_new = x_old + (dxdt + attract_x + repel_x) · dt',
      'y_new = clamp(y_old + (dydt + attract_y + repel_y) · dt, -H/2, H/2)',
      'dxdt, dydt ~ Normal(0, diffusionSd²)',
      '',
      '<span class="accent-2">Selective membrane gating + potential proxies</span>',
      'Type 0 and Type 1 have different channel windows; failed crossing attempts set x_new := x_old',
      'V_A = (#A_left - #A_right), V_B = (#B_left - #B_right), V_total = V_A + V_B',
      extra,
      '',
      `Per-step Brownian displacement SD = diffusionSd × dt = ${stepSd.toFixed(3)}`
    ].join('\n');
  }

  function updateStatus(frameIndex: number): void {
    statusEls.frame.textContent = `${frameIndex + 1}`;
    statusEls.time.textContent = sim.t[frameIndex].toFixed(1);
    statusEls.va.textContent = sim.VA[frameIndex].toFixed(0);
    statusEls.vb.textContent = sim.VB[frameIndex].toFixed(0);
    statusEls.vt.textContent = sim.VTotal[frameIndex].toFixed(0);
    statusEls.dt.textContent = sim.dt.toFixed(2);
    statusEls.stepSd.textContent = (simParams.diffusionSd * simParams.dt).toFixed(3);
    statusEls.seed.textContent = `${currentSeed >>> 0}`;
  }

  function draw(frameIndex: number): void {
    drawParticleCanvas(particleCanvas, sim, frameIndex, displayParams.pointSize, variant);
    const series: Array<{ data: Float32Array; color: string; dashed?: boolean }> = [
      { data: sim.VA, color: '#f5b248' },
      { data: sim.VB, color: variant.type1Color },
      { data: sim.VTotal, color: '#c68dff' }
    ];
    if (variant.withGoldman && sim.VGoldman) {
      const scaled = new Float32Array(sim.VGoldman.length);
      for (let i = 0; i < sim.VGoldman.length; i += 1) scaled[i] = sim.VGoldman[i] * simParams.goldmanScale;
      series.push({ data: scaled, color: '#f2f5fb', dashed: true });
    }
    drawTraceCanvas(traceCanvas, sim.t, frameIndex, series, sim.t[sim.t.length - 1] || 1, displayParams.traceYLimit, 'Membrane Potential Proxy Traces');
  }

  function rerunFromInputs(rewind = true): void {
    simParams = readSimInputs();
    displayParams = readDisplayInputs();
    currentSeed = clamp(Math.floor(Number(inputs.seed.value) || currentSeed), 0, 0xffffffff) >>> 0;
    sim = simulateTwoIon(simParams, currentSeed, variant);
    simParams = {
      ...simParams,
      boxWidth: sim.boxWidth,
      boxHeight: sim.boxHeight,
      wallThickness: sim.rightWall - sim.leftWall,
      negX: sim.negX,
      negY: sim.negY,
      type0YMin: sim.type0YMin,
      type0YMax: sim.type0YMax,
      type1YMin: sim.type1YMin,
      type1YMax: sim.type1YMax
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
  draw(0);

  buttons.togglePlay.addEventListener('click', () => setPlaying(!isPlaying));
  buttons.rerun.addEventListener('click', () => rerunFromInputs(true));
  buttons.rewind.addEventListener('click', () => { playhead = 0; updateStatus(0); draw(0); });
  buttons.randomSeed.addEventListener('click', () => { currentSeed = randomSeed(); setNumberInput(inputs.seed, currentSeed, 0); rerunFromInputs(true); });
  buttons.resetDefaults.addEventListener('click', () => { simParams = { ...defaultSim }; displayParams = { ...defaultDisplay }; currentSeed = randomSeed(); writeInputs(); rerunFromInputs(true); setPlaying(true); });

  const simKeys = [
    inputs.numParticles, inputs.type0Fraction, inputs.diffusionSd, inputs.electricStrength, inputs.repulsionStrength,
    inputs.type0YMin, inputs.type0YMax, inputs.type1YMin, inputs.type1YMax, inputs.seed, inputs.totalTime, inputs.dt,
    inputs.boxWidth, inputs.boxHeight, inputs.wallThickness, inputs.negX, inputs.negY, inputs.initialLeftFrac,
    ...(inputs.goldmanScale ? [inputs.goldmanScale] : [])
  ];
  for (const el of simKeys) el.addEventListener('change', () => rerunFromInputs(el !== inputs.seed));

  for (const el of [inputs.playbackSpeed, inputs.traceYLim, inputs.pointSize, inputs.targetFps]) {
    el.addEventListener('change', () => refreshDisplayFromInputs());
  }

  window.addEventListener('resize', () => draw(Math.floor(playhead)));

  function animate(ts: number): void {
    const dtSec = (ts - lastTs) / 1000;
    lastTs = ts;
    if (isPlaying && sim.frames > 0) {
      playhead += dtSec * displayParams.targetFps * displayParams.playbackSpeed;
      if (playhead >= sim.frames) playhead %= sim.frames;
    }
    const frameIndex = clamp(Math.floor(playhead), 0, Math.max(0, sim.frames - 1));
    updateStatus(frameIndex);
    draw(frameIndex);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame((ts) => { lastTs = ts; animate(ts); });
}
