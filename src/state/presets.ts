import { Criterion, Preset } from "./types";

export type WeightMap = Record<Criterion, number>;

// Initial weight tables from the handoff §6. Tune in calibration (§10).
export const PRESET_WEIGHTS: Record<Exclude<Preset, "custom">, WeightMap> = {
  dating: {
    smile: 3,
    eyeContact: 3,
    lightColour: 2, // warmth
    clarity: 1,
    proportion: 1,
    goodHairDay: 1,
  },
  linkedin: {
    smile: 1,
    eyeContact: 2,
    lightColour: 1,
    clarity: 3,
    proportion: 3, // composure
    goodHairDay: 1,
  },
  social: {
    smile: 1,
    eyeContact: 1,
    lightColour: 3,
    clarity: 1,
    proportion: 1,
    goodHairDay: 2,
  },
};

export interface PresetMeta {
  id: Exclude<Preset, "custom">;
  title: string;
  blurb: string; // the "smile · eye contact · warmth" line
}

export const PRESETS: PresetMeta[] = [
  { id: "dating", title: "Dating", blurb: "smile · eye contact · warmth" },
  {
    id: "linkedin",
    title: "LinkedIn",
    blurb: "clarity · proportion · composure",
  },
  { id: "social", title: "Social", blurb: "light & colour · good hair day" },
];

export function weightsForPreset(preset: Exclude<Preset, "custom">): WeightMap {
  return { ...PRESET_WEIGHTS[preset] };
}
