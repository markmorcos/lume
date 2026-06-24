import { Criterion, CRITERIA, Shot } from "../state/types";
import { WeightMap } from "../state/presets";

// overall = round(100 × Σ(wᵢ·sᵢ) / Σwᵢ / 10).  Toggles set a weight to 0.
export function aggregate(
  scores: Partial<Record<Criterion, number>>,
  weights: WeightMap
): number {
  let num = 0;
  let den = 0;
  for (const c of CRITERIA) {
    const w = weights[c] ?? 0;
    const s = scores[c];
    if (w <= 0 || s == null) continue;
    num += w * s;
    den += w;
  }
  if (den === 0) return 0;
  return Math.round((100 * num) / den / 10);
}

// Recompute every shot's overall against the current weights, then rank.
export function applyWeights(shots: Shot[], weights: WeightMap): Shot[] {
  return shots.map((s) => ({ ...s, overall: aggregate(s.scores, weights) }));
}

// Top-3 ids, ranked. Tie-break: clarity → eye contact (§5).
export function rankTop(shots: Shot[], n = 3): string[] {
  const sorted = [...shots].sort((a, b) => {
    if (b.overall !== a.overall) return b.overall - a.overall;
    const ca = a.scores.clarity ?? 0;
    const cb = b.scores.clarity ?? 0;
    if (cb !== ca) return cb - ca;
    const ea = a.scores.eyeContact ?? 0;
    const eb = b.scores.eyeContact ?? 0;
    return eb - ea;
  });
  return sorted.slice(0, n).map((s) => s.id);
}
