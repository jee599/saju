/**
 * GA4 analytics helper + server-side event tracking.
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

/* ──────────────────────────────────────────────────
   Server-side event tracking (DB-backed)
   ────────────────────────────────────────────────── */

interface ServerEvent {
  eventType: string;
  eventName: string;
  properties?: Record<string, unknown>;
  page?: string;
  referrer?: string;
}

let queue: ServerEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function getOrCreateId(key: string, storage: Storage): string {
  try {
    let id = storage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      storage.setItem(key, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function getUserId(): string {
  if (typeof window === "undefined") return "";
  return getOrCreateId("saju_uid", localStorage);
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  return getOrCreateId("saju_sid", sessionStorage);
}

function flush() {
  if (typeof window === "undefined" || queue.length === 0) return;
  const batch = queue.splice(0, 50);
  const body = JSON.stringify({
    sessionId: getSessionId(),
    userId: getUserId(),
    locale: document.documentElement.lang || "ko",
    device: /Mobile|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
    userAgent: navigator.userAgent,
    events: batch,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
  } else {
    fetch("/api/events", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 5000);
}

function enqueue(event: ServerEvent) {
  if (typeof window === "undefined") return;
  queue.push({
    ...event,
    page: event.page ?? window.location.pathname,
    referrer: event.referrer ?? document.referrer,
  });
  if (queue.length >= 10) flush();
  else scheduleFlush();
}

// Auto flush on visibility change / page hide
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
}

/** Track a server event (saved to DB via /api/events) */
export function trackServerEvent(
  eventType: string,
  eventName: string,
  properties?: Record<string, unknown>,
) {
  enqueue({ eventType, eventName, properties });
}

/** Track a page view (server-side) */
export function trackPageEvent(page?: string) {
  trackServerEvent("page_view", "page_view", { page: page ?? (typeof window !== "undefined" ? window.location.pathname : "") });
}

/** Track a funnel step */
export function trackFunnel(step: string, properties?: Record<string, unknown>) {
  trackServerEvent("funnel", step, properties);
}

/** Track a form step */
export function trackFormStep(step: string, properties?: Record<string, unknown>) {
  trackServerEvent("form_step", step, properties);
}

/** Track timing (duration in ms) */
export function trackTiming(name: string, durationMs: number, properties?: Record<string, unknown>) {
  trackServerEvent("timing", name, { durationMs, ...properties });
}

/** Track user choice */
export function trackChoice(name: string, value: string, properties?: Record<string, unknown>) {
  trackServerEvent("choice", name, { value, ...properties });
}

/** Track a click */
export function trackClick(target: string, properties?: Record<string, unknown>) {
  trackServerEvent("click", target, properties);
}

/** Track an error */
export function trackError(name: string, error?: string) {
  trackServerEvent("error", name, { error });
}

/** Track scroll depth (0-100) */
export function trackScrollDepth(page: string, depth: number) {
  trackServerEvent("scroll", "scroll_depth", { page, depth });
}

/** Create a page timer — call stop() when leaving */
export function createPageTimer(pageName: string) {
  const start = Date.now();
  return {
    stop() {
      trackTiming(`${pageName}_duration`, Date.now() - start);
    },
  };
}

/** Force flush queued events */
export function flushEvents() {
  flush();
}
