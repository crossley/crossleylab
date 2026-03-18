import '../style.css';
import { applyStoredTheme, initThemeToggle } from '../theme';

applyStoredTheme();

import {
  DEFAULT_DIFFUSION_SD,
  DEFAULT_POTENTIAL_SCALE,
  MAX_PARTICLES,
  SIM_COLORS,
  drawMembraneWall,
  evenlySpacedChannelBounds,
  fieldColor,
  pointFieldDrift,
  getCanvasColors,
} from './sim_shared';

type IonType = 0 | 1;
type TeachingFocus = 'resting' | 'permeability' | 'goldman';

interface VariantConfig {
  pageId: string;
  title: string;
  subtitle: string;
  subtitlePoints?: string[];
  withGoldman: boolean;
  focusMode: TeachingFocus;
  type1Color: string;
  type1Label: string;
  negMarkerLabel: string;
  defaultNumParticles: number;
  defaultElectricStrength: number;
  defaultDt?: number;
  defaultT?: number;
  defaultNegX?: number;
  goldmanScaleDefault?: number;
  eyebrow?: string;
  equationGroupLabel?: string;
  equationDescription?: string;
  canvasTitle?: string;
  canvasModeLabel?: string;
  particlePanelTitle?: string;
  particleHint?: string;
  concentrationPanelTitle?: string;
  concentrationHint?: string;
  tracePanelTitle?: string;
  traceHint?: string;
  traceTitle?: string;
  showGoldmanPredictionTrace?: boolean;
  defaultType0ChannelWidth?: number;
  defaultType1ChannelWidth?: number;
  defaultType0Permeability?: number;
  defaultType1Permeability?: number;
  defaultType0Charge?: 1 | -1;
  defaultType1Charge?: 1 | -1;
  guidedQuestions?: string[];
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
  negX: number;
  negY: number;
  type0ChannelWidth: number;
  type1ChannelWidth: number;
  type0Permeability: number;
  type1Permeability: number;
  type0Charge: 1 | -1;
  type1Charge: 1 | -1;
  initialLeftFrac: number;
  goldmanScale: number;
  pumpStrength: number;
}

interface DisplayParams {
  pointSize: number;
  playbackSpeed: number;
  targetFps: number;
  traceYLimit: number;
}

const FIXED_ANION_MEMBRANE_OFFSET = 2;
const FIXED_ANION_POINT_FRACTION = 0.2;
const FIXED_ANION_POINT_MIN = 30;
const FIXED_ANION_POINT_MAX = 1200;
const MOBILE_FIELD_SAMPLES = 96;
const MOBILE_FIELD_WEIGHT = 0.35;

interface LiveState {
  x: Float32Array;
  y: Float32Array;
  fixedX: Float32Array;
  fixedY: Float32Array;
  fixedCount: number;
  types: Uint8Array;
  charges: Int8Array;
  numParticles: number;
  dt: number;
  simTime: number;
  stepCount: number;
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
  type0Permeability: number;
  type1Permeability: number;
  VA: number;
  VB: number;
  VTotal: number;
  VGoldman: number;
  naInside: number;
  naOutside: number;
  kInside: number;
  kOutside: number;
}

interface TraceHistory {
  times: number[];
  va: number[];
  vb: number[];
  vTotal: number[];
  vGoldman: number[];
  naInside: number[];
  naOutside: number[];
  kInside: number[];
  kOutside: number[];
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

function clamp(v: number, min: number, max: number): number { return Math.min(max, Math.max(min, v)); }
function reflectIntoBounds(value: number, min: number, max: number): number {
  let next = value;
  while (next < min || next > max) {
    if (next < min) next = min + (min - next);
    if (next > max) next = max - (next - max);
  }
  return clamp(next, min, max);
}
function randomSeed(): number { return (Math.random() * 0xffffffff) >>> 0; }
function getEl<T extends Element>(s: string): T { const el = document.querySelector<T>(s); if (!el) throw new Error(`Missing ${s}`); return el; }
function setNumberInput(input: HTMLInputElement, value: number, digits = 3): void { input.value = Number.isInteger(value) ? String(value) : Number(value.toFixed(digits)).toString(); }
function fixedAnionLayerXNearMembrane(boxWidth: number, wallThickness: number): number {
  const halfW = boxWidth / 2;
  const leftMembraneFace = -wallThickness / 2;
  return clamp(leftMembraneFace - FIXED_ANION_MEMBRANE_OFFSET, -halfW + 0.5, halfW - 0.5);
}
function targetFixedAnionCount(numParticles: number): number {
  return clamp(Math.round(numParticles * FIXED_ANION_POINT_FRACTION), FIXED_ANION_POINT_MIN, FIXED_ANION_POINT_MAX);
}
function layoutFixedAnions(
  fixedX: Float32Array,
  fixedY: Float32Array,
  fixedCount: number,
  boxWidth: number,
  boxHeight: number,
  leftWall: number,
  rng: Rng
): void {
  const halfW = boxWidth / 2;
  const xMin = -halfW + 1;
  const xMax = leftWall - 1;
  const yMin = -boxHeight / 2 + 1;
  const yMax = boxHeight / 2 - 1;
  for (let i = 0; i < fixedCount; i += 1) {
    fixedX[i] = rng.uniform(xMin, xMax);
    fixedY[i] = rng.uniform(yMin, yMax);
  }
}
function syncCanvasSize(canvas: HTMLCanvasElement): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
}

