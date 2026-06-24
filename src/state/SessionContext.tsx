import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnalyzeProgress,
  Criterion,
  CRITERIA,
  Preset,
  Route,
  Shot,
} from "./types";
import { PRESET_WEIGHTS, weightsForPreset, WeightMap } from "./presets";
import { applyWeights, rankTop } from "../engine/aggregate";
import { scoreBatch } from "../engine/engine";
import { track } from "./analytics";
import {
  getPurchaseProvider,
  PRODUCT_ID,
  PurchaseResult,
} from "../iap/purchases";

export interface PickedAsset {
  id: string;
  uri: string;
  width?: number;
  height?: number;
}

const EMPTY_WEIGHTS: WeightMap = {
  clarity: 1,
  lightColour: 1,
  proportion: 1,
  eyeContact: 1,
  smile: 1,
  goodHairDay: 1,
};

interface SessionState {
  route: Route;
  assets: PickedAsset[];
  shots: Shot[];
  top: string[];
  preset: Preset;
  weights: WeightMap;
  // Toggles: which criteria are switched OFF (weight forced to 0).
  disabled: Set<Criterion>;
  progress: AnalyzeProgress;
  isPremium: boolean;
  paywallVisible: boolean;
  paywallReason: string;
  busy: boolean;
}

interface SessionApi extends SessionState {
  goTo: (r: Route) => void;
  setAssets: (a: PickedAsset[]) => void;
  beginCriteria: () => void;
  choosePreset: (p: Exclude<Preset, "custom">) => void;
  toggleCriterion: (c: Criterion) => void;
  analyze: () => Promise<void>;
  reset: () => void;
  shotById: (id: string) => Shot | undefined;
  openPaywall: (reason: string) => void;
  closePaywall: () => void;
  subscribe: () => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
}

const Ctx = createContext<SessionApi | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<Route>("empty");
  const [assets, setAssetsState] = useState<PickedAsset[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [top, setTop] = useState<string[]>([]);
  const [preset, setPreset] = useState<Preset>("dating");
  const [disabled, setDisabled] = useState<Set<Criterion>>(new Set());
  const [progress, setProgress] = useState<AnalyzeProgress>({
    done: 0,
    total: 0,
    label: "",
  });
  const [isPremium, setIsPremium] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallReason, setPaywallReason] = useState("");
  const [busy, setBusy] = useState(false);

  // Raw 0–10 scores live independently of weighting so re-ranking on a preset
  // or toggle change is instant (no re-decode). See effectiveWeights().
  const rawScores = useRef<Shot[]>([]);

  const effectiveWeights = useCallback(
    (p: Preset, off: Set<Criterion>): WeightMap => {
      const base: WeightMap =
        p === "custom"
          ? { ...EMPTY_WEIGHTS }
          : weightsForPreset(p as Exclude<Preset, "custom">);
      const w = { ...base };
      for (const c of CRITERIA) if (off.has(c)) w[c] = 0;
      return w;
    },
    []
  );

  const weights = useMemo(
    () => effectiveWeights(preset, disabled),
    [preset, disabled, effectiveWeights]
  );

  const reRank = useCallback((src: Shot[], w: WeightMap) => {
    const weighted = applyWeights(src, w);
    setShots(weighted);
    setTop(rankTop(weighted));
  }, []);

  const goTo = useCallback((r: Route) => setRoute(r), []);

  const setAssets = useCallback((a: PickedAsset[]) => {
    setAssetsState(a);
  }, []);

  const beginCriteria = useCallback(() => {
    track("criteria_view", { count: assets.length });
    setRoute("criteria");
  }, [assets.length]);

  const choosePreset = useCallback(
    (p: Exclude<Preset, "custom">) => {
      track("preset_pick", { preset: p });
      setPreset(p);
      setDisabled(new Set());
      if (rawScores.current.length) {
        reRank(rawScores.current, effectiveWeights(p, new Set()));
      }
    },
    [effectiveWeights, reRank]
  );

  const toggleCriterion = useCallback(
    (c: Criterion) => {
      setDisabled((prev) => {
        const next = new Set(prev);
        next.has(c) ? next.delete(c) : next.add(c);
        // Manual tuning => custom preset semantics, but keep base weights.
        const w = effectiveWeights(preset, next);
        if (rawScores.current.length) reRank(rawScores.current, w);
        return next;
      });
    },
    [preset, effectiveWeights, reRank]
  );

  const analyze = useCallback(async () => {
    if (!assets.length) return;
    setBusy(true);
    setRoute("analyzing");
    setProgress({ done: 0, total: assets.length, label: "Reading the room" });
    track("analyze_start", { count: assets.length });

    const raw = await scoreBatch(
      assets.map((a) => ({ id: a.id, uri: a.uri })),
      (e) => setProgress(e)
    );

    const base: Shot[] = raw.map((r) => {
      const a = assets.find((x) => x.id === r.id)!;
      return {
        id: r.id,
        uri: a.uri,
        width: a.width,
        height: a.height,
        scores: r.scores,
        overall: 0,
        scored: true,
      };
    });
    rawScores.current = base;
    reRank(base, effectiveWeights(preset, disabled));
    track("analyze_done", { count: base.length });
    setBusy(false);
    setRoute("result");
    track("result_view");
  }, [assets, preset, disabled, effectiveWeights, reRank]);

  const reset = useCallback(() => {
    rawScores.current = [];
    setAssetsState([]);
    setShots([]);
    setTop([]);
    setPreset("dating");
    setDisabled(new Set());
    setProgress({ done: 0, total: 0, label: "" });
    setRoute("empty");
  }, []);

  const shotById = useCallback(
    (id: string) => shots.find((s) => s.id === id),
    [shots]
  );

  const openPaywall = useCallback((reason: string) => {
    track("paywall_view", { reason });
    setPaywallReason(reason);
    setPaywallVisible(true);
  }, []);
  const closePaywall = useCallback(() => setPaywallVisible(false), []);

  const subscribe = useCallback(async () => {
    track("subscribe_tap");
    const res = await getPurchaseProvider().purchase(PRODUCT_ID);
    if (res.isPremium) {
      setIsPremium(true);
      setPaywallVisible(false);
      track("subscribe_success");
    }
    return res;
  }, []);

  const restore = useCallback(async () => {
    track("restore_tap");
    const res = await getPurchaseProvider().restore();
    if (res.isPremium) {
      setIsPremium(true);
      setPaywallVisible(false);
    }
    return res;
  }, []);

  const value: SessionApi = {
    route,
    assets,
    shots,
    top,
    preset,
    weights,
    disabled,
    progress,
    isPremium,
    paywallVisible,
    paywallReason,
    busy,
    goTo,
    setAssets,
    beginCriteria,
    choosePreset,
    toggleCriterion,
    analyze,
    reset,
    shotById,
    openPaywall,
    closePaywall,
    subscribe,
    restore,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession must be used within SessionProvider");
  return v;
}
