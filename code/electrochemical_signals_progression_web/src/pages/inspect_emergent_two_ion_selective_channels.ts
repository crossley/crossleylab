import '../style.css';
import {
  DEFAULT_DIFFUSION_SD,
  DEFAULT_NUM_PARTICLES,
  MAX_PARTICLES,
  SIM_COLORS,
  drawMembraneWall,
  evenlySpacedChannelBounds,
  leftEdgeChargeWallX,
  pointFieldDrift
} from './sim_shared';

type IonType = 0 | 1;
const MOBILE_FIELD_SAMPLES = 96;
const MOBILE_FIELD_WEIGHT = 0.35;

interface SimParams {
  T: number;
  dt: number;
  numParticles: number;
  type0Fraction: number;
  type0Charge: number;
  type1Charge: number;
  boxWidth: number;
  boxHeight: number;
  wallThickness: number;
  diffusionSd: number;
  type0ChannelWidth: number;
  type1ChannelWidth: number;
  type0Permeability: number;
  type1Permeability: number;
  electricStrength: number;
  fixedAnionLayerX: number;
}

interface DisplayParams {
  pointSize: number;
  playbackSpeed: number;
  targetFps: number;
}

interface LiveState {
  x: Float32Array;
  y: Float32Array;
  fixedX: Float32Array;
  fixedY: Float32Array;
  fixedCount: number;
  types: Uint8Array;
  charges: Float32Array;
  numParticles: number;
  dt: number;
  simTime: number;
  stepCount: number;
  boxWidth: number;
  boxHeight: number;
  leftWall: number;
  rightWall: number;
  fixedAnionLayerX: number;
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
  type0Charge: 1,
  type1Charge: 1,
  boxWidth: 100,
  boxHeight: 80,
  wallThickness: 4,
  diffusionSd: DEFAULT_DIFFUSION_SD,
  type0ChannelWidth: 14,
  type1ChannelWidth: 14,
  type0Permeability: 0.25,
  type1Permeability: 0.65,
  electricStrength: -0.15,
  fixedAnionLayerX: leftEdgeChargeWallX(100)
};

const defaultDisplay: DisplayParams = { pointSize: 2.0, playbackSpeed: 1, targetFps: 30 };
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
    type0Fraction: 0.5,
    type0Charge: clamp(params.type0Charge, -5, 5),
    type1Charge: clamp(params.type1Charge, -5, 5),
    boxWidth,
    boxHeight,
    wallThickness,
    diffusionSd: clamp(params.diffusionSd, 0, 20),
    type0ChannelWidth: clamp(params.type0ChannelWidth, 0.5, boxHeight - 8),
    type1ChannelWidth: clamp(params.type1ChannelWidth, 0.5, boxHeight - 8),
    type0Permeability: clamp(params.type0Permeability, 0, 1),
    type1Permeability: clamp(params.type1Permeability, 0, 1),
    electricStrength: params.electricStrength,
    fixedAnionLayerX: leftEdgeChargeWallX(boxWidth)
  };
}

function chargeForType(type: IonType, params: Pick<SimParams, 'type0Charge' | 'type1Charge'>): number {
  return type === 0 ? params.type0Charge : params.type1Charge;
}

function syncCharges(state: LiveState, params: Pick<SimParams, 'type0Charge' | 'type1Charge'>): void {
  for (let i = 0; i < state.numParticles; i += 1) {
    state.charges[i] = chargeForType(state.types[i] as IonType, params);
  }
}

