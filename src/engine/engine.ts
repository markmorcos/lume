import { Criterion, CRITERION_PHASE } from "../state/types";
import { loadPixels } from "./decode";
import { estimateFaceRegion } from "./faceRegion";
import { detectFace } from "./faceDetect";
import { scoreAll } from "./scorers";

export interface RawScoredShot {
  id: string;
  scores: Record<Criterion, number>;
}

export interface ScoreInput {
  id: string;
  uri: string;
}

export interface ProgressEvent {
  done: number;
  total: number;
  label: string;
}

// Progress copy cycles through the face-dependent criteria to mirror the live
// "Scoring expression & eye contact · 5 / 8" UI without lying about order.
const PHASE_CYCLE: Criterion[] = [
  "clarity",
  "lightColour",
  "eyeContact",
  "smile",
  "proportion",
  "goodHairDay",
];

// Score a batch on-device. Runs sequentially with a yield between images so the
// UI thread can paint progress; deterministic given the same inputs.
export async function scoreBatch(
  inputs: ScoreInput[],
  onProgress: (e: ProgressEvent) => void
): Promise<RawScoredShot[]> {
  const out: RawScoredShot[] = [];
  const total = inputs.length;
  for (let i = 0; i < total; i++) {
    const input = inputs[i];
    const label =
      CRITERION_PHASE[PHASE_CYCLE[i % PHASE_CYCLE.length]] ?? "Reading the room";
    onProgress({ done: i, total, label });
    try {
      const buf = await loadPixels(input.uri);
      const fallback = estimateFaceRegion(buf);
      const { region, ml } = await detectFace(buf, input.uri, fallback);
      const scores = scoreAll(buf, region, ml);
      out.push({ id: input.id, scores });
    } catch {
      // A single unreadable asset shouldn't sink the batch — neutral scores.
      out.push({
        id: input.id,
        scores: {
          clarity: 5,
          lightColour: 5,
          proportion: 5,
          eyeContact: 5,
          smile: 5,
          goodHairDay: 5,
        },
      });
    }
    // Yield to the event loop so progress renders between heavy decodes.
    await new Promise((r) => setTimeout(r, 0));
  }
  onProgress({ done: total, total, label: "Polishing the shortlist" });
  return out;
}
