import '../style.css';
import {
  DEFAULT_DIFFUSION_SD,
  DEFAULT_NUM_PARTICLES,
  MAX_PARTICLES,
  SIM_COLORS,
  drawMembraneWall,
  evenlySpacedChannelBounds
} from './sim_shared';

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
  type0ChannelWidth: number;
  type1ChannelWidth: number;
  type0Permeability: number;
  type1Permeability: number;
}

interface DisplayParams {
  pointSize: number;
  playbackSpeed: number;
  targetFps: number;
}

interface LiveSimState {
  x: Float32Array;
  y: Float32Array;
  types: Uint8Array;
  numParticles: number;
  dt: number;
  simTime: number;
  stepCount: number;
  boxWidth: number;
  boxHeight: number;
  leftWall: number;
  rightWall: number;
  type0YMin: number;
  type0YMax: number;
  type1YMin: number;
  type1YMax: number;
  type0Left: number;
  type0Right: number;
  type1Left: number;
  type1Right: number;
  type0Total: number;
  type1Total: number;
}

interface TraceHistory {
  times: number[];
  type0LeftFrac: number[];
  type0RightFrac: number[];
  type1LeftFrac: number[];
  type1RightFrac: number[];
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
  numParticles: DEFAULT_NUM_PARTICLES,
  type0Fraction: 0.5,
  boxWidth: 100,
  boxHeight: 80,
  wallThickness: 4,
  diffusionSd: DEFAULT_DIFFUSION_SD,
  type0ChannelWidth: 14,
  type1ChannelWidth: 14,
  type0Permeability: 0.2,
  type1Permeability: 0.7
};

const defaultDisplay: DisplayParams = {
  pointSize: 2.0,
  playbackSpeed: 1,
  targetFps: 30
};

const TRACE_HISTORY_MAX_POINTS = 4000;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
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
  input.value = Number.isInteger(value) ? String(value) : Number(value.toFixed(digits)).toString();
}

function normalizeSimParams(params: SimParams): SimParams {
  const boxWidth = clamp(params.boxWidth, 20, 500);
  const boxHeight = clamp(params.boxHeight, 20, 500);
  const wallThickness = clamp(params.wallThickness, 0.5, Math.min(50, boxWidth - 2));
  return {
    T: clamp(Math.round(params.T), 100, 20000),
    dt: clamp(params.dt, 0.05, 20),
    numParticles: clamp(Math.round(params.numParticles), 1, MAX_PARTICLES),
    type0Fraction: clamp(params.type0Fraction, 0, 1),
    boxWidth,
    boxHeight,
    wallThickness,
    diffusionSd: clamp(params.diffusionSd, 0, 20),
    type0ChannelWidth: clamp(params.type0ChannelWidth, 0.5, boxHeight - 8),
    type1ChannelWidth: clamp(params.type1ChannelWidth, 0.5, boxHeight - 8),
    type0Permeability: clamp(params.type0Permeability, 0, 1),
    type1Permeability: clamp(params.type1Permeability, 0, 1)
  };
}

function countByTypeAndSide(state: LiveSimState): void {
  let type0Left = 0;
  let type0Right = 0;
  let type1Left = 0;
  let type1Right = 0;
  for (let i = 0; i < state.numParticles; i += 1) {
    const isType0 = state.types[i] === 0;
    const x = state.x[i];
    if (x < state.leftWall) {
      if (isType0) type0Left += 1;
      else type1Left += 1;
    } else if (x > state.rightWall) {
      if (isType0) type0Right += 1;
      else type1Right += 1;
    }
  }
  state.type0Left = type0Left;
  state.type0Right = type0Right;
  state.type1Left = type1Left;
  state.type1Right = type1Right;
}

