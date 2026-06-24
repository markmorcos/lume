import React, { useState } from "react";
import { View, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library/legacy";
import * as Haptics from "expo-haptics";
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
import { Shot, Criterion, CRITERION_LABEL } from "../state/types";
import { track } from "../state/analytics";

const ALBUM = "LUMÉ Picks";

export function ResultScreen() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const { top, shotById, shots, weights, isPremium, openPaywall, reset } =
    useSession();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const ranked = top.map((id) => shotById(id)).filter(Boolean) as Shot[];
  const winner = ranked[0];
  const runners = ranked.slice(1);
  const heroW = width - 48;

  // Sub-scores worth surfacing on the winner: enabled criteria, best first.
  const winnerSubs: { c: Criterion; v: number }[] = winner
    ? (Object.keys(winner.scores) as Criterion[])
        .filter((c) => (weights[c] ?? 0) > 0)
        .map((c) => ({ c, v: winner.scores[c] ?? 0 }))
        .sort((a, b) => b.v - a.v)
    : [];

  const saveWinner = async () => {
    if (!winner) return;
    setSaving(true);
    try {
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (perm.status !== MediaLibrary.PermissionStatus.GRANTED) {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        ).catch(() => {});
        return;
      }
      const asset = await MediaLibrary.createAssetAsync(winner.uri);
      try {
        const album = await MediaLibrary.getAlbumAsync(ALBUM);
        if (album) await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        else await MediaLibrary.createAlbumAsync(ALBUM, asset, false);
      } catch {
        // album grouping is best-effort; the asset is already saved
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
      setSaved(true);
      track("save_winner");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => {}
      );
    } finally {
      setSaving(false);
    }
  };

  if (!winner) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Body dim>No results to show.</Body>
          <View style={{ height: 16 }} />
          <GhostButton label="Start over" onPress={reset} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: 24, paddingTop: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Kicker>the verdict · from {shots.length}</Kicker>
          <GhostButton label="Start over" onPress={reset} />
        </View>
        <Display size={44} style={{ marginTop: 10 }}>
          Your top three
        </Display>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 22, paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Winner hero */}
        <View
          style={{
            borderRadius: t.radius.lg,
            overflow: "hidden",
            backgroundColor: t.colors.inkSoft,
            borderWidth: 1,
            borderColor: t.colors.hairline,
          }}
        >
          <View>
            <Image
              source={{ uri: winner.uri }}
              style={{ width: heroW, height: heroW * 1.15 }}
              contentFit="cover"
              transition={200}
            />
            <View
              style={{
                position: "absolute",
                top: 14,
                left: 14,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: t.radius.pill,
                backgroundColor: "rgba(11,11,15,0.7)",
              }}
            >
              <Body size={12} color={t.colors.paper} style={{ letterSpacing: 1 }}>
                01 · THE ONE
              </Body>
            </View>
            <View style={{ position: "absolute", right: 16, bottom: 14, alignItems: "flex-end" }}>
              <Display size={64} color={t.colors.paper}>
                {winner.overall}
              </Display>
              <Body size={11} color={t.colors.paper} style={{ letterSpacing: 2, marginTop: -6 }}>
                OVERALL
              </Body>
            </View>
          </View>

          <View style={{ padding: 18, gap: 12 }}>
            {winnerSubs.map(({ c, v }) => (
              <ScoreRow key={c} label={CRITERION_LABEL[c]} value={v} />
            ))}
          </View>
        </View>

        {/* Runners-up */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
          {runners.map((s, i) => (
            <View
              key={s.id}
              style={{
                flex: 1,
                borderRadius: t.radius.md,
                overflow: "hidden",
                backgroundColor: t.colors.inkSoft,
                borderWidth: 1,
                borderColor: t.colors.hairline,
              }}
            >
              <Image
                source={{ uri: s.uri }}
                style={{ width: "100%", height: (heroW / 2 - 6) * 1.2 }}
                contentFit="cover"
                transition={180}
              />
              <View
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: t.radius.pill,
                  backgroundColor: "rgba(11,11,15,0.7)",
                }}
              >
                <Body size={11} color={t.colors.paper} style={{ letterSpacing: 1 }}>
                  0{i + 2}
                </Body>
              </View>
              <View style={{ padding: 12, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
                <Display size={28}>{s.overall}</Display>
                <Body size={10} dim style={{ letterSpacing: 2 }}>
                  OVERALL
                </Body>
              </View>
            </View>
          ))}
        </View>

        {!isPremium ? (
          <Pressable
            onPress={() => openPaywall("group-scene")}
            style={{
              marginTop: 22,
              padding: 18,
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.colors.hairline,
              backgroundColor: t.colors.inkSoft,
            }}
          >
            <Kicker>premium</Kicker>
            <Body size={15} style={{ marginTop: 8 }}>
              Judging a group photo? Unlock whole-scene scoring, posture &
              custom weighting. ↗
            </Body>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Sticky actions */}
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
          flexDirection: "row",
          gap: 12,
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1 }}>
          <PrimaryButton
            label={saved ? "Saved ✓" : "Save winner"}
            loading={saving}
            disabled={saved}
            onPress={saveWinner}
          />
        </View>
        <ExportButton locked={!isPremium} onPress={() => (isPremium ? saveWinner() : openPaywall("export"))} />
      </View>
    </Screen>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, value / 10));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <Body size={14} dim style={{ width: 110 }}>
        {label}
      </Body>
      <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: t.colors.ink }}>
        <View
          style={{
            width: `${pct * 100}%`,
            height: "100%",
            borderRadius: 2,
            backgroundColor: t.colors.accent,
          }}
        />
      </View>
      <Display size={18} style={{ width: 44, textAlign: "right" }}>
        {value.toFixed(1)}
      </Display>
    </View>
  );
}

function ExportButton({ locked, onPress }: { locked: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={locked ? "Export (premium)" : "Export"}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 58,
        height: 58,
        borderRadius: 29,
        borderWidth: 1,
        borderColor: t.colors.hairline,
        backgroundColor: t.colors.inkSoft,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Body size={20} color={t.colors.textOnInk}>
        ↧
      </Body>
      {locked ? (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: t.colors.ink,
            borderWidth: 1,
            borderColor: t.colors.hairline,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Body size={10}>🔒</Body>
        </View>
      ) : null}
    </Pressable>
  );
}