function formatCharge(value: number): string {
  const rounded = Number(value.toFixed(2));
  if (Object.is(rounded, -0)) return '0';
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function count(state: LiveState): void {
  let t0L = 0;
  let t0R = 0;
  let t1L = 0;
  let t1R = 0;
  for (let i = 0; i < state.numParticles; i += 1) {
    const isType0 = state.types[i] === 0;
    const x = state.x[i];
    if (x < state.leftWall) {
      if (isType0) t0L += 1;
      else t1L += 1;
    } else if (x > state.rightWall) {
      if (isType0) t0R += 1;
      else t1R += 1;
    }
  }
  state.type0Left = t0L;
  state.type0Right = t0R;
  state.type1Left = t1L;
  state.type1Right = t1R;
}

function sampledMobileFieldSources(state: LiveState, rng: Rng, maxSamples: number): number[] {
  if (state.numParticles <= maxSamples) return Array.from({ length: state.numParticles }, (_, i) => i);
  const step = Math.max(1, Math.floor(state.numParticles / maxSamples));
  const offset = Math.floor(rng.next() * step);
  const out: number[] = [];
  for (let i = offset; i < state.numParticles && out.length < maxSamples; i += step) out.push(i);
  while (out.length < maxSamples) out.push(Math.floor(rng.next() * state.numParticles));
  return out;
}

function createState(params: SimParams, seed: number): LiveState {
  const p = normalizeSimParams(params);
  const rng = new Rng(seed);
  const leftWall = -p.wallThickness / 2;
  const rightWall = p.wallThickness / 2;
  const [[type0YMin, type0YMax], [type1YMin, type1YMax]] = evenlySpacedChannelBounds(
    [p.type0ChannelWidth, p.type1ChannelWidth],
    p.boxHeight
  );
  const x = new Float32Array(p.numParticles);
  const y = new Float32Array(p.numParticles);
  const fixedCount = clamp(Math.round(p.numParticles * 0.2), 30, 1200);
  const fixedX = new Float32Array(fixedCount);
  const fixedY = new Float32Array(fixedCount);
  const types = new Uint8Array(p.numParticles);
  const charges = new Float32Array(p.numParticles);
  let type0Total = 0;
  let type1Total = 0;
  for (let i = 0; i < p.numParticles; i += 1) {
    const type = (rng.next() < p.type0Fraction ? 0 : 1) as IonType;
    types[i] = type;
    charges[i] = chargeForType(type, p);
    if (type === 0) type0Total += 1;
    else type1Total += 1;
    x[i] = rng.uniform(rightWall + 1, p.boxWidth / 2 - 1);
    y[i] = rng.uniform(-p.boxHeight / 2 + 1, p.boxHeight / 2 - 1);
  }
  for (let i = 0; i < fixedCount; i += 1) {
    fixedX[i] = rng.uniform(-p.boxWidth / 2 + 1, leftWall - 1);
    fixedY[i] = rng.uniform(-p.boxHeight / 2 + 1, p.boxHeight / 2 - 1);
  }
  const state: LiveState = {
    x,
    y,
    fixedX,
    fixedY,
    fixedCount,
    types,
    charges,
    numParticles: p.numParticles,
    dt: p.dt,
    simTime: 0,
    stepCount: 0,
    boxWidth: p.boxWidth,
    boxHeight: p.boxHeight,
    leftWall,
    rightWall,
    fixedAnionLayerX: p.fixedAnionLayerX,
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
  count(state);
  return state;
}

function retargetTypes(state: LiveState, targetType0Fraction: number, rngRef: Rng): LiveState {
  const targetType0 = Math.round(state.numParticles * targetType0Fraction);
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
  if (targetType0 > currentType0) {
    for (let n = 0; n < targetType0 - currentType0 && type1Idx.length > 0; n += 1) {
      const pick = Math.floor(rngRef.next() * type1Idx.length);
      const idx = type1Idx.splice(pick, 1)[0];
      state.types[idx] = 0;
    }
  } else if (targetType0 < currentType0) {
    for (let n = 0; n < currentType0 - targetType0 && type0Idx.length > 0; n += 1) {
      const pick = Math.floor(rngRef.next() * type0Idx.length);
      const idx = type0Idx.splice(pick, 1)[0];
      state.types[idx] = 1;
    }
  }
  state.type0Total = targetType0;
  state.type1Total = state.numParticles - targetType0;
  count(state);
  return state;
}

function resizeState(state: LiveState, targetCount: number, rngRef: Rng): LiveState {
  if (targetCount === state.numParticles) return state;
  const nextX = new Float32Array(targetCount);
  const nextY = new Float32Array(targetCount);
  const nextTypes = new Uint8Array(targetCount);
  const nextCharges = new Float32Array(targetCount);
  const keep = Math.min(state.numParticles, targetCount);
  nextX.set(state.x.subarray(0, keep));
  nextY.set(state.y.subarray(0, keep));
  nextTypes.set(state.types.subarray(0, keep));
  nextCharges.set(state.charges.subarray(0, keep));
  const type0Frac = state.numParticles > 0 ? state.type0Total / state.numParticles : 0.5;
  for (let i = keep; i < targetCount; i += 1) {
    const type = (rngRef.next() < type0Frac ? 0 : 1) as IonType;
    nextTypes[i] = type;
    nextCharges[i] = chargeForType(type, simParams);
    nextX[i] = rngRef.uniform(state.rightWall + 1, state.boxWidth / 2 - 1);
    nextY[i] = rngRef.uniform(-state.boxHeight / 2 + 1, state.boxHeight / 2 - 1);
  }
  state.x = nextX;
  state.y = nextY;
  state.types = nextTypes;
  state.charges = nextCharges;
  state.numParticles = targetCount;
  state.type0Total = 0;
  state.type1Total = 0;
  for (let i = 0; i < targetCount; i += 1) {
    if (state.types[i] === 0) state.type0Total += 1;
    else state.type1Total += 1;
  }
  count(state);
  return state;
}

function enforceGeometry(state: LiveState): void {
  const halfW = state.boxWidth / 2;
  const halfH = state.boxHeight / 2;
  for (let i = 0; i < state.numParticles; i += 1) {
    state.x[i] = reflectIntoBounds(state.x[i], -halfW, halfW);
    state.y[i] = reflectIntoBounds(state.y[i], -halfH, halfH);
    const cMin = state.types[i] === 0 ? state.type0YMin : state.type1YMin;
    const cMax = state.types[i] === 0 ? state.type0YMax : state.type1YMax;
    if (state.x[i] > state.leftWall && state.x[i] < state.rightWall && !(state.y[i] >= cMin && state.y[i] <= cMax)) {
      state.x[i] = state.x[i] < 0 ? state.leftWall : state.rightWall;
    }
  }
  count(state);
}

function stepState(state: LiveState, params: SimParams, rng: Rng): void {
  const halfW = state.boxWidth / 2;
  const halfH = state.boxHeight / 2;
  const mobileSources = sampledMobileFieldSources(state, rng, MOBILE_FIELD_SAMPLES);
  const perFixedStrength = params.electricStrength / Math.max(1, state.fixedCount);
  const perMobileStrength = -MOBILE_FIELD_WEIGHT * params.electricStrength / Math.max(1, mobileSources.length);
  const driftFromChargeField = (x: number, y: number, charge: number, selfIndex: number): [number, number] => {
    let driftX = 0;
    let driftY = 0;
    for (let k = 0; k < state.fixedCount; k += 1) {
      const [dxPart, dyPart] = pointFieldDrift(state.fixedX[k] - x, state.fixedY[k] - y, perFixedStrength, charge);
      driftX += dxPart;
      driftY += dyPart;
    }
    for (let s = 0; s < mobileSources.length; s += 1) {
      const srcIdx = mobileSources[s];
      if (srcIdx === selfIndex) continue;
      const [dxPart, dyPart] = pointFieldDrift(state.x[srcIdx] - x, state.y[srcIdx] - y, perMobileStrength, charge);
      driftX += dxPart;
      driftY += dyPart;
    }
    return [driftX, driftY];
  };
  for (let i = 0; i < state.numParticles; i += 1) {
    const xPrev = state.x[i];
    const yPrev = state.y[i];
    const [driftX, driftY] = driftFromChargeField(xPrev, yPrev, state.charges[i], i);
    const xTrial = reflectIntoBounds(xPrev + (rng.normal(0, params.diffusionSd) + driftX) * state.dt, -halfW, halfW);
    const yTrial = reflectIntoBounds(yPrev + (rng.normal(0, params.diffusionSd) + driftY) * state.dt, -halfH, halfH);
    let xNew = xTrial;
    const tryingToCrossLeft = xPrev > state.rightWall && xTrial <= state.rightWall;
    const tryingToCrossRight = xPrev < state.leftWall && xTrial >= state.leftWall;
    const isType0 = state.types[i] === 0;
    const chMin = isType0 ? state.type0YMin : state.type1YMin;
    const chMax = isType0 ? state.type0YMax : state.type1YMax;
    const inChannel = yTrial >= chMin && yTrial <= chMax;
    const permeability = isType0 ? params.type0Permeability : params.type1Permeability;
    if ((tryingToCrossLeft || tryingToCrossRight) && !inChannel) {
      xNew = tryingToCrossLeft
        ? reflectIntoBounds(2 * state.rightWall - xTrial, -halfW, halfW)
        : reflectIntoBounds(2 * state.leftWall - xTrial, -halfW, halfW);
    } else if ((tryingToCrossLeft || tryingToCrossRight) && inChannel && rng.next() > permeability) {
      xNew = tryingToCrossLeft
        ? reflectIntoBounds(2 * state.rightWall - xTrial, -halfW, halfW)
        : reflectIntoBounds(2 * state.leftWall - xTrial, -halfW, halfW);
    } else if (!inChannel && xTrial > state.leftWall && xTrial < state.rightWall) {
      xNew = xPrev < 0 ? state.leftWall : state.rightWall;
    }
    state.x[i] = xNew;
    state.y[i] = yTrial;
  }
  state.stepCount += 1;
  state.simTime = state.stepCount * state.dt;
  count(state);
}

function createTrace(state: LiveState, traceWindowMs: number): TraceHistory {
  const trace: TraceHistory = { times: [], type0LeftFrac: [], type0RightFrac: [], type1LeftFrac: [], type1RightFrac: [] };
  pushTrace(trace, state, traceWindowMs);
  return trace;
}

function pushTrace(trace: TraceHistory, state: LiveState, traceWindowMs: number): void {
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

function worldToCanvas(x: number, y: number, state: LiveState, w: number, h: number): [number, number] {
  const px = ((x + state.boxWidth / 2) / state.boxWidth) * w;
  const py = h - ((y + state.boxHeight / 2) / state.boxHeight) * h;
  return [px, py];
}

function drawEnvironment(ctx: CanvasRenderingContext2D, state: LiveState, w: number, h: number, dpr: number): void {
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

function drawFrame(canvas: HTMLCanvasElement, state: LiveState, display: DisplayParams): void {
  syncCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, w, h);
  drawEnvironment(ctx, state, w, h, dpr);
  const r = Math.max(0.8, display.pointSize) * dpr;
  ctx.fillStyle = SIM_COLORS.fieldNegative;
  const fixedR = Math.max(0.7, display.pointSize * 0.8) * dpr;
  for (let i = 0; i < state.fixedCount; i += 1) {
    const [px, py] = worldToCanvas(state.fixedX[i], state.fixedY[i], state, w, h);
    ctx.fillRect(px - fixedR, py - fixedR, 2 * fixedR, 2 * fixedR);
  }
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
  ctx.fillStyle = 'rgba(232, 243, 255, 0.92)';
  ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
}

const app = getEl<HTMLDivElement>('#app');
app.innerHTML = `
  <div class="site-shell">
    <div class="nav-line">
      <a href="./index.html">Back to index</a>
      <span>•</span>
      <span>Page: <code>inspect_emergent_two_ion_selective_channels</code></span>
    </div>
    <header class="page-head">
      <p class="eyebrow">Two-Ion Transport with Selective Pores</p>
      <h1>Two-Ion Selective Channels with Electrical Attraction</h1>
      <ul class="key-points">
        <li>Ion A and Ion B each cross through their own selective pore.</li>
        <li>Both ions feel the same electric field.</li>
        <li>Higher open probability means higher permeability and faster redistribution.</li>
        <li>Set one pore permeability high and the other low, then compare the resulting concentration gradients.</li>
        <li>Different permeabilities change equilibration rates but do not by themselves maintain stable gradients.</li>
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
              <div class="field"><label for="diffusion-sd">Diffusion SD</label><input id="diffusion-sd" type="number" min="0" max="20" step="0.05" /></div>
              <div class="field"><label for="electric-strength">Electric strength</label><input id="electric-strength" type="number" step="0.01" /></div>
              <div class="field"><label for="type0-charge">Ion A charge</label><input id="type0-charge" type="number" min="-5" max="5" step="0.1" /></div>
              <div class="field"><label for="type1-charge">Ion B charge</label><input id="type1-charge" type="number" min="-5" max="5" step="0.1" /></div>
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
                <div class="field"><label for="neg-x">Immobile anion reference x (fixed)</label><input id="neg-x" type="number" step="1" readonly /></div>
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
            <p class="group-label">Teaching Note</p>
            <div class="equation-card">
              <pre class="equation" id="equation-block"></pre>
              <p>
                The pore geometry is fixed. Permeability is controlled by each ion channel's open probability.
                In the default setup both ions are cations, so both are biased in the same field direction. To demonstrate opposite-direction electrical responses, assign opposite charge signs.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <section class="panel canvas-panel">
        <div class="canvas-grid-2">
          <div class="canvas-subpanel">
            <canvas id="sim-canvas" class="square-canvas"></canvas>
          </div>
          <div class="canvas-subpanel">
            <canvas id="trace-canvas" class="trace-canvas square-canvas"></canvas>
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
  type0Charge: getEl<HTMLInputElement>('#type0-charge'),
  type1Charge: getEl<HTMLInputElement>('#type1-charge'),
  diffusionSd: getEl<HTMLInputElement>('#diffusion-sd'),
  electricStrength: getEl<HTMLInputElement>('#electric-strength'),
  type0Permeability: getEl<HTMLInputElement>('#type0-permeability'),
  type1Permeability: getEl<HTMLInputElement>('#type1-permeability'),
  playbackSpeed: getEl<HTMLInputElement>('#playback-speed'),
  seed: getEl<HTMLInputElement>('#seed'),
  totalTime: getEl<HTMLInputElement>('#total-time'),
  dt: getEl<HTMLInputElement>('#dt'),
  boxWidth: getEl<HTMLInputElement>('#box-width'),
  boxHeight: getEl<HTMLInputElement>('#box-height'),
  wallThickness: getEl<HTMLInputElement>('#wall-thickness'),
  fixedAnionLayerX: getEl<HTMLInputElement>('#neg-x'),
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
let trace = createTrace(state, simParams.T);
let isPlaying = true;
let lastTs = performance.now();
let stepAccumulator = 0;

function writeInputs(): void {
  setNumberInput(inputs.numParticles, simParams.numParticles, 0);
  setNumberInput(inputs.type0Charge, simParams.type0Charge, 2);
  setNumberInput(inputs.type1Charge, simParams.type1Charge, 2);
  setNumberInput(inputs.diffusionSd, simParams.diffusionSd, 3);
  setNumberInput(inputs.electricStrength, simParams.electricStrength, 3);
  setNumberInput(inputs.type0Permeability, simParams.type0Permeability, 2);
  setNumberInput(inputs.type1Permeability, simParams.type1Permeability, 2);
  setNumberInput(inputs.playbackSpeed, displayParams.playbackSpeed, 2);
  setNumberInput(inputs.seed, currentSeed, 0);
  setNumberInput(inputs.totalTime, simParams.T, 0);
  setNumberInput(inputs.dt, simParams.dt, 3);
  setNumberInput(inputs.boxWidth, simParams.boxWidth, 1);
  setNumberInput(inputs.boxHeight, simParams.boxHeight, 1);
  setNumberInput(inputs.wallThickness, simParams.wallThickness, 2);
  setNumberInput(inputs.fixedAnionLayerX, simParams.fixedAnionLayerX, 1);
  setNumberInput(inputs.pointSize, displayParams.pointSize, 2);
  setNumberInput(inputs.targetFps, displayParams.targetFps, 0);
}

function readSimInputs(): SimParams {
  const boxHeight = clamp(Number(inputs.boxHeight.value) || defaultSim.boxHeight, 20, 500);
  const boxWidth = clamp(Number(inputs.boxWidth.value) || defaultSim.boxWidth, 20, 500);
  const electricStrengthRaw = Number(inputs.electricStrength.value);
  const type0Charge = inputs.type0Charge.value === '' ? defaultSim.type0Charge : Number(inputs.type0Charge.value);
  const type1Charge = inputs.type1Charge.value === '' ? defaultSim.type1Charge : Number(inputs.type1Charge.value);
  return normalizeSimParams({
    T: clamp(Number(inputs.totalTime.value) || defaultSim.T, 100, 20000),
    dt: clamp(Number(inputs.dt.value) || defaultSim.dt, 0.05, 20),
    numParticles: clamp(Math.round(Number(inputs.numParticles.value) || defaultSim.numParticles), 1, MAX_PARTICLES),
    type0Fraction: 0.5,
    type0Charge: clamp(type0Charge, -5, 5),
    type1Charge: clamp(type1Charge, -5, 5),
    boxWidth,
    boxHeight,
    wallThickness: clamp(Number(inputs.wallThickness.value) || defaultSim.wallThickness, 0.5, 50),
    diffusionSd: clamp(Number(inputs.diffusionSd.value) || defaultSim.diffusionSd, 0, 20),
    type0ChannelWidth: clamp(simParams.type0ChannelWidth, 0.5, boxHeight - 8),
    type1ChannelWidth: clamp(simParams.type1ChannelWidth, 0.5, boxHeight - 8),
    type0Permeability: clamp(Number(inputs.type0Permeability.value) || 0, 0, 1),
    type1Permeability: clamp(Number(inputs.type1Permeability.value) || 0, 0, 1),
    electricStrength: Number.isNaN(electricStrengthRaw) ? defaultSim.electricStrength : electricStrengthRaw,
    fixedAnionLayerX: leftEdgeChargeWallX(boxWidth)
  });
}

function readDisplayInputs(): DisplayParams {
  return {
    pointSize: clamp(Number(inputs.pointSize.value) || defaultDisplay.pointSize, 0.5, 8),
    playbackSpeed: clamp(Number(inputs.playbackSpeed.value) || defaultDisplay.playbackSpeed, 0.1, 8),
    targetFps: clamp(Math.round(Number(inputs.targetFps.value) || defaultDisplay.targetFps), 1, 120)
  };
}

function retargetFromInputs(): void {
  state = retargetTypes(state, simParams.type0Fraction, rng);
  syncCharges(state, simParams);
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

function updateEquationText(): void {
  const stepSd = simParams.diffusionSd * simParams.dt;
  equationBlock.innerHTML = [
    '<span class="accent">Shared live diffusion + immobile-anion field drift (all particles)</span>',
    'drift_(x,y) = Σ pointFieldDrift(fixed_anion_k - ion) + Σ pointFieldDrift(sampled_mobile_k - ion)',
    `Current ion charges: Ion A = ${formatCharge(simParams.type0Charge)}, Ion B = ${formatCharge(simParams.type1Charge)}`,
    'The sign of electric_strength × charge determines whether a species is attracted or repelled by the immobile-anion field',
    'Default note: both ions start as cations, so field direction is shared unless you change one ion to a negative charge',
    'x_trial = x_old + (dxdt + drift_x) · dt',
    'x_new = reflect(x_trial, -W/2, W/2)',
    'y_new = reflect(y_old + (dydt + drift_y) · dt, -H/2, H/2)',
    'dxdt, dydt ~ Normal(0, diffusionSd²)',
    '',
    '<span class="accent-2">Selective permeability comes from pore open probability</span>',
    'Immobile intracellular negative charges are sampled uniformly across the left compartment.',
    'Ion A and Ion B cross only through their own fixed pore windows.',
    'In-channel crossing is accepted with probability p for that ion type.',
    '',
    `Per-step displacement SD = diffusionSd × dt = ${stepSd.toFixed(3)}`,
    `Electric strength = ${simParams.electricStrength.toFixed(3)}`,
    `Ion charges: Ion A = ${formatCharge(simParams.type0Charge)}, Ion B = ${formatCharge(simParams.type1Charge)}`,
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
  trace = createTrace(state, simParams.T);
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
  state = resizeState(state, simParams.numParticles, rng);
  retargetFromInputs();
  syncCharges(state, simParams);
  state.dt = simParams.dt;
  state.boxWidth = simParams.boxWidth;
  state.boxHeight = simParams.boxHeight;
  state.leftWall = -simParams.wallThickness / 2;
  state.rightWall = simParams.wallThickness / 2;
  state.fixedAnionLayerX = simParams.fixedAnionLayerX;
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

function setPlaying(next: boolean): void {
  isPlaying = next;
  buttons.togglePlay.textContent = isPlaying ? 'Pause' : 'Play';
}

function render(): void {
  updateStatus();
  drawFrame(canvas, state, displayParams);
  drawSideTrace(traceCanvas, trace, state.simTime, simParams.T);
}

writeInputs();
updateEquationText();
render();

buttons.togglePlay.addEventListener('click', () => setPlaying(!isPlaying));
buttons.rerun.addEventListener('click', () => { rebuildFromInputs(); setPlaying(true); render(); });
buttons.rewind.addEventListener('click', () => { rebuildFromInputs(); render(); });
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
  inputs.type0Charge,
  inputs.type1Charge,
  inputs.diffusionSd,
  inputs.electricStrength,
  inputs.type0Permeability,
  inputs.type1Permeability,
  inputs.seed,
  inputs.totalTime,
  inputs.dt,
  inputs.boxWidth,
  inputs.boxHeight,
  inputs.wallThickness,
  inputs.fixedAnionLayerX
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
        pushTrace(trace, state, simParams.T);
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
