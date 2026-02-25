export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type PostHogLike = {
  capture: (event: string, properties?: AnalyticsProps) => void;
};

const getPostHog = (): PostHogLike | null => {
  if (typeof window === "undefined") return null;
  const maybe = (window as typeof window & { posthog?: PostHogLike }).posthog;
  return maybe ?? null;
};

export const trackEvent = (event: string, properties?: AnalyticsProps): void => {
  console.log("[analytics]", event, properties ?? {});

  // GA4
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", event, properties ?? {});
  }

  // PostHog (fallback)
  const posthog = getPostHog();
  if (posthog) {
    posthog.capture(event, properties);
  }
};

// ── 퍼널 이벤트 헬퍼 ─────────────────────────────────────

/** 히어로 폼 입력 시작 */
export const trackFormStart = () => trackEvent("form_start", { form: "hero_fortune" });

/** 히어로 폼 제출 (무료 분석 요청) */
export const trackFormSubmit = () => trackEvent("form_submit", { form: "hero_fortune" });

/** 무료 리포트 결과 조회 완료 */
export const trackPreviewView = () => trackEvent("preview_view");

/** CTA 클릭 (position: top_banner | locked_preview | sticky_bar) */
export const trackCtaClick = (position: string) => trackEvent("cta_click", { position });

/** 결제 페이지 진입 */
export const trackCheckoutStart = () => trackEvent("begin_checkout");

/** 결제 완료 */
export const trackPurchase = (value: number, currency = "KRW") =>
  trackEvent("purchase", { value, currency });

/** 공유 클릭 */
export const trackShare = (method: string) => trackEvent("share", { method });

/** 에러 발생 */
export const trackError = (errorCode: string) => trackEvent("error_view", { error_code: errorCode });
