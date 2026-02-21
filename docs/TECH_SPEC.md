# Technical Spec (MVP Draft)

## 1) Architecture
- Monorepo: pnpm workspaces
- Apps
  - `apps/web`: Next.js(TypeScript), 랜딩 + 무료 사주 폼 + 결과 뷰
  - `apps/mobile`: Expo React Native(TypeScript), 동일한 입력/결과 플로우
- Packages
  - `packages/shared`: 입력/결과 타입, 검증 유틸
  - `packages/api`: Fastify API 서버
- Infra (초안)
  - Web: Vercel
  - API: Render/Fly.io
  - DB: Supabase Postgres or Neon
  - Object Storage: S3-compatible (리포트 파일용)

## 2) Data Model Draft

### `users`
- `id` (uuid, pk)
- `email` (unique, nullable)
- `auth_provider` (text)
- `created_at`, `updated_at`

### `fortune_requests`
- `id` (uuid, pk)
- `user_id` (uuid, nullable)
- `name` (text)
- `birth_date` (date)
- `birth_time` (time, nullable)
- `gender` (enum: male/female/other)
- `calendar_type` (enum: solar/lunar)
- `timezone` (text, default `Asia/Seoul`)
- `created_at`

### `fortune_results`
- `id` (uuid, pk)
- `request_id` (uuid, fk -> fortune_requests.id)
- `engine_version` (text)
- `summary` (text)
- `traits` (jsonb)
- `warnings` (jsonb)
- `score` (int, nullable)
- `created_at`

### `payments`
- `id` (uuid, pk)
- `user_id` (uuid, fk)
- `provider` (text)
- `provider_payment_id` (text)
- `amount` (int)
- `currency` (text)
- `status` (enum: pending/succeeded/failed/refunded)
- `created_at`, `updated_at`

## 3) API Endpoints (MVP)
- `GET /health`
  - 응답: `{ ok: true, service: "api", timestamp: string }`
- `POST /fortune/mock`
  - 요청: `FortuneInput`
  - 응답: `FortuneResult`
  - 동작: 입력값 해시를 기반으로 결정론적(mock) 결과 생성

## 4) Auth Plan
- MVP: 무인증 + 익명 사용 가능
- Phase 2:
  - Clerk/Supabase Auth 도입
  - 이메일 + OAuth (Google, Kakao 후보)
  - JWT 세션 + 서버에서 user_id 매핑

## 5) Payments Integration Plan
- 후보
  - 국내 중심: 토스페이먼츠
  - 글로벌/빠른 도입: Stripe
- 단계
  1. 결제 요청 생성 API (`POST /payments/create`)
  2. 프론트 결제창 호출
  3. webhook으로 최종 결제 상태 검증
  4. 결제 성공 시 `fortune_results` 상세 리포트 unlock
- 보안
  - webhook signature 검증 필수
  - idempotency key 저장
  - 결제 상태는 provider 조회 결과 기준으로 확정

## 6) Environment Variables
- `OPENAI_API_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_API_URL`
- (향후) `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
