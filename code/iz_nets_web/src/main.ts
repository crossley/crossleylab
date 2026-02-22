import './style.css';

type Cell = 0 | 1 | 2;

interface SimParams {
  w_IA: number;
  w_AB: number;
  w_BC: number;
  pulse_amp: number;
  pulse_width: number;
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
  valueInput: HTMLInputElement;
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
const pulsePeriodMs = 3000;

const controlSpec: ControlSpec[] = [
  { key: 'w_IA', min: 0, step: 0.1, label: 'Weight w_IA' },
  { key: 'w_AB', min: -220, step: 1, label: 'Weight w_AB' },
  { key: 'w_BC', min: -220, step: 1, label: 'Weight w_BC' },
  { key: 'pulse_amp', min: 0, step: 1, label: 'Pulse amplitude' },
  { key: 'pulse_width', min: 50, max: pulsePeriodMs - 50, step: 10, label: 'Pulse width (ms)' },
  { key: 'E_A', min: -50, step: 1, label: 'Baseline E_A' },
  { key: 'E_B', min: -50, step: 1, label: 'Baseline E_B' },
  { key: 'E_C', min: -50, step: 1, label: 'Baseline E_C' }
];

const defaultParams: SimParams = {
  w_IA: 1.0,
  w_AB: 80,
  w_BC: 80,
  pulse_amp: 220,
  pulse_width: 1000,
  E_A: 0,
  E_B: 0,
  E_C: 0
};

function squarePulse(tMs: number, amp: number, widthMs: number): number {
  const pulseOnStartMs = pulsePeriodMs / 3;
  const pulseOnEndMs = Math.min(pulsePeriodMs, pulseOnStartMs + Math.max(1, widthMs));
  const phase = tMs % pulsePeriodMs;
  return phase >= pulseOnStartMs && phase < pulseOnEndMs ? amp : 0;
}

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
    const { w_IA, w_AB, w_BC, pulse_amp, pulse_width, E_A, E_B, E_C } = this.params;

    const I_A = w_IA * squarePulse(this.t, pulse_amp, pulse_width) + E_A;
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
  iA: RingBuffer;
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
    iA: new RingBuffer(n),
    vA: new RingBuffer(n),
    vB: new RingBuffer(n),
    vC: new RingBuffer(n),
    gA: new RingBuffer(n),
    gB: new RingBuffer(n),
    gC: new RingBuffer(n)
  };
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
  <p class="subtitle">Three-neuron feedforward excitatory network (A -> B -> C) with repeating square-pulse input to A and baseline currents E_A/E_B/E_C.</p>
  <div class="main-grid">
    <section class="row-stack">
      <div class="row-grid">
        <aside class="panel row-controls" id="ctrl-input"></aside>
        <div class="panel canvas-wrap">
          <span class="canvas-title">External Input to Neuron A (I)</span>
          <canvas id="i-canvas"></canvas>
          <div class="legend">
            <span><span class="swatch" style="background: #d8dde4"></span>I_A square pulse</span>
          </div>
        </div>
      </div>
      <div class="row-grid">
        <aside class="panel row-controls" id="ctrl-a"></aside>
        <div class="panel canvas-wrap">
          <span class="canvas-title">Neuron A: v (left axis) and g (right axis)</span>
          <canvas id="a-canvas"></canvas>
          <div class="legend">
            <span><span class="swatch" style="background: var(--line-a)"></span>v_A</span>
            <span><span class="swatch" style="background: var(--g-a)"></span>g_A</span>
          </div>
        </div>
      </div>
      <div class="row-grid">
        <aside class="panel row-controls" id="ctrl-b"></aside>
        <div class="panel canvas-wrap">
          <span class="canvas-title">Neuron B: v (left axis) and g (right axis)</span>
          <canvas id="b-canvas"></canvas>
          <div class="legend">
            <span><span class="swatch" style="background: var(--line-b)"></span>v_B</span>
            <span><span class="swatch" style="background: var(--g-b)"></span>g_B</span>
          </div>
        </div>
      </div>
      <div class="row-grid">
        <aside class="panel row-controls" id="ctrl-c"></aside>
        <div class="panel canvas-wrap">
          <span class="canvas-title">Neuron C: v (left axis) and g (right axis)</span>
          <canvas id="c-canvas"></canvas>
          <div class="legend">
            <span><span class="swatch" style="background: var(--line-c)"></span>v_C</span>
            <span><span class="swatch" style="background: var(--g-c)"></span>g_C</span>
          </div>
        </div>
      </div>
    </section>
    <aside class="panel run-controls" id="run-controls"></aside>
  </div>
