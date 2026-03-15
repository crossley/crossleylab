import '../style.css';
import {
  DEFAULT_DIFFUSION_SD,
  DEFAULT_NUM_PARTICLES,
  drawMembraneWall,
  MAX_PARTICLES,
  SIM_COLORS,
  pointFieldDrift
} from './sim_shared';

type IonType = 0 | 1; // 0 = Na+, 1 = K+

interface SimParams {
  T: number;
  dt: number;
  numParticles: number;
  naFraction: number;
  naInsideInitFrac: number;
  kInsideInitFrac: number;
  boxWidth: number;
  boxHeight: number;
  wallThickness: number;
  diffusionSd: number;
  naOpenTarget: number;
  kOpenTarget: number;
  gateTauMs: number;
  electricStrength: number;
  chargeSeparationGain: number;
  fieldResponseMs: number;
  fixedAnionLayerX: number;
  pumpStrength: number;
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
  charges: Int8Array;
  numParticles: number;
  dt: number;
  simTime: number;
  stepCount: number;
  boxWidth: number;
  boxHeight: number;
  leftWall: number;
  rightWall: number;
  fixedAnionLayerX: number;
  naChannelY: Float32Array;
  kChannelY: Float32Array;
  pumpY: Float32Array;
  naOpen: Uint8Array;
  kOpen: Uint8Array;
  naLeft: number;
  naRight: number;
  kLeft: number;
  kRight: number;
  vmProxy: number;
  effectiveElectricStrength: number;
}