function countVoltages(
  state: LiveState,
  variant: VariantConfig,
  goldmanScale: number,
  type0Charge: 1 | -1,
  type1Charge: 1 | -1
): void {
  let aLeft = 0, aRight = 0, bLeft = 0, bRight = 0;
  for (let i = 0; i < state.numParticles; i += 1) {
    const x = state.x[i];
    const type = state.types[i] as IonType;
    if (x < state.leftWall) {
      if (type === 0) aLeft += 1; else bLeft += 1;
    } else if (x > state.rightWall) {
      if (type === 0) aRight += 1; else bRight += 1;
    }
  }
  const eps = 0.5;
  const aOut = type0Charge > 0 ? aRight : aLeft;
  const aIn = type0Charge > 0 ? aLeft : aRight;
  const bOut = type1Charge > 0 ? bRight : bLeft;
  const bIn = type1Charge > 0 ? bLeft : bRight;
  state.naInside = aIn;
  state.naOutside = aOut;
  state.kInside = bIn;
  state.kOutside = bOut;
  state.VA = goldmanScale * Math.log((aOut + eps) / (aIn + eps));
  state.VB = goldmanScale * Math.log((bOut + eps) / (bIn + eps));
  if (variant.withGoldman) {
    const pA = Math.max(1e-3, state.type0Permeability);
    const pB = Math.max(1e-3, state.type1Permeability);
    state.VGoldman = Math.log((pA * aOut + pB * bOut + eps) / (pA * aIn + pB * bIn + eps)) * goldmanScale;
    // Keep the plotted membrane-potential trace on the Goldman definition.
    state.VTotal = state.VGoldman;
  } else {
    state.VGoldman = 0;
    state.VTotal = state.VA + state.VB;
  }
}

function createState(params: SimParams, seed: number, variant: VariantConfig): LiveState {
  const dt = clamp(params.dt, 0.05, 20);
  const numParticles = clamp(Math.round(params.numParticles), 10, MAX_PARTICLES);
  const type0Fraction = clamp(params.type0Fraction, 0, 1);
  const boxWidth = clamp(params.boxWidth, 40, 500);
  const boxHeight = clamp(params.boxHeight, 40, 500);
  const wallThickness = clamp(params.wallThickness, 0.5, Math.min(50, boxWidth - 2));
  const [[type0YMin, type0YMax], [type1YMin, type1YMax]] = evenlySpacedChannelBounds(
    [params.type0ChannelWidth, params.type1ChannelWidth],
    boxHeight
  );
  const leftWall = -wallThickness / 2;
  const rightWall = wallThickness / 2;
  const negX = clamp(params.negX, -boxWidth / 2, boxWidth / 2);
  const negY = clamp(params.negY, -boxHeight / 2, boxHeight / 2);
  const rng = new Rng(seed);
  const x = new Float32Array(numParticles);
  const y = new Float32Array(numParticles);
  const fixedCount = targetFixedAnionCount(numParticles);
  const fixedX = new Float32Array(fixedCount);
  const fixedY = new Float32Array(fixedCount);
  const types = new Uint8Array(numParticles);
  const charges = new Int8Array(numParticles);
  const type0Indices: number[] = [];
  const type1Indices: number[] = [];
  for (let i = 0; i < numParticles; i += 1) {
    const type: IonType = rng.next() < type0Fraction ? 0 : 1;
    types[i] = type;
    charges[i] = type === 0 ? params.type0Charge : params.type1Charge;
    if (type === 0) type0Indices.push(i); else type1Indices.push(i);
  }
  const placeGroup = (indices: number[]): void => {
    const leftMinX = -boxWidth / 2 + 1;
    const nLeft = Math.floor(indices.length * clamp(params.initialLeftFrac, 0, 1));
    for (let j = 0; j < indices.length; j += 1) {
      const idx = indices[j];
      const onLeft = j < nLeft;
      x[idx] = onLeft ? rng.uniform(leftMinX, leftWall - 1) : rng.uniform(rightWall + 1, boxWidth / 2 - 1);
      y[idx] = rng.uniform(-boxHeight / 2 + 1, boxHeight / 2 - 1);
    }
  };
  placeGroup(type0Indices);
  placeGroup(type1Indices);
  if (fixedCount > 0) {
    layoutFixedAnions(fixedX, fixedY, fixedCount, boxWidth, boxHeight, leftWall, rng);
  }
  const state: LiveState = {
    x, y, fixedX, fixedY, fixedCount, types, charges, numParticles, dt, simTime: 0, stepCount: 0, boxWidth, boxHeight, leftWall, rightWall,
    negX, negY, type0YMin, type0YMax, type1YMin, type1YMax,
    type0Permeability: clamp(params.type0Permeability, 0, 1),
    type1Permeability: clamp(params.type1Permeability, 0, 1),
    VA: 0, VB: 0, VTotal: 0, VGoldman: 0,
    naInside: 0, naOutside: 0, kInside: 0, kOutside: 0
  };
  countVoltages(state, variant, params.goldmanScale, params.type0Charge, params.type1Charge);
  return state;
}

