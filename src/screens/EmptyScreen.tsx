import React from "react";
import { View } from "react-native";
import { Screen } from "../components/Screen";
import { BrandBar, Display, Body, PrimaryButton, Kicker } from "../components/ui";
import { useSession } from "../state/SessionContext";
import { track } from "../state/analytics";

export function EmptyScreen() {
  const { goTo } = useSession();
  return (
    <Screen>
      <BrandBar mode="PORTRAIT" />
      <View style={{ flex: 1, justifyContent: "center" }}>
        <View style={{ marginBottom: 28 }}>
          <Kicker>00 · best shot</Kicker>
        </View>
        <Display size={52} style={{ marginBottom: 28 }}>
          Which one{"\n"}is the one?
        </Display>
        <Body size={17} dim style={{ maxWidth: 340 }}>
          Add a handful of shots. We&apos;ll read each for clarity, light,
          expression and more — and pick your best.
        </Body>
      </View>
      <View style={{ paddingBottom: 12, gap: 14 }}>
        <PrimaryButton
          label="Select photos"
          onPress={() => {
            track("select_start");
            goTo("picker");
          }}
        />
        <Body size={13} dim style={{ textAlign: "center" }}>
          up to 20 from your library · they never leave your device
        </Body>
      </View>
    </Screen>
  );
}
