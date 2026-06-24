// Swappable theme token bundle. Atelier ships first; Spotlight / ContactSheet
// can be added later as re-skins without touching flow or engine code.

export type ThemeId = "atelier" | "spotlight" | "contactSheet";

export interface ThemeColors {
  ink: string; // primary background
  inkSoft: string; // raised ink surface
  accent: string;
  accentSoft: string;
  paper: string; // light surface
  paperDim: string;
  textOnInk: string;
  textOnInkDim: string;
  textOnPaper: string;
  textOnPaperDim: string;
  hairline: string;
  good: string;
  warn: string;
  lock: string;
}

export interface ThemeFonts {
  display: string; // serif headlines + scores
  body: string; // UI / body
  mono: string; // kickers, meta labels
}

export interface ThemeRadius {
  sm: number;
  md: number;
  lg: number;
  pill: number;
}

export interface Theme {
  id: ThemeId;
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  radius: ThemeRadius;
  // 8pt-ish spacing scale
  space: (n: number) => number;
}

const baseSpace = (n: number) => n * 8;

export const atelier: Theme = {
  id: "atelier",
  name: "Atelier",
  colors: {
    ink: "#0b0b0f",
    inkSoft: "#16161d",
    accent: "#7c5cff",
    accentSoft: "#a392ff",
    paper: "#f4f2ee",
    paperDim: "#e7e5df",
    textOnInk: "#f4f2ee",
    textOnInkDim: "#9b9aa3",
    textOnPaper: "#0b0b0f",
    textOnPaperDim: "#6c6a64",
    hairline: "rgba(244,242,238,0.12)",
    good: "#8fe39a",
    warn: "#ffcf6b",
    lock: "#6c6a72",
  },
  fonts: {
    display: "BodoniModa_500Medium",
    body: "Archivo_400Regular",
    mono: "SpaceMono_400Regular",
  },
  radius: { sm: 8, md: 14, lg: 24, pill: 999 },
  space: baseSpace,
};

export const themes: Record<ThemeId, Theme> = {
  atelier,
  // Placeholders so the picker compiles; only Atelier is wired for GTM.
  spotlight: { ...atelier, id: "spotlight", name: "Spotlight" },
  contactSheet: { ...atelier, id: "contactSheet", name: "Contact Sheet" },
};

export const defaultTheme = atelier;