function stepState(state: LiveState, params: SimParams, rng: Rng, variant: VariantConfig): void {
  const halfW = state.boxWidth / 2;
  const halfH = state.boxHeight / 2;
  const minX = -halfW;
  const sampledMobileSources = (): number[] => {
    if (state.numParticles <= MOBILE_FIELD_SAMPLES) return Array.from({ length: state.numParticles }, (_, i) => i);
    const step = Math.max(1, Math.floor(state.numParticles / MOBILE_FIELD_SAMPLES));
    const offset = Math.floor(rng.next() * step);
    const out: number[] = [];
    for (let i = offset; i < state.numParticles && out.length < MOBILE_FIELD_SAMPLES; i += step) out.push(i);
    while (out.length < MOBILE_FIELD_SAMPLES) out.push(Math.floor(rng.next() * state.numParticles));
    return out;
  };
  const mobileSources = sampledMobileSources();
  const perFixedStrength = params.electricStrength / Math.max(1, state.fixedCount);
  const perMobileStrength = -MOBILE_FIELD_WEIGHT * params.electricStrength / Math.max(1, mobileSources.length);
  const driftFromPointChargeField = (x: number, y: number, charge: number, selfIndex: number): [number, number] => {
    let driftX = 0;
    let driftY = 0;
    for (let k = 0; k < state.fixedCount; k += 1) {
      const [dxPart, dyPart] = pointFieldDrift(
        state.fixedX[k] - x,
        state.fixedY[k] - y,
        perFixedStrength,
        charge
      );
      driftX += dxPart;
      driftY += dyPart;
    }
    for (let s = 0; s < mobileSources.length; s += 1) {
      const srcIdx = mobileSources[s];
      if (srcIdx === selfIndex) continue;
      const [dxPart, dyPart] = pointFieldDrift(
        state.x[srcIdx] - x,
        state.y[srcIdx] - y,
        perMobileStrength,
        charge
      );
      driftX += dxPart;
      driftY += dyPart;
    }
    return [driftX, driftY];
  };
  for (let i = 0; i < state.numParticles; i += 1) {
    const xPrev = state.x[i];
    const yPrev = state.y[i];
    const [attractX, attractY] = driftFromPointChargeField(xPrev, yPrev, state.charges[i], i);
    const xTrial = reflectIntoBounds(xPrev + (rng.normal(0, params.diffusionSd) + attractX) * state.dt, minX, halfW);
    const yNew = reflectIntoBounds(yPrev + (rng.normal(0, params.diffusionSd) + attractY) * state.dt, -halfH, halfH);
    let xNew = xTrial;
    const tryingToCrossLeft = xPrev > state.rightWall && xTrial <= state.rightWall;
    const tryingToCrossRight = xPrev < state.leftWall && xTrial >= state.leftWall;
    const type = state.types[i] as IonType;
    const cMin = type === 0 ? state.type0YMin : state.type1YMin;
    const cMax = type === 0 ? state.type0YMax : state.type1YMax;
    const inChannel = yNew >= cMin && yNew <= cMax;
    const permeability = type === 0 ? state.type0Permeability : state.type1Permeability;
    if ((tryingToCrossLeft || tryingToCrossRight) && !inChannel) {
      xNew = tryingToCrossLeft ? reflectIntoBounds(2 * state.rightWall - xTrial, minX, halfW) : reflectIntoBounds(2 * state.leftWall - xTrial, minX, halfW);
    } else if ((tryingToCrossLeft || tryingToCrossRight) && inChannel && rng.next() > permeability) {
      xNew = tryingToCrossLeft ? reflectIntoBounds(2 * state.rightWall - xTrial, minX, halfW) : reflectIntoBounds(2 * state.leftWall - xTrial, minX, halfW);
    } else if (!inChannel && xTrial > state.leftWall && xTrial < state.rightWall) {
      xNew = xPrev < 0 ? state.leftWall : state.rightWall;
    }
    state.x[i] = xNew;
    state.y[i] = yNew;
  }
  applyPump(state, params, rng);
  state.stepCount += 1;
  state.simTime = state.stepCount * state.dt;
  countVoltages(state, variant, params.goldmanScale, params.type0Charge, params.type1Charge);
}

function shuffleInPlace(values: number[], rng: Rng): void {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    const tmp = values[i];
    values[i] = values[j];
    values[j] = tmp;
  }
}

function applyPump(state: LiveState, params: SimParams, rng: Rng): void {
  const strength = clamp(params.pumpStrength, 0, 2);
  const rate = clamp(0.7 * strength, 0, 4);
  const radius = clamp(7 * strength, 1, 20);
  if (rate <= 0) return;
  const pumpY = ((state.type0YMin + state.type0YMax) * 0.5 + (state.type1YMin + state.type1YMax) * 0.5) * 0.5;
  const naCandidates: number[] = [];
  const kCandidates: number[] = [];
  for (let i = 0; i < state.numParticles; i += 1) {
    const isNearPumpY = Math.abs(state.y[i] - pumpY) <= radius;
    if (!isNearPumpY) continue;
    if (state.types[i] === 0 && state.x[i] < state.leftWall && state.leftWall - state.x[i] <= radius) naCandidates.push(i);
    if (state.types[i] === 1 && state.x[i] > state.rightWall && state.x[i] - state.rightWall <= radius) kCandidates.push(i);
  }
  shuffleInPlace(naCandidates, rng);
  shuffleInPlace(kCandidates, rng);

  let cycles = Math.floor(rate * state.dt);
  if (rng.next() < rate * state.dt - cycles) cycles += 1;
  cycles = clamp(cycles, 0, 20);

  let naCursor = 0;
  let kCursor = 0;
  for (let c = 0; c < cycles; c += 1) {
    for (let i = 0; i < 3; i += 1) {
      if (naCursor >= naCandidates.length) break;
      const idx = naCandidates[naCursor++];
      state.x[idx] = state.rightWall + 1 + rng.uniform(0, radius * 0.5);
      state.y[idx] = pumpY + rng.uniform(-radius, radius);
    }
    for (let i = 0; i < 2; i += 1) {
      if (kCursor >= kCandidates.length) break;
      const idx = kCandidates[kCursor++];
      state.x[idx] = state.leftWall - 1 - rng.uniform(0, radius * 0.5);
      state.y[idx] = pumpY + rng.uniform(-radius, radius);
    }
  }
}

function createTrace(state: LiveState, traceWindowMs: number): TraceHistory {
  const trace: TraceHistory = {
    times: [],
    va: [],
    vb: [],
    vTotal: [],
    vGoldman: [],
    naInside: [],
    naOutside: [],
    kInside: [],
    kOutside: []
  };
  pushTrace(trace, state, traceWindowMs);
  return trace;
}

