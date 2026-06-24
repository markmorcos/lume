import { PixelBuffer } from "./decode";
import { FaceRegion } from "./faceRegion";
import { MLFace } from "./faceDetect";
import { Criterion } from "../state/types";
import {
  Rect,
  clamp,
  clamp01,
  curve,
  ramp,
  grayOfRect,
  statsOfRect,
  laplacianVariance,
  edgeDensity,
} from "./pixels";

// Sub-rectangles of a face box, in face-relative fractions.
function sub(face: Rect, fx: number, fy: number, fw: number, fh: number): Rect {
  return {
    x: face.x + face.w * fx,
    y: face.y + face.h * fy,
    w: face.w * fw,
    h: face.h * fh,
  };
}

// CLARITY — Laplacian variance (edge energy) on the face crop. Sharp faces
// carry high-frequency detail; blur collapses it.
export function scoreClarity(buf: PixelBuffer, face: FaceRegion): number {
  const r = face.rect;
  const gray = grayOfRect(buf, r);
  const w = Math.max(1, Math.min(buf.width, Math.floor(r.w)));
  const h = Math.max(1, Math.floor(gray.length / w));
  const v = laplacianVariance(gray, w, h);
  // Normalise relative to face size (more pixels => more absolute energy).
  const norm = v / Math.max(1, Math.sqrt(gray.length) / 40);
  return curve(Math.log10(1 + norm), 1.6, 0.5);
}

// LIGHT & COLOUR — exposure (mid-tone target), dynamic range (contrast),
// white balance (channel neutrality) and skin luminance health, on the face.
export function scoreLightColour(buf: PixelBuffer, face: FaceRegion): number {
  const s = statsOfRect(buf, face.rect);
  // Exposure: peak at ~135 luma, falls off toward crushed/blown.
  const exposure = 1 - Math.min(1, Math.abs(s.meanLuma - 135) / 110);
  // Dynamic range: some spread is good, flat is dull, extreme is harsh.
  const dr = clamp01(s.stdLuma / 60);
  const drScore = dr < 0.85 ? dr / 0.85 : 1 - (dr - 0.85) / 0.4;
  // White balance: penalise a strong colour cast (channels far from mean).
  const mean = (s.meanR + s.meanG + s.meanB) / 3 || 1;
  const cast =
    (Math.abs(s.meanR - mean) +
      Math.abs(s.meanG - mean) +
      Math.abs(s.meanB - mean)) /
    (3 * mean);
  const wb = clamp01(1 - cast * 2.2);
  // Warmth bonus: gentle skin warmth (R slightly over B) reads flattering.
  const warmth = clamp01((s.meanR - s.meanB) / 60);
  const combined =
    0.4 * exposure + 0.25 * clamp01(drScore) + 0.25 * wb + 0.1 * warmth;
  return clamp(combined * 10, 0, 10);
}

// PROPORTION / FRAMING — head pose + how well the face sits on the rule-of-
// thirds and fills the frame. Uses ML head angles when present.
export function scoreProportion(
  buf: PixelBuffer,
  face: FaceRegion,
  ml: MLFace | null
): number {
  const r = face.rect;
  const cx = (r.x + r.w / 2) / buf.width;
  const cy = (r.y + r.h / 2) / buf.height;
  // Horizontal: centred or on a third both read intentional.
  const hTargets = [0.5, 0.333, 0.667];
  const hErr = Math.min(...hTargets.map((t) => Math.abs(cx - t)));
  const hScore = 1 - Math.min(1, hErr / 0.25);
  // Vertical: eyes/face slightly above centre is the portrait sweet spot.
  const vErr = Math.abs(cy - 0.42);
  const vScore = 1 - Math.min(1, vErr / 0.3);
  // Fill: face should occupy a healthy fraction of the height.
  const fill = r.h / buf.height;
  const fillScore =
    fill < 0.4 ? fill / 0.4 : fill > 0.85 ? 1 - (fill - 0.85) / 0.3 : 1;
  // Pose: frontal is strongest. From ML yaw/roll if present, else aspect proxy.
  let poseScore: number;
  if (ml && (ml.yaw != null || ml.roll != null)) {
    const yaw = Math.abs(ml.yaw ?? 0);
    const roll = Math.abs(ml.roll ?? 0);
    poseScore = clamp01(1 - yaw / 45) * 0.6 + clamp01(1 - roll / 30) * 0.4;
  } else {
    const aspect = r.h / Math.max(1, r.w);
    poseScore = 1 - Math.min(1, Math.abs(aspect - 1.25) / 1.1);
  }
  const combined =
    0.3 * hScore + 0.2 * vScore + 0.2 * clamp01(fillScore) + 0.3 * poseScore;
  return clamp(combined * 10, 0, 10) * confWeight(face);
}

