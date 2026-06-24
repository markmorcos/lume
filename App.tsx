import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./src/theme/ThemeContext";
import { SessionProvider } from "./src/state/SessionContext";
import { useAppFonts } from "./src/theme/fonts";
import { Root, LoadingGate } from "./src/Root";

export default function App() {
  const fontsLoaded = useAppFonts();
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {fontsLoaded ? (
          <SessionProvider>
            <Root />
          </SessionProvider>
        ) : (
          <LoadingGate />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
