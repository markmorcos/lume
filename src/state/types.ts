export type Criterion =
  | "clarity"
  | "lightColour"
  | "proportion"
  | "eyeContact"
  | "smile"
  | "goodHairDay";

export const CRITERIA: Criterion[] = [
  "clarity",
  "lightColour",
  "proportion",
  "eyeContact",
  "smile",
  "goodHairDay",
];

export const CRITERION_LABEL: Record<Criterion, string> = {
  clarity: "Clarity",
  lightColour: "Light & colour",
  proportion: "Proportion",
  eyeContact: "Eye contact",
  smile: "Smile",
  goodHairDay: "Good hair day",
};

// Short label used during analysis progress copy ("Scoring expression…").
export const CRITERION_PHASE: Record<Criterion, string> = {
  clarity: "Reading clarity & sharpness",
  lightColour: "Reading light & colour",
  proportion: "Reading framing & proportion",
  eyeContact: "Scoring expression & eye contact",
  smile: "Scoring expression & smile",
  goodHairDay: "Reading the finishing touches",
};

export type Preset = "dating" | "linkedin" | "social" | "custom";

export interface Shot {
  id: string; // PHAsset.localIdentifier / picker asset id
  uri: string; // local file uri for display + decoding
  width?: number;
  height?: number;
  scores: Partial<Record<Criterion, number>>; // 0–10
  overall: number; // 0–100
  scored: boolean;
}

export type Route =
  | "empty"
  | "picker"
  | "criteria"
  | "analyzing"
  | "result";

export interface AnalyzeProgress {
  done: number;
  total: number;
  label: string; // e.g. "Scoring expression & eye contact"
}
