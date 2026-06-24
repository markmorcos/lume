import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useSession } from "./state/SessionContext";
import { useTheme } from "./theme/ThemeContext";
import { EmptyScreen } from "./screens/EmptyScreen";
import { PickerScreen } from "./screens/PickerScreen";
import { CriteriaScreen } from "./screens/CriteriaScreen";
import { AnalyzingScreen } from "./screens/AnalyzingScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { PaywallScreen } from "./screens/PaywallScreen";
import { track } from "./state/analytics";

// Single-screen router driven by the §7 state machine; paywall floats over all.
export function Root() {
  const { route } = useSession();

  useEffect(() => {
    track("app_open");
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {route === "empty" && <EmptyScreen />}
      {route === "picker" && <PickerScreen />}
      {route === "criteria" && <CriteriaScreen />}
      {route === "analyzing" && <AnalyzingScreen />}
      {route === "result" && <ResultScreen />}
      <PaywallScreen />
    </View>
  );
}

export function LoadingGate() {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.colors.ink,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator color={t.colors.accent} />
    </View>
  );
}
