import React, { useState } from "react";
import { View, Modal, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Display, Body, Kicker, PrimaryButton, GhostButton } from "../components/ui";
import { useTheme } from "../theme/ThemeContext";
import { useSession } from "../state/SessionContext";
import { PRICE_LABEL, TRIAL_LABEL } from "../iap/purchases";

const BENEFITS = [
  { title: "Group photos", body: "Score the whole scene — who looks best, together." },
  { title: "Posture & body language", body: "Read stance and framing, not just the face." },
  { title: "Custom weighting & export", body: "Tune every criterion. Save watermark-free." },
  { title: "History", body: "Revisit every shortlist you've ever judged." },
];

export function PaywallScreen() {
  const t = useTheme();
  const { paywallVisible, closePaywall, subscribe, restore } = useSession();
  const [busy, setBusy] = useState<"buy" | "restore" | null>(null);
  const [note, setNote] = useState<string>("");

  const onSubscribe = async () => {
    setBusy("buy");
    setNote("");
    const res = await subscribe();
    setBusy(null);
    if (!res.ok) setNote(res.message ?? "Purchase did not complete.");
  };
  const onRestore = async () => {
    setBusy("restore");
    setNote("");
    const res = await restore();
    setBusy(null);
    setNote(res.message ?? "");
  };

  return (
    <Modal
      visible={paywallVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closePaywall}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.ink }}>
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingTop: 8 }}>
            <GhostButton label="Close ✕" onPress={closePaywall} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <Kicker>lumé premium</Kicker>
            <Display size={46} style={{ marginTop: 14, marginBottom: 10 }}>
              Judge the{"\n"}whole scene.
            </Display>
            <Body size={16} dim style={{ marginBottom: 28 }}>
              Everything in LUMÉ, plus the tools to judge groups, bodies and your
              own taste.
            </Body>

            <View style={{ gap: 16 }}>
              {BENEFITS.map((b) => (
                <View key={b.title} style={{ flexDirection: "row", gap: 14 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: t.colors.accent,
                      marginTop: 7,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Body size={16} style={{ marginBottom: 2 }}>
                      {b.title}
                    </Body>
                    <Body size={13} dim>
                      {b.body}
                    </Body>
                  </View>
                </View>
              ))}
            </View>

            <View
              style={{
                marginTop: 30,
                padding: 18,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: t.colors.accent,
                backgroundColor: "rgba(124,92,255,0.10)",
                flexDirection: "row",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <View>
                <Display size={30}>{PRICE_LABEL}</Display>
                <Body size={13} color={t.colors.accentSoft} style={{ marginTop: 2 }}>
                  {TRIAL_LABEL}
                </Body>
              </View>
              <Body size={12} dim style={{ maxWidth: 130, textAlign: "right" }}>
                Billed monthly after trial. Cancel anytime.
              </Body>
            </View>

            {note ? (
              <Body size={13} color={t.colors.accentSoft} style={{ marginTop: 14, textAlign: "center" }}>
                {note}
              </Body>
            ) : null}
          </ScrollView>

          <View style={{ paddingBottom: 16, gap: 14 }}>
            <PrimaryButton
              label="Start 7-day free trial"
              loading={busy === "buy"}
              onPress={onSubscribe}
            />
            <Pressable onPress={onRestore} disabled={busy != null} hitSlop={8}>
              <Body size={13} dim style={{ textAlign: "center" }}>
                {busy === "restore" ? "Restoring…" : "Restore purchase"}
              </Body>
            </Pressable>
            <Body size={11} dim style={{ textAlign: "center" }}>
              Cancel anytime · restore purchase · no photos ever leave your device
            </Body>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
