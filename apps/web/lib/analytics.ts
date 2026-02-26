/**
 * GA4 analytics helper.
 * No-ops safely when NEXT_PUBLIC_GA_MEASUREMENT_ID is not set.
 */

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

/** Core funnel events */
export type FunnelEvent =
  | "input_start"
  | "input_submit"
  | "result_view"
  | "paywall_view"
  | "checkout_start"
  | "checkout_success"
  | "checkout_fail";

type GtagFn = (...args: unknown[]) => void;

function getGtag(): GtagFn | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { gtag?: GtagFn }).gtag ?? null;
}

export function track(event: FunnelEvent | string, props?: AnalyticsProps): void {
  if (process.env.NODE_ENV === "development") {
    console.log("[analytics]", event, props ?? {});
  }
  const gtag = getGtag();
  if (gtag) {
    gtag("event", event, props ?? {});
  }
}

/** Backwards-compatible alias */
export const trackEvent = track;
