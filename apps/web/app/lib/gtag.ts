declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA4_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

function gtag(...args: unknown[]) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag(...args);
  }
}

/** 퍼널 이벤트 10개 */
export const trackEvent = {
  /** 1. 랜딩 페이지 방문 */
  pageView: () => gtag("event", "page_view"),

  /** 2. 생년월일 입력 시작 (히어로 사주 탭) */
  inputStart: () => gtag("event", "input_start"),

  /** 3. Step 2 모달 진입 */
  inputStep2: () => gtag("event", "input_step2"),

  /** 4. 분석 요청 완료 */
  inputComplete: (params: { year: number; month: number; day: number }) =>
    gtag("event", "input_complete", params),

  /** 5. 무료 리포트 확인 */
  reportView: (params: { dayMasterElement: string }) =>
    gtag("event", "report_view", params),

  /** 6. 궁합 입력 시작 */
  compatibilityStart: (source: "hero_tab" | "report") =>
    gtag("event", "compatibility_start", { source }),

  /** 7. Paywall 노출 */
  paywallView: () => gtag("event", "paywall_view"),

  /** 8. 결제 버튼 클릭 */
  checkoutStart: (params: { cta_position: "cta1" | "cta2" | "sticky"; price_variant?: number }) =>
    gtag("event", "checkout_start", params),

  /** 9. 결제 완료 */
  purchaseComplete: (params: { price_variant: number; order_id: string }) =>
    gtag("event", "purchase_complete", params),

  /** 10. 공유 클릭 */
  shareClick: (params: { channel: string; type: "saju" | "compatibility" }) =>
    gtag("event", "share_click", params),
};
