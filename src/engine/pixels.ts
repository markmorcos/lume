import { PixelBuffer } from "./decode";

export interface Rect {
  x: number; // px
  y: number;
  w: number;
  h: number;
}

export const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

export const clamp01 = (v: number) => clamp(v, 0, 1);

// Map a raw measure to 0–10 with a smooth saturating curve centred on `mid`.
// `spread` controls how quickly it saturates. Deterministic, monotonic.
export function curve(value: number, mid: number, spread: number): number {
  const z = (value - mid) / spread;
  const s = 1 / (1 + Math.exp(-z)); // logistic 0..1
  return clamp(s * 10, 0, 10);
}

// Linear normalise into 0–10 between lo..hi (clamped).
export function ramp(value: number, lo: number, hi: number): number {
  if (hi === lo) return 5;
  return clamp(((value - lo) / (hi - lo)) * 10, 0, 10);
}

export function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Rec.601 grayscale of a sub-rectangle.
export function grayOfRect(buf: PixelBuffer, rect: Rect): Float32Array {
  const { data, width } = buf;
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(buf.width, Math.floor(rect.x + rect.w));
  const y1 = Math.min(buf.height, Math.floor(rect.y + rect.h));
  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);
  const out = new Float32Array(w * h);
  let k = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      out[k++] = luma(data[i], data[i + 1], data[i + 2]);
    }
  }
  return out;
}

export interface RectStats {
  meanLuma: number;
  meanR: number;
  meanG: number;
  meanB: number;
  stdLuma: number;
  count: number;
}

export function statsOfRect(buf: PixelBuffer, rect: Rect): RectStats {
  const { data, width } = buf;
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(buf.width, Math.floor(rect.x + rect.w));
  const y1 = Math.min(buf.height, Math.floor(rect.y + rect.h));
  let sr = 0,
    sg = 0,
    sb = 0,
    sl = 0,
    sl2 = 0,
    n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      const l = luma(r, g, b);
      sr += r;
      sg += g;
      sb += b;
      sl += l;
      sl2 += l * l;
      n++;
    }
  }
  if (n === 0)
    return { meanLuma: 0, meanR: 0, meanG: 0, meanB: 0, stdLuma: 0, count: 0 };
  const meanLuma = sl / n;
  return {
    meanLuma,
    meanR: sr / n,
    meanG: sg / n,
    meanB: sb / n,
    stdLuma: Math.sqrt(Math.max(0, sl2 / n - meanLuma * meanLuma)),
    count: n,
  };
}

// Variance of a discrete Laplacian over a grayscale patch — classic blur/edge
// energy measure. High variance => sharp; low => blurry.
export function laplacianVariance(
  gray: Float32Array,
  w: number,
  h: number
): number {
  if (w < 3 || h < 3) return 0;
  let sum = 0,
    sum2 = 0,
    n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap =
        gray[i - 1] +
        gray[i + 1] +
        gray[i - w] +
        gray[i + w] -
        4 * gray[i];
      sum += lap;
      sum2 += lap * lap;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return sum2 / n - mean * mean;
}

// Average gradient magnitude (Sobel-ish) over a grayscale patch — tidiness /
// edge-density proxy used by the hair heuristic.
export function edgeDensity(
  gray: Float32Array,
  w: number,
  h: number
): number {
  if (w < 3 || h < 3) return 0;
  let sum = 0,
    n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = gray[i + 1] - gray[i - 1];
      const gy = gray[i + w] - gray[i - w];
      sum += Math.sqrt(gx * gx + gy * gy);
      n++;
    }
  }
  return n ? sum / n : 0;
}

// Simple skin-tone test in RGB. Tuned to be permissive across tones; used only
// to localise a face region, not to judge anything.
export function isSkin(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (
    r > 60 &&
    g > 30 &&
    b > 15 &&
    r > g &&
    g >= b * 0.7 &&
    r - min > 12 &&
    max - min > 12 &&
    Math.abs(r - g) > 8
  );
}
