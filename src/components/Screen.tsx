import React from "react";
import { View, ViewProps } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../theme/ThemeContext";

export function Screen({
  children,
  edges = ["top", "bottom"],
  padded = true,
  style,
}: {
  children: React.ReactNode;
  edges?: Edge[];
  padded?: boolean;
  style?: ViewProps["style"];
}) {
  const t = useTheme();
  return (
    <SafeAreaView
      edges={edges}
      style={{ flex: 1, backgroundColor: t.colors.ink }}
    >
      <StatusBar style="light" />
      <View
        style={[
          { flex: 1, paddingHorizontal: padded ? 24 : 0 },
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
