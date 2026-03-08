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

- QA 4차: SEO FAQ raw key 노출 수정, 궁합 paywall productCode/partnerDate 수정, 결제에러 double .json() 수정, JSON-LD XSS 방어, retrieve rate limit 순서 수정, retarget sessionId 충돌 방지, Enter key 폼 제출, console.* → logger.* 통일
- 가짜 소셜프루프 전면 제거 (★4.8, 2500+ 사용자, 할인뱃지, 가격앵커) + 결제 실패 로컬라이즈 에러 메시지
- Abandoned checkout retarget email cron 배포 (6시간 간격, 8개 로케일)
- API 통합 테스트 35개 추가, console.error → 구조화된 logger 전환
- SEO 랜딩 페이지 4개 x 8개 로케일, FAQPage JSON-LD, sitemap
- 궁합 paywall + 리포트 찾기(retrieve) 페이지/API, 8개 로케일 i18n
- 오행 매핑 상수 3중 중복 제거, getPaddle() 유틸 추출, ShareButtons
- Stripe 완전 제거, Paddle 전환 완료 (결제 2원화: Toss + Paddle)
- QA 3차: --t3 색상 대비, report retry, DB 인덱스
- Rate limiting 구현 (middleware.ts, DB 기반, 5회/일)


## 진행중

- 홈페이지 온보딩 캐러셀 추가 (첫 방문자용, 3슬라이드, 8개 로케일 i18n)
- loading-analysis 페이지 리팩토링 완료 (hook/component 분리, elapsedSec useRef 성능 수정)
- 폼 진행 바 + 결제 실패 복구 UX 추가 (완료, 커밋 대기)


## 남은 것

- Paddle 웹훅 실 결제 테스트 (sandbox -> production 전환)
- 첫 유료 전환 달성 후 수익화 지표 트래킹
- 궁합 전용 리포트 생성 로직 (LLM 프롬프트 — productCode "compat" 분리는 완료)


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
