# QA Browser Report — 2026-03-05

- 실행시간(KST): 2026-03-05 11:42 ~ 12:00
- 대상: https://fortunelab.store
- 방식: 로컬 Playwright(chromium, headless) 실제 브라우저 테스트 + API 스모크

## 1) 테스트 결과 요약

### Locale 페이지/Paywall 접근
- ko/en/ja/zh/th/vi/id/hi 각 locale 랜딩 접근: PASS
- ko/en/ja/zh/th/vi/id/hi paywall 접근: PASS

### Paywall 이메일 검증(UI)
- 각 locale에서 invalid email 입력 후 결제 버튼 클릭 시 에러 텍스트 노출: PASS

### Checkout 시작(UI)
- /en/paywall에서 valid email 입력 후 결제 클릭
- 실제 Stripe Checkout URL(checkout.stripe.com)로 이동 확인: PASS

### API 스모크
- GET /api/admin/stats?range=7d (비인증): 401 PASS
- POST /api/checkout/stripe/create (valid payload): 200 + checkoutUrl/orderId PASS

### 관리자 라우트
- /admin 접근 가능(리다이렉트/진입 정상): PASS

### 로케일 링크 유지
- en/ja/zh/th/vi/id/hi: 내부 링크 locale prefix 유지 PASS
- ko: 기본 로케일 정책으로 비-prefix 링크 다수 확인(예: /daily, /palm). 기능오류로 단정은 어려우나 locale 정책 일관성 관점에서 점검 권장.

## 2) 이슈 목록

### P1
1. **ko 로케일 링크 prefix 정책 일관성 확인 필요**
   - 재현: /ko 진입 후 내부 링크 수집 시 /daily, /palm 등 비-prefix 링크 다수
   - 영향: 다국어 URL 정책을 엄격히 유지하려는 경우 혼선 가능
   - 권장: `ko`를 default-locale no-prefix로 유지할지, 모든 locale prefix 강제할지 정책 확정

## 3) 결론
- 결제 핵심 플로우(이메일 검증, Stripe checkout 시작, API create) 및 기본 접근 기능은 **정상 동작**.
- 치명적(P0) 결함은 이번 라운드에서 발견되지 않음.

---

## 4) 모바일 추가 QA (iPhone 12 viewport)

- 실행시간(KST): 2026-03-05 12:20
- 환경: Playwright chromium + `devices['iPhone 12']` (headless)

### 결과
- ko/en/ja/zh/th/vi/id/hi 랜딩 진입: 전부 PASS
- ko/en/ja/zh/th/vi/id/hi paywall 이메일 invalid 검증: 전부 PASS
- en paywall 결제 시작 후 Stripe checkout 리다이렉트: PASS

### 비고
- 모바일 추가 라운드에서도 P0/P1 신규 결제 장애는 재현되지 않음.
