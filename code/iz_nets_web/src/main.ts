import './style.css';

type Cell = 0 | 1 | 2;

interface SimParams {
  I_amp: number;
  w_AB: number;
  w_BC: number;
  w_CA: number;
  E_A: number;
  E_B: number;
  E_C: number;
}

interface ControlSpec {
  key: keyof SimParams;
  min?: number;
  max?: number;
  step: number;
  label: string;
}

interface ControlRuntime {
  spec: ControlSpec;
  value: number;
  holdDir: -1 | 0 | 1;
  holdMs: number;
  valueEl: HTMLElement;
}

interface NetworkPreset {
  key: string;
  label: string;
  params: SimParams;
}

const C = 100;
const vr = -60;
const vt = -40;
const vpeak = 35;
const k = 0.7;
const a = 0.03;
const b = -2;
const c = -50;
const d = 100;
const pspAmp = 1000;
const pspDecay = 100;

const solverDt = 0.01;
const traceSampleDt = 1.0;

const controlSpec: ControlSpec[] = [
  { key: 'I_amp', min: 0, step: 1, label: 'Input I_amp (A, continuous)' },
  { key: 'w_AB', min: -220, step: 1, label: 'Weight w_AB' },
  { key: 'w_BC', min: -220, step: 1, label: 'Weight w_BC' },
  { key: 'w_CA', min: -220, step: 1, label: 'Weight w_CA (feedback)' },
  { key: 'E_A', min: -50, step: 1, label: 'Baseline E_A' },
  { key: 'E_B', min: -50, step: 1, label: 'Baseline E_B' },
  { key: 'E_C', min: -50, step: 1, label: 'Baseline E_C' }
];

const defaultParams: SimParams = {
  I_amp: 200,
  w_AB: 80,
  w_BC: 80,
  w_CA: 0,
  E_A: 0,
  E_B: 0,
  E_C: 0
};

const presets: NetworkPreset[] = [
  { key: 'n1', label: 'N1: A -> B -> C', params: { I_amp: 200, w_AB: 80, w_BC: 80, w_CA: 0, E_A: 0, E_B: 0, E_C: 0 } },
  { key: 'n2', label: 'N2: A -> B -| C', params: { I_amp: 200, w_AB: 80, w_BC: -120, w_CA: 0, E_A: 0, E_B: 300, E_C: 0 } },
  { key: 'n3', label: 'N3: A -> B(inhib) -| C', params: { I_amp: 200, w_AB: 100, w_BC: -140, w_CA: 0, E_A: 0, E_B: 0, E_C: 0 } },
  { key: 'n4', label: 'N4: A -> B -> C -> A', params: { I_amp: 200, w_AB: 70, w_BC: 70, w_CA: 70, E_A: 0, E_B: 0, E_C: 0 } }
];

class Izh3Sim {
  params: SimParams = { ...defaultParams };
  t = 0;
  v = new Float32Array(3);
  u = new Float32Array(3);
  g = new Float32Array(3);
  spike = new Float32Array(3);
  spikePrev = new Float32Array(3);

  constructor() {
    this.reset();
  }

  reset() {
    this.t = 0;
    for (let i = 0; i < 3; i += 1) {
      this.v[i] = vr + Math.random() * 5;
      this.u[i] = 0;
      this.g[i] = 0;
      this.spike[i] = 0;
      this.spikePrev[i] = 0;
    }
  }

  setParam<K extends keyof SimParams>(key: K, value: SimParams[K]) {
    this.params[key] = value;
  }

