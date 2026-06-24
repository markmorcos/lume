import React, { useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";
import { Screen } from "../components/Screen";
import { Display, Body, Kicker } from "../components/ui";
import { useTheme } from "../theme/ThemeContext";
import { useSession } from "../state/SessionContext";

export function AnalyzingScreen() {
  const t = useTheme();
  const { progress } = useSession();
  const pct = progress.total ? progress.done / progress.total : 0;

  const barWidth = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: pct,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, barWidth]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Animated.View style={{ opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }}>
          <Kicker>analysing · on device</Kicker>
        </Animated.View>
        <Display size={48} style={{ marginTop: 18, marginBottom: 36 }}>
          Reading{"\n"}the room…
        </Display>

        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: t.colors.inkSoft,
            overflow: "hidden",
            marginBottom: 18,
          }}
        >
          <Animated.View
            style={{
              height: "100%",
              borderRadius: 2,
              backgroundColor: t.colors.accent,
              width: barWidth.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
            }}
          />
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Body size={15} dim>
            {progress.label || "Warming up"}
          </Body>
          <Body
            size={15}
            color={t.colors.textOnInk}
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {progress.done} / {progress.total}
          </Body>
        </View>
      </View>
    </Screen>
  );
}