function pushTrace(trace: TraceHistory, state: LiveState, traceWindowMs: number): void {
  const naTotal = Math.max(1, state.naInside + state.naOutside);
  const kTotal = Math.max(1, state.kInside + state.kOutside);
  trace.times.push(state.simTime);
  trace.va.push(state.VA);
  trace.vb.push(state.VB);
  trace.vTotal.push(state.VTotal);
  trace.vGoldman.push(state.VGoldman);
  trace.naInside.push(state.naInside / naTotal);
  trace.naOutside.push(state.naOutside / naTotal);
  trace.kInside.push(state.kInside / kTotal);
  trace.kOutside.push(state.kOutside / kTotal);
  const minTime = Math.max(0, state.simTime - traceWindowMs);
  while (trace.times.length > 1 && trace.times[0] < minTime) {
    trace.times.shift(); trace.va.shift(); trace.vb.shift(); trace.vTotal.shift(); trace.vGoldman.shift();
    trace.naInside.shift(); trace.naOutside.shift(); trace.kInside.shift(); trace.kOutside.shift();
  }
  while (trace.times.length > 4000) {
    trace.times.shift(); trace.va.shift(); trace.vb.shift(); trace.vTotal.shift(); trace.vGoldman.shift();
    trace.naInside.shift(); trace.naOutside.shift(); trace.kInside.shift(); trace.kOutside.shift();
  }
}
function computeDynamicTraceLimit(trace: TraceHistory, startTime: number, minLimit: number, includeGoldman: boolean): number {
  let maxAbs = 0;
  for (let i = 0; i < trace.times.length; i += 1) {
    if (trace.times[i] < startTime) continue;
    maxAbs = Math.max(maxAbs, Math.abs(trace.va[i]), Math.abs(trace.vb[i]), Math.abs(trace.vTotal[i]));
    if (includeGoldman) maxAbs = Math.max(maxAbs, Math.abs(trace.vGoldman[i]));
  }
  const padded = Math.max(1, maxAbs * 1.15);
  return Math.max(minLimit, padded);
}