  step() {
    const { w_AB, w_BC, w_CA, E_A, E_B, E_C } = this.params;

    const I_A = this.params.I_amp + w_CA * this.g[2] + E_A;
    const I_B = w_AB * this.g[0] + E_B;
    const I_C = w_BC * this.g[1] + E_C;
    const I = [I_A, I_B, I_C];

    this.spike.fill(0);

    for (let j: Cell = 0; j < 3; j = (j + 1) as Cell) {
      const dvdt = (k * (this.v[j] - vr) * (this.v[j] - vt) - this.u[j] + I[j]) / C;
      const dudt = a * (b * (this.v[j] - vr) - this.u[j]);
      const dgdt = (-this.g[j] + pspAmp * this.spikePrev[j]) / pspDecay;

      this.v[j] += dvdt * solverDt;
      this.u[j] += dudt * solverDt;
      this.g[j] += dgdt * solverDt;

      if (this.v[j] >= vpeak) {
        this.v[j] = c;
        this.u[j] += d;
        this.spike[j] = 1;
      }
    }

    this.spikePrev.set(this.spike);
    this.t += solverDt;
  }
}

class RingBuffer {
  private data: Float32Array;
  private idx = 0;
  private used = 0;

  constructor(private readonly size: number) {
    this.data = new Float32Array(size);
  }

  clear(v = 0) {
    this.data.fill(v);
    this.idx = 0;
    this.used = 0;
  }

  push(v: number) {
    this.data[this.idx] = v;
    this.idx = (this.idx + 1) % this.size;
    this.used = Math.min(this.used + 1, this.size);
  }

  count(): number {
    return this.used;
  }

  at(i: number): number {
    if (this.used === 0) return 0;
    const clamped = Math.max(0, Math.min(i, this.used - 1));
    const start = this.used < this.size ? 0 : this.idx;
    const p = (start + clamped) % this.size;
    return this.data[p];
  }
}

interface Channels {
  t: RingBuffer;
  vA: RingBuffer;
  vB: RingBuffer;
  vC: RingBuffer;
  gA: RingBuffer;
  gB: RingBuffer;
  gC: RingBuffer;
}

function initChannels(n: number): Channels {
  return {
    t: new RingBuffer(n),
    vA: new RingBuffer(n),
    vB: new RingBuffer(n),
    vC: new RingBuffer(n),
    gA: new RingBuffer(n),
    gB: new RingBuffer(n),
    gC: new RingBuffer(n)
  };
}

function colormap(value: number): string {
  const x = Math.max(0, Math.min(1, value));
  const r = Math.floor(255 * Math.max(0, Math.min(1, 1.4 * x - 0.2)));
  const g = Math.floor(255 * Math.max(0, Math.min(1, 1.6 - Math.abs(2.2 * x - 1.1))));
  const b = Math.floor(255 * Math.max(0, Math.min(1, 1.2 - 1.6 * x)));
  return `rgb(${r}, ${g}, ${b})`;
}

