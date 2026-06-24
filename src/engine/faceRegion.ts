import { PixelBuffer } from "./decode";
import { Rect, isSkin } from "./pixels";

export interface FaceRegion {
  rect: Rect; // bounding box in pixels
  confidence: number; // 0..1 — how face-like the localisation is
  found: boolean; // false => fell back to a centred crop
}

// Heuristic face localiser: build a coarse skin mask, take its bounding box
// (trimmed to the dense core to reject scattered skin pixels), and report a
// confidence from skin coverage. This is a deliberate fallback — when a native
// face detector is available (see mlkit.ts) its box supersedes this one.
export function estimateFaceRegion(buf: PixelBuffer): FaceRegion {
  const { data, width, height } = buf;
  const colCount = new Int32Array(width);
  const rowCount = new Int32Array(height);
  let skin = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (isSkin(data[i], data[i + 1], data[i + 2])) {
        colCount[x]++;
        rowCount[y]++;
        skin++;
      }
    }
  }
  const total = width * height;
  const coverage = skin / total;

  if (coverage < 0.02) {
    // No believable skin region — centre crop covering the typical portrait face.
    return {
      rect: {
        x: width * 0.25,
        y: height * 0.18,
        w: width * 0.5,
        h: height * 0.55,
      },
      confidence: 0.15,
      found: false,
    };
  }

  // Trim to the band where skin density is at least 25% of the column/row peak.
  const colThresh = Math.max(1, peak(colCount) * 0.25);
  const rowThresh = Math.max(1, peak(rowCount) * 0.25);
  const x0 = firstAbove(colCount, colThresh, false);
  const x1 = firstAbove(colCount, colThresh, true);
  const y0 = firstAbove(rowCount, rowThresh, false);
  const y1 = firstAbove(rowCount, rowThresh, true);
  const w = Math.max(8, x1 - x0);
  const h = Math.max(8, y1 - y0);

  // Confidence: reward moderate coverage (a face fills part of the frame, not
  // all of it) and a head-ish aspect ratio.
  const aspect = h / w;
  const aspectScore = 1 - Math.min(1, Math.abs(aspect - 1.25) / 1.25);
  const covScore =
    coverage > 0.06 && coverage < 0.55 ? 1 : coverage <= 0.06 ? coverage / 0.06 : 0.4;
  return {
    rect: { x: x0, y: y0, w, h },
    confidence: Math.max(0.2, 0.5 * aspectScore + 0.5 * covScore),
    found: true,
  };
}

function peak(a: Int32Array): number {
  let m = 0;
  for (let i = 0; i < a.length; i++) if (a[i] > m) m = a[i];
  return m;
}

function firstAbove(a: Int32Array, thresh: number, fromEnd: boolean): number {
  if (fromEnd) {
    for (let i = a.length - 1; i >= 0; i--) if (a[i] >= thresh) return i;
    return a.length - 1;
  }
  for (let i = 0; i < a.length; i++) if (a[i] >= thresh) return i;
  return 0;
}
