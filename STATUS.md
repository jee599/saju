# FateSaju STATUS

## 기획

한국 사주(四柱 — 생년월일시를 기반으로 운명을 읽는 전통 점술) AI 리포트 판매 앱.
한국·일본·동남아 다국어 지원. 결제는 Toss(한국), Stripe(글로벌), Paddle(글로벌 대안) 3중 구조.
목표: 런칭 후 첫 유료 전환 달성.


## 아키텍처 현황

```
User → Next.js (apps/web)
  → /api/checkout/{toss|stripe|paddle}/create  → DB(Prisma/Supabase) + 결제 SDK
  → /api/checkout/{toss|stripe|paddle}/webhook → 주문 확정
  → /api/report/preview                         → Claude AI (LLM)
  → /api/fortune/mock                           → Claude AI (LLM)
middleware.ts → Rate Limit (5회/일, IP 기반, Supabase 백엔드)
```


## 완료 (최근 10개)

- Paddle 1차 통합 (환경변수 `NEXT_PUBLIC_PAYMENT_PROVIDER=paddle` 전환)
- Rate limiting 구현 (middleware.ts, LLM 엔드포인트 5회/일)
- Playwright E2E 스모크 (8개 로케일, desktop + iPhone 12)
- 런칭 전 감사 보고서 작성 (CLAUDE_AUDIT_LAUNCH_READINESS_2026-03-05.md)
- husky pre-push 훅: Claude CLI 자동 빌드 로그 생성
- GitHub Actions post-push: 포트폴리오/블로그 레포 자동 동기화 + 이메일 알림
- Vercel 배포 정상화 (framework preset, root directory, env vars)
- i18n 전체 카피 폴리시 (BaZi 점/물결 제거, 구두점 통일)
- 모바일 UI 오버플로 수정 (nav/footer 소형 화면)
- 별자리 배경 constellation 선 추가 (three.js)
- CSS aurora/star 배경 → Three.js CosmicBackground 전환 (z-index 버그 4개 해결, 51줄 삭제)
- husky pre-push 타임아웃 60s → 180/240s 증가


## 진행중

없음 — 런칭 직전 대기 상태.


## 남은 것

- Paddle 웹훅 실 결제 테스트 (sandbox → production 전환)
- ko 로케일 링크 prefix 정책 확정 (default-locale no-prefix vs 강제 prefix)
- 관리자 대시보드 레이트 리밋 모니터링
- 첫 유료 전환 달성 후 수익화 지표 트래킹


## 이슈

- ko 로케일: 내부 링크에 `/ko` prefix 없는 URL 다수 (`/daily`, `/palm` 등). 기능 오류는 아니나 정책 확정 필요.


## 메모

- gtimeout (macOS coreutils) 필요. `brew install coreutils`
- Claude CLI 경로: `/Users/jidong/.local/bin/claude` (상대경로 불가)
- Paddle API: `@paddle/paddle-node-sdk@^3.6.0` 사용


## 기술 결정 로그

- **결제 3중 구조**: Toss(한국) + Stripe(글로벌) + Paddle(글로벌 대안). 런타임 환경변수로 전환. 기존 코드 삭제 없이 추가.
- **Rate limit 백엔드**: Supabase Postgres 선택 (이미 사용 중, 추가 비용 없음, 감사 로그 내장).
- **E2E 위치**: `e2e_temp/` — CI 통합 전 임시 로컬 실행용.
- **husky pre-push timeout**: `gtimeout 180` (pre-push) / `240` (fallback) — Claude CLI 빌드 로그 생성 시간 필요. 실패 시 push는 계속.
- **빌드 로그 자동화**: Claude CLI `-p` 플래그로 비대화형 실행. 타임아웃 초과 시 스킵.


## 주의사항

- `.env.local`은 `.gitignore`에 있음. 배포 시 Vercel 환경변수 직접 설정 필수.
- husky hook은 `auto:`, `docs:` prefix 커밋과 코드 변경 없는 커밋은 스킵.
- Paddle 웹훅 서명 검증은 `apps/web/app/api/checkout/paddle/webhook/route.ts` 에서 처리 — 비활성화하지 마라.