function normV(v: number): number {
  return (v + 80) / 120;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function clampToSpec(v: number, spec: ControlSpec): number {
  let out = v;
  if (spec.min !== undefined) out = Math.max(spec.min, out);
  if (spec.max !== undefined) out = Math.min(spec.max, out);
  return out;
}

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing app root');

app.innerHTML = `
  <h1>IZ Nets Interactive: A -> B -> C</h1>
  <p class="subtitle">Three-neuron feedforward excitatory network (A -> B -> C) with optional recurrent feedback (C -> A) and continuous drive to A.</p>
  <div class="layout">
    <section class="panel controls" id="controls"></section>
    <section class="canvas-stack">
      <div class="panel canvas-wrap">
        <span class="canvas-title">Neuron A: v (left axis) and g (right axis)</span>
        <canvas id="a-canvas"></canvas>
        <div class="legend">
          <span><span class="swatch" style="background: var(--line-a)"></span>v_A</span>
          <span><span class="swatch" style="background: var(--g-a)"></span>g_A</span>
        </div>
      </div>
      <div class="panel canvas-wrap">
        <span class="canvas-title">Neuron B: v (left axis) and g (right axis)</span>
        <canvas id="b-canvas"></canvas>
        <div class="legend">
          <span><span class="swatch" style="background: var(--line-b)"></span>v_B</span>
          <span><span class="swatch" style="background: var(--g-b)"></span>g_B</span>
        </div>
      </div>
      <div class="panel canvas-wrap">
        <span class="canvas-title">Neuron C: v (left axis) and g (right axis)</span>
        <canvas id="c-canvas"></canvas>
        <div class="legend">
          <span><span class="swatch" style="background: var(--line-c)"></span>v_C</span>
          <span><span class="swatch" style="background: var(--g-c)"></span>g_C</span>
        </div>
      </div>
      <div class="panel canvas-wrap">
        <span class="canvas-title">Animated Network Graph</span>
        <canvas class="network" id="net-canvas"></canvas>
      </div>
    </section>
  </div>
`;

const controlsEl = (() => {
  const el = document.querySelector<HTMLDivElement>('#controls');
  if (!el) throw new Error('Missing controls root');
  return el;
})();

const sim = new Izh3Sim();
let paused = false;
let activePresetKey = presets[0].key;

const mobile = window.matchMedia('(max-width: 720px)').matches;
const historyLength = mobile ? 650 : 1100;
const channels = initChannels(historyLength);
let nextTraceSampleTime = 0;
let simAccumulator = 0;
const plotWindowMs = historyLength * traceSampleDt;
const vSampleMax = new Float32Array(3);

function pushChannels(sampleTime: number) {
  channels.t.push(sampleTime);
  // Store max V reached since last sample so spike peaks stay clipped/visible.
  channels.vA.push(vSampleMax[0]);
  channels.vB.push(vSampleMax[1]);
  channels.vC.push(vSampleMax[2]);
  channels.gA.push(sim.g[0]);
  channels.gB.push(sim.g[1]);
  channels.gC.push(sim.g[2]);
  vSampleMax[0] = sim.v[0];
  vSampleMax[1] = sim.v[1];
  vSampleMax[2] = sim.v[2];
}

function seedHistory() {
  channels.t.clear(0);
  channels.vA.clear(vr);
  channels.vB.clear(vr);
  channels.vC.clear(vr);
  channels.gA.clear(0);
  channels.gB.clear(0);
  channels.gC.clear(0);
  nextTraceSampleTime = sim.t;
  simAccumulator = 0;
  vSampleMax[0] = sim.v[0];
  vSampleMax[1] = sim.v[1];
  vSampleMax[2] = sim.v[2];
  pushChannels(sim.t);
  nextTraceSampleTime = sim.t + traceSampleDt;
}
seedHistory();

function formatValue(spec: ControlSpec, v: number): string {
  const decimals = spec.step < 1 ? Math.ceil(Math.max(0, -Math.log10(spec.step))) : 0;
  return v.toFixed(decimals);
}

const controlRuntimes: ControlRuntime[] = [];

function addControl(spec: ControlSpec) {
  const row = document.createElement('label');
  row.className = 'control';

  const top = document.createElement('div');
  top.className = 'label-row';

  const l = document.createElement('span');
  l.textContent = spec.label;

  const valueEl = document.createElement('span');
  valueEl.className = 'value';
  valueEl.textContent = formatValue(spec, defaultParams[spec.key]);

  const nudgeRow = document.createElement('div');
  nudgeRow.className = 'nudge-row';
  const minusBtn = document.createElement('button');
  minusBtn.type = 'button';
  minusBtn.className = 'nudge-btn';
  minusBtn.textContent = '-';
  const plusBtn = document.createElement('button');
  plusBtn.type = 'button';
  plusBtn.className = 'nudge-btn';
  plusBtn.textContent = '+';
  const hint = document.createElement('span');
  hint.className = 'nudge-hint';
  hint.textContent = 'Hold';

  const runtime: ControlRuntime = {
    spec,
    value: defaultParams[spec.key],
    holdDir: 0,
    holdMs: 0,
    valueEl
  };

  const startHold = (dir: -1 | 1) => {
    runtime.holdDir = dir;
    runtime.holdMs = 0;
  };

  const stopHold = () => {
    runtime.holdDir = 0;
    runtime.holdMs = 0;
  };

  minusBtn.addEventListener('pointerdown', () => startHold(-1));
  plusBtn.addEventListener('pointerdown', () => startHold(1));
  minusBtn.addEventListener('pointerup', stopHold);
  plusBtn.addEventListener('pointerup', stopHold);
  minusBtn.addEventListener('pointercancel', stopHold);
  plusBtn.addEventListener('pointercancel', stopHold);
  minusBtn.addEventListener('pointerleave', stopHold);
  plusBtn.addEventListener('pointerleave', stopHold);

  top.append(l, valueEl);
  nudgeRow.append(minusBtn, hint, plusBtn);
  row.append(top, nudgeRow);
  controlsEl.append(row);

  controlRuntimes.push(runtime);
}

function applyControlValuesToSim() {
  for (const runtime of controlRuntimes) {
    sim.setParam(runtime.spec.key, runtime.value);
    runtime.valueEl.textContent = formatValue(runtime.spec, runtime.value);
  }
}

function applyPreset(presetKey: string) {
  const preset = presets.find((p) => p.key === presetKey);
  if (!preset) return;
  activePresetKey = preset.key;

  for (const runtime of controlRuntimes) {
    runtime.value = clampToSpec(preset.params[runtime.spec.key], runtime.spec);
    runtime.holdDir = 0;
    runtime.holdMs = 0;
  }
  applyControlValuesToSim();
}

function addTitle(text: string) {
  const el = document.createElement('div');
  el.className = 'group-title';
  el.textContent = text;
  controlsEl.append(el);
}

const buttons = document.createElement('div');
buttons.className = 'button-row';
const pauseBtn = document.createElement('button');
pauseBtn.textContent = 'Pause';
pauseBtn.onclick = () => {
  paused = !paused;
  pauseBtn.textContent = paused ? 'Resume' : 'Pause';
};

const resetBtn = document.createElement('button');
resetBtn.textContent = 'Reset State';
resetBtn.onclick = () => {
  sim.reset();
  seedHistory();
};

const presetBtn = document.createElement('button');
presetBtn.textContent = 'Reset Parameters';
presetBtn.onclick = () => {
  applyPreset(activePresetKey);
};

buttons.append(pauseBtn, resetBtn, presetBtn);
controlsEl.append(buttons);

addTitle('Drive + Weights');
for (const spec of controlSpec.slice(0, 4)) addControl(spec);
addTitle('Baseline');
for (const spec of controlSpec.slice(4, 7)) addControl(spec);

applyControlValuesToSim();
const presetFromUrl = new URLSearchParams(window.location.search).get('preset');
if (presetFromUrl) {
  applyPreset(presetFromUrl);
} else {
  applyPreset(presets[0].key);
}

window.addEventListener('pointerup', () => {
  for (const runtime of controlRuntimes) {
    runtime.holdDir = 0;
    runtime.holdMs = 0;
  }
});

function applyNudges(elapsedMs: number) {
  for (const runtime of controlRuntimes) {
    if (runtime.holdDir === 0) continue;
    runtime.holdMs += elapsedMs;
    const accel = 1 + Math.min(8, runtime.holdMs / 450);
    const delta = runtime.holdDir * runtime.spec.step * accel * (elapsedMs / 16.7);
    runtime.value = clampToSpec(runtime.value + delta, runtime.spec);
  }
  applyControlValuesToSim();
}

function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas unavailable');

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  resize();
  window.addEventListener('resize', resize);
  return ctx;
}