`;

const ctrlInputEl = (() => {
  const el = document.querySelector<HTMLDivElement>('#ctrl-input');
  if (!el) throw new Error('Missing input controls root');
  return el;
})();
const ctrlAEl = (() => {
  const el = document.querySelector<HTMLDivElement>('#ctrl-a');
  if (!el) throw new Error('Missing A controls root');
  return el;
})();
const ctrlBEl = (() => {
  const el = document.querySelector<HTMLDivElement>('#ctrl-b');
  if (!el) throw new Error('Missing B controls root');
  return el;
})();
const ctrlCEl = (() => {
  const el = document.querySelector<HTMLDivElement>('#ctrl-c');
  if (!el) throw new Error('Missing C controls root');
  return el;
})();
const runControlsEl = (() => {
  const el = document.querySelector<HTMLDivElement>('#run-controls');
  if (!el) throw new Error('Missing run controls root');
  return el;
})();

const sim = new Izh3Sim();
let paused = false;

const mobile = window.matchMedia('(max-width: 720px)').matches;
const historyLength = mobile ? 650 : 1100;
const channels = initChannels(historyLength);
let nextTraceSampleTime = 0;
let simAccumulator = 0;
const plotWindowMs = historyLength * traceSampleDt;
const vSampleMax = new Float32Array(3);

function pushChannels(sampleTime: number) {
  channels.t.push(sampleTime);
  channels.iA.push(squarePulse(sampleTime, sim.params.pulse_amp, sim.params.pulse_width));
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
  channels.iA.clear(0);
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

function addControl(spec: ControlSpec, parent: HTMLElement) {
  const row = document.createElement('label');
  row.className = 'control';

  const top = document.createElement('div');
  top.className = 'label-row';

  const l = document.createElement('span');
  l.textContent = spec.label;

  const valueInput = document.createElement('input');
  valueInput.type = 'number';
  valueInput.className = 'value-input';
  valueInput.step = String(spec.step);
  if (spec.min !== undefined) valueInput.min = String(spec.min);
  if (spec.max !== undefined) valueInput.max = String(spec.max);
  valueInput.value = formatValue(spec, defaultParams[spec.key]);

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
    valueInput
  };

  const commitInputValue = () => {
    const num = Number(valueInput.value);
    if (!Number.isFinite(num)) {
      valueInput.value = formatValue(spec, runtime.value);
      return;
    }
    runtime.value = clampToSpec(num, spec);
    applyControlValuesToSim();
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

  valueInput.addEventListener('change', commitInputValue);
  valueInput.addEventListener('blur', commitInputValue);
  valueInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitInputValue();
      valueInput.blur();
    }
  });

  top.append(l, valueInput);
  nudgeRow.append(minusBtn, hint, plusBtn);
  row.append(top, nudgeRow);
  parent.append(row);

  controlRuntimes.push(runtime);
}

function getControlSpec(key: keyof SimParams): ControlSpec {
  const spec = controlSpec.find((s) => s.key === key);
  if (!spec) throw new Error(`Missing control spec for ${key}`);
  return spec;
}

function addNeuronControlLayout() {
  const addSection = (name: string, keys: Array<keyof SimParams>, parent: HTMLElement) => {
    const nameEl = document.createElement('div');
    nameEl.className = 'group-title';
    nameEl.textContent = name;
    parent.append(nameEl);
    for (const key of keys) {
      addControl(getControlSpec(key), parent);
    }
  };

  addSection('External Input', ['pulse_width', 'pulse_amp'], ctrlInputEl);
  addSection('Neuron A', ['w_IA', 'E_A'], ctrlAEl);
  addSection('Neuron B', ['w_AB', 'E_B'], ctrlBEl);
  addSection('Neuron C', ['w_BC', 'E_C'], ctrlCEl);
}

function applyControlValuesToSim() {
  for (const runtime of controlRuntimes) {
    sim.setParam(runtime.spec.key, runtime.value);
    runtime.valueInput.value = formatValue(runtime.spec, runtime.value);
  }
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
  for (const runtime of controlRuntimes) {
    runtime.value = clampToSpec(defaultParams[runtime.spec.key], runtime.spec);
    runtime.holdDir = 0;
    runtime.holdMs = 0;
  }
  applyControlValuesToSim();
};

buttons.append(pauseBtn, resetBtn, presetBtn);
const runTitle = document.createElement('div');
runTitle.className = 'group-title';
runTitle.textContent = 'Run Controls';
runControlsEl.append(runTitle, buttons);
addNeuronControlLayout();

applyControlValuesToSim();

window.addEventListener('pointerup', () => {
  for (const runtime of controlRuntimes) {
    runtime.holdDir = 0;
    runtime.holdMs = 0;
  }
});

function applyNudges(elapsedMs: number) {
  let changed = false;
  for (const runtime of controlRuntimes) {
    if (runtime.holdDir === 0) continue;
    runtime.holdMs += elapsedMs;
    const accel = 1 + Math.min(8, runtime.holdMs / 450);
    const delta = runtime.holdDir * runtime.spec.step * accel * (elapsedMs / 16.7);
    runtime.value = clampToSpec(runtime.value + delta, runtime.spec);
    changed = true;
  }
  if (changed) applyControlValuesToSim();
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

const iCanvas = document.querySelector<HTMLCanvasElement>('#i-canvas');
const aCanvas = document.querySelector<HTMLCanvasElement>('#a-canvas');
const bCanvas = document.querySelector<HTMLCanvasElement>('#b-canvas');
const cCanvas = document.querySelector<HTMLCanvasElement>('#c-canvas');
if (!iCanvas || !aCanvas || !bCanvas || !cCanvas) throw new Error('Missing canvas nodes');

const iCtx = setupCanvas(iCanvas);
const aCtx = setupCanvas(aCanvas);
const bCtx = setupCanvas(bCanvas);
const cCtx = setupCanvas(cCanvas);

function drawTraceGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.13)';
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
  grad.addColorStop(0, 'rgba(18, 18, 20, 0.46)');
  grad.addColorStop(1, 'rgba(2, 2, 3, 0.97)');
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

  ctx.fillStyle = 'rgba(220, 224, 230, 0.78)';
  ctx.font = '11px "Avenir Next", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('v (mV)', 8, 14);
  ctx.textAlign = 'right';
  ctx.fillText(`g (a.u., max=${gMax.toFixed(2)})`, w - 8, 14);
}

function drawInputPlot(ctx: CanvasRenderingContext2D, iTrace: RingBuffer, nowMs: number) {
  const w = ctx.canvas.clientWidth;
  const h = ctx.canvas.clientHeight;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(18, 18, 20, 0.46)');
  grad.addColorStop(1, 'rgba(2, 2, 3, 0.97)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  drawTraceGrid(ctx, w, h);
  const xEnd = Math.max(plotWindowMs, nowMs);
  const xStart = xEnd - plotWindowMs;
  let iMax = 0;
  const n = iTrace.count();
  for (let i = 0; i < n; i += 1) {
    const tx = channels.t.at(i);
    if (tx < xStart || tx > xEnd) continue;
    iMax = Math.max(iMax, iTrace.at(i));
  }
  drawLine(ctx, channels.t, iTrace, 0, Math.max(10, iMax * 1.05), '#d8dde4', xStart, xEnd);

  ctx.fillStyle = 'rgba(220, 224, 230, 0.78)';
  ctx.font = '11px "Avenir Next", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('I_A (a.u.)', 8, 14);
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

  drawInputPlot(
    iCtx,
    channels.iA,
    sim.t
  );
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

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