interface TraceHistory {
  times: number[];
  naInsideFrac: number[];
  kInsideFrac: number[];
  naOpenFrac: number[];
  kOpenFrac: number[];
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

const CHANNELS_PER_TYPE = 20;
const PUMP_SITES = 10;
const CHANNEL_HALF_HEIGHT = 0.35;
const CHANNEL_PADDING = 5;
const PUMP_HALF_HEIGHT = 1.2;
const FIXED_ANION_MEMBRANE_OFFSET = 2;
const MOBILE_FIELD_SAMPLES = 96;
const MOBILE_FIELD_WEIGHT = 0.35;

const defaultSim: SimParams = {
  T: 2800,
  dt: 1,
  numParticles: DEFAULT_NUM_PARTICLES,
  naFraction: 0.5,
  naInsideInitFrac: 0.5,
  kInsideInitFrac: 0.5,
  boxWidth: 100,
  boxHeight: 90,
  wallThickness: 4,
  diffusionSd: DEFAULT_DIFFUSION_SD,
  naOpenTarget: 0.2,
  kOpenTarget: 0.65,
  gateTauMs: 14,
  electricStrength: -0.12,
  chargeSeparationGain: 1.3,
  fieldResponseMs: 14,
  fixedAnionLayerX: fixedAnionLayerXNearMembrane(100, 4),
  pumpStrength: 1
};

const defaultDisplay: DisplayParams = {
  pointSize: 2.1,
  playbackSpeed: 1,
  targetFps: 30
};

const TRACE_HISTORY_MAX_POINTS = 5000;

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

function fixedAnionLayerXNearMembrane(boxWidth: number, wallThickness: number): number {
  const halfW = boxWidth / 2;
  const leftMembraneFace = -wallThickness / 2;
  return clamp(leftMembraneFace - FIXED_ANION_MEMBRANE_OFFSET, -halfW + 0.5, halfW - 0.5);
}

function targetFixedAnionCount(numParticles: number): number {
  return clamp(Math.round(numParticles * 0.2), 30, 1200);
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

function layoutInterleavedChannels(
  naY: Float32Array,
  kY: Float32Array,
  boxHeight: number,
  rng: Rng
): void {
  const halfH = boxHeight / 2;
  const yMax = halfH - CHANNEL_PADDING;
  const yMin = -halfH + CHANNEL_PADDING;
  const totalSlots = naY.length + kY.length;
  const step = (yMax - yMin) / (totalSlots + 1);
  const jitter = step * 0.16;

  for (let i = 0; i < naY.length; i += 1) {
    const slot = 2 * i + 1;
    const baseY = yMax - slot * step;
    naY[i] = clamp(baseY + rng.uniform(-jitter, jitter), yMin, yMax);
  }
  for (let i = 0; i < kY.length; i += 1) {
    const slot = 2 * i + 2;
    const baseY = yMax - slot * step;
    kY[i] = clamp(baseY + rng.uniform(-jitter, jitter), yMin, yMax);
  }
}

function layoutPumpSites(pumpY: Float32Array, boxHeight: number, rng: Rng): void {
  const halfH = boxHeight / 2;
  const yMax = halfH - CHANNEL_PADDING;
  const yMin = -halfH + CHANNEL_PADDING;
  const step = (yMax - yMin) / (pumpY.length + 1);
  const jitter = step * 0.2;
  for (let i = 0; i < pumpY.length; i += 1) {
    const baseY = yMax - (i + 1) * step;
    pumpY[i] = clamp(baseY + rng.uniform(-jitter, jitter), yMin, yMax);
  }
}

function normalizeSimParams(params: SimParams): SimParams {
  const boxWidth = clamp(params.boxWidth, 40, 500);
  const boxHeight = clamp(params.boxHeight, 40, 500);
  const wallThickness = clamp(params.wallThickness, 0.5, Math.min(50, boxWidth - 2));
  return {
    T: clamp(Math.round(params.T), 200, 20000),
    dt: clamp(params.dt, 0.05, 20),
    numParticles: clamp(Math.round(params.numParticles), 20, MAX_PARTICLES),
    naFraction: clamp(params.naFraction, 0.05, 0.95),
    naInsideInitFrac: clamp(params.naInsideInitFrac, 0, 1),
    kInsideInitFrac: clamp(params.kInsideInitFrac, 0, 1),
    boxWidth,
    boxHeight,
    wallThickness,
    diffusionSd: clamp(params.diffusionSd, 0, 20),
    naOpenTarget: clamp(params.naOpenTarget, 0, 1),
    kOpenTarget: clamp(params.kOpenTarget, 0, 1),
    gateTauMs: clamp(params.gateTauMs, 1, 200),
    electricStrength: params.electricStrength,
    chargeSeparationGain: clamp(params.chargeSeparationGain, -8, 8),
    fieldResponseMs: clamp(params.fieldResponseMs, 1, 400),
    fixedAnionLayerX: fixedAnionLayerXNearMembrane(boxWidth, wallThickness),
    pumpStrength: clamp(params.pumpStrength, 0, 2)
  };
}

function shuffleInPlace(values: number[], rng: Rng): void {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    const tmp = values[i];
    values[i] = values[j];
    values[j] = tmp;
  }
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

function recount(state: LiveState): void {
  let naLeft = 0;
  let naRight = 0;
  let kLeft = 0;
  let kRight = 0;
  let fixedLeft = 0;
  let fixedRight = 0;
  for (let i = 0; i < state.numParticles; i += 1) {
    const left = state.x[i] < state.leftWall;
    const right = state.x[i] > state.rightWall;
    const isNa = state.types[i] === 0;
    if (left) {
      if (isNa) naLeft += 1; else kLeft += 1;
    } else if (right) {
      if (isNa) naRight += 1; else kRight += 1;
    }
  }
  for (let i = 0; i < state.fixedCount; i += 1) {
    const left = state.fixedX[i] < state.leftWall;
    const right = state.fixedX[i] > state.rightWall;
    if (left) fixedLeft += 1;
    else if (right) fixedRight += 1;
  }
  state.naLeft = naLeft;
  state.naRight = naRight;
  state.kLeft = kLeft;
  state.kRight = kRight;
  const netLeft = (naLeft + kLeft) - fixedLeft;
  const netRight = (naRight + kRight) - fixedRight;
  const total = Math.max(1, state.numParticles + state.fixedCount);
  state.vmProxy = 80 * (netLeft - netRight) / total;
}

function createState(params: SimParams, seed: number): LiveState {
  const p = normalizeSimParams(params);
  const rng = new Rng(seed);
  const leftWall = -p.wallThickness / 2;
  const rightWall = p.wallThickness / 2;
  const x = new Float32Array(p.numParticles);
  const y = new Float32Array(p.numParticles);
  const fixedCount = targetFixedAnionCount(p.numParticles);
  const fixedX = new Float32Array(fixedCount);
  const fixedY = new Float32Array(fixedCount);
  const types = new Uint8Array(p.numParticles);
  const charges = new Int8Array(p.numParticles);
  const naIndices: number[] = [];
  const kIndices: number[] = [];

  for (let i = 0; i < p.numParticles; i += 1) {
    const type: IonType = rng.next() < p.naFraction ? 0 : 1;
    types[i] = type;
    charges[i] = 1;
    if (type === 0) naIndices.push(i); else kIndices.push(i);
  }

  const placeType = (indices: number[], insideFrac: number): void => {
    const insideCount = Math.floor(indices.length * insideFrac);
    for (let i = 0; i < indices.length; i += 1) {
      const idx = indices[i];
      const inside = i < insideCount;
      x[idx] = inside
        ? rng.uniform(-p.boxWidth / 2 + 1, leftWall - 1)
        : rng.uniform(rightWall + 1, p.boxWidth / 2 - 1);
      y[idx] = rng.uniform(-p.boxHeight / 2 + 1, p.boxHeight / 2 - 1);
    }
  };

  placeType(naIndices, p.naInsideInitFrac);
  placeType(kIndices, p.kInsideInitFrac);
  layoutFixedAnions(fixedX, fixedY, fixedCount, p.boxWidth, p.boxHeight, leftWall, rng);

  const naChannelY = new Float32Array(CHANNELS_PER_TYPE);
  const kChannelY = new Float32Array(CHANNELS_PER_TYPE);
  const pumpY = new Float32Array(PUMP_SITES);
  layoutInterleavedChannels(naChannelY, kChannelY, p.boxHeight, rng);
  layoutPumpSites(pumpY, p.boxHeight, rng);

  const naOpen = new Uint8Array(CHANNELS_PER_TYPE);
  const kOpen = new Uint8Array(CHANNELS_PER_TYPE);
  for (let i = 0; i < CHANNELS_PER_TYPE; i += 1) {
    naOpen[i] = rng.next() < p.naOpenTarget ? 1 : 0;
    kOpen[i] = rng.next() < p.kOpenTarget ? 1 : 0;
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
    naChannelY,
    kChannelY,
    pumpY,
    naOpen,
    kOpen,
    naLeft: 0,
    naRight: 0,
    kLeft: 0,
    kRight: 0,
    vmProxy: 0,
    effectiveElectricStrength: p.electricStrength
  };
  recount(state);
  return state;
}

function resizeState(state: LiveState, targetCount: number, params: SimParams, rng: Rng): LiveState {
  if (targetCount === state.numParticles) return state;
  const nextX = new Float32Array(targetCount);
  const nextY = new Float32Array(targetCount);
  const nextTypes = new Uint8Array(targetCount);
  const nextCharges = new Int8Array(targetCount);
  const keep = Math.min(targetCount, state.numParticles);
  nextX.set(state.x.subarray(0, keep));
  nextY.set(state.y.subarray(0, keep));
  nextTypes.set(state.types.subarray(0, keep));
  nextCharges.set(state.charges.subarray(0, keep));
  const halfW = state.boxWidth / 2;
  for (let i = keep; i < targetCount; i += 1) {
    const type: IonType = rng.next() < params.naFraction ? 0 : 1;
    nextTypes[i] = type;
    nextCharges[i] = 1;
    const inside = rng.next() < (type === 0 ? params.naInsideInitFrac : params.kInsideInitFrac);
    nextX[i] = inside
      ? rng.uniform(-halfW + 1, state.leftWall - 1)
      : rng.uniform(state.rightWall + 1, halfW - 1);
    nextY[i] = rng.uniform(-state.boxHeight / 2 + 1, state.boxHeight / 2 - 1);
  }
  state.x = nextX;
  state.y = nextY;
  state.types = nextTypes;
  state.charges = nextCharges;
  state.numParticles = targetCount;
  const nextFixedCount = targetFixedAnionCount(targetCount);
  if (nextFixedCount !== state.fixedCount) {
    state.fixedCount = nextFixedCount;
    state.fixedX = new Float32Array(nextFixedCount);
    state.fixedY = new Float32Array(nextFixedCount);
  }
  layoutFixedAnions(state.fixedX, state.fixedY, state.fixedCount, state.boxWidth, state.boxHeight, state.leftWall, rng);
  recount(state);
  return state;
}

function retargetTypes(state: LiveState, naFraction: number, rng: Rng): LiveState {
  const targetNa = Math.round(state.numParticles * naFraction);
  let currentNa = 0;
  for (let i = 0; i < state.numParticles; i += 1) if (state.types[i] === 0) currentNa += 1;
  if (targetNa === currentNa) return state;
  const from: IonType = targetNa > currentNa ? 1 : 0;
  const to: IonType = targetNa > currentNa ? 0 : 1;
  const candidates: number[] = [];
  for (let i = 0; i < state.numParticles; i += 1) if (state.types[i] === from) candidates.push(i);
  shuffleInPlace(candidates, rng);
  const flips = Math.min(Math.abs(targetNa - currentNa), candidates.length);
  for (let i = 0; i < flips; i += 1) state.types[candidates[i]] = to;
  recount(state);
  return state;
}

function nearestAlignedOpenChannel(y: number, channelY: Float32Array, channelOpen: Uint8Array, halfHeight: number): boolean {
  for (let i = 0; i < channelY.length; i += 1) {
    if (Math.abs(y - channelY[i]) <= halfHeight && channelOpen[i] === 1) return true;
  }
  return false;
}

function updateChannelStates(open: Uint8Array, targetOpen: number, gateTauMs: number, dt: number, rng: Rng): void {
  const p = clamp(targetOpen, 0, 1);
  const tau = Math.max(1e-6, gateTauMs);
  const lambda = 1 / tau;
  const pOpenStep = 1 - Math.exp(-(p * lambda) * dt);
  const pCloseStep = 1 - Math.exp(-((1 - p) * lambda) * dt);
  for (let i = 0; i < open.length; i += 1) {
    if (open[i] === 1) {
      if (rng.next() < pCloseStep) open[i] = 0;
    } else if (rng.next() < pOpenStep) {
      open[i] = 1;
    }
  }
}

function enforceGeometry(state: LiveState): void {
  const halfW = state.boxWidth / 2;
  const halfH = state.boxHeight / 2;
  for (let i = 0; i < state.numParticles; i += 1) {
    state.x[i] = reflectIntoBounds(state.x[i], -halfW, halfW);
    state.y[i] = reflectIntoBounds(state.y[i], -halfH, halfH);
    const inMembrane = state.x[i] > state.leftWall && state.x[i] < state.rightWall;
    if (inMembrane) {
      const openAligned = state.types[i] === 0
        ? nearestAlignedOpenChannel(state.y[i], state.naChannelY, state.naOpen, CHANNEL_HALF_HEIGHT)
        : nearestAlignedOpenChannel(state.y[i], state.kChannelY, state.kOpen, CHANNEL_HALF_HEIGHT);
      if (!openAligned) state.x[i] = state.x[i] < 0 ? state.leftWall : state.rightWall;
    }
  }
  recount(state);
}

function applyPump(state: LiveState, params: SimParams, rng: Rng, pumpEnabled: boolean): void {
  const strength = clamp(params.pumpStrength, 0, 2);
  const rate = clamp(0.7 * strength, 0, 4);
  const membraneReach = clamp(7 * strength, 1, 20);
  const siteReachY = clamp(2.2 + 1.8 * strength, 1.5, 8);
  if (!pumpEnabled || rate <= 0) return;
  const naCandidatesBySite: number[][] = Array.from({ length: state.pumpY.length }, () => []);
  const kCandidatesBySite: number[][] = Array.from({ length: state.pumpY.length }, () => []);
  for (let i = 0; i < state.numParticles; i += 1) {
    let bestSite = -1;
    let bestDy = Number.POSITIVE_INFINITY;
    for (let s = 0; s < state.pumpY.length; s += 1) {
      const dy = Math.abs(state.y[i] - state.pumpY[s]);
      if (dy <= siteReachY && dy < bestDy) {
        bestDy = dy;
        bestSite = s;
      }
    }
    if (bestSite < 0) continue;
    if (state.types[i] === 0 && state.x[i] < state.leftWall && state.leftWall - state.x[i] <= membraneReach) {
      naCandidatesBySite[bestSite].push(i);
    }
    if (state.types[i] === 1 && state.x[i] > state.rightWall && state.x[i] - state.rightWall <= membraneReach) {
      kCandidatesBySite[bestSite].push(i);
    }
  }
  for (let s = 0; s < state.pumpY.length; s += 1) {
    shuffleInPlace(naCandidatesBySite[s], rng);
    shuffleInPlace(kCandidatesBySite[s], rng);
  }

  let cycles = Math.floor(rate * state.dt);
  if (rng.next() < rate * state.dt - cycles) cycles += 1;
  cycles = clamp(cycles, 0, 20);

  const siteOrder = Array.from({ length: state.pumpY.length }, (_, i) => i);
  shuffleInPlace(siteOrder, rng);
  const naCursorBySite = new Uint16Array(state.pumpY.length);
  const kCursorBySite = new Uint16Array(state.pumpY.length);
  for (let c = 0; c < cycles; c += 1) {
    const siteIndex = siteOrder[c % siteOrder.length];
    const siteY = state.pumpY[siteIndex];
    for (let i = 0; i < 3; i += 1) {
      if (naCursorBySite[siteIndex] >= naCandidatesBySite[siteIndex].length) break;
      const idx = naCandidatesBySite[siteIndex][naCursorBySite[siteIndex]++];
      state.x[idx] = state.rightWall + 1 + rng.uniform(0, membraneReach * 0.5);
      state.y[idx] = siteY + rng.uniform(-siteReachY, siteReachY);
    }
    for (let i = 0; i < 2; i += 1) {
      if (kCursorBySite[siteIndex] >= kCandidatesBySite[siteIndex].length) break;
      const idx = kCandidatesBySite[siteIndex][kCursorBySite[siteIndex]++];
      state.x[idx] = state.leftWall - 1 - rng.uniform(0, membraneReach * 0.5);
      state.y[idx] = siteY + rng.uniform(-siteReachY, siteReachY);
    }
  }
}

function stepState(state: LiveState, params: SimParams, rng: Rng, pumpEnabled: boolean): void {
  const halfW = state.boxWidth / 2;
  const halfH = state.boxHeight / 2;
  updateChannelStates(state.naOpen, params.naOpenTarget, params.gateTauMs, state.dt, rng);
  updateChannelStates(state.kOpen, params.kOpenTarget, params.gateTauMs, state.dt, rng);

  const vmNormalized = state.vmProxy / 80;
  const targetField = params.electricStrength + params.chargeSeparationGain * vmNormalized;
  const alpha = clamp(state.dt / Math.max(1e-6, params.fieldResponseMs), 0, 1);
  state.effectiveElectricStrength += alpha * (targetField - state.effectiveElectricStrength);

  const mobileSources = sampledMobileFieldSources(state, rng, MOBILE_FIELD_SAMPLES);
  const perFixedStrength = state.effectiveElectricStrength / Math.max(1, state.fixedCount);
  const perMobileStrength = -MOBILE_FIELD_WEIGHT * state.effectiveElectricStrength / Math.max(1, mobileSources.length);

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
    const canCross = state.types[i] === 0
      ? nearestAlignedOpenChannel(yTrial, state.naChannelY, state.naOpen, CHANNEL_HALF_HEIGHT)
      : nearestAlignedOpenChannel(yTrial, state.kChannelY, state.kOpen, CHANNEL_HALF_HEIGHT);

    if ((tryingToCrossLeft || tryingToCrossRight) && !canCross) {
      xNew = tryingToCrossLeft
        ? reflectIntoBounds(2 * state.rightWall - xTrial, -halfW, halfW)
        : reflectIntoBounds(2 * state.leftWall - xTrial, -halfW, halfW);
    } else if (!canCross && xTrial > state.leftWall && xTrial < state.rightWall) {
      xNew = xPrev < 0 ? state.leftWall : state.rightWall;
    }
    state.x[i] = xNew;
    state.y[i] = yTrial;
  }

  applyPump(state, params, rng, pumpEnabled);
  state.stepCount += 1;
  state.simTime = state.stepCount * state.dt;
  recount(state);
}

function openFraction(open: Uint8Array): number {
  let countOpen = 0;
  for (let i = 0; i < open.length; i += 1) if (open[i] === 1) countOpen += 1;
  return countOpen / Math.max(1, open.length);
}

function pushTrace(trace: TraceHistory, state: LiveState, traceWindowMs: number): void {
  trace.times.push(state.simTime);
  trace.naInsideFrac.push(state.naLeft / Math.max(1, state.naLeft + state.naRight));
  trace.kInsideFrac.push(state.kLeft / Math.max(1, state.kLeft + state.kRight));
  trace.naOpenFrac.push(openFraction(state.naOpen));
  trace.kOpenFrac.push(openFraction(state.kOpen));
  const minTime = Math.max(0, state.simTime - traceWindowMs);
  while (trace.times.length > 1 && trace.times[0] < minTime) {
    trace.times.shift();
    trace.naInsideFrac.shift();
    trace.kInsideFrac.shift();
    trace.naOpenFrac.shift();
    trace.kOpenFrac.shift();
  }
  while (trace.times.length > TRACE_HISTORY_MAX_POINTS) {
    trace.times.shift();
    trace.naInsideFrac.shift();
    trace.kInsideFrac.shift();
    trace.naOpenFrac.shift();
    trace.kOpenFrac.shift();
  }
}

function createTrace(state: LiveState, traceWindowMs: number): TraceHistory {
  const trace: TraceHistory = { times: [], naInsideFrac: [], kInsideFrac: [], naOpenFrac: [], kOpenFrac: [] };
  pushTrace(trace, state, traceWindowMs);
  return trace;
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

function drawDiscreteChannels(
  ctx: CanvasRenderingContext2D,
  state: LiveState,
  w: number,
  h: number,
  dpr: number
): void {
  const [wl] = worldToCanvas(state.leftWall, 0, state, w, h);
  const [wr] = worldToCanvas(state.rightWall, 0, state, w, h);
  const membraneWidth = Math.max(1, wr - wl);
  const aperturePx = Math.max(1.3 * dpr, (2 * CHANNEL_HALF_HEIGHT / state.boxHeight) * h * 0.5);

  const drawTypeChannels = (yList: Float32Array, open: Uint8Array, color: string): void => {
    for (let i = 0; i < yList.length; i += 1) {
      const [, yPx] = worldToCanvas(0, yList[i], state, w, h);
      const top = yPx - aperturePx;
      const height = 2 * aperturePx;
      ctx.fillStyle = 'rgba(8,16,26,0.90)';
      ctx.fillRect(wl, top, membraneWidth, height);
      if (open[i] === 1) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.45;
        ctx.fillRect(wl, top, membraneWidth, height);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2 * dpr;
        ctx.strokeRect(wl, top, membraneWidth, height);
        ctx.restore();
      } else {
        ctx.strokeStyle = 'rgba(230,240,255,0.50)';
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(wl + 1 * dpr, yPx);
        ctx.lineTo(wr - 1 * dpr, yPx);
        ctx.stroke();
      }
    }
  };

  drawTypeChannels(state.naChannelY, state.naOpen, 'rgba(66, 200, 255, 0.95)');
  drawTypeChannels(state.kChannelY, state.kOpen, 'rgba(245, 178, 72, 0.95)');
}

function drawParticles(canvas: HTMLCanvasElement, state: LiveState, pointSize: number, pumpEnabled: boolean): void {
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

  const [wl] = worldToCanvas(state.leftWall, 0, state, w, h);
  const [wr] = worldToCanvas(state.rightWall, 0, state, w, h);
  drawMembraneWall(ctx, {
    leftX: wl,
    rightX: wr,
    height: h,
    dpr
  });
  drawDiscreteChannels(ctx, state, w, h, dpr);

  ctx.fillStyle = pumpEnabled ? SIM_COLORS.ionC : 'rgba(170,170,190,0.8)';
  const pumpHalfHeightPx = Math.max(3 * dpr, (PUMP_HALF_HEIGHT / state.boxHeight) * h * 0.5);
  for (let i = 0; i < state.pumpY.length; i += 1) {
    const [, pumpYPx] = worldToCanvas(0, state.pumpY[i], state, w, h);
    ctx.fillRect((wl + wr) / 2 - 2.5 * dpr, pumpYPx - pumpHalfHeightPx, 5 * dpr, 2 * pumpHalfHeightPx);
  }

  const r = Math.max(0.8, pointSize) * dpr;
  ctx.fillStyle = SIM_COLORS.fieldNegative;
  const fixedR = Math.max(0.7, pointSize * 0.8) * dpr;
  for (let i = 0; i < state.fixedCount; i += 1) {
    const [px, py] = worldToCanvas(state.fixedX[i], state.fixedY[i], state, w, h);
    ctx.fillRect(px - fixedR, py - fixedR, 2 * fixedR, 2 * fixedR);
  }
  for (let i = 0; i < state.numParticles; i += 1) {
    const [px, py] = worldToCanvas(state.x[i], state.y[i], state, w, h);
    ctx.fillStyle = state.types[i] === 0 ? SIM_COLORS.ionB : SIM_COLORS.ionA;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }

  const naOpenN = Math.round(openFraction(state.naOpen) * state.naOpen.length);
  const kOpenN = Math.round(openFraction(state.kOpen) * state.kOpen.length);

  ctx.fillStyle = 'rgba(232,243,255,0.92)';
  ctx.font = `${12 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.fillText(`Vm proxy = ${state.vmProxy.toFixed(1)} mV`, 12 * dpr, 15 * dpr);
  ctx.fillText(`E_eff = ${state.effectiveElectricStrength.toFixed(3)}`, 12 * dpr, 69 * dpr);
  ctx.fillStyle = 'rgba(66,200,255,0.90)';
  ctx.fillText(`Na open: ${naOpenN}/${state.naOpen.length}`, 12 * dpr, 33 * dpr);
  ctx.fillStyle = 'rgba(245,178,72,0.90)';
  ctx.fillText(`K open: ${kOpenN}/${state.kOpen.length}`, 12 * dpr, 51 * dpr);
  ctx.fillStyle = 'rgba(232,243,255,0.75)';
  ctx.fillText('inside (cell)', 12 * dpr, h - 10 * dpr);
  ctx.fillText('outside', w - 58 * dpr, h - 10 * dpr);
}

function drawTrace(canvas: HTMLCanvasElement, trace: TraceHistory, currentTime: number, traceWindowMs: number): void {
  syncCanvasSize(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#03060b';
  ctx.fillRect(0, 0, w, h);

  const padL = 64 * dpr;
  const padR = 12 * dpr;
  const padT = 18 * dpr;
  const padB = 24 * dpr;
  const plotW = Math.max(1, w - padL - padR);
  const plotH = Math.max(1, h - padT - padB);
  const startTime = Math.max(0, currentTime - traceWindowMs);
  const xMap = (tt: number) => padL + ((tt - startTime) / Math.max(1, traceWindowMs)) * plotW;
  const yFrac = (v: number) => padT + (1 - v) * plotH;

  ctx.strokeStyle = 'rgba(180,220,255,0.28)';
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(padL, padT, plotW, plotH);
  ctx.beginPath();
  ctx.moveTo(padL, yFrac(0.5));
  ctx.lineTo(padL + plotW, yFrac(0.5));
  ctx.stroke();

  const drawSeries = (data: number[], color: string, dashed = false): void => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8 * dpr;
    if (dashed) ctx.setLineDash([5 * dpr, 4 * dpr]);
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < trace.times.length; i += 1) {
      if (trace.times[i] < startTime) continue;
      const px = xMap(trace.times[i]);
      const py = yFrac(data[i]);
      if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
    }
    if (started) ctx.stroke();
    ctx.restore();
  };

  drawSeries(trace.naInsideFrac, SIM_COLORS.ionBTrace, false);
  drawSeries(trace.kInsideFrac, SIM_COLORS.ionATrace, false);

  ctx.fillStyle = 'rgba(232,243,255,0.78)';
  ctx.font = `${11 * dpr}px Avenir Next, Segoe UI, sans-serif`;
  ctx.save();
  ctx.translate(padL - 42 * dpr, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('fraction', 0, 0);
  ctx.restore();
}

const app = getEl<HTMLDivElement>('#app');
app.innerHTML = `
  <div class="site-shell">
    <div class="nav-line"><a href="./index.html">Back to index</a><span>•</span><span>Page: <code>inspect_emergent_nak_dynamic_field_feedback</code></span></div>
    <header class="page-head">
      <p class="eyebrow">Charge-Separation Feedback as a Next Step</p>
      <h1>Na/K Pump with Dynamic Charge-Separation Field</h1>
      <ul class="key-points">
        <li>Up to this point, electric force came only from fixed intracellular anions (red).</li>
        <li>In real neurons, mobile-ion charge imbalance across the membrane is another electric-force source.</li>
        <li>This simulation adds that dynamic charge-separation field.</li>
      </ul>
    </header>
    <div class="sim-layout">
      <aside class="controls">
        <div class="panel">
          <div class="group">
            <p class="group-label">Classroom Controls</p>
            <div class="button-row">
              <button id="toggle-play" class="primary">Pause</button>
              <button id="rerun">Rerun</button>
              <button id="reset-defaults" class="warn">Reset Defaults</button>
            </div>
            <div class="button-row">
              <button id="pump-toggle" class="primary">Pump ON</button>
            </div>
            <div class="control-grid">
              <div class="field"><label for="num-particles">Particles</label><input id="num-particles" type="number" min="20" max="5000" step="1" /></div>
              <div class="field"><label for="diffusion-sd">Diffusion SD</label><input id="diffusion-sd" type="number" min="0" max="20" step="0.05" /></div>
              <div class="field"><label for="playback-speed">Playback speed</label><input id="playback-speed" type="number" min="0.1" max="12" step="0.05" /></div>
              <div class="field"><label for="electric-strength">Electric strength</label><input id="electric-strength" type="number" step="0.01" /></div>
              <div class="field"><label for="na-open-target">NA+ open probability target</label><input id="na-open-target" type="number" min="0" max="1" step="0.01" /></div>
              <div class="field"><label for="k-open-target">K+ open probability target</label><input id="k-open-target" type="number" min="0" max="1" step="0.01" /></div>
              <div class="field"><label for="gate-tau">Gate switching timescale (ms)</label><input id="gate-tau" type="number" min="1" max="200" step="1" /></div>
              <div class="field"><label for="sep-gain">Charge-separation gain</label><input id="sep-gain" type="number" min="-8" max="8" step="0.05" /></div>
              <div class="field"><label for="field-response-ms">Field response (ms)</label><input id="field-response-ms" type="number" min="1" max="400" step="1" /></div>
              <div class="field"><label for="pump-strength">NA+/K+ pump strength</label><input id="pump-strength" type="number" min="0" max="2" step="0.05" /></div>
            </div>
          </div>
        </div>
      </aside>
      <section class="panel canvas-panel">
        <div class="canvas-grid-2">
          <div class="canvas-subpanel">
            <canvas id="particle-canvas"></canvas>
          </div>
          <div class="canvas-subpanel">
            <canvas id="trace-canvas"></canvas>
          </div>
        </div>
      </section>
    </div>
  </div>
`;

const particleCanvas = getEl<HTMLCanvasElement>('#particle-canvas');
const traceCanvas = getEl<HTMLCanvasElement>('#trace-canvas');
const inputs = {
  numParticles: getEl<HTMLInputElement>('#num-particles'),
  diffusionSd: getEl<HTMLInputElement>('#diffusion-sd'),
  electricStrength: getEl<HTMLInputElement>('#electric-strength'),
  naOpenTarget: getEl<HTMLInputElement>('#na-open-target'),
  kOpenTarget: getEl<HTMLInputElement>('#k-open-target'),
  gateTauMs: getEl<HTMLInputElement>('#gate-tau'),
  sepGain: getEl<HTMLInputElement>('#sep-gain'),
  fieldResponseMs: getEl<HTMLInputElement>('#field-response-ms'),
  pumpStrength: getEl<HTMLInputElement>('#pump-strength')
};
const displayInputs = {
  playbackSpeed: getEl<HTMLInputElement>('#playback-speed')
};
const buttons = {
  togglePlay: getEl<HTMLButtonElement>('#toggle-play'),
  rerun: getEl<HTMLButtonElement>('#rerun'),
  resetDefaults: getEl<HTMLButtonElement>('#reset-defaults'),
  pumpToggle: getEl<HTMLButtonElement>('#pump-toggle')
};

let simParams: SimParams = { ...defaultSim };
let displayParams: DisplayParams = { ...defaultDisplay };
let currentSeed = randomSeed();
let rng = new Rng(currentSeed);
let state = createState(simParams, currentSeed);
let trace = createTrace(state, simParams.T);
let isPlaying = true;
let pumpEnabled = true;
let lastTs = performance.now();
let stepAccumulator = 0;

function writeInputs(): void {
  setNumberInput(inputs.numParticles, simParams.numParticles, 0);
  setNumberInput(inputs.diffusionSd, simParams.diffusionSd, 3);
  setNumberInput(inputs.electricStrength, simParams.electricStrength, 3);
  setNumberInput(inputs.naOpenTarget, simParams.naOpenTarget, 2);
  setNumberInput(inputs.kOpenTarget, simParams.kOpenTarget, 2);
  setNumberInput(inputs.gateTauMs, simParams.gateTauMs, 0);
  setNumberInput(inputs.sepGain, simParams.chargeSeparationGain, 2);
  setNumberInput(inputs.fieldResponseMs, simParams.fieldResponseMs, 0);
  setNumberInput(inputs.pumpStrength, simParams.pumpStrength, 2);
  setNumberInput(displayInputs.playbackSpeed, displayParams.playbackSpeed, 2);
  buttons.pumpToggle.textContent = pumpEnabled ? 'Pump ON' : 'Pump OFF';
}

function readSimInputs(): SimParams {
  const boxWidth = defaultSim.boxWidth;
  const boxHeight = defaultSim.boxHeight;
  const electricStrengthRaw = Number(inputs.electricStrength.value);
  return normalizeSimParams({
    T: clamp(defaultSim.T, 200, 20000),
    dt: defaultSim.dt,
    numParticles: clamp(Math.round(Number(inputs.numParticles.value) || defaultSim.numParticles), 20, MAX_PARTICLES),
    naFraction: 0.5,
    naInsideInitFrac: 0.5,
    kInsideInitFrac: 0.5,
    boxWidth,
    boxHeight,
    wallThickness: defaultSim.wallThickness,
    diffusionSd: clamp(Number(inputs.diffusionSd.value) || 0, 0, 20),
    naOpenTarget: clamp(Number(inputs.naOpenTarget.value) || 0, 0, 1),
    kOpenTarget: clamp(Number(inputs.kOpenTarget.value) || 0, 0, 1),
    gateTauMs: clamp(Number(inputs.gateTauMs.value) || defaultSim.gateTauMs, 1, 200),
    chargeSeparationGain: clamp(Number(inputs.sepGain.value) || 0, -8, 8),
    fieldResponseMs: clamp(Number(inputs.fieldResponseMs.value) || defaultSim.fieldResponseMs, 1, 400),
    electricStrength: Number.isNaN(electricStrengthRaw) ? defaultSim.electricStrength : electricStrengthRaw,
    fixedAnionLayerX: fixedAnionLayerXNearMembrane(boxWidth, defaultSim.wallThickness),
    pumpStrength: clamp(Number(inputs.pumpStrength.value) || 0, 0, 2)
  });
}

function readDisplayInputs(): DisplayParams {
  return {
    ...displayParams,
    playbackSpeed: clamp(Number(displayInputs.playbackSpeed.value) || defaultDisplay.playbackSpeed, 0.1, 12)
  };
}

function rebuild(): void {
  simParams = readSimInputs();
  currentSeed = randomSeed();
  rng = new Rng(currentSeed);
  state = createState(simParams, currentSeed);
  trace = createTrace(state, simParams.T);
  stepAccumulator = 0;
  writeInputs();
}

function applyLiveInputs(): void {
  const next = readSimInputs();
  simParams = next;
  state = resizeState(state, simParams.numParticles, simParams, rng);
  state = retargetTypes(state, simParams.naFraction, rng);
  state.dt = simParams.dt;
  state.boxWidth = simParams.boxWidth;
  state.boxHeight = simParams.boxHeight;
  state.leftWall = -simParams.wallThickness / 2;
  state.rightWall = simParams.wallThickness / 2;
  state.fixedAnionLayerX = simParams.fixedAnionLayerX;
  state.effectiveElectricStrength += 0.3 * (simParams.electricStrength - state.effectiveElectricStrength);
  layoutFixedAnions(state.fixedX, state.fixedY, state.fixedCount, state.boxWidth, state.boxHeight, state.leftWall, rng);
  enforceGeometry(state);
  pushTrace(trace, state, simParams.T);
  writeInputs();
}

function render(): void {
  drawParticles(particleCanvas, state, displayParams.pointSize, pumpEnabled);
  drawTrace(traceCanvas, trace, state.simTime, simParams.T);
}

writeInputs();
render();

buttons.togglePlay.addEventListener('click', () => {
  isPlaying = !isPlaying;
  buttons.togglePlay.textContent = isPlaying ? 'Pause' : 'Play';
});
buttons.pumpToggle.addEventListener('click', () => {
  pumpEnabled = !pumpEnabled;
  writeInputs();
  render();
});
buttons.rerun.addEventListener('click', () => {
  rebuild();
  render();
});
buttons.resetDefaults.addEventListener('click', () => {
  simParams = { ...defaultSim };
  displayParams = { ...defaultDisplay };
  pumpEnabled = true;
  rebuild();
  isPlaying = true;
  buttons.togglePlay.textContent = 'Pause';
  render();
});

for (const input of Object.values(inputs)) {
  input.addEventListener('change', () => {
    applyLiveInputs();
    render();
  });
}
displayInputs.playbackSpeed.addEventListener('change', () => {
  displayParams = readDisplayInputs();
  writeInputs();
  render();
});

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
        stepState(state, simParams, rng, pumpEnabled);
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
