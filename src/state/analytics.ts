// Privacy-preserving funnel analytics (§7/§11). Events carry NO photo data and
// NO personal identifiers — only flow milestones and coarse counts. Default sink
// is the console; point `sink` at a first-party collector when one exists.

export type FunnelEvent =
  | "app_open"
  | "select_start"
  | "select_confirm"
  | "criteria_view"
  | "preset_pick"
  | "analyze_start"
  | "analyze_done"
  | "result_view"
  | "save_winner"
  | "paywall_view"
  | "subscribe_tap"
  | "subscribe_success"
  | "restore_tap";

type Props = Record<string, string | number | boolean>;
type Sink = (event: FunnelEvent, props?: Props) => void;

let sink: Sink = (event, props) => {
  if (__DEV__) console.log(`[funnel] ${event}`, props ?? {});
};

export function setAnalyticsSink(s: Sink) {
  sink = s;
}

export function track(event: FunnelEvent, props?: Props) {
  try {
    sink(event, props);
  } catch {
    // analytics must never break the flow
  }
}
