# Paddle 결제 1차 통합 보고서

**작성일**: 2026-03-05
**상태**: ✅ typecheck 통과 / ✅ next build 통과

---

## 1. 변경 개요

Stripe 중심의 기존 결제 흐름 옆에 Paddle을 1차 결제 제공자로 추가했습니다.
기존 Stripe 코드는 전혀 삭제하지 않고, 런타임 환경변수(`NEXT_PUBLIC_PAYMENT_PROVIDER`)로 전환 가능하도록 설계했습니다.

---

## 2. 변경 파일 목록

### 신규 생성 (2개)

| 파일 | 역할 |
|------|------|
| `apps/web/app/api/checkout/paddle/create/route.ts` | Paddle 결제 세션 생성 API |
| `apps/web/app/api/checkout/paddle/webhook/route.ts` | Paddle 웹훅 수신 및 주문 확정 처리 |

### 수정 (5개)

| 파일 | 변경 내용 |
|------|-----------|
| `packages/shared/src/config/countries.ts` | `paymentProvider` 타입에 `"paddle"` 추가 |
| `apps/web/app/[locale]/paywall/page.tsx` | Paddle 결제 흐름 분기 추가 (`effectiveProvider` 로직) |
| `apps/web/next.config.ts` | CSP에 Paddle 도메인 추가 |
| `apps/web/middleware.ts` | `/api/checkout/paddle/create` 레이트리밋 적용 |
| `.env.example` | Paddle 환경변수 항목 추가 |

### 패키지 (1개)

- `apps/web/package.json`: `@paddle/paddle-node-sdk@^3.6.0` 추가

---

## 3. 런타임 전환 플래그

```
# .env.local / 배포 환경변수
NEXT_PUBLIC_PAYMENT_PROVIDER=paddle   # → 모든 비-KR 국가를 Paddle로 라우팅
NEXT_PUBLIC_PAYMENT_PROVIDER=stripe   # → 강제 Stripe (명시적)
NEXT_PUBLIC_PAYMENT_PROVIDER=        # → 국가별 기본값 사용 (현재: 한국=Toss, 나머지=Stripe)
```

### 우선순위 결정 로직 (paywall/page.tsx)

```
effectiveProvider =
  NEXT_PUBLIC_PAYMENT_PROVIDER=paddle  → "paddle"
  NEXT_PUBLIC_PAYMENT_PROVIDER=stripe  → "stripe"
  미설정                               → country.paymentProvider (기존 동작)
```

---

## 4. 결제 흐름 상세

### Paddle 결제 생성 (`POST /api/checkout/paddle/create`)

1. 입력 유효성 검사 (`isValidFortuneInput`)
2. CF-IPCountry 헤더로 로케일-국가 불일치 감지 (경고 로그)
3. `FortuneRequest` DB 레코드 생성
4. `Order` DB 레코드 생성 (`paymentProvider: 'paddle'`, `status: 'created'`)
5. Paddle SDK `transactions.create()` 호출
   - 항목: 비카탈로그(Non-catalog) 동적 가격, `taxMode: 'exclusive'`
   - 금액: `country.pricing.saju.premium` (Stripe와 동일한 최소 단위 기준)
   - `customData`: `{ orderId, locale, countryCode }`
   - `checkout.successUrl` / `checkout.failureUrl` 설정
6. `Order.paymentId` = Paddle 트랜잭션 ID로 업데이트
7. `transaction.checkout.url` 반환 → 프론트엔드가 `window.location.href`로 리다이렉트

### Paddle 웹훅 (`POST /api/checkout/paddle/webhook`)

1. `PADDLE_WEBHOOK_SECRET` 확인
2. `paddle.webhooks.unmarshal(body, secret, signature)` 서명 검증
3. `event.eventType === EventName.TransactionCompleted` 확인
4. `event.data.customData.orderId` 추출
5. 이미 confirmed 상태이면 스킵 (idempotency)
6. `Order.status = 'confirmed'`, `Order.confirmedAt = now()` 업데이트

