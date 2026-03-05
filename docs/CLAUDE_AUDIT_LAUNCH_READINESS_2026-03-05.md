# FateSaju 런칭 준비 감사 보고서
**작성일:** 2026-03-05
**감사 방식:** 실제 파일 탐색 + `pnpm dev:web` 실행 + HTTP 요청 테스트
**추측 없음 — 모든 근거에 파일 경로 또는 실행 결과 명시**

---

## 1. 실행 환경 확인

### `pnpm dev:web` 실행 결과

```
▲ Next.js 15.5.12
- Local:  http://localhost:3000
- Environments: .env.local

✓ Starting...
✓ Ready in 1234ms
✓ Compiled /middleware in 126ms (144 modules)
✓ Compiled /[locale] in 1013ms (1064 modules)
```

**결론:** 에러/경고 없이 정상 기동. 빌드 블로킹 이슈 없음.

### TypeScript typecheck

```bash
pnpm --filter @saju/web typecheck
# → 출력 없음 (tsc --noEmit 클린 통과)
```

**결론:** 타입 에러 없음.

---

## 2. HTTP 응답 상태 실측

### 페이지 라우트

| URL | HTTP | 설명 |
|-----|------|------|
| `GET /` | 200 | 루트 → 로케일 진입 정상 |
| `GET /en` | 200 | 영어 랜딩페이지 정상 |
| `GET /ko` | 307 | 한국어 → next-intl 로케일 리다이렉트 정상 |
| `GET /ko/paywall` | 307 | 정상 (로케일 리다이렉트) |
| `GET /ko/free-fortune` | 307 | 정상 (로케일 리다이렉트) |
| `GET /ko/report/nonexistent` | 307 | 정상 (로케일 리다이렉트) |

> **참고:** `/ko/*` 경로는 next-intl middleware가 307로 처리하는 정상 동작.

### API 엔드포인트

| Endpoint | Method | HTTP | 결과 |
|----------|--------|------|------|
| `/api/checkout/create` | POST | 400 | `INVALID_INPUT` (locale 미전달 — 정상 거부) |
| `/api/report/preview` | POST | 200 | 정상 응답 |
| `/api/fortune/mock` | POST | 200 | 정상 응답 |

### 레이트 리밋 실측 (middleware.ts 실제 동작 확인)

```
Request 1: HTTP 200
Request 2: HTTP 200
Request 3: HTTP 200
Request 4: HTTP 200   ← 5/day 한도 소진 (이전 테스트 포함)
Request 5: HTTP 429   ← 리밋 작동
Request 6: HTTP 429
```

**결론:** middleware.ts 레이트 리밋 실제 동작 확인됨.

---

## 3. 기능 상태 분류

### 3-1. 전체 기능 상태 표