const aCanvas = document.querySelector<HTMLCanvasElement>('#a-canvas');
const bCanvas = document.querySelector<HTMLCanvasElement>('#b-canvas');
const cCanvas = document.querySelector<HTMLCanvasElement>('#c-canvas');
const netCanvas = document.querySelector<HTMLCanvasElement>('#net-canvas');
if (!aCanvas || !bCanvas || !cCanvas || !netCanvas) throw new Error('Missing canvas nodes');

const aCtx = setupCanvas(aCanvas);
const bCtx = setupCanvas(bCanvas);
const cCtx = setupCanvas(cCanvas);
const netCtx = setupCanvas(netCanvas);

function drawTraceGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = 'rgba(170, 220, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 5; i += 1) {
    const y = (h * i) / 5;
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  for (let i = 1; i < 8; i += 1) {
    const x = (w * i) / 8;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  ctx.stroke();
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  xTrace: RingBuffer,
  yTrace: RingBuffer,
  minY: number,
  maxY: number,
  color: string,
  xStart: number,
  xEnd: number,
  floor?: number
) {
  const n = Math.min(xTrace.count(), yTrace.count());
  if (n < 2) return;

  const w = ctx.canvas.clientWidth;
  const h = ctx.canvas.clientHeight;
  const xSpan = Math.max(1e-6, xEnd - xStart);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  let hasStarted = false;
  let prevPlotted = false;

  for (let i = 0; i < n; i += 1) {
    const tx = xTrace.at(i);
    if (tx < xStart || tx > xEnd) {
      prevPlotted = false;
      continue;
    }
    const x = ((tx - xStart) / xSpan) * w;
    const yVal = yTrace.at(i);

    const shouldSkip = floor !== undefined && yVal <= floor;
    if (shouldSkip) {
      prevPlotted = false;
      continue;
    }

    const yNorm = (yVal - minY) / (maxY - minY);
    const y = h - yNorm * h;

    if (!hasStarted || !prevPlotted) {
      ctx.moveTo(x, y);
      hasStarted = true;
    } else {
      ctx.lineTo(x, y);
    }
    prevPlotted = true;
  }

  ctx.stroke();
}

