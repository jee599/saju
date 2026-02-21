# 사주 MVP Monorepo Starter

`pnpm` 워크스페이스 기반의 경량 스타터입니다.

## Included
- `apps/web`: Next.js(TypeScript) 랜딩 + 무료 사주 입력 폼 + 결과 placeholder
- `apps/mobile`: Expo React Native(TypeScript) 동일 입력/결과 흐름
- `packages/shared`: 공통 타입 (`FortuneInput`, `FortuneResult`)
- `packages/api`: Fastify API (`GET /health`, `POST /fortune/mock`, `POST /report/preview`)
- `docs/`: Product brief / Roadmap / Tech spec / 리포트 템플릿 / 용어집 / GTM 전환 플레이북

## Quick Start
1. Node.js 20+ / pnpm 설치
2. 루트에서 의존성 설치

```bash
pnpm install
```

3. 환경변수 파일 준비

```bash
cp .env.example .env
```

4. 앱 실행 (각각 별도 터미널)

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:mobile
```

## Useful Scripts
- `pnpm dev:api`
- `pnpm dev:web`
- `pnpm dev:mobile`
- `pnpm lint`
- `pnpm typecheck`

## Notes
- API 기본 주소: `http://localhost:3001`
- 웹은 `.env`의 `NEXT_PUBLIC_API_URL`을 사용
- 모바일은 `EXPO_PUBLIC_API_URL`을 사용
- 현재 운세/리포트 결과는 입력값 해시 기반 deterministic mock입니다.

## If install is too heavy in your environment
- 현재 레포는 바로 확장 가능한 파일 구조와 코드 스텁을 포함합니다.
- 의존성 설치가 어려운 환경에서도 구조 검토 및 코드 확장은 가능합니다.

## Validation Status
- 실행 일시: 2026-02-21
- `pnpm typecheck` 실행 시도 결과: 실패 (`pnpm: command not found`)
- 미검증 항목: 워크스페이스 전체 타입체크, Next/Fastify 런타임 동작 확인
- 원인: 패키지 매니저(`pnpm`) 미설치 상태로 의존성 설치/검증 불가