function createState(params: SimParams, seed: number): LiveSimState {
  const normalized = normalizeSimParams(params);
  const rng = new Rng(seed);
  const leftWall = -normalized.wallThickness / 2;
  const rightWall = normalized.wallThickness / 2;
  const [[type0YMin, type0YMax], [type1YMin, type1YMax]] = evenlySpacedChannelBounds(
    [normalized.type0ChannelWidth, normalized.type1ChannelWidth],
    normalized.boxHeight
  );
  const x = new Float32Array(normalized.numParticles);
  const y = new Float32Array(normalized.numParticles);
  const types = new Uint8Array(normalized.numParticles);
  let type0Total = 0;
  let type1Total = 0;

  for (let i = 0; i < normalized.numParticles; i += 1) {
    const type = (rng.next() < normalized.type0Fraction ? 0 : 1) as IonType;
    types[i] = type;
    if (type === 0) type0Total += 1;
    else type1Total += 1;
    x[i] = rng.uniform(-normalized.boxWidth / 2 + 1, leftWall - 1);
    y[i] = rng.uniform(-normalized.boxHeight / 2 + 1, normalized.boxHeight / 2 - 1);
  }

  const state: LiveSimState = {
    x,
    y,
    types,
    numParticles: normalized.numParticles,
    dt: normalized.dt,
    simTime: 0,
    stepCount: 0,
    boxWidth: normalized.boxWidth,
    boxHeight: normalized.boxHeight,
    leftWall,
    rightWall,
    type0YMin,
    type0YMax,
    type1YMin,
    type1YMax,
    type0Left: 0,
    type0Right: 0,
    type1Left: 0,
    type1Right: 0,
    type0Total,
    type1Total
  };
  countByTypeAndSide(state);
  return state;
}

function retargetTypes(state: LiveSimState, type0Fraction: number, rng: Rng): void {
  const targetType0 = Math.round(state.numParticles * type0Fraction);
  let currentType0 = 0;
  const type0Idx: number[] = [];
  const type1Idx: number[] = [];
  for (let i = 0; i < state.numParticles; i += 1) {
    if (state.types[i] === 0) {
      currentType0 += 1;
      type0Idx.push(i);
    } else {
      type1Idx.push(i);
    }
  }
  if (currentType0 < targetType0) {
    for (let n = 0; n < targetType0 - currentType0 && type1Idx.length > 0; n += 1) {
      const pick = Math.floor(rng.next() * type1Idx.length);
      state.types[type1Idx.splice(pick, 1)[0]] = 0;
    }
  } else if (currentType0 > targetType0) {
    for (let n = 0; n < currentType0 - targetType0 && type0Idx.length > 0; n += 1) {
      const pick = Math.floor(rng.next() * type0Idx.length);
      state.types[type0Idx.splice(pick, 1)[0]] = 1;
    }
  }
  state.type0Total = targetType0;
  state.type1Total = state.numParticles - targetType0;
}

function resizeState(state: LiveSimState, nextCount: number, rng: Rng, type0Fraction: number): LiveSimState {
  if (nextCount === state.numParticles) return state;
  const x = new Float32Array(nextCount);
  const y = new Float32Array(nextCount);
  const types = new Uint8Array(nextCount);
  const keep = Math.min(state.numParticles, nextCount);
  x.set(state.x.subarray(0, keep));
  y.set(state.y.subarray(0, keep));
  types.set(state.types.subarray(0, keep));
  for (let i = keep; i < nextCount; i += 1) {
    types[i] = (rng.next() < type0Fraction ? 0 : 1) as IonType;
    x[i] = rng.uniform(-state.boxWidth / 2 + 1, state.leftWall - 1);
    y[i] = rng.uniform(-state.boxHeight / 2 + 1, state.boxHeight / 2 - 1);
  }
  state = { ...state, x, y, types, numParticles: nextCount };
  retargetTypes(state, type0Fraction, rng);
  return state;
}

function enforceGeometry(state: LiveSimState): void {
  const halfW = state.boxWidth / 2;
  const halfH = state.boxHeight / 2;
  for (let i = 0; i < state.numParticles; i += 1) {
    state.x[i] = reflectIntoBounds(state.x[i], -halfW, halfW);
    state.y[i] = reflectIntoBounds(state.y[i], -halfH, halfH);
    const inWall = state.x[i] > state.leftWall && state.x[i] < state.rightWall;
    const chMin = state.types[i] === 0 ? state.type0YMin : state.type1YMin;
    const chMax = state.types[i] === 0 ? state.type0YMax : state.type1YMax;
    const inChannel = state.y[i] >= chMin && state.y[i] <= chMax;
    if (inWall && !inChannel) state.x[i] = state.x[i] < 0 ? state.leftWall : state.rightWall;
  }
  countByTypeAndSide(state);
}