function drawDualAxisPlot(
  ctx: CanvasRenderingContext2D,
  vTrace: RingBuffer,
  gTrace: RingBuffer,
  vColor: string,
  gColor: string,
  nowMs: number
) {
  const w = ctx.canvas.clientWidth;
  const h = ctx.canvas.clientHeight;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(12, 45, 83, 0.55)');
  grad.addColorStop(1, 'rgba(2, 10, 20, 0.9)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  drawTraceGrid(ctx, w, h);

  // Keep a fixed-width plotting window from frame 1 to avoid startup zoom.
  const xEnd = Math.max(plotWindowMs, nowMs);
  const xStart = xEnd - plotWindowMs;
  drawLine(ctx, channels.t, vTrace, -83, 43, vColor, xStart, xEnd);

  let gMax = 0;
  const n = gTrace.count();
  for (let i = 0; i < n; i += 1) {
    const tx = channels.t.at(i);
    if (tx < xStart || tx > xEnd) continue;
    gMax = Math.max(gMax, gTrace.at(i));
  }
  gMax = Math.min(60, Math.max(0.5, gMax * 1.15));
  drawLine(ctx, channels.t, gTrace, 0, gMax, gColor, xStart, xEnd);

  ctx.fillStyle = 'rgba(215, 235, 255, 0.78)';
  ctx.font = '11px "Avenir Next", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('v (mV)', 8, 14);
  ctx.textAlign = 'right';
  ctx.fillText(`g (a.u., max=${gMax.toFixed(2)})`, w - 8, 14);
}

function drawEdge(ctx: CanvasRenderingContext2D, from: [number, number], to: [number, number], weight: number, g: number) {
  const activity = clamp((Math.abs(weight) * g) / 150000, 0, 1);
  const edgeColor = weight >= 0 ? colormap(activity) : `rgba(255, ${Math.round(130 - 80 * activity)}, ${Math.round(170 - 120 * activity)}, 1)`;
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = 2 + activity * 8;
  ctx.shadowColor = edgeColor;
  ctx.shadowBlur = 10 + 26 * activity;
  ctx.setLineDash(weight >= 0 ? [] : [8, 6]);

  const [x1, y1] = from;
  const [x2, y2] = to;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;

  const ax = x2 - ux * 16;
  const ay = y2 - uy * 16;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(ax + px * 6, ay + py * 6);
  ctx.lineTo(ax - px * 6, ay - py * 6);
  ctx.closePath();
  ctx.fillStyle = edgeColor;
  ctx.fill();

  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
}

function drawNode(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, vVal: number, spikeVal: number) {
  const n = clamp(normV(vVal), 0, 1);
  const color = colormap(n);

  ctx.shadowColor = color;
  ctx.shadowBlur = 14 + (spikeVal > 0 ? 24 : 0);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#e8f4ff';
  ctx.font = '12px "Avenir Next", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + 38);
}

function drawNetwork() {
  const w = netCtx.canvas.clientWidth;
  const h = netCtx.canvas.clientHeight;

  const bg = netCtx.createRadialGradient(w * 0.55, h * 0.1, 10, w * 0.55, h * 0.5, h);
  bg.addColorStop(0, 'rgba(16, 53, 88, 0.4)');
  bg.addColorStop(1, 'rgba(4, 12, 24, 0.95)');
  netCtx.fillStyle = bg;
  netCtx.fillRect(0, 0, w, h);

  netCtx.fillStyle = 'rgba(98, 193, 255, 0.06)';
  for (let i = 0; i < 80; i += 1) {
    const x = ((i * 73) % w) + Math.sin((i + sim.t * 0.01) * 0.7) * 3;
    const y = ((i * 113) % h) + Math.cos((i + sim.t * 0.013) * 0.8) * 3;
    netCtx.beginPath();
    netCtx.arc(x, y, 1.1, 0, Math.PI * 2);
    netCtx.fill();
  }

  const pA: [number, number] = [w * 0.2, h * 0.5];
  const pB: [number, number] = [w * 0.5, h * 0.3];
  const pC: [number, number] = [w * 0.8, h * 0.5];

  drawEdge(netCtx, pA, pB, sim.params.w_AB, sim.g[0]);
  drawEdge(netCtx, pB, pC, sim.params.w_BC, sim.g[1]);
  if (sim.params.w_CA > 0) drawEdge(netCtx, pC, pA, sim.params.w_CA, sim.g[2]);

  drawNode(netCtx, pA[0], pA[1], 'A', sim.v[0], sim.spike[0]);
  drawNode(netCtx, pB[0], pB[1], 'B', sim.v[1], sim.spike[1]);
  drawNode(netCtx, pC[0], pC[1], 'C', sim.v[2], sim.spike[2]);

  netCtx.fillStyle = 'rgba(125, 157, 183, 0.85)';
  netCtx.font = '12px "Avenir Next", sans-serif';
  netCtx.textAlign = 'left';
  const activePreset = presets.find((p) => p.key === activePresetKey);
  const label = activePreset ? activePreset.label : presets[0].label;
  netCtx.fillText(`${label}  |  t = ${Math.round(sim.t)} ms`, 12, h - 12);
}

let last = performance.now();

function frame(now: number) {
  const elapsed = now - last;
  last = now;

  if (!paused) {
    applyNudges(elapsed);

    simAccumulator += Math.min(100, elapsed);
    let steps = 0;
    const maxSteps = 5000;

    while (simAccumulator >= solverDt && steps < maxSteps) {
      sim.step();
      vSampleMax[0] = Math.max(vSampleMax[0], sim.spike[0] > 0 ? vpeak : sim.v[0]);
      vSampleMax[1] = Math.max(vSampleMax[1], sim.spike[1] > 0 ? vpeak : sim.v[1]);
      vSampleMax[2] = Math.max(vSampleMax[2], sim.spike[2] > 0 ? vpeak : sim.v[2]);

      while (sim.t >= nextTraceSampleTime) {
        pushChannels(nextTraceSampleTime);
        nextTraceSampleTime += traceSampleDt;
      }

      simAccumulator -= solverDt;
      steps += 1;
    }

    if (steps >= maxSteps) {
      simAccumulator = 0;
    }
  }

  drawDualAxisPlot(
    aCtx,
    channels.vA,
    channels.gA,
    getComputedStyle(document.documentElement).getPropertyValue('--line-a').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--g-a').trim(),
    sim.t
  );
  drawDualAxisPlot(
    bCtx,
    channels.vB,
    channels.gB,
    getComputedStyle(document.documentElement).getPropertyValue('--line-b').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--g-b').trim(),
    sim.t
  );
  drawDualAxisPlot(
    cCtx,
    channels.vC,
    channels.gC,
    getComputedStyle(document.documentElement).getPropertyValue('--line-c').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--g-c').trim(),
    sim.t
  );
  drawNetwork();

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