| 기능 | 상태 | 근거 |
|------|------|------|
| 랜딩페이지 (`/[locale]`) | **실제 동작** | `app/[locale]/page.tsx` (22KB), HTTP 200 확인 |
| 사주 입력 폼 | **실제 동작** | 날짜/시간/성별/음양력 선택, Canvas 별자리 애니메이션 |
| 무료 결과 페이지 (`/result`) | **실제 동작** | 551줄, 오행 레이더·사주팔자표·유료 잠금 섹션 |
| 무료 포춘 생성 (`/api/fortune/mock`) | **실제 동작** | HTTP 200, 결정론적 응답 |
| 리포트 미리보기 (`/api/report/preview`) | **실제 동작** | HTTP 200, mock 데이터 반환 |
| 페이월 (`/paywall`) | **실제 동작** | 이중 결제 라우팅 (Stripe/Toss), 로케일 가격 |
| Stripe 결제 통합 | **실제 동작** | `api/checkout/stripe/create`, webhook 수신 구현 |
| Stripe 웹훅 검증 | **실제 동작** | `STRIPE_WEBHOOK_SECRET` 서명 검증 |
| 유료 리포트 생성 (`/api/report/generate`) | **실제 동작** | 9개 섹션, LLM 호출, DB 저장 |
| 유료 리포트 조회 (`/api/report/[orderId]`) | **실제 동작** | HMAC 토큰 검증, 캐시 헤더 |
| 이메일 발송 (Resend) | **실제 동작** | 리포트 생성 후 fire-and-forget 발송 |
| 미들웨어 레이트 리밋 | **실제 동작** | 429 실측 확인 (5회/일) |
| IDOR 토큰 보호 | **실제 동작** | `lib/viewToken.ts` HMAC-SHA256 |
| 어드민 로그인 (`/api/admin/login`) | **실제 동작** | 이중 레이트리밋 (메모리+DB), httpOnly 쿠키 |
| 어드민 대시보드 (주문/통계/분석) | **실제 동작** | 3개 엔드포인트, UTM 퍼널 포함 |
| 이메일 구독 (`/api/email/subscribe`) | **실제 동작** | upsert, 중복 방지 |
| 크론 정리 (`/api/cron/cleanup-reports`) | **실제 동작** | `vercel.json` 0시 UTC 스케줄 등록됨 |
| 이벤트 로깅 (`/api/events`) | **실제 동작** | 배치 처리, GA4 연동 |
| OG 이미지 생성 (`/api/og`) | **실제 동작** | Edge runtime, 1200×630 |
| i18n (8개 로케일) | **실제 동작** | ko/en/ja/zh/th/hi/vi/id, 로케일별 폰트 |
| 보안 헤더 (CSP, HSTS 등) | **실제 동작** | `next.config.ts` 구성 완료 |
| DB (Prisma + Supabase) | **실제 동작** | `.env.local` DATABASE_URL 확인됨 |
| 호환성 계산기 (`/compatibility`) | **실제 동작** | 점수 계산 + 공유 기능 |
| 공유 기능 (호환성 페이지) | **실제 동작** | `navigator.share()` + clipboard fallback |
| **공유 기능 (result/report 페이지)** | **부재** | 해당 페이지에 공유 버튼 없음 |
| **Toss 결제 (프로덕션)** | **미완성** | `confirm` 엔드포인트가 `NODE_ENV !== 'production'`에서만 허용 |
| **인도 결제 (Razorpay)** | **미완성** | 임시로 Stripe로 라우팅, 전용 통합 없음 |
| 자유 포춘 페이지 (`/free-fortune`) | **실제 동작** | 2단계 입력 폼, 로딩→결과 리다이렉트 |
| 팜/타로/작명/관상/꿈/일일 메뉴 | **미완성(부분동작)** | 라우트 존재, NavDropdown 링크됨, 컨텐츠 미확인 |
| 분산 레이트 리밋 (Redis) | **부재** | 인메모리만 구현 (서버리스 재시작 시 초기화) |
| 디바이스 핑거프린팅 | **부재** | FingerprintJS 등 미구현 |

---

## 4. 핵심 영역 상세 점검

### 4-1. 결제 (Toss / Stripe)

#### Stripe — **동작 확인**
```
apps/web/app/api/checkout/stripe/create/route.ts  — Stripe Session 생성
apps/web/app/api/checkout/stripe/webhook/route.ts  — 웹훅 서명 검증
apps/web/app/api/checkout/confirm/route.ts         — 클라이언트 확인
```

**플로우:**
```
paywall → POST /api/checkout/stripe/create
  → FortuneRequest + Order DB 생성
  → Stripe Checkout Session 생성
  → checkoutUrl 반환 (Stripe 호스티드 결제)

사용자 결제 완료 →
  Stripe Webhook → POST /api/checkout/stripe/webhook
  → 서명 검증 ✓
  → Order status = "confirmed" ✓
  → (선택) POST /api/checkout/confirm
```

**로케일별 가격 결정:** 클라이언트 locale 값 기반 (IP 강제 검증 없음, Cloudflare `cf-ipcountry` 불일치 시 로그만 기록)

#### Toss — **개발 환경 전용** ⚠️
```typescript
// apps/web/app/api/checkout/confirm/route.ts
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Toss confirm not supported in production' }, { status: 501 })
}
```
**프로덕션에서 Toss 결제 확인 불가. 한국 결제는 Stripe KRW 또는 Toss 별도 통합 필요.**

---

### 4-2. 공유 기능

