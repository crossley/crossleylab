export const MAX_PARTICLES = 5000;
export const DEFAULT_NUM_PARTICLES = 3000;
export const DEFAULT_DIFFUSION_SD = 0.25;
export const DEFAULT_POTENTIAL_SCALE = 26;
export const DEFAULT_CHARGE_WALL_INSET = 2;

export const SIM_COLORS = {
  particle: 'rgba(245, 178, 72, 0.92)',
  ionA: 'rgba(245, 178, 72, 0.92)',
  ionB: 'rgba(66, 200, 255, 0.92)',
  ionC: 'rgba(114, 255, 178, 0.92)',
  outsideTrace: '#42c8ff',
  insideTrace: '#72ffb2',
  ionATrace: '#f5b248',
  ionBTrace: '#42c8ff',
  ionCTrace: '#72ffb2',
  totalTrace: '#c68dff',
  predictionTrace: '#f2f5fb',
  channelFill: 'rgba(159, 255, 106, 0.12)',
  membraneFill: 'rgba(200, 220, 255, 0.08)',
  membraneStroke: 'rgba(190, 225, 255, 0.48)',
  fieldNegative: 'rgba(255, 111, 143, 0.92)',
  fieldPositive: 'rgba(143, 178, 255, 0.92)'
} as const;

type ChannelBandPx = {
  top: number;
  bottom: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function fitWidthsToHeight(widths: number[], boxHeight: number, padding = 4): number[] {
  const maxTotal = Math.max(0.5 * widths.length, boxHeight - 2 * padding);
  const clamped = widths.map((width) => clamp(width, 0.5, boxHeight - 2 * padding));
  const total = clamped.reduce((sum, width) => sum + width, 0);
  if (total <= maxTotal || total <= Number.EPSILON) return clamped;
  const scale = maxTotal / total;
  return clamped.map((width) => Math.max(0.5, width * scale));
}

export function centeredChannelBounds(channelWidth: number, boxHeight: number): [number, number] {
  const width = clamp(channelWidth, 0.5, boxHeight - 2);
  const half = width / 2;
  return [-half, half];
}

export function evenlySpacedChannelBounds(channelWidths: number[], boxHeight: number, padding = 4): Array<[number, number]> {
  const widths = fitWidthsToHeight(channelWidths, boxHeight, padding);
  const usableGap = Math.max(0, boxHeight - 2 * padding - widths.reduce((sum, width) => sum + width, 0));
  const gap = usableGap / (widths.length + 1);
  const halfH = boxHeight / 2;
  let cursor = halfH - padding - gap;

  return widths.map((width) => {
    const yMax = cursor;
    const yMin = yMax - width;
    cursor = yMin - gap;
    return [yMin, yMax];
  });
}

export function pointFieldDrift(dx: number, dy: number, sourceStrength: number, particleCharge = 1): [number, number] {
  // Softened inverse-square field: F ~ r / (r^2 + eps^2)^(3/2)
  const softening = 2;
  const r2 = dx * dx + dy * dy + softening * softening;
  const scale = (-sourceStrength * particleCharge) / (r2 * Math.sqrt(r2));
  return [scale * dx, scale * dy];
}

export function wallFieldDrift(dx: number, sourceStrength: number, particleCharge = 1): number {
  // 1D softened inverse-square along x: F ~ sign(dx) / (|dx|^2 + eps^2)
  const softening = 2;
  const r2 = dx * dx + softening * softening;
  return (-sourceStrength * particleCharge * dx) / (r2 * Math.sqrt(r2));
}

export function leftEdgeChargeWallX(boxWidth: number, inset = DEFAULT_CHARGE_WALL_INSET): number {
  return -boxWidth / 2 + clamp(inset, 0.5, Math.max(0.5, boxWidth - 1));
}

export function fieldColor(sourceStrength: number): string {
  return sourceStrength < 0 ? SIM_COLORS.fieldNegative : SIM_COLORS.fieldPositive;
}

export function fieldSignLabel(sourceStrength: number, negativeLabel: string, positiveLabel: string): string {
  return sourceStrength < 0 ? negativeLabel : positiveLabel;
}

export function drawMembraneWall(
  ctx: CanvasRenderingContext2D,
  params: {
    leftX: number;
    rightX: number;
    height: number;
    dpr: number;
    channels?: ChannelBandPx[];
  }
): void {
  const left = Math.min(params.leftX, params.rightX);
  const right = Math.max(params.leftX, params.rightX);
  const height = params.height;
  const width = Math.max(1, right - left);
  const channels = (params.channels ?? [])
    .map(({ top, bottom }) => ({
      top: clamp(Math.min(top, bottom), 0, height),
      bottom: clamp(Math.max(top, bottom), 0, height)
    }))
    .filter((band) => band.bottom - band.top >= 0.5)
    .sort((a, b) => a.top - b.top);

  ctx.fillStyle = SIM_COLORS.membraneFill;
  ctx.fillRect(left, 0, width, height);

  ctx.fillStyle = SIM_COLORS.channelFill;
  for (const band of channels) {
    ctx.fillRect(left, band.top, width, band.bottom - band.top);
  }

  ctx.strokeStyle = SIM_COLORS.membraneStroke;
  ctx.lineWidth = 1.5 * params.dpr;

  for (const x of [left, right]) {
    let cursor = 0;
    for (const band of channels) {
      if (band.top > cursor) {
        ctx.beginPath();
        ctx.moveTo(x, cursor);
        ctx.lineTo(x, band.top);
        ctx.stroke();
      }
      cursor = Math.max(cursor, band.bottom);
    }
    if (cursor < height) {
      ctx.beginPath();
      ctx.moveTo(x, cursor);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }

  ctx.beginPath();
  ctx.moveTo(left, 0);
  ctx.lineTo(right, 0);
  ctx.moveTo(left, height);
  ctx.lineTo(right, height);
  for (const band of channels) {
    ctx.moveTo(left, band.top);
    ctx.lineTo(right, band.top);
    ctx.moveTo(left, band.bottom);
    ctx.lineTo(right, band.bottom);
  }
  ctx.stroke();
}
