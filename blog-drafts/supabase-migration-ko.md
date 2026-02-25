---
title: "Supabase 연결하는데 3번 틀렸다 — Prisma + Supabase 실전 삽질기"
published: false
description: "SQLite에서 Supabase PostgreSQL로 전환하면서 겪은 IPv4, pooler 리전, cross-schema 문제와 해결법"
tags: [prisma, supabase, postgresql, database]
series: AI 사주 앱 빌드 로그
---

Prisma에서 SQLite를 PostgreSQL로 바꾸는 건 provider 한 줄이면 된다고 했다. 거짓말은 아니다. 근데 Supabase에 실제로 연결하는 데서 3번 연속 실패했다.

## 왜 전환했나

로컬 SQLite로 개발하고 있었는데 프로덕션을 생각하면 답이 없었다. 동시 접속, 서버리스 환경, 데이터 보관 정책 — 전부 PostgreSQL이 필요한 이유였다. Supabase 무료 플랜으로 시작하기로 했다.

## 1단계: provider 변경 — 이건 진짜 쉬웠다

```prisma
// Before
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// After
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

`prisma migrate diff --from-empty --to-schema-datamodel`로 PostgreSQL용 SQL을 뽑았다. `DATETIME` → `TIMESTAMP(3)`, `REAL` → `DOUBLE PRECISION` 같은 타입 변환은 Prisma가 알아서 해줬다. 여기까진 순조로웠다.

## 삽질 1: "Can't reach database server"

```
Error: P1001: Can't reach database server at
db.ngrfhhkrmjvumrznzhmn.supabase.co:5432
```

DNS가 안 풀렸다. `nslookup`을 때려보니 A 레코드가 없다. Supabase 대시보드를 열어보니 "Not IPv4 compatible"이라는 경고가 있었다. Direct connection은 IPv6 전용이었다.

교훈: Supabase 무료 플랜의 direct DB는 IPv6만 지원한다. IPv4 네트워크에서는 Connection Pooler를 써야 한다.

## 삽질 2: "Tenant or user not found"

pooler로 바꿨다. 근데 이번엔 다른 에러.

```
FATAL: Tenant or user not found
```

리전을 `aws-0-ap-northeast-2`로 때려넣었는데, 실제 프로젝트 pooler는 `aws-1-ap-south-1`이었다. Supabase 대시보드 Connect > ORMs 탭에서 확인한 실제 주소:

```
postgresql://postgres.[REF]:[PW]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

교훈: pooler 호스트를 추측하지 마라. Supabase 대시보드에서 복사해라.

## 삽질 3: "Cross schema references"

연결은 됐다. 근데 `prisma migrate dev`가 또 실패.

```
Error: P4002
public.profiles points to auth.users in constraint profiles_id_fkey
```

Supabase가 기본으로 만들어놓은 `profiles` 테이블이 `auth.users`를 참조하고 있었다. Prisma는 `public` 스키마만 보는데 `auth` 스키마의 FK를 만나면 당황한다.

해결법: introspection을 우회했다.

```bash
# SQL을 직접 실행 (introspection 없이)
prisma db execute --stdin < migration.sql

# 마이그레이션을 baseline으로 등록
prisma migrate resolve --applied "20260225_init_postgresql"
```

`migrate dev`나 `db push` 대신 SQL을 직접 밀어넣고 resolve로 마킹하면 cross-schema 문제를 깔끔하게 피할 수 있다.

## 최종 결과

```
Test Files  4 passed (4)
     Tests  99 passed (99)
```

DB 테스트가 실제 Supabase에 연결되어 CRUD까지 통과. 5개 테이블(FortuneRequest, Order, Report, LlmUsage, PromptCache) 전부 생성 완료.

vitest 설정에서 하드코딩된 SQLite 경로도 제거하고, QA 게이트 스크립트의 SQLite 참조도 잡았다. `grep -r sqlite` 결과 0건.

## Prisma + Supabase 연결 정리

```env
# 쿼리용 (pgbouncer, port 6543)
DATABASE_URL="postgresql://postgres.[REF]:[PW]@aws-X-region.pooler.supabase.com:6543/postgres?pgbouncer=true"

# 마이그레이션용 (session mode, port 5432)
DIRECT_URL="postgresql://postgres.[REF]:[PW]@aws-X-region.pooler.supabase.com:5432/postgres"
```

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

> "DB 전환은 provider 한 줄이지만, 실제 연결은 인프라 문제다. Supabase 대시보드 ORMs 탭에서 복붙하는 게 정답이다."