function stepState(state: LiveSimState, params: SimParams, rng: Rng): void {
  const halfW = state.boxWidth / 2;
  const halfH = state.boxHeight / 2;
  for (let i = 0; i < state.numParticles; i += 1) {
    const xPrev = state.x[i];
    const yPrev = state.y[i];
    const xTrial = reflectIntoBounds(xPrev + rng.normal(0, params.diffusionSd) * state.dt, -halfW, halfW);
    const yNew = reflectIntoBounds(yPrev + rng.normal(0, params.diffusionSd) * state.dt, -halfH, halfH);
    let xNew = xTrial;
    const tryingToCrossLeft = xPrev < state.leftWall && xTrial >= state.leftWall;
    const tryingToCrossRight = xPrev > state.rightWall && xTrial <= state.rightWall;
    const isType0 = state.types[i] === 0;
    const chMin = isType0 ? state.type0YMin : state.type1YMin;
    const chMax = isType0 ? state.type0YMax : state.type1YMax;
    const inChannel = yNew >= chMin && yNew <= chMax;
    const permeability = isType0 ? params.type0Permeability : params.type1Permeability;
    if ((tryingToCrossLeft || tryingToCrossRight) && !inChannel) {
      xNew = tryingToCrossLeft
        ? reflectIntoBounds(2 * state.leftWall - xTrial, -halfW, halfW)
        : reflectIntoBounds(2 * state.rightWall - xTrial, -halfW, halfW);
    } else if ((tryingToCrossLeft || tryingToCrossRight) && inChannel && rng.next() > permeability) {
      xNew = tryingToCrossLeft
        ? reflectIntoBounds(2 * state.leftWall - xTrial, -halfW, halfW)
        : reflectIntoBounds(2 * state.rightWall - xTrial, -halfW, halfW);
    } else if (!inChannel && xTrial > state.leftWall && xTrial < state.rightWall) {
      xNew = xPrev < 0 ? state.leftWall : state.rightWall;
    }
    state.x[i] = xNew;
    state.y[i] = yNew;
  }
  state.stepCount += 1;
  state.simTime = state.stepCount * state.dt;
  countByTypeAndSide(state);
}

function createTraceHistory(state: LiveSimState, traceWindowMs: number): TraceHistory {
  const trace: TraceHistory = { times: [], type0LeftFrac: [], type0RightFrac: [], type1LeftFrac: [], type1RightFrac: [] };
  pushTracePoint(trace, state, traceWindowMs);
  return trace;
}

function pushTracePoint(trace: TraceHistory, state: LiveSimState, traceWindowMs: number): void {
  trace.times.push(state.simTime);
  trace.type0LeftFrac.push(state.type0Total > 0 ? state.type0Left / state.type0Total : 0);
  trace.type0RightFrac.push(state.type0Total > 0 ? state.type0Right / state.type0Total : 0);
  trace.type1LeftFrac.push(state.type1Total > 0 ? state.type1Left / state.type1Total : 0);
  trace.type1RightFrac.push(state.type1Total > 0 ? state.type1Right / state.type1Total : 0);
  const minTime = Math.max(0, state.simTime - traceWindowMs);
  while (trace.times.length > 1 && trace.times[0] < minTime) {
    trace.times.shift();
    trace.type0LeftFrac.shift();
    trace.type0RightFrac.shift();
    trace.type1LeftFrac.shift();
    trace.type1RightFrac.shift();
  }
  while (trace.times.length > TRACE_HISTORY_MAX_POINTS) {
    trace.times.shift();
    trace.type0LeftFrac.shift();
    trace.type0RightFrac.shift();
    trace.type1LeftFrac.shift();
    trace.type1RightFrac.shift();
  }
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

function worldToCanvas(x: number, y: number, state: LiveSimState, w: number, h: number): [number, number] {
  const px = ((x + state.boxWidth / 2) / state.boxWidth) * w;
  const py = h - ((y + state.boxHeight / 2) / state.boxHeight) * h;
  return [px, py];
}

function drawEnvironment(ctx: CanvasRenderingContext2D, state: LiveSimState, w: number, h: number, dpr: number): void {
  ctx.fillStyle = '#03060b';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(120, 170, 255, 0.10)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i += 1) {
    const gx = (w * i) / 10;
    const gy = (h * i) / 10;
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }
  const [wl] = worldToCanvas(state.leftWall, 0, state, w, h);
  const [wr] = worldToCanvas(state.rightWall, 0, state, w, h);
  const [, t0Top] = worldToCanvas(0, state.type0YMax, state, w, h);
  const [, t0Bottom] = worldToCanvas(0, state.type0YMin, state, w, h);
  const [, t1Top] = worldToCanvas(0, state.type1YMax, state, w, h);
  const [, t1Bottom] = worldToCanvas(0, state.type1YMin, state, w, h);
  drawMembraneWall(ctx, {
    leftX: wl,
    rightX: wr,
    height: h,
    dpr,
    channels: [
      { top: t0Top, bottom: t0Bottom },
      { top: t1Top, bottom: t1Bottom }
    ]
  });
  const membraneWidth = Math.max(1, wr - wl);
  const drawPermeabilityBand = (top: number, bottom: number, color: string, permeability: number): void => {
    const yTop = Math.min(top, bottom);
    const yBottom = Math.max(top, bottom);
    const bandHeight = Math.max(1, yBottom - yTop);
    const openHeight = Math.max(1 * dpr, bandHeight * clamp(permeability, 0, 1));
    const openY = yTop + (bandHeight - openHeight) / 2;
    ctx.fillStyle = 'rgba(8, 16, 26, 0.85)';
    ctx.fillRect(wl, yTop, membraneWidth, bandHeight);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.15 + 0.55 * clamp(permeability, 0, 1);
    ctx.fillRect(wl, openY, membraneWidth, openHeight);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1 * dpr;
    ctx.strokeRect(wl, yTop, membraneWidth, bandHeight);
  };
  drawPermeabilityBand(t0Top, t0Bottom, 'rgba(245, 178, 72, 0.92)', simParams.type0Permeability);
  drawPermeabilityBand(t1Top, t1Bottom, 'rgba(66, 200, 255, 0.92)', simParams.type1Permeability);
  ctx.strokeStyle = 'rgba(120, 170, 255, 0.2)';
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(0.5 * dpr, 0.5 * dpr, w - dpr, h - dpr);
}