function drawTraceCanvas(canvas: HTMLCanvasElement, trace: TraceHistory, currentTime: number, traceWindowMs: number, yLimit: number, title: string, variant: VariantConfig): void {
  const cc = getCanvasColors();
  syncCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = cc.gridA;
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i += 1) {
    const gx = (w * i) / 10;
    const gy = (h * i) / 10;
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  }
  const padL = 36 * dpr, padR = 10 * dpr, padT = 18 * dpr, padB = 18 * dpr;
  const plotW = Math.max(1, w - padL - padR);
  const plotH = Math.max(1, h - padT - padB);
  const startTime = Math.max(0, currentTime - traceWindowMs);
  const showGoldmanTrace = variant.showGoldmanPredictionTrace ?? variant.withGoldman;
  const effectiveYLimit = computeDynamicTraceLimit(trace, startTime, yLimit, showGoldmanTrace);
  const xMap = (tt: number) => padL + ((tt - startTime) / Math.max(traceWindowMs, 1)) * plotW;
  const yMap = (yy: number) => padT + (1 - (yy + effectiveYLimit) / Math.max(1e-6, 2 * effectiveYLimit)) * plotH;
  ctx.strokeStyle = cc.gridB;
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(padL, padT, plotW, plotH);
  ctx.beginPath(); ctx.moveTo(padL, yMap(0)); ctx.lineTo(padL + plotW, yMap(0)); ctx.stroke();
  const series = [
    { data: trace.va, color: SIM_COLORS.ionATrace, dashed: false },
    { data: trace.vb, color: variant.type1Color, dashed: false },
    { data: trace.vTotal, color: SIM_COLORS.totalTrace, dashed: false },
    { data: trace.vGoldman, color: SIM_COLORS.predictionTrace, dashed: true }
  ];
  for (const s of series) {
    if (s.dashed && !showGoldmanTrace) continue;
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.5 * dpr;
    if (s.dashed) ctx.setLineDash([5 * dpr, 4 * dpr]);
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < trace.times.length; i += 1) {
      if (trace.times[i] < startTime) continue;
      const px = xMap(trace.times[i]);
      const py = yMap(s.data[i]);
      if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
    }
    if (started) ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = cc.ink;
  ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.fillText(title, 12 * dpr, 14 * dpr);
  ctx.fillStyle = cc.inkDim;
  ctx.font = `${11 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.fillText('time (ms)', padL + plotW - 52 * dpr, h - 6 * dpr);
  ctx.save();
  ctx.translate(12 * dpr, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('membrane potential proxy (mV-scaled)', 0, 0);
  ctx.restore();
}

function drawConcentrationCanvas(canvas: HTMLCanvasElement, trace: TraceHistory, currentTime: number, traceWindowMs: number): void {
  const cc = getCanvasColors();
  syncCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = cc.gridA;
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i += 1) {
    const gx = (w * i) / 10;
    const gy = (h * i) / 10;
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  }
  const padL = 36 * dpr, padR = 10 * dpr, padT = 18 * dpr, padB = 18 * dpr;
  const plotW = Math.max(1, w - padL - padR);
  const plotH = Math.max(1, h - padT - padB);
  const startTime = Math.max(0, currentTime - traceWindowMs);
  const xMap = (tt: number) => padL + ((tt - startTime) / Math.max(traceWindowMs, 1)) * plotW;
  const yMap = (yy: number) => padT + (1 - yy) * plotH;
  ctx.strokeStyle = cc.gridB;
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(padL, padT, plotW, plotH);
  ctx.beginPath(); ctx.moveTo(padL, yMap(0.5)); ctx.lineTo(padL + plotW, yMap(0.5)); ctx.stroke();
  const series = [
    { data: trace.naInside, color: SIM_COLORS.ionA, dashed: false },
    { data: trace.naOutside, color: SIM_COLORS.ionA, dashed: true },
    { data: trace.kInside, color: SIM_COLORS.ionB, dashed: false },
    { data: trace.kOutside, color: SIM_COLORS.ionB, dashed: true }
  ];
  for (const s of series) {
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.5 * dpr;
    if (s.dashed) ctx.setLineDash([5 * dpr, 4 * dpr]);
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < trace.times.length; i += 1) {
      if (trace.times[i] < startTime) continue;
      const px = xMap(trace.times[i]);
      const py = yMap(s.data[i]);
      if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
    }
    if (started) ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = cc.ink;
  ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.fillText('Na+/K+ concentration fractions', 12 * dpr, 14 * dpr);
  ctx.fillStyle = cc.inkDim;
  ctx.font = `${11 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.fillText('time (ms)', padL + plotW - 52 * dpr, h - 6 * dpr);
  ctx.save();
  ctx.translate(12 * dpr, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('inside/outside fraction', 0, 0);
  ctx.restore();
}

function drawParticleCanvas(canvas: HTMLCanvasElement, state: LiveState, pointSize: number, variant: VariantConfig, sourceStrength: number): void {
  const cc = getCanvasColors();
  syncCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = cc.gridA;
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i += 1) {
    const gx = (w * i) / 10;
    const gy = (h * i) / 10;
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  }
  const toPx = (x: number, y: number): [number, number] => [((x + state.boxWidth / 2) / state.boxWidth) * w, h - ((y + state.boxHeight / 2) / state.boxHeight) * h];
  const [wl] = toPx(state.leftWall, 0);
  const [wr] = toPx(state.rightWall, 0);
  const [, t0Top] = toPx(0, state.type0YMax);
  const [, t0Bottom] = toPx(0, state.type0YMin);
  const [, t1Top] = toPx(0, state.type1YMax);
  const [, t1Bottom] = toPx(0, state.type1YMin);
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
    ctx.fillStyle = cc.channelBody;
    ctx.fillRect(wl, yTop, membraneWidth, bandHeight);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.15 + 0.55 * clamp(permeability, 0, 1);
    ctx.fillRect(wl, openY, membraneWidth, openHeight);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1 * dpr;
    ctx.strokeRect(wl, yTop, membraneWidth, bandHeight);
  };
  drawPermeabilityBand(t0Top, t0Bottom, SIM_COLORS.ionA, state.type0Permeability);
  drawPermeabilityBand(t1Top, t1Bottom, variant.type1Color, state.type1Permeability);
  ctx.fillStyle = fieldColor(sourceStrength);
  const fixedR = Math.max(0.7, pointSize * 0.8) * dpr;
  for (let i = 0; i < state.fixedCount; i += 1) {
    const [px, py] = toPx(state.fixedX[i], state.fixedY[i]);
    ctx.fillRect(px - fixedR, py - fixedR, 2 * fixedR, 2 * fixedR);
  }
  const r = Math.max(0.8, pointSize) * dpr;
  for (let i = 0; i < state.numParticles; i += 1) {
    const [px, py] = toPx(state.x[i], state.y[i]);
    const type = state.types[i] as IonType;
    ctx.fillStyle = type === 0 ? SIM_COLORS.ionA : variant.type1Color;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = cc.ink;
  ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.fillText(variant.title, 12 * dpr, 14 * dpr);
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
    diffusionSd: DEFAULT_DIFFUSION_SD,
    electricStrength: variant.defaultElectricStrength,
    negX: fixedAnionLayerXNearMembrane(100, 4),
    negY: 0,
    type0ChannelWidth: variant.defaultType0ChannelWidth ?? 16,
    type1ChannelWidth: variant.defaultType1ChannelWidth ?? 16,
    type0Permeability: variant.defaultType0Permeability ?? 0.5,
    type1Permeability: variant.defaultType1Permeability ?? 0.5,
    type0Charge: variant.defaultType0Charge ?? 1,
    type1Charge: variant.defaultType1Charge ?? -1,
    initialLeftFrac: 0.5,
    goldmanScale: variant.goldmanScaleDefault ?? DEFAULT_POTENTIAL_SCALE,
    pumpStrength: 1
  };
  const defaultDisplay: DisplayParams = { pointSize: 2.2, playbackSpeed: 1, targetFps: 30, traceYLimit: 40 };
  const subtitlePoints = variant.subtitlePoints ?? [variant.subtitle];

  const app = getEl<HTMLDivElement>('#app');
  app.innerHTML = `
    <div class="site-shell">
      <div class="nav-line">
        <a href="./index.html">← Back</a>
        <div class="spacer"></div>
        <button id="theme-toggle" class="theme-btn">☀</button>
      </div>
      <header class="page-head">
        <p class="eyebrow">${variant.eyebrow ?? 'Resting Potential Sequence'}</p>
        <h1>${variant.title}</h1>
        <p class="teaching-label">Key concepts</p>
        <ul class="key-points">
          ${subtitlePoints.map((point) => `<li>${point}</li>`).join('')}
        </ul>
        ${variant.guidedQuestions && variant.guidedQuestions.length > 0 ? `
        <p class="teaching-label questions">Questions to explore</p>
        <ul class="guided-questions">
          ${variant.guidedQuestions.map((q) => `<li>${q}</li>`).join('')}
        </ul>` : ''}
      </header>
      <div class="sim-layout">
        <aside class="controls">
          <div class="panel">
            <div class="group">
              <div class="button-row"><button id="toggle-play" class="primary">Pause</button><button id="rerun">Rerun</button><button id="reset-defaults" class="warn">Reset Defaults</button></div>
              <div class="control-grid">
                <div class="field"><label for="num-particles">Particles</label><input id="num-particles" type="number" min="10" max="5000" step="1" /></div>
                <div class="field"><label for="diffusion-sd">Diffusion SD</label><input id="diffusion-sd" type="number" min="0" max="20" step="0.05" /></div>
                <div class="field"><label for="electric-strength">Electric strength</label><input id="electric-strength" type="number" step="0.01" /></div>
                <div class="field"><label for="type0-permeability">NA+ permeability</label><input id="type0-permeability" type="number" min="0" max="1" step="0.01" /></div>
                <div class="field"><label for="type1-permeability">K+ permeability</label><input id="type1-permeability" type="number" min="0" max="1" step="0.01" /></div>
                <div class="field"><label for="pump-strength">NA+/K+ pump strength</label><input id="pump-strength" type="number" min="0" max="2" step="0.05" /></div>
                <div class="field"><label for="playback-speed">Playback speed</label><input id="playback-speed" type="number" min="0.1" max="8" step="0.1" /></div>
                ${variant.withGoldman ? '<div class="field"><label for="goldman-scale">Voltage scale</label><input id="goldman-scale" type="number" min="1" max="200" step="1" /></div>' : ''}
              </div>
            </div>
          </div>
        </aside>
        <section class="panel canvas-panel">
          <div class="canvas-head"><h2>${variant.canvasTitle ?? variant.title}</h2><span class="tiny">${variant.canvasModeLabel ?? 'Live two-ion membrane model'}</span></div>
          <div class="canvas-grid-3">
            <div class="canvas-subpanel"><div class="subhead"><h3>${variant.particlePanelTitle ?? 'Particle Dynamics'}</h3><span class="tiny">${variant.particleHint ?? variant.negMarkerLabel}</span></div><canvas id="particle-canvas"></canvas></div>
            <div class="canvas-subpanel"><div class="subhead"><h3>${variant.concentrationPanelTitle ?? 'Na+/K+ Concentrations'}</h3><span class="tiny">${variant.concentrationHint ?? 'Solid = inside, dashed = outside'}</span></div><canvas id="concentration-canvas"></canvas></div>
            <div class="canvas-subpanel"><div class="subhead"><h3>${variant.tracePanelTitle ?? 'Membrane Potential Proxy Traces'}</h3><span class="tiny">${variant.traceHint ?? `V_Na / V_K / V_total${(variant.showGoldmanPredictionTrace ?? variant.withGoldman) ? ' / Goldman' : ''}`}</span></div><canvas id="trace-canvas"></canvas></div>
          </div>
          <div class="legend">
            <span><span class="swatch" style="background:${SIM_COLORS.ionA}"></span>Na+</span>
            <span><span class="swatch" style="background:${variant.type1Color}"></span>K+</span>
            <span><span class="swatch" style="background:${SIM_COLORS.totalTrace}"></span>V_total trace</span>
            ${(variant.showGoldmanPredictionTrace ?? variant.withGoldman) ? `<span><span class="swatch" style="background:${SIM_COLORS.predictionTrace}"></span>Goldman prediction trace</span>` : ''}
          </div>
        </section>
      </div>
    </div>
  `;

  const particleCanvas = getEl<HTMLCanvasElement>('#particle-canvas');
  const concentrationCanvas = getEl<HTMLCanvasElement>('#concentration-canvas');
  const traceCanvas = getEl<HTMLCanvasElement>('#trace-canvas');
  const inputs = {
    numParticles: getEl<HTMLInputElement>('#num-particles'),
    diffusionSd: getEl<HTMLInputElement>('#diffusion-sd'),
    electricStrength: getEl<HTMLInputElement>('#electric-strength'),
    type0Permeability: getEl<HTMLInputElement>('#type0-permeability'),
    type1Permeability: getEl<HTMLInputElement>('#type1-permeability'),
    pumpStrength: getEl<HTMLInputElement>('#pump-strength'),
    playbackSpeed: getEl<HTMLInputElement>('#playback-speed'),
    goldmanScale: variant.withGoldman ? getEl<HTMLInputElement>('#goldman-scale') : null
  };
  const buttons = {
    togglePlay: getEl<HTMLButtonElement>('#toggle-play'),
    rerun: getEl<HTMLButtonElement>('#rerun'),
    resetDefaults: getEl<HTMLButtonElement>('#reset-defaults')
  };

  let simParams: SimParams = { ...defaultSim };
  let displayParams: DisplayParams = { ...defaultDisplay };
  let currentSeed = randomSeed();
  let rng = new Rng(currentSeed);
  let state = createState(simParams, currentSeed, variant);
  let trace = createTrace(state, simParams.T);
  let isPlaying = true;
  let lastTs = performance.now();
  let stepAccumulator = 0;

  function writeInputs(): void {
    setNumberInput(inputs.numParticles, simParams.numParticles, 0);
    setNumberInput(inputs.diffusionSd, simParams.diffusionSd, 3);
    setNumberInput(inputs.electricStrength, simParams.electricStrength, 3);
    setNumberInput(inputs.type0Permeability, simParams.type0Permeability, 2);
    setNumberInput(inputs.type1Permeability, simParams.type1Permeability, 2);
    setNumberInput(inputs.pumpStrength, simParams.pumpStrength, 2);
    setNumberInput(inputs.playbackSpeed, displayParams.playbackSpeed, 2);
    if (inputs.goldmanScale) setNumberInput(inputs.goldmanScale, simParams.goldmanScale, 0);
  }

  function readSimInputs(): SimParams {
    const boxHeight = defaultSim.boxHeight;
    const boxWidth = defaultSim.boxWidth;
    const wallThickness = defaultSim.wallThickness;
    const electricStrengthRaw = Number(inputs.electricStrength.value);
    const electricStrength = Number.isNaN(electricStrengthRaw)
      ? defaultSim.electricStrength
      : electricStrengthRaw;
    return {
      T: defaultSim.T,
      dt: defaultSim.dt,
      numParticles: clamp(Math.round(Number(inputs.numParticles.value) || defaultSim.numParticles), 10, MAX_PARTICLES),
      type0Fraction: simParams.type0Fraction,
      boxWidth,
      boxHeight,
      wallThickness,
      diffusionSd: clamp(Number(inputs.diffusionSd.value) || 0, 0, 20),
      electricStrength,
      negX: fixedAnionLayerXNearMembrane(boxWidth, wallThickness),
      negY: 0,
      type0ChannelWidth: clamp(simParams.type0ChannelWidth, 0.5, boxHeight - 8),
      type1ChannelWidth: clamp(simParams.type1ChannelWidth, 0.5, boxHeight - 8),
      type0Permeability: clamp(Number(inputs.type0Permeability.value) || 0, 0, 1),
      type1Permeability: clamp(Number(inputs.type1Permeability.value) || 0, 0, 1),
      type0Charge: simParams.type0Charge,
      type1Charge: simParams.type1Charge,
      initialLeftFrac: defaultSim.initialLeftFrac,
      goldmanScale: variant.withGoldman ? clamp(Number(inputs.goldmanScale?.value) || defaultSim.goldmanScale, 1, 200) : defaultSim.goldmanScale,
      pumpStrength: clamp(Number(inputs.pumpStrength.value) || 0, 0, 2)
    };
  }

  function readDisplayInputs(): DisplayParams {
    return {
      pointSize: defaultDisplay.pointSize,
      playbackSpeed: clamp(Number(inputs.playbackSpeed.value) || defaultDisplay.playbackSpeed, 0.1, 8),
      targetFps: defaultDisplay.targetFps,
      traceYLimit: defaultDisplay.traceYLimit
    };
  }

  function retargetTypes(stateRef: LiveState, targetType0Fraction: number, rngRef: Rng): LiveState {
    const targetType0 = Math.round(stateRef.numParticles * targetType0Fraction);
    let currentType0 = 0;
    for (let i = 0; i < stateRef.numParticles; i += 1) if (stateRef.types[i] === 0) currentType0 += 1;
    if (targetType0 === currentType0) return stateRef;
    const candidates: number[] = [];
    const fromType: IonType = targetType0 > currentType0 ? 1 : 0;
    const toType: IonType = targetType0 > currentType0 ? 0 : 1;
    for (let i = 0; i < stateRef.numParticles; i += 1) if (stateRef.types[i] === fromType) candidates.push(i);
    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rngRef.next() * (i + 1));
      const tmp = candidates[i];
      candidates[i] = candidates[j];
      candidates[j] = tmp;
    }
    const flips = Math.min(Math.abs(targetType0 - currentType0), candidates.length);
    for (let i = 0; i < flips; i += 1) {
      const idx = candidates[i];
      stateRef.types[idx] = toType;
      stateRef.charges[idx] = toType === 0 ? simParams.type0Charge : simParams.type1Charge;
    }
    countVoltages(stateRef, variant, simParams.goldmanScale, simParams.type0Charge, simParams.type1Charge);
    return stateRef;
  }

  function resizeState(stateRef: LiveState, targetCount: number, rngRef: Rng): LiveState {
    if (targetCount === stateRef.numParticles) return stateRef;
    const nextX = new Float32Array(targetCount);
    const nextY = new Float32Array(targetCount);
    const nextTypes = new Uint8Array(targetCount);
    const nextCharges = new Int8Array(targetCount);
    const keep = Math.min(stateRef.numParticles, targetCount);
    nextX.set(stateRef.x.subarray(0, keep));
    nextY.set(stateRef.y.subarray(0, keep));
    nextTypes.set(stateRef.types.subarray(0, keep));
    nextCharges.set(stateRef.charges.subarray(0, keep));
    const halfW = stateRef.boxWidth / 2;
    let currentType0 = 0;
    for (let i = 0; i < keep; i += 1) if (nextTypes[i] === 0) currentType0 += 1;
    const approxType0Frac = keep > 0 ? currentType0 / keep : simParams.type0Fraction;
    for (let i = keep; i < targetCount; i += 1) {
      const type: IonType = rngRef.next() < approxType0Frac ? 0 : 1;
      nextTypes[i] = type;
      nextCharges[i] = type === 0 ? simParams.type0Charge : simParams.type1Charge;
      const onLeft = rngRef.next() < simParams.initialLeftFrac;
      nextX[i] = onLeft
        ? rngRef.uniform(-halfW + 1, stateRef.leftWall - 1)
        : rngRef.uniform(stateRef.rightWall + 1, halfW - 1);
      nextY[i] = rngRef.uniform(-stateRef.boxHeight / 2 + 1, stateRef.boxHeight / 2 - 1);
    }
    stateRef.x = nextX;
    stateRef.y = nextY;
    stateRef.types = nextTypes;
    stateRef.charges = nextCharges;
    stateRef.numParticles = targetCount;
    const nextFixedCount = targetFixedAnionCount(targetCount);
    if (nextFixedCount !== stateRef.fixedCount) {
      stateRef.fixedCount = nextFixedCount;
      stateRef.fixedX = new Float32Array(nextFixedCount);
      stateRef.fixedY = new Float32Array(nextFixedCount);
    }
    layoutFixedAnions(stateRef.fixedX, stateRef.fixedY, stateRef.fixedCount, stateRef.boxWidth, stateRef.boxHeight, stateRef.leftWall, rngRef);
    countVoltages(stateRef, variant, simParams.goldmanScale, simParams.type0Charge, simParams.type1Charge);
    return stateRef;
  }

  function enforceGeometry(stateRef: LiveState): void {
    const halfW = stateRef.boxWidth / 2;
    const halfH = stateRef.boxHeight / 2;
    const minX = -halfW;
    for (let i = 0; i < stateRef.numParticles; i += 1) {
      stateRef.x[i] = reflectIntoBounds(stateRef.x[i], minX, halfW);
      stateRef.y[i] = reflectIntoBounds(stateRef.y[i], -halfH, halfH);
      const cMin = stateRef.types[i] === 0 ? stateRef.type0YMin : stateRef.type1YMin;
      const cMax = stateRef.types[i] === 0 ? stateRef.type0YMax : stateRef.type1YMax;
      if (stateRef.x[i] > stateRef.leftWall && stateRef.x[i] < stateRef.rightWall && !(stateRef.y[i] >= cMin && stateRef.y[i] <= cMax)) {
        stateRef.x[i] = stateRef.x[i] < 0 ? stateRef.leftWall : stateRef.rightWall;
      }
    }
    countVoltages(stateRef, variant, simParams.goldmanScale, simParams.type0Charge, simParams.type1Charge);
  }

  function trimTrace(traceHistory: TraceHistory, currentTime: number, traceWindowMs: number): void {
    const minTime = Math.max(0, currentTime - traceWindowMs);
    while (traceHistory.times.length > 1 && traceHistory.times[0] < minTime) {
      traceHistory.times.shift();
      traceHistory.va.shift();
      traceHistory.vb.shift();
      traceHistory.vTotal.shift();
      traceHistory.vGoldman.shift();
      traceHistory.naInside.shift();
      traceHistory.naOutside.shift();
      traceHistory.kInside.shift();
      traceHistory.kOutside.shift();
    }
  }

  function render(): void {
    drawParticleCanvas(particleCanvas, state, displayParams.pointSize, variant, simParams.electricStrength);
    drawConcentrationCanvas(concentrationCanvas, trace, state.simTime, simParams.T);
    drawTraceCanvas(traceCanvas, trace, state.simTime, simParams.T, displayParams.traceYLimit, variant.traceTitle ?? 'Membrane Potential Proxy Traces', variant);
  }

  function rebuildFromInputs(): void {
    simParams = readSimInputs();
    displayParams = readDisplayInputs();
    rng = new Rng(currentSeed);
    state = createState(simParams, currentSeed, variant);
    trace = createTrace(state, simParams.T);
    stepAccumulator = 0;
    writeInputs();
  }

  function applyLiveSimParams(): void {
    const next = readSimInputs();
    simParams = next;
    state = resizeState(state, simParams.numParticles, rng);
    state = retargetTypes(state, simParams.type0Fraction, rng);
    state.dt = simParams.dt;
    state.boxWidth = simParams.boxWidth;
    state.boxHeight = simParams.boxHeight;
    state.leftWall = -simParams.wallThickness / 2;
    state.rightWall = simParams.wallThickness / 2;
    state.negX = simParams.negX;
    state.negY = simParams.negY;
    layoutFixedAnions(state.fixedX, state.fixedY, state.fixedCount, state.boxWidth, state.boxHeight, state.leftWall, rng);
    const [[type0YMin, type0YMax], [type1YMin, type1YMax]] = evenlySpacedChannelBounds(
      [simParams.type0ChannelWidth, simParams.type1ChannelWidth],
      simParams.boxHeight
    );
    state.type0YMin = type0YMin;
    state.type0YMax = type0YMax;
    state.type1YMin = type1YMin;
    state.type1YMax = type1YMax;
    state.type0Permeability = simParams.type0Permeability;
    state.type1Permeability = simParams.type1Permeability;
    enforceGeometry(state);
    trimTrace(trace, state.simTime, simParams.T);
    writeInputs();
  }

  function refreshDisplayFromInputs(): void { displayParams = readDisplayInputs(); writeInputs(); }
  function setPlaying(next: boolean): void { isPlaying = next; buttons.togglePlay.textContent = isPlaying ? 'Pause' : 'Play'; }

  writeInputs();
  render();

  buttons.togglePlay.addEventListener('click', () => setPlaying(!isPlaying));
  buttons.rerun.addEventListener('click', () => { currentSeed = randomSeed(); rebuildFromInputs(); setPlaying(true); render(); });
  buttons.resetDefaults.addEventListener('click', () => { simParams = { ...defaultSim }; displayParams = { ...defaultDisplay }; currentSeed = randomSeed(); writeInputs(); rebuildFromInputs(); setPlaying(true); render(); });

  const simKeys = [
    inputs.numParticles, inputs.diffusionSd, inputs.electricStrength, inputs.type0Permeability, inputs.type1Permeability, inputs.pumpStrength, ...(inputs.goldmanScale ? [inputs.goldmanScale] : [])
  ];
  for (const el of simKeys) el.addEventListener('change', () => { applyLiveSimParams(); render(); });
  inputs.playbackSpeed.addEventListener('change', () => { refreshDisplayFromInputs(); render(); });
  window.addEventListener('resize', () => render());

  initThemeToggle(getEl<HTMLButtonElement>('#theme-toggle'));

  function animate(ts: number): void {
    const dtSec = Math.max(0, (ts - lastTs) / 1000);
    lastTs = ts;
    if (isPlaying) {
      stepAccumulator += dtSec * displayParams.targetFps * displayParams.playbackSpeed;
      const stepsToRun = Math.min(120, Math.floor(stepAccumulator));
      if (stepsToRun > 0) {
        stepAccumulator -= stepsToRun;
        for (let i = 0; i < stepsToRun; i += 1) {
          stepState(state, simParams, rng, variant);
          pushTrace(trace, state, simParams.T);
        }
      }
    }
    render();
    requestAnimationFrame(animate);
  }

  requestAnimationFrame((ts) => { lastTs = ts; animate(ts); });
}
