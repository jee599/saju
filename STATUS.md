# FateSaju STATUS

## 기획

한국 사주(四柱 — 생년월일시를 기반으로 운명을 읽는 전통 점술) AI 리포트 판매 앱.
한국·일본·동남아 다국어 지원. 결제는 Toss(한국) + Paddle(글로벌) 2원 구조.
목표: 런칭 후 첫 유료 전환 달성.


## 아키텍처 현황

```
User -> Next.js (apps/web)
  -> /api/checkout/{toss|paddle}/create   -> DB(Prisma/Supabase) + 결제 SDK
  -> /api/checkout/paddle/webhook         -> 주문 확정
  -> /api/report/preview                  -> Claude AI (LLM)
  -> /api/fortune/mock                    -> Claude AI (LLM)
middleware.ts -> Rate Limit (5회/일, IP 기반, DB 기반 via internal API)
```


## 완료 (최근 10개)

- API 통합 테스트 35개 추가 (checkout create/confirm, report generate/preview/get), console.error → 구조화된 logger 전환
- SEO 랜딩 페이지 4개 (free-saju, zodiac-2026, birth-chart, compatibility-test) x 8개 로케일, FAQPage JSON-LD, sitemap, footer 내부 링크
- 궁합 paywall 페이지 + CTA 추가, 리포트 찾기(retrieve) 페이지/API 추가, 8개 로케일 i18n
- 오행 매핑 상수 3중 중복 제거, getPaddle() 유틸 추출, 유료 리포트 ShareButtons 추가
- Stripe 코드 완전 제거, Paddle 전환 완료 (결제 2원화: Toss + Paddle)
- QA 2차: log-rate-limit 보호, rate limit 확대, 한국어 레이블 i18n
- QA 3차: --t3 색상 대비 개선, report retry, compatibility shareUrl, DB 인덱스
- daily/page.tsx useRouter i18n 수정, admin/logout auth 수정
- i18n Link/router 통일: 8개 파일에서 next/link, next/navigation -> i18n navigation 전환
- 레이트 리밋 모니터링: 429 발생 시 DB 로깅 + admin 대시보드 Rate Limit 탭
- CSS focus-visible inset 수정 (overflow:hidden 클리핑 방지)
- Resend DNS 레코드 Vercel DNS에 추가 (이메일 인증 완료)
- Rate limiting 구현 (middleware.ts, LLM 엔드포인트 5회/일)
- Playwright E2E 스모크 (8개 로케일, desktop + iPhone 12)


## 진행중

- Abandoned checkout retarget email cron 구현 완료 (코드 리뷰/배포 대기)


## 남은 것

- Paddle 웹훅 실 결제 테스트 (sandbox -> production 전환)
- 첫 유료 전환 달성 후 수익화 지표 트래킹
- 궁합 paywall: productCode "compat" 분리 + 궁합 전용 리포트 생성 로직 (LLM 프롬프트)


## 이슈

없음.


## 메모

- gtimeout (macOS coreutils) 필요. `brew install coreutils`
- Claude CLI 경로: `/Users/jidong/.local/bin/claude` (상대경로 불가)
- Paddle API: `@paddle/paddle-node-sdk@^3.6.0` 사용


## 기술 결정 로그

- **결제 2원 구조**: Toss(한국) + Paddle(글로벌). Stripe/Razorpay 코드 완전 제거 (2026-03-07).
- **Rate limit 백엔드**: Supabase Postgres 선택 (이미 사용 중, 추가 비용 없음, 감사 로그 내장).
- **E2E 위치**: `e2e_temp/` — CI 통합 전 임시 로컬 실행용.
- **husky pre-push timeout**: `gtimeout 180` (pre-push) / `240` (fallback) — Claude CLI 빌드 로그 생성 시간 필요. 실패 시 push는 계속.
- **빌드 로그 자동화**: Claude CLI `-p` 플래그로 비대화형 실행. 타임아웃 초과 시 스킵.


## 주의사항

- `.env.local`은 `.gitignore`에 있음. 배포 시 Vercel 환경변수 직접 설정 필수.
- husky hook은 `auto:`, `docs:` prefix 커밋과 코드 변경 없는 커밋은 스킵.
- Paddle 웹훅 서명 검증은 `apps/web/app/api/checkout/paddle/webhook/route.ts` 에서 처리 — 비활성화하지 마라.
