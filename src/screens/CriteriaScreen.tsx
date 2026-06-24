import React from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Screen } from "../components/Screen";
import {
  Display,
  Body,
  Kicker,
  PrimaryButton,
  GhostButton,
} from "../components/ui";
import { useTheme } from "../theme/ThemeContext";
import { useSession } from "../state/SessionContext";
import { PRESETS } from "../state/presets";
import { Criterion, CRITERION_LABEL } from "../state/types";

// The five fine-tune toggles named in the spec (§4).
const TUNABLE: Criterion[] = [
  "eyeContact",
  "smile",
  "goodHairDay",
  "clarity",
  "proportion",
];

export function CriteriaScreen() {
  const t = useTheme();
  const { goTo, preset, choosePreset, disabled, toggleCriterion, analyze, assets } =
    useSession();

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: 24, paddingTop: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
          <GhostButton label="‹ Back" onPress={() => goTo("picker")} />
          <Body size={13} dim>
            {assets.length} selected
          </Body>
        </View>
        <Kicker>step 2 of 2 · intent</Kicker>
        <Display size={40} style={{ marginTop: 10 }}>
          What&apos;s this{"\n"}shot for?
        </Display>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 12 }}>
          {PRESETS.map((p, i) => {
            const active = preset === p.id;
            return (
              <Pressable
                key={p.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => choosePreset(p.id)}
                style={{
                  borderWidth: 1,
                  borderColor: active ? t.colors.accent : t.colors.hairline,
                  backgroundColor: active ? "rgba(124,92,255,0.12)" : t.colors.inkSoft,
                  borderRadius: t.radius.md,
                  padding: 18,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <Body
                  size={12}
                  color={active ? t.colors.accentSoft : t.colors.textOnInkDim}
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {String(i + 1).padStart(2, "0")}
                </Body>
                <View style={{ flex: 1 }}>
                  <Display size={24} style={{ marginBottom: 4 }}>
                    {p.title}
                  </Display>
                  <Body size={13} dim>
                    {p.blurb}
                  </Body>
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: active ? t.colors.accent : t.colors.textOnInkDim,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {active ? (
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: t.colors.accent,
                      }}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: 32 }}>
          <Kicker>fine-tune</Kicker>
          <Body size={13} dim style={{ marginTop: 6, marginBottom: 16 }}>
            Switch a criterion off to drop it from the score entirely.
          </Body>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {TUNABLE.map((c) => {
              const on = !disabled.has(c);
              return (
                <Pressable
                  key={c}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={CRITERION_LABEL[c]}
                  onPress={() => toggleCriterion(c)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: t.radius.pill,
                    borderWidth: 1,
                    borderColor: on ? t.colors.accent : t.colors.hairline,
                    backgroundColor: on ? "rgba(124,92,255,0.14)" : "transparent",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: on ? t.colors.accent : t.colors.textOnInkDim,
                    }}
                  />
                  <Body size={14} color={on ? t.colors.textOnInk : t.colors.textOnInkDim}>
                    {CRITERION_LABEL[c]}
                  </Body>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 24,
          paddingTop: 14,
          paddingBottom: 34,
          backgroundColor: t.colors.ink,
          borderTopWidth: 1,
          borderTopColor: t.colors.hairline,
        }}
      >
        <PrimaryButton label="Find the best" trailing="↗" onPress={() => analyze()} />
      </View>
    </Screen>
  );
}