function drawFrame(canvas: HTMLCanvasElement, state: LiveSimState, display: DisplayParams): void {
  syncCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, w, h);
  drawEnvironment(ctx, state, w, h, dpr);
  const r = Math.max(0.8, display.pointSize) * dpr;
  for (let i = 0; i < state.numParticles; i += 1) {
    const [px, py] = worldToCanvas(state.x[i], state.y[i], state, w, h);
    ctx.fillStyle = state.types[i] === 0 ? SIM_COLORS.ionA : SIM_COLORS.ionB;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(232, 243, 255, 0.92)';
  ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
}

function drawSideTrace(canvas: HTMLCanvasElement, trace: TraceHistory, currentTime: number, traceWindowMs: number): void {
  syncCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#03060b';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(120, 170, 255, 0.10)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i += 1) {
    const gx = (w * i) / 10;
    const gy = (h * i) / 10;
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }
  const padL = 38 * dpr;
  const padR = 12 * dpr;
  const padT = 18 * dpr;
  const padB = 22 * dpr;
  const plotW = Math.max(1, w - padL - padR);
  const plotH = Math.max(1, h - padT - padB);
  const startTime = Math.max(0, currentTime - traceWindowMs);
  const xMap = (tt: number) => padL + ((tt - startTime) / Math.max(traceWindowMs, 1)) * plotW;
  const yMap = (frac: number) => padT + (1 - frac) * plotH;
  ctx.strokeStyle = 'rgba(180, 220, 255, 0.28)';
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(padL, padT, plotW, plotH);
  ctx.beginPath();
  ctx.moveTo(padL, yMap(0.5));
  ctx.lineTo(padL + plotW, yMap(0.5));
  ctx.stroke();
  const series = [
    { data: trace.type0LeftFrac, color: SIM_COLORS.ionATrace, dashed: false },
    { data: trace.type0RightFrac, color: SIM_COLORS.ionATrace, dashed: true },
    { data: trace.type1LeftFrac, color: SIM_COLORS.ionBTrace, dashed: false },
    { data: trace.type1RightFrac, color: SIM_COLORS.ionBTrace, dashed: true }
  ];
  for (const seriesEntry of series) {
    ctx.save();
    ctx.strokeStyle = seriesEntry.color;
    ctx.lineWidth = 1.8 * dpr;
    if (seriesEntry.dashed) ctx.setLineDash([5 * dpr, 4 * dpr]);
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < trace.times.length; i += 1) {
      if (trace.times[i] < startTime) continue;
      const px = xMap(trace.times[i]);
      const py = yMap(seriesEntry.data[i]);
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    if (started) ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(232, 243, 255, 0.78)';
  ctx.font = `${11 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.save();
  ctx.translate(18 * dpr, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('fraction in compartment', 0, 0);
  ctx.restore();
  ctx.fillStyle = 'rgba(232, 243, 255, 0.92)';
  ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
}

const app = getEl<HTMLDivElement>('#app');
app.innerHTML = `
  <div class="site-shell">
    <div class="nav-line">
      <a href="./index.html">Back to index</a>
      <span>•</span>
      <span>Page: <code>inspect_diffusion_selective_permeability_rate</code></span>
    </div>
    <header class="page-head">
      <p class="eyebrow">Electrochemical Signalling in Nerve Cells</p>
      <h1>Selective Permeability by Probabilistic Gating</h1>
      <ul class="key-points">
        <li>Ion A and Ion B have the same diffusion dynamics.</li>
        <li>Each ion crosses only through its own pore.</li>
        <li>Higher open probability means higher permeability for that ion.</li>
        <li>Higher permeability leads to faster approach to equilibrium.</li>
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
              <div class="field"><label for="type0-fraction">Ion A fraction</label><input id="type0-fraction" type="number" min="0" max="1" step="0.01" /></div>
              <div class="field"><label for="diffusion-sd">Diffusion SD</label><input id="diffusion-sd" type="number" min="0" max="20" step="0.05" /></div>
              <div class="field"><label for="type0-permeability">Ion A pore permeability</label><input id="type0-permeability" type="number" min="0" max="1" step="0.01" /></div>
              <div class="field"><label for="type1-permeability">Ion B pore permeability</label><input id="type1-permeability" type="number" min="0" max="1" step="0.01" /></div>
              <div class="field"><label for="playback-speed">Playback speed</label><input id="playback-speed" type="number" min="0.1" max="8" step="0.1" /></div>
              <div class="field"><label for="seed">Seed</label><input id="seed" type="number" min="0" max="4294967295" step="1" /></div>
            </div>
          </div>
          <details>
            <summary>Advanced Controls</summary>
            <div class="group" style="margin-top: 8px;">
              <div class="control-grid">
                <div class="field"><label for="total-time">Trace window T (ms)</label><input id="total-time" type="number" min="100" max="20000" step="10" /></div>
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
              <dt>Step</dt><dd id="status-frame">0</dd>
              <dt>Time (ms)</dt><dd id="status-time">0.0</dd>
              <dt>Ion A Left</dt><dd id="status-type0-left">0</dd>
              <dt>Ion A Right</dt><dd id="status-type0-right">0</dd>
              <dt>Ion B Left</dt><dd id="status-type1-left">0</dd>
              <dt>Ion B Right</dt><dd id="status-type1-right">0</dd>
              <dt>Ion A Right Frac</dt><dd id="status-type0-right-frac">0</dd>
              <dt>Ion B Right Frac</dt><dd id="status-type1-right-frac">0</dd>
              <dt>dt</dt><dd id="status-dt">0</dd>
              <dt>Step SD</dt><dd id="status-step-sd">0</dd>
              <dt>Seed</dt><dd id="status-seed">0</dd>
              <dt>Trace Samples</dt><dd id="status-frames">0</dd>
            </dl>
          </div>
          <div class="group">
            <p class="group-label">Equation + Selective Gating Rule</p>
            <div class="equation-card">
              <pre class="equation" id="equation-block"></pre>
              <p>
                Both ions use the same diffusion update. Their effective permeability differs only because each ion
                crosses the membrane through fixed channel windows with independently controlled open probability.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <section class="panel canvas-panel">
        <div class="canvas-grid-2">
          <div class="canvas-subpanel">
            <canvas id="sim-canvas" aria-label="Selective permeability simulation"></canvas>
          </div>
          <div class="canvas-subpanel">
            <canvas id="trace-canvas" aria-label="Per-ion fraction traces"></canvas>
          </div>
        </div>
      </section>
    </div>
  </div>
`;

const canvas = getEl<HTMLCanvasElement>('#sim-canvas');
const traceCanvas = getEl<HTMLCanvasElement>('#trace-canvas');
const equationBlock = getEl<HTMLElement>('#equation-block');

const inputs = {
  numParticles: getEl<HTMLInputElement>('#num-particles'),
  type0Fraction: getEl<HTMLInputElement>('#type0-fraction'),
  diffusionSd: getEl<HTMLInputElement>('#diffusion-sd'),
  type0Permeability: getEl<HTMLInputElement>('#type0-permeability'),
  type1Permeability: getEl<HTMLInputElement>('#type1-permeability'),
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
  type0RightFrac: getEl<HTMLElement>('#status-type0-right-frac'),
  type1RightFrac: getEl<HTMLElement>('#status-type1-right-frac'),
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
let rng = new Rng(currentSeed);
let state = createState(simParams, currentSeed);
let trace = createTraceHistory(state, simParams.T);
let isPlaying = true;
let lastTs = performance.now();
let stepAccumulator = 0;

function writeInputs(): void {
  setNumberInput(inputs.numParticles, simParams.numParticles, 0);
  setNumberInput(inputs.type0Fraction, simParams.type0Fraction, 2);
  setNumberInput(inputs.diffusionSd, simParams.diffusionSd, 3);
  setNumberInput(inputs.type0Permeability, simParams.type0Permeability, 2);
  setNumberInput(inputs.type1Permeability, simParams.type1Permeability, 2);
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
  return normalizeSimParams({
    T: clamp(Number(inputs.totalTime.value) || defaultSim.T, 100, 20000),
    dt: clamp(Number(inputs.dt.value) || defaultSim.dt, 0.05, 20),
    numParticles: clamp(Math.round(Number(inputs.numParticles.value) || defaultSim.numParticles), 1, MAX_PARTICLES),
    type0Fraction: clamp(Number(inputs.type0Fraction.value) || defaultSim.type0Fraction, 0, 1),
    boxWidth: clamp(Number(inputs.boxWidth.value) || defaultSim.boxWidth, 20, 500),
    boxHeight,
    wallThickness: clamp(Number(inputs.wallThickness.value) || defaultSim.wallThickness, 0.5, 50),
    diffusionSd: clamp(Number(inputs.diffusionSd.value) || defaultSim.diffusionSd, 0, 20),
    type0ChannelWidth: clamp(simParams.type0ChannelWidth, 0.5, boxHeight - 8),
    type1ChannelWidth: clamp(simParams.type1ChannelWidth, 0.5, boxHeight - 8),
    type0Permeability: clamp(Number(inputs.type0Permeability.value) || 0, 0, 1),
    type1Permeability: clamp(Number(inputs.type1Permeability.value) || 0, 0, 1)
  });
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
  equationBlock.innerHTML = [
    '<span class="accent">Shared live diffusion update (all particles)</span>',
    'x_new = reflect(x_old + dxdt · dt, -W/2, W/2)',
    'y_new = reflect(y_old + dydt · dt, -H/2, H/2)',
    'dxdt, dydt ~ Normal(0, diffusionSd²)',
    '',
    '<span class="accent-2">Selective permeability comes from pore open probability</span>',
    'Ion A can cross only through the Ion A pore window',
    'Ion B can cross only through the Ion B pore window',
    'Each crossing attempt in-channel is accepted with probability p for that ion type',
    '',
    `Per-step displacement SD = diffusionSd × dt = ${stepSd.toFixed(3)}`,
    `Permeability: Ion A p = ${simParams.type0Permeability.toFixed(2)}, Ion B p = ${simParams.type1Permeability.toFixed(2)}`,
    `Trace window T = ${simParams.T.toFixed(0)} ms`
  ].join('\n');
}

function updateStatus(): void {
  statusEls.frame.textContent = `${state.stepCount}`;
  statusEls.time.textContent = state.simTime.toFixed(1);
  statusEls.type0Left.textContent = `${state.type0Left}`;
  statusEls.type0Right.textContent = `${state.type0Right}`;
  statusEls.type1Left.textContent = `${state.type1Left}`;
  statusEls.type1Right.textContent = `${state.type1Right}`;
  statusEls.type0RightFrac.textContent = state.type0Total > 0 ? (state.type0Right / state.type0Total).toFixed(3) : '0.000';
  statusEls.type1RightFrac.textContent = state.type1Total > 0 ? (state.type1Right / state.type1Total).toFixed(3) : '0.000';
  statusEls.dt.textContent = state.dt.toFixed(2);
  statusEls.stepSd.textContent = (simParams.diffusionSd * simParams.dt).toFixed(3);
  statusEls.seed.textContent = `${currentSeed >>> 0}`;
  statusEls.frames.textContent = `${trace.times.length}`;
}

function rebuildFromInputs(): void {
  simParams = readSimInputs();
  displayParams = readDisplayInputs();
  currentSeed = clamp(Math.floor(Number(inputs.seed.value) || currentSeed), 0, 0xffffffff) >>> 0;
  rng = new Rng(currentSeed);
  state = createState(simParams, currentSeed);
  trace = createTraceHistory(state, simParams.T);
  stepAccumulator = 0;
  writeInputs();
  updateEquationText();
}

function applyLiveSimParams(): void {
  const next = readSimInputs();
  const nextSeed = clamp(Math.floor(Number(inputs.seed.value) || currentSeed), 0, 0xffffffff) >>> 0;
  if (nextSeed !== currentSeed) {
    currentSeed = nextSeed;
    rng = new Rng(currentSeed);
  }
  simParams = next;
  state = resizeState(state, simParams.numParticles, rng, simParams.type0Fraction);
  state.dt = simParams.dt;
  state.boxWidth = simParams.boxWidth;
  state.boxHeight = simParams.boxHeight;
  state.leftWall = -simParams.wallThickness / 2;
  state.rightWall = simParams.wallThickness / 2;
  const [[type0YMin, type0YMax], [type1YMin, type1YMax]] = evenlySpacedChannelBounds(
    [simParams.type0ChannelWidth, simParams.type1ChannelWidth],
    simParams.boxHeight
  );
  state.type0YMin = type0YMin;
  state.type0YMax = type0YMax;
  state.type1YMin = type1YMin;
  state.type1YMax = type1YMax;
  enforceGeometry(state);
  trimTrace(trace, state.simTime, simParams.T);
  writeInputs();
  updateEquationText();
}

function refreshDisplayFromInputs(): void {
  displayParams = readDisplayInputs();
  writeInputs();
}

function trimTrace(traceHistory: TraceHistory, currentTime: number, traceWindowMs: number): void {
  const minTime = Math.max(0, currentTime - traceWindowMs);
  while (traceHistory.times.length > 1 && traceHistory.times[0] < minTime) {
    traceHistory.times.shift();
    traceHistory.type0LeftFrac.shift();
    traceHistory.type0RightFrac.shift();
    traceHistory.type1LeftFrac.shift();
    traceHistory.type1RightFrac.shift();
  }
}

function render(): void {
  updateStatus();
  drawFrame(canvas, state, displayParams);
  drawSideTrace(traceCanvas, trace, state.simTime, simParams.T);
}

function setPlaying(next: boolean): void {
  isPlaying = next;
  buttons.togglePlay.textContent = isPlaying ? 'Pause' : 'Play';
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
buttons.randomSeed.addEventListener('click', () => {
  currentSeed = randomSeed();
  setNumberInput(inputs.seed, currentSeed, 0);
  rebuildFromInputs();
  setPlaying(true);
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

for (const input of [
  inputs.numParticles,
  inputs.type0Fraction,
  inputs.diffusionSd,
  inputs.type0Permeability,
  inputs.type1Permeability,
  inputs.seed,
  inputs.totalTime,
  inputs.dt,
  inputs.boxWidth,
  inputs.boxHeight,
  inputs.wallThickness
] as const) {
  input.addEventListener('change', () => {
    applyLiveSimParams();
    render();
  });
}

for (const input of [inputs.playbackSpeed, inputs.pointSize, inputs.targetFps] as const) {
  input.addEventListener('change', () => {
    refreshDisplayFromInputs();
    render();
  });
}

window.addEventListener('resize', () => render());

function animate(ts: number): void {
  const dtSec = Math.max(0, (ts - lastTs) / 1000);
  lastTs = ts;
  if (isPlaying) {
    stepAccumulator += dtSec * displayParams.targetFps * displayParams.playbackSpeed;
    const stepsToRun = Math.min(120, Math.floor(stepAccumulator));
    if (stepsToRun > 0) {
      stepAccumulator -= stepsToRun;
      for (let i = 0; i < stepsToRun; i += 1) {
        stepState(state, simParams, rng);
        pushTracePoint(trace, state, simParams.T);
      }
    }
  }
  render();
  requestAnimationFrame(animate);
}

requestAnimationFrame((ts) => {
  lastTs = ts;
  animate(ts);
});
