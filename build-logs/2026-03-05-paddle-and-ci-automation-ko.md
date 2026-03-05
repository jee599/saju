---
title: "Paddle 결제 통합 + Claude CLI 자동 빌드 로그 파이프라인 구축"
project: "saju_global"
date: 2026-03-05
lang: ko
pair: "2026-03-05-paddle-and-ci-automation-en"
tags: [paddle, payment, ci-cd, claude-code, automation]
---

## 뭘 했나

Stripe 전용이던 결제 시스템에 Paddle을 1차 결제 수단으로 추가하고, Playwright로 8개 로케일 전체 E2E 스모크 테스트를 돌렸다. 동시에 husky pre-push 훅이 Claude CLI를 호출해 빌드 로그를 자동 생성하고, GitHub Actions가 포트폴리오와 블로그 레포에 동기화하는 파이프라인을 완성했다.

## 어떻게 구현했나

작업은 크게 두 갈래였다. 첫째는 Paddle 통합, 둘째는 자동화 파이프라인.

Paddle 통합은 "기존 Stripe/Toss 코드 건드리지 않고, 런타임 환경변수 하나로 전환 가능하게"라는 제약을 먼저 명시했다. Claude에게 `NEXT_PUBLIC_PAYMENT_PROVIDER=paddle` 하나로 분기되는 `effectiveProvider` 로직을 설계하게 했고, `/api/checkout/paddle/create`, `/api/checkout/paddle/webhook` 두 라우트를 새로 생성했다. typecheck와 `next build`를 통과하는 것까지 확인하고 커밋.

더 재밌는 건 자동화 파이프라인이었다. Claude가 생성한 코드를 push할 때마다 Claude가 빌드 로그까지 써준다 — 이 문서가 바로 그 결과물이다. 구조는 이렇다.

> "husky pre-push 훅에서 `claude -p` 로 빌드 로그를 생성하고, GitHub Actions에서 포트폴리오 레포와 블로그 레포로 자동 동기화해줘. 커밋 5개 이상이면 블로그 초안도 만들어줘."

핵심 설계 결정은 `gtimeout 60` 제한이었다. Claude CLI가 무한정 돌면 push 자체가 멈추기 때문에 타임아웃을 걸고, 실패해도 `|| echo "⚠️ 스킵"` 으로 hook 자체가 블로킹하지 않게 했다. 처음엔 `timeout`이 macOS에 없어서 `gtimeout`(coreutils)으로 교체하는 삽질이 있었고, Claude CLI 경로도 상대경로가 안 먹혀 풀패스(`/Users/jidong/.local/bin/claude`)로 고쳐야 했다.

GitHub Actions 쪽에서 Vercel 배포가 Next.js 프레임워크 preset을 못 잡아서 `vercel.json`에 `framework: "nextjs"`를 명시하고, 루트 디렉토리를 `apps/web`으로 설정하고, 환경변수를 맞추고 rebuild를 반복 트리거하는 과정에서 커밋이 5개 쌓였다. 전형적인 배포 삽질이지만 `fix(deploy):` 컨벤션으로 기록은 깔끔하게 남겼다.

런칭 전 감사는 Claude에게 실제 파일 탐색 + `pnpm dev:web` 실행 + HTTP 요청 테스트를 "추측 없이, 모든 근거에 파일 경로 또는 실행 결과 명시"라는 조건으로 요청했다. 레이트 리밋 5회 한도 실측, 8개 로케일 paywall 접근 전부 PASS, P0 결함 없음을 확인했다.

## 커밋 로그

- `82e29d8` chore: add automation setup (Paddle API, Husky hook, GitHub Actions, E2E, 감사 문서 한꺼번에)
- `a6379ed` fix(deploy): set Next.js framework in vercel.json
- `7feb33f` fix(deps): add three and @types/three to web package
- `2e10679` fix: use gtimeout for macOS
- `bb714ce` fix: use full path for claude CLI
- `e659c9b` fix(deploy): ignore husky failure in CI environment
- `3789e6d` fix(deploy): remove .env.local from git tracking
- `5c7cece` chore: trigger rebuild with env vars configured

## 결과

| 항목 | Before | After |
|------|--------|-------|
| 결제 수단 | Stripe + Toss | Stripe + Toss + Paddle (환경변수 전환) |
| 레이트 리밋 | 없음 | 5회/일 (LLM 엔드포인트) |
| E2E 커버리지 | 0 | 8개 로케일 × 핵심 플로우 |
| 빌드 로그 자동화 | 수동 | push 시 Claude CLI 자동 생성 |
| 배포 시간 | — | Vercel framework preset 수동 지정 후 정상화 |
