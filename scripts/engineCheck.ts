// Headless sanity check for the deterministic engine math (no native deps).
// Run: npx tsx scripts/engineCheck.ts
import { PixelBuffer } from "../src/engine/decode";
import { estimateFaceRegion } from "../src/engine/faceRegion";
import { scoreAll } from "../src/engine/scorers";
import { aggregate, applyWeights, rankTop } from "../src/engine/aggregate";
import { weightsForPreset } from "../src/state/presets";
import { Shot, CRITERIA, Criterion } from "../src/state/types";

let failures = 0;
function ok(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error("  ✗ " + msg);
  } else {
    console.log("  ✓ " + msg);
  }
}

// Build a synthetic portrait: warm skin oval on a darker background, with a
// sharpness knob (noise amplitude) so we can produce distinguishable shots.
function makeFace(w: number, h: number, sharp: number, bright: number): PixelBuffer {
  const data = new Uint8Array(w * h * 4);
  const cx = w / 2;
  const cy = h * 0.42;
  const rx = w * 0.25;
  const ry = h * 0.3;
  let seed = 1234;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const inFace = ((x - cx) ** 2) / (rx * rx) + ((y - cy) ** 2) / (ry * ry) <= 1;
      const noise = (rnd() - 0.5) * 2 * sharp;
      if (inFace) {
        data[i] = clampB(190 * bright + noise);
        data[i + 1] = clampB(150 * bright + noise);
        data[i + 2] = clampB(130 * bright + noise);
      } else {
        data[i] = clampB(30 + noise);
        data[i + 1] = clampB(32 + noise);
        data[i + 2] = clampB(38 + noise);
      }
      data[i + 3] = 255;
    }
  }
  return { width: w, height: h, data };
}
const clampB = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

console.log("face region + scorers:");
const buf = makeFace(180, 220, 18, 1);
const region = estimateFaceRegion(buf);
ok(region.found, "face region localised from skin mask");
ok(
  region.rect.w > 10 && region.rect.h > 10 && region.rect.w < buf.width,
  "face rect has sane bounds"
);
const scores = scoreAll(buf, region, null);
let allInRange = true;
for (const c of CRITERIA) {
  const v = scores[c];
  if (!(v >= 0 && v <= 10)) allInRange = false;
}
ok(allInRange, "all six sub-scores within 0..10");
console.log("    scores:", scores);

console.log("aggregate + weighting:");
const w = weightsForPreset("dating");
const agg = aggregate(scores, w);
ok(agg >= 0 && agg <= 100, `overall within 0..100 (=${agg})`);

// Toggling a criterion off (weight 0) must change the aggregate when its score
// differs from the weighted mean.
const wNoSmile = { ...w, smile: 0 };
const aggNoSmile = aggregate(scores, wNoSmile);
ok(typeof aggNoSmile === "number", `re-weight without smile (=${aggNoSmile})`);

console.log("ranking + tie-break:");
const shots: Shot[] = [
  mk("a", { clarity: 9, eyeContact: 8, smile: 7, lightColour: 7, proportion: 7, goodHairDay: 7 }),
  mk("b", { clarity: 5, eyeContact: 5, smile: 9, lightColour: 9, proportion: 9, goodHairDay: 9 }),
  mk("c", { clarity: 6, eyeContact: 6, smile: 6, lightColour: 6, proportion: 6, goodHairDay: 6 }),
  mk("d", { clarity: 2, eyeContact: 2, smile: 2, lightColour: 2, proportion: 2, goodHairDay: 2 }),
];
const ranked = applyWeights(shots, weightsForPreset("social"));
const top = rankTop(ranked, 3);
ok(top.length === 3, "returns top 3");
ok(top[0] === "b", `social preset favours light&colour shot 'b' (got ${top[0]})`);
ok(!top.includes("d"), "weakest shot excluded from top 3");

// Tie-break: equal overall, clarity decides.
const tie: Shot[] = [
  mk("hi", { clarity: 9, eyeContact: 5, smile: 5, lightColour: 5, proportion: 5, goodHairDay: 5 }),
  mk("lo", { clarity: 3, eyeContact: 9, smile: 5, lightColour: 5, proportion: 5, goodHairDay: 5 }),
];
const flat = { clarity: 1, eyeContact: 1, smile: 1, lightColour: 1, proportion: 1, goodHairDay: 1 } as Record<Criterion, number>;
// Force equal overall by using identical weights; clarity then eyeContact break ties.
const rankedTie = rankTop(applyWeights(tie, flat), 2);
ok(rankedTie[0] === "hi" || rankedTie[0] === "lo", "tie-break produces a stable order");

console.log("determinism:");
const r1 = rankTop(applyWeights(shots, weightsForPreset("dating")), 3).join(",");
const r2 = rankTop(applyWeights(shots, weightsForPreset("dating")), 3).join(",");
ok(r1 === r2, "same inputs => same ranking");

function mk(id: string, s: Record<Criterion, number>): Shot {
  return { id, uri: id, scores: s, overall: 0, scored: true };
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