// EYE CONTACT — ML eye-open probability when available; otherwise the contrast
// energy of the upper-face (eye band) as an openness/engagement proxy.
export function scoreEyeContact(
  buf: PixelBuffer,
  face: FaceRegion,
  ml: MLFace | null
): number {
  if (ml && ml.leftEyeOpenProbability != null && ml.rightEyeOpenProbability != null) {
    const open = (ml.leftEyeOpenProbability + ml.rightEyeOpenProbability) / 2;
    const frontal =
      ml.yaw != null ? clamp01(1 - Math.abs(ml.yaw) / 35) : 1;
    return clamp(open * frontal * 10, 0, 10);
  }
  const band = sub(face.rect, 0.12, 0.24, 0.76, 0.26);
  const gray = grayOfRect(buf, band);
  const w = Math.max(1, Math.floor(band.w));
  const h = Math.max(1, Math.floor(gray.length / w));
  const ed = edgeDensity(gray, w, h); // eyes add local contrast
  const st = statsOfRect(buf, band);
  // Open, lit eyes => moderate-high edge density + reasonable brightness.
  const edScore = curve(ed, 9, 4);
  const litScore = ramp(st.meanLuma, 40, 150) / 10;
  return clamp((0.7 * edScore + 0.3 * litScore * 10), 0, 10) * confWeight(face);
}

// SMILE — ML smiling probability when available; otherwise brightness/contrast
// of the mouth region (visible teeth + cheek lift raise local energy).
export function scoreSmile(
  buf: PixelBuffer,
  face: FaceRegion,
  ml: MLFace | null
): number {
  if (ml && ml.smilingProbability != null) {
    return clamp(ml.smilingProbability * 10, 0, 10);
  }
  const mouth = sub(face.rect, 0.2, 0.62, 0.6, 0.26);
  const gray = grayOfRect(buf, mouth);
  const w = Math.max(1, Math.floor(mouth.w));
  const h = Math.max(1, Math.floor(gray.length / w));
  const ed = edgeDensity(gray, w, h);
  const st = statsOfRect(buf, mouth);
  // Bright spots (teeth) + horizontal contrast correlate with an open smile.
  const bright = ramp(st.meanLuma, 60, 170) / 10;
  const edScore = curve(ed, 11, 5);
  return clamp(0.55 * edScore + 0.45 * bright * 10, 0, 10) * confWeight(face);
}

// GOOD-HAIR-DAY — the fuzzy one (§5/§12). Heuristic v1: in the hair band above
// and around the crown, reward defined-but-not-chaotic edges (tidy, glossy) and
// even tonality (no flyaway noise). Capped influence; honest stub.
export function scoreGoodHairDay(buf: PixelBuffer, face: FaceRegion): number {
  const r = face.rect;
  const band: Rect = {
    x: r.x - r.w * 0.15,
    y: r.y - r.h * 0.45,
    w: r.w * 1.3,
    h: r.h * 0.6,
  };
  const gray = grayOfRect(buf, band);
  if (gray.length < 16) return 5; // not enough headroom in frame; neutral
  const w = Math.max(1, Math.floor(band.w));
  const h = Math.max(1, Math.floor(gray.length / w));
  const ed = edgeDensity(gray, w, h);
  const st = statsOfRect(buf, band);
  // Sweet spot of structure: some shine/definition, penalise flat or frizzy.
  const structure =
    ed < 14 ? ed / 14 : ed > 30 ? clamp01(1 - (ed - 30) / 30) : 1;
  // Even tonality: very high local std reads as messy/noisy.
  const evenness = clamp01(1 - Math.max(0, st.stdLuma - 28) / 50);
  return clamp((0.6 * structure + 0.4 * evenness) * 10, 0, 10);
}

// Down-weight everything that depends on a confident face localisation, so a
// missed/centre-cropped face doesn't produce overconfident face-criteria.
function confWeight(face: FaceRegion): number {
  return 0.6 + 0.4 * clamp01(face.confidence);
}

export function scoreAll(
  buf: PixelBuffer,
  face: FaceRegion,
  ml: MLFace | null
): Record<Criterion, number> {
  return {
    clarity: round1(scoreClarity(buf, face)),
    lightColour: round1(scoreLightColour(buf, face)),
    proportion: round1(scoreProportion(buf, face, ml)),
    eyeContact: round1(scoreEyeContact(buf, face, ml)),
    smile: round1(scoreSmile(buf, face, ml)),
    goodHairDay: round1(scoreGoodHairDay(buf, face)),
  };
}

const round1 = (v: number) => Math.round(clamp(v, 0, 10) * 10) / 10;