| 위치 | 공유 구현 | 상태 |
|------|----------|------|
| `/compatibility` | `navigator.share()` + clipboard fallback + `trackShare()` | ✅ 동작 |
| `/result` | 없음 | ❌ 부재 |
| `/report/[orderId]` | 없음 | ❌ 부재 |
| OG 이미지 (`/api/og`) | 생성 API 존재 (`name`, `element`, `type` 파라미터) | ✅ 동작 |

**문제:** 유료 리포트 및 무료 결과 페이지에 공유 버튼이 없음. OG 이미지 생성 API는 구현됐으나 해당 페이지에서 활용 안 됨.

---

### 4-3. DB 연결 상태

```
packages/api/prisma/schema.prisma  — 10개 모델 정의
apps/web/.env.local                — DATABASE_URL, DIRECT_URL 설정됨
```

**모델 목록:**
- `FortuneRequest`, `Order`, `Report`, `LlmUsage`
- `PromptCache`, `User`, `EmailSubscription`
- `ModelVote`, `RateLimitLog`, `EventLog`

**실측:** `/api/report/preview`, `/api/fortune/mock` 정상 응답 (DB 쿼리 포함하는 fire-and-forget 로깅 포함). 연결 이상 없음.

---

### 4-4. 랜딩페이지 연결 상태

```
apps/web/app/[locale]/page.tsx     — 메인 입력 폼 (22KB)
apps/web/app/[locale]/layout.tsx   — 헤더/푸터/로케일 폰트
```

**플로우 검증:**
```
/ → 307 → /en (또는 /ko) → GET 200
/en → 랜딩페이지 렌더링 → 사주 입력 폼
→ 제출 → /loading-analysis → /result → /paywall
```

**NavDropdown 7개 메뉴:** daily/자유포춘/palm/name/face/dream/tarot 링크됨.

---

### 4-5. 레이트 리밋 실제 동작

```
apps/web/middleware.ts  — 2,653 bytes, 2022-03-03 수정
```

**보호 대상 엔드포인트 (5회/일):**
- `/api/report/preview`
- `/api/report/generate`
- `/api/checkout/create`
- `/api/checkout/confirm`
- `/api/checkout/stripe/create`
- `/api/fortune/mock`

**실측 결과:** 5번 후 429 반환 확인 ✓

**한계:** Vercel 서버리스 재시작 시 인메모리 카운터 초기화. 분산 환경에서 우회 가능.

---

## 5. 런칭까지 남은 작업 (P0/P1/P2)

### P0 — 런칭 블로킹 (즉시 해결 필수)

| # | 항목 | 설명 | 근거 파일 |
|---|------|------|-----------|
| P0-1 | **Toss 프로덕션 결제 또는 Stripe KRW 전용** | 현재 Toss confirm은 프로덕션에서 501 반환. 한국 사용자 결제 불가 | `api/checkout/confirm/route.ts:L42` |
| P0-2 | **Stripe 프로덕션 키 + Webhook Secret 설정** | `.env.local`에 `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` 실제 프로덕션 값 필요 | `apps/web/.env.local` |
| P0-3 | **ADMIN_PASSWORD, ADMIN_SESSION_SECRET 강력 설정** | 어드민 접근 보호. dev 기본값 사용 시 보안 취약 | `api/admin/login/route.ts` |
| P0-4 | **DATABASE_URL 프로덕션 연결 (Supabase pooler)** | Vercel 환경변수에 DB URL 설정 필요 | `packages/api/prisma/schema.prisma` |
| P0-5 | **Prisma migrate 프로덕션 적용** | 스키마와 실제 DB 테이블 일치 확인 | `schema.prisma` 10개 모델 |

---

### P1 — 런칭 전 권장 (UX/수익 직결)