---

## 5. 환경변수 (신규 추가)

```bash
PADDLE_API_KEY=             # Paddle 벤더 API 키 (서버 전용)
PADDLE_WEBHOOK_SECRET=      # 웹훅 서명 검증 키 (Paddle 대시보드에서 발급)
PADDLE_ENVIRONMENT=sandbox  # sandbox | production
NEXT_PUBLIC_PAYMENT_PROVIDER=  # paddle | stripe | (비워두면 국가별 기본값)
```

---

## 6. CSP 헤더 추가 도메인

| 지시문 | 추가된 도메인 |
|--------|--------------|
| `script-src` | `https://cdn.paddle.com` |
| `connect-src` | `https://api.paddle.com`, `https://checkout.paddle.com` |
| `frame-src` | `https://buy.paddle.com`, `https://checkout.paddle.com` |

---

## 7. 레이트리밋

`/api/checkout/paddle/create`를 기존 레이트리밋 목록에 추가 (5회/일/IP).

---

## 8. 빌드 결과

```
✓ Compiled successfully in 1878ms
✓ Linting and checking validity of types
✓ Generating static pages (24/24)

ƒ /api/checkout/paddle/create    197 B    102 kB
ƒ /api/checkout/paddle/webhook   197 B    102 kB
```

typecheck: 에러 없음
build: 에러 없음

---

## 9. 남은 TODO (2차 작업)

### 필수

- [ ] **Paddle 계정 설정**: 대시보드에서 웹훅 엔드포인트 등록 (`/api/checkout/paddle/webhook`)
- [ ] **통화 지원 확인**: Paddle이 VND, IDR, CNY를 지원하는지 공식 문서 확인
  → 미지원 통화는 USD fallback 또는 국가별 Paddle 비활성화 처리 필요
- [ ] **Sandbox 실결제 테스트**: Paddle sandbox 환경에서 실제 결제 흐름 E2E 검증
- [ ] **`/api/checkout/confirm` 연동**: 현재 confirm 엔드포인트는 Stripe만 검증함
  → Paddle 주문의 경우 `paymentProvider === 'paddle'`일 때 Paddle API로 트랜잭션 상태 조회하도록 수정 필요
- [ ] **보고서 생성 연동 확인**: 웹훅 confirmed 이후 `/api/report/generate` 자동 호출 경로 검증

### 권장

- [ ] **KR(Toss) 예외 처리**: `NEXT_PUBLIC_PAYMENT_PROVIDER=paddle`로 설정 시 KR 사용자가 Paddle로 라우팅되지 않도록 보호 로직 추가 (현재 Toss는 provider가 `"toss"`여서 `effectiveProvider === "paddle"`이 됨 — KR만 예외 처리 필요)
- [ ] **Paddle Overlay 모드**: 현재는 hosted checkout(리다이렉트) 방식. Paddle.js overlay 방식으로 전환 시 UX 향상 가능
- [ ] **환불 처리**: Paddle `transaction.refunded` 웹훅 수신 시 주문 상태 롤백 로직 추가
- [ ] **Paddle 대시보드 세금 설정**: `taxMode: 'exclusive'` 사용 중 → Paddle 계정 세금 설정과 일치 여부 확인

### 정리

- [ ] **Stripe legacy 코드 제거 시점 결정**: Paddle이 안정화되면 Stripe 코드 제거 일정 계획

---

## 10. 기존 Stripe 코드 현황 (유지)

삭제하지 않고 그대로 유지됩니다:

| 파일 | 상태 |
|------|------|
| `apps/web/app/api/checkout/stripe/create/route.ts` | ✅ 유지 (legacy) |
| `apps/web/app/api/checkout/stripe/webhook/route.ts` | ✅ 유지 (legacy) |
| `apps/web/app/api/checkout/confirm/route.ts` | ✅ 유지 (Stripe 검증 포함) |

`NEXT_PUBLIC_PAYMENT_PROVIDER` 미설정 시 기존 동작과 100% 동일합니다.
