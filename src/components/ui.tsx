import React from "react";
import {
  Text,
  TextProps,
  View,
  ViewProps,
  Pressable,
  PressableProps,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme/ThemeContext";

// Mono numbered kicker — "01 ·  WHAT'S THIS SHOT FOR".
export function Kicker({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <Text
      style={{
        fontFamily: t.fonts.mono,
        color: t.colors.textOnInkDim,
        letterSpacing: 2,
        fontSize: 11,
        textTransform: "uppercase",
      }}
    >
      {children}
    </Text>
  );
}

// Oversized editorial serif — the hero questions and scores.
export function Display({
  children,
  size = 40,
  color,
  style,
  ...rest
}: TextProps & { size?: number; color?: string }) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: t.fonts.display,
          color: color ?? t.colors.textOnInk,
          fontSize: size,
          lineHeight: size * 1.04,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Body({
  children,
  size = 16,
  dim,
  color,
  style,
  ...rest
}: TextProps & { size?: number; dim?: boolean; color?: string }) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: t.fonts.body,
          color: color ?? (dim ? t.colors.textOnInkDim : t.colors.textOnInk),
          fontSize: size,
          lineHeight: size * 1.4,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  trailing,
  style,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  trailing?: string;
  style?: ViewProps["style"];
}) {
  const t = useTheme();
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off }}
      disabled={off}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          backgroundColor: off ? t.colors.paperDim : t.colors.paper,
          opacity: off ? 0.5 : pressed ? 0.85 : 1,
          borderRadius: t.radius.pill,
          paddingVertical: 18,
          paddingHorizontal: 28,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={t.colors.ink} />
      ) : (
        <Text
          style={{
            fontFamily: t.fonts.body,
            color: t.colors.ink,
            fontSize: 17,
            fontWeight: "600",
            letterSpacing: 0.3,
          }}
        >
          {label}
          {trailing ? <Text style={{ fontSize: 17 }}>{`  ${trailing}`}</Text> : null}
        </Text>
      )}
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  color,
}: {
  label: string;
  onPress?: () => void;
  color?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Text
        style={{
          fontFamily: t.fonts.body,
          color: color ?? t.colors.textOnInkDim,
          fontSize: 15,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Hairline(props: ViewProps) {
  const t = useTheme();
  return (
    <View
      {...props}
      style={[{ height: StyleSheet.hairlineWidth, backgroundColor: t.colors.hairline }, props.style]}
    />
  );
}

// Brand lockup: LUMÉ · MODE.
export function BrandBar({ mode = "PORTRAIT" }: { mode?: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
      <Display size={26} style={{ letterSpacing: 1 }}>
        LUMÉ
      </Display>
      <Text
        style={{
          fontFamily: t.fonts.mono,
          color: t.colors.textOnInkDim,
          letterSpacing: 3,
          fontSize: 11,
        }}
      >
        {mode}
      </Text>
    </View>
  );
}