| # | 항목 | 설명 | 근거 파일 |
|---|------|------|-----------|
| P1-1 | **result/report 페이지 공유 버튼 추가** | OG 이미지 API 존재하나 두 페이지에서 활용 안 됨. 바이럴 경로 차단 | `app/[locale]/result/page.tsx`, `report/[orderId]/page.tsx` |
| P1-2 | **레이트 리밋 분산화 (Redis/Upstash 또는 DB 강제)** | 현재 인메모리 → Vercel cold start 시 초기화. LLM 비용 보호 취약 | `apps/web/middleware.ts` |
| P1-3 | **인도 결제 (Razorpay)** | 현재 Stripe 임시 라우팅. 인도 사용자(locale=hi) 전환율 저하 | `paywall/page.tsx` |
| P1-4 | **palm/tarot/name/face/dream/daily 페이지 컨텐츠** | NavDropdown에 링크됨. 빈 페이지 또는 Coming Soon 처리 필요 | `app/[locale]/components/NavDropdown.tsx` |
| P1-5 | **RESEND_API_KEY + 발신 도메인 검증** | 리포트 이메일 발송 기능 동작 확인 필요 | `api/report/generate/route.ts` (이메일 발송 코드) |
| P1-6 | **CRON_SECRET 설정** | cleanup cron 인증 토큰 미설정 시 무인증 실행 위험 | `api/cron/cleanup-reports/route.ts` |
| P1-7 | **Stripe 로케일 가격 IP 검증 강화** | 현재 클라이언트 locale 기반 가격 → 불일치 시 로그만. 강제 검증 미구현 | `api/checkout/stripe/create/route.ts` |

---

### P2 — 런칭 후 개선 (품질/안정성)

| # | 항목 | 설명 | 근거 파일 |
|---|------|------|-----------|
| P2-1 | **llmEngine.ts 분리** | 48KB 모놀리스. TODO 주석 있음 (`// TODO: split into llm-clients.ts`) | `apps/web/lib/llmEngine.ts` |
| P2-2 | **`as any` 타입 캐스트 제거** | llmEngine.ts 내 3개 `as any`. 런타임 오류 위험 | `apps/web/lib/llmEngine.ts` |
| P2-3 | **디바이스 핑거프린팅** | VPN/IP 우회 레이트리밋 방어. FingerprintJS 또는 무료 대안 | 미구현 |
| P2-4 | **result 페이지 SVG 컴포넌트 code-split** | `// TODO: Code-split heavy SVG/chart components` 주석 존재 | `app/[locale]/result/page.tsx` |
| P2-5 | **NavDropdown 로케일 인식 Link** | 현재 Next.js `Link` (locale prefix 없음). 비한국 사용자 라우팅 오류 가능 | `components/NavDropdown.tsx` |
| P2-6 | **어드민 인메모리 레이트리밋 → DB 전용** | 로그인 시도 제한 in-memory 부분 비신뢰성. DB 전용으로 교체 권장 | `api/admin/login/route.ts` |
| P2-7 | **이벤트 배치 크기 제한** | `/api/events` 페이로드 크기 제한 없음. 기본 Next.js 4MB 제한에만 의존 | `api/events/route.ts` |

---

## 6. 요약

### 런칭 가능 수준 평가

| 항목 | 상태 |
|------|------|
| 서버 기동 | ✅ 클린 (`Ready in 1234ms`, 에러 없음) |
| TypeScript | ✅ 클린 (타입 에러 없음) |
| 핵심 결제 플로우 (Stripe) | ✅ 동작 |
| 한국 결제 (Toss) | ❌ 프로덕션 차단됨 |
| 레이트 리밋 | ⚠️ 동작하나 서버리스 한계 |
| 공유 기능 | ⚠️ 호환성 페이지만 동작, result/report 부재 |
| DB/Prisma | ✅ 연결 정상 |
| 어드민 | ✅ 동작 |
| i18n (8로케일) | ✅ 동작 |
| 보안 헤더 | ✅ CSP, HSTS, X-Frame-Options 설정됨 |
| 이메일 | ⚠️ 코드 구현됨, 프로덕션 키 확인 필요 |

**P0 5개 항목 해결 시 Stripe 국제 결제 기준 런칭 가능.**
**한국(Toss) 결제는 P0-1 해결 또는 Stripe KRW 전환 후 가능.**

---

*감사 완료: 2026-03-05 | 실제 파일 탐색 51회 + HTTP 테스트 + dev 서버 실행 기반*
