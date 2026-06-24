import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  FlatList,
  Pressable,
  useWindowDimensions,
  Linking,
  ActivityIndicator,
} from "react-native";
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
  Hairline,
} from "../components/ui";
import { useTheme } from "../theme/ThemeContext";
import { useSession, PickedAsset } from "../state/SessionContext";
import { track } from "../state/analytics";

const CAP = 20;
const PAGE = 120;

export function PickerScreen() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const { goTo, setAssets, beginCriteria } = useSession();

  const [perm, setPerm] = useState<MediaLibrary.PermissionStatus | "loading">(
    "loading"
  );
  const [limited, setLimited] = useState(false);
  const [assets, setAssetList] = useState<MediaLibrary.Asset[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [endCursor, setEndCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [resolving, setResolving] = useState(false);

  const cols = 3;
  const gap = 2;
  const tile = (width - 48 - gap * (cols - 1)) / cols;

  const requestPerm = useCallback(async () => {
    const res = await MediaLibrary.requestPermissionsAsync();
    setPerm(res.status);
    setLimited(res.accessPrivileges === "limited");
    return res.status === MediaLibrary.PermissionStatus.GRANTED;
  }, []);

  const loadPage = useCallback(
    async (after?: string) => {
      if (loadingMore) return;
      setLoadingMore(true);
      try {
        const res = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.photo,
          first: PAGE,
          after,
          sortBy: [MediaLibrary.SortBy.creationTime],
        });
        setAssetList((prev) => (after ? [...prev, ...res.assets] : res.assets));
        setEndCursor(res.endCursor);
        setHasMore(res.hasNextPage);
      } finally {
        setLoadingMore(false);
      }
    },
    [loadingMore]
  );

  useEffect(() => {
    (async () => {
      const cur = await MediaLibrary.getPermissionsAsync();
      if (cur.status === MediaLibrary.PermissionStatus.GRANTED) {
        setPerm(cur.status);
        setLimited(cur.accessPrivileges === "limited");
        loadPage();
      } else {
        setPerm(cur.status);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (perm === MediaLibrary.PermissionStatus.GRANTED) loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perm]);

  const toggle = useCallback((id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= CAP) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
          () => {}
        );
        return prev; // hard cap at 20
      }
      return [...prev, id];
    });
  }, []);

  const confirm = useCallback(async () => {
    if (!selected.length) return;
    setResolving(true);
    // Build the picked list from what we already have, then try to upgrade each
    // uri to a decodable localUri. Resolution is best-effort and never blocks
    // navigation: a slow/failing getAssetInfoAsync must not strand the user on
    // the picker (the engine falls back to neutral scores on any unreadable
    // asset anyway).
    const base: PickedAsset[] = selected
      .map((id) => assets.find((x) => x.id === id))
      .filter((a): a is MediaLibrary.Asset => !!a)
      .map((a) => ({ id: a.id, uri: a.uri, width: a.width, height: a.height }));

    try {
      const resolved = await Promise.all(
        base.map(async (p) => {
          try {
            const a = assets.find((x) => x.id === p.id)!;
            const info = await MediaLibrary.getAssetInfoAsync(a);
            return { ...p, uri: info.localUri ?? p.uri };
          } catch {
            return p; // keep the original uri; decode step will cope
          }
        })
      );
      setAssets(resolved);
    } catch {
      setAssets(base); // never block on resolution
    } finally {
      track("select_confirm", { count: base.length });
      setResolving(false);
      beginCriteria();
    }
  }, [selected, assets, setAssets, beginCriteria]);

  // --- Permission gates ---
  if (perm === "loading") {
    return (
      <Screen>
        <Center>
          <ActivityIndicator color={t.colors.paper} />
        </Center>
      </Screen>
    );
  }

  if (perm === "denied" || perm === "undetermined") {
    const denied = perm === "denied";
    return (
      <Screen>
        <Header onBack={() => goTo("empty")} count={0} />
        <Center>
          <Display size={34} style={{ textAlign: "center", marginBottom: 16 }}>
            {denied ? "Photo access is off" : "May we read your library?"}
          </Display>
          <Body dim size={16} style={{ textAlign: "center", maxWidth: 320, marginBottom: 28 }}>
            LUMÉ scores your shots entirely on this device — nothing is uploaded.
            {denied ? " Enable photo access in Settings to continue." : ""}
          </Body>
          <View style={{ width: "100%", paddingHorizontal: 24 }}>
            <PrimaryButton
              label={denied ? "Open Settings" : "Allow access"}
              onPress={async () => {
                if (denied) Linking.openSettings();
                else {
                  const ok = await requestPerm();
                  if (ok) loadPage();
                }
              }}
            />
          </View>
        </Center>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: 24 }}>
        <Header onBack={() => goTo("empty")} count={selected.length} />
        <Kicker>step 1 of 2 · your library</Kicker>
        <Display size={34} style={{ marginTop: 10, marginBottom: limited ? 6 : 14 }}>
          Pick your contenders
        </Display>
        {limited ? (
          <Pressable onPress={() => Linking.openSettings()}>
            <Body size={13} color={t.colors.accentSoft} style={{ marginBottom: 12 }}>
              Limited access · tap to manage which photos LUMÉ can see
            </Body>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={assets}
        keyExtractor={(a) => a.id}
        numColumns={cols}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        columnWrapperStyle={{ gap }}
        ItemSeparatorComponent={() => <View style={{ height: gap }} />}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (hasMore && !loadingMore) loadPage(endCursor);
        }}
        renderItem={({ item }) => {
          const idx = selected.indexOf(item.id);
          const isSel = idx >= 0;
          return (
            <Pressable onPress={() => toggle(item.id)} style={{ width: tile, height: tile }}>
              <Image
                source={{ uri: item.uri }}
                style={{ width: "100%", height: "100%", borderRadius: 4 }}
                contentFit="cover"
                transition={120}
              />
              <View
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 4,
                  borderWidth: isSel ? 2 : 0,
                  borderColor: t.colors.accent,
                  backgroundColor: isSel ? "rgba(124,92,255,0.18)" : "transparent",
                }}
              />
              {isSel ? (
                <View
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    minWidth: 22,
                    height: 22,
                    paddingHorizontal: 6,
                    borderRadius: 11,
                    backgroundColor: t.colors.accent,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Body size={12} color="#fff">
                    {idx + 1}
                  </Body>
                </View>
              ) : null}
            </Pressable>
          );
        }}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 24 }}>
              <ActivityIndicator color={t.colors.textOnInkDim} />
            </View>
          ) : null
        }
      />

      {/* Sticky CTA */}
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
        <PrimaryButton
          label={
            selected.length ? `Analyze ${selected.length} photo${selected.length > 1 ? "s" : ""}` : "Select up to 20"
          }
          disabled={!selected.length}
          loading={resolving}
          onPress={confirm}
        />
      </View>
    </Screen>
  );
}

function Header({ onBack, count }: { onBack: () => void; count: number }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 6,
        marginBottom: 8,
      }}
    >
      <GhostButton label="‹ Back" onPress={onBack} />
      <Body size={13} dim>
        {count}/{CAP}
      </Body>
    </View>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      {children}
    </View>
  );
}
