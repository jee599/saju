# Phase A – DB 전환 (SQLite → Supabase Postgres) 실행 가이드

> Repo: `/Users/jidong/saju_global`
> Target: Supabase PostgreSQL + Prisma 유지

## 전제
- 현재 Phase 0/1 QA는 통과 상태
- 사용자는 “데이터 이관 필요 없음(Reset OK)”로 결정

---

## 1) 환경변수 준비
루트의 `.env.example`를 참고해 `.env.local`(또는 로컬에서 사용하는 env 파일)에 아래를 설정합니다.

- `DATABASE_URL`: Supabase **pooled** 연결 문자열(런타임용)
- `DIRECT_URL`: Supabase **direct / non-pooled** 연결 문자열(마이그레이션용)

> 주의: 비밀값이므로 git에 커밋하지 않습니다.

---

## 2) Prisma 마이그레이션 (Reset OK 흐름)

```bash
cd /Users/jidong/saju_global

# API 패키지 기준으로 prisma CLI 실행
pnpm --filter @saju/api exec prisma generate

# (Reset OK) 새 Postgres에 초기 마이그레이션 생성
pnpm --filter @saju/api exec prisma migrate dev --name init_postgres
```

성공하면 Supabase DB에 테이블이 생성됩니다.

---

## 3) QA Gate 재확인

```bash
cd /Users/jidong/saju_global
pnpm test
pnpm typecheck
pnpm -C apps/web build
```

---

## 4) 다음 단계 (Phase B로 진입)
- 로그인 벽 제거(무료 비로그인)
- GA4 이벤트
- rate limit
- 비용 절감(모델 확정)
- paywall 전환 UX
