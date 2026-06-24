import React, { createContext, useContext, useMemo, useState } from "react";
import { Theme, ThemeId, themes, defaultTheme } from "./tokens";

interface ThemeCtx {
  theme: Theme;
  setThemeId: (id: ThemeId) => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: defaultTheme,
  setThemeId: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [id, setThemeId] = useState<ThemeId>(defaultTheme.id);
  const value = useMemo(
    () => ({ theme: themes[id], setThemeId }),
    [id]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx).theme;
export const useThemeControls = () => useContext(Ctx);
