/**
 * GA4 analytics helper.
 * No-ops safely when NEXT_PUBLIC_GA_MEASUREMENT_ID is not set.
 */

type FunnelEvent =
  | "page_view"
  | "input_start"
  | "input_step2"
  | "input_complete"
  | "report_view"
  | "compatibility_start"
  | "compatibility_result"
  | "paywall_view"
  | "checkout_start"
  | "purchase_complete"
  | "share_click";

interface AnalyticsProps {
  [key: string]: string | number | boolean | undefined;
}

export function track(event: FunnelEvent | string, props?: AnalyticsProps): void {
  // No-op if GA not configured
  if (typeof window === "undefined") return;
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[analytics] ${event}`, props ?? "");
    }
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gtag = (window as any).gtag;
  if (typeof gtag === "function") {
    gtag("event", event, props);
  }
}

// Track page views
export function trackPageView(url: string): void {
  track("page_view", { page_path: url });
}

// Track CTA clicks with position info
export function trackCheckoutStart(ctaPosition: "top" | "middle" | "sticky", priceVariant?: string): void {
  track("checkout_start", { cta_position: ctaPosition, price_variant: priceVariant });
}

// Track share clicks
export function trackShare(channel: string, contentType: "saju" | "compatibility"): void {
  track("share_click", { channel, content_type: contentType });
}

/** Backwards-compatible alias */
export const trackEvent = track;
