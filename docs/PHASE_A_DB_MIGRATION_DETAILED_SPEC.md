# Phase A: DB 전환 + 인프라 정비 (고도화) - 상세 스펙

**프로젝트:** 복연구소 (packages/api)
**현재 상태:** Phase 0/1 QA 통과 (Reset OK)
**목표:** SQLite → Supabase PostgreSQL 전환 + 배포 환경변수 정비
**예상 작업량:** 2-3시간 (로컬 환경 설정 포함)

---

## A-0. 현재 상태 분석

### A-0.1 Prisma Schema 모델 (현재 정의)

| 모델 | 용도 | 관계 | 주요 필드 |
|------|------|------|---------|
| **FortuneRequest** | 입력 기록 | `1:N` Order, `1:N` LlmUsage | id, name, birthDate, birthTime, gender, calendarType, createdAt |
| **Order** | 주문 | `N:1` FortuneRequest, `1:N` Report | id, requestId, productCode, amountKrw, status, createdAt, confirmedAt |
| **Report** | 생성 리포트 | `N:1` Order | id, orderId, model, productCode, headline, summary, sectionsJson, recommendationsJson, disclaimer, generatedAt |
| **LlmUsage** | 토큰/비용 추적 | `N:1` FortuneRequest | id, requestId, provider, model, inputTokens, outputTokens, totalTokens, durationMs, estimatedCostUsd, createdAt |
| **PromptCache** | 프롬프트 캐시 | 독립 | id, cacheKey(unique), provider, model, response, usageJson, createdAt, expiresAt |

**총 5개 모델 / 총 필드 수: ~30개**

### A-0.2 현재 Datasource 설정

**파일:** `/packages/api/prisma/schema.prisma` (라인 5-11)

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**현재 상태:**
- ✓ PostgreSQL provider로 이미 설정됨 (SQLite 아님)
- ✓ DATABASE_URL (pooled) + DIRECT_URL (direct) 구조 이미 정의
- ✓ Prisma v6 사용 중 (`packages/api/package.json` 라인 15-18)

### A-0.3 현재 환경 변수 (검출)

**파일:** `.env.example`

```bash
# DB
# Local (legacy sqlite):
# DATABASE_URL="file:./fortune.db"
#
# Supabase Postgres (recommended):
# Use a pooled URL for runtime, and a direct/non-pooled URL for migrations.
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?schema=public"

# Client API URLs
NEXT_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_API_URL=http://localhost:3001
```

**LLM 제공자 변수 (API 키):**
- `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_MODELS`
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_MODELS`
- `GOOGLE_API_KEY`, `GEMINI_MODEL`, `GEMINI_MODELS`

### A-0.4 DB 초기화 상태

**파일:** `packages/api/prisma/migrations/`

```
20260225051451_init/
  └─ migration.sql (SQLite → PostgreSQL 변환 기록)
migration_lock.toml (PostgreSQL로 잠금)
```

**로컬 파일:**
- `packages/api/prisma/dev.db` (개발용 SQLite, 제거 예정)
- `packages/api/prisma/fortune.db` (백업 가능)

---

## A-1. Supabase 프로젝트 연결

### A-1.1 Supabase 프로젝트 생성/연결

#### 태스크 1.1.1: Supabase 계정 확인 및 프로젝트 생성

**전제:**
- Supabase 계정 보유 (https://supabase.com)
- PostgreSQL 15+ 버전 지원 확인

**수행 단계:**

1. Supabase Dashboard 접속
2. **New Project** > 프로젝트 생성
   - Organization: 복연구소 (또는 기존)
   - Project Name: `fortunelab-db` (권장)
   - Database Password: 강력한 비밀번호 설정 (SSH로 보관)
   - Region: 가장 가까운 지역 (ap-southeast-1 등)
   - Pricing: Free (개발/테스트), Pro (프로덕션)

3. 프로젝트 생성 완료 후 **Settings > Database** 접속

#### 태스크 1.1.2: 연결 문자열 획득

**확인할 정보:**

```
Host: db.XXXXXXXXXX.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [설정값]
```

**두 가지 연결 문자열 생성:**

1. **Pooled URL (DATABASE_URL)** - 런타임용
   ```
   postgresql://postgres:PASSWORD@db.XXXXXXXXXX.supabase.co:6543/postgres?schema=public
   ```
   (주의: 포트 **6543** - pgBouncer 연결 풀러)

2. **Direct URL (DIRECT_URL)** - 마이그레이션용
   ```
   postgresql://postgres:PASSWORD@db.XXXXXXXXXX.supabase.co:5432/postgres?schema=public
   ```
   (주의: 포트 **5432** - 직접 연결)

### A-1.2 로컬/미리보기/프로덕션 환경 분리

#### 태스크 1.2.1: 환경별 .env 파일 생성

**디렉토리 구조:**

```
/Users/jidong/saju_global/
  .env.local              # 로컬 개발 (Supabase dev DB)
  .env.preview            # 프리뷰/테스트 (Supabase staging 또는 main DB 별도 schema)
  .env.production         # 프로덕션 배포 (Vercel 환경변수로 관리)
```

#### 태스크 1.2.2: .env.local 작성 (로컬 개발)

**파일:** `/Users/jidong/saju_global/.env.local`

```bash
# ── Supabase (Local Dev) ──────────────────────────
DATABASE_URL="postgresql://postgres:PASSWORD@db.XXXXXXXXXX.supabase.co:6543/postgres?schema=public"
DIRECT_URL="postgresql://postgres:PASSWORD@db.XXXXXXXXXX.supabase.co:5432/postgres?schema=public"

# ── LLM 제공자 ──────────────────────────────────────
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
OPENAI_MODELS=gpt-5.3,gpt-4.1-mini

ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
ANTHROPIC_MODELS=claude-sonnet-4-6,claude-haiku-4-5-20251001

GOOGLE_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
GEMINI_MODELS=gemini-2.0-flash

# ── Client URLs ──────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_API_URL=http://localhost:3001
```

**보안 주의:**
- `.env.local`을 `.gitignore`에 추가 (이미 추가되어 있는지 확인)
- 비밀값 절대 git에 커밋하지 않음

#### 태스크 1.2.3: Vercel 환경변수 설정 (프로덕션)

**Vercel Dashboard 접속:**
1. Project: 복연구소 (web app)
2. Settings > Environment Variables

**추가할 변수 (프로덕션 배포용):**

| 변수 | 값 | 적용 범위 |
|------|---|---------|
| `DATABASE_URL` | Supabase pooled URL | Production |
| `DIRECT_URL` | Supabase direct URL | Production (마이그레이션 시만 필요) |
| `OPENAI_API_KEY` | sk-... | Production |
| `OPENAI_MODEL` | gpt-4.1-mini | Production |
| `ANTHROPIC_API_KEY` | sk-ant-... | Production |
| `ANTHROPIC_MODEL` | claude-sonnet-4-6 | Production |
| `GOOGLE_API_KEY` | ... | Production |
| `GEMINI_MODEL` | gemini-2.0-flash | Production |

**배포 환경 (Deployment Branches):**
- Production: `main`
- Preview: `develop` (또는 PR 브랜치)

---

## A-2. Prisma Datasource 전환

### A-2.1 Schema.prisma 검증 및 수정

**현재 상태:** ✓ 이미 PostgreSQL 설정됨

**파일:** `/packages/api/prisma/schema.prisma`

**현재 내용 (라인 1-11):**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**필요한 변경:**
- ✓ 변경 불필요 (이미 올바른 설정)
- 마이그레이션 시 `directUrl` 자동 사용

### A-2.2 Prisma 마이그레이션 전략 (Reset OK)

**시나리오:** 데이터 이관 불필요, 데이터베이스 초기화 가능

#### 태스크 2.2.1: Supabase 데이터베이스 초기화

**Supabase Dashboard:**
1. Settings > Database
2. Danger Zone > Reset Database
3. 확인 (데이터 모두 삭제)

또는 **SQL로 스키마 제거:**
```sql
-- Supabase SQL Editor에서 실행
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres;
GRANT CREATE ON SCHEMA public TO postgres;
```

#### 태스크 2.2.2: Prisma 마이그레이션 생성 및 실행

**로컬 명령어:**

```bash
cd /Users/jidong/saju_global

# 1. Prisma 클라이언트 생성
pnpm --filter @saju/api exec prisma generate

# 2. 초기 마이그레이션 생성 (Reset OK이므로 새로 생성)
pnpm --filter @saju/api exec prisma migrate dev --name init_postgres

# 3. 프롬프트에서:
#    - 마이그레이션 이름: "init_postgres" (또는 기본값)
#    - 진행 확인: "yes"
```

**예상 출력:**
```
✔ Successfully created migrations folder at packages/api/prisma/migrations
✔ A new migration was created at packages/api/prisma/migrations/20260226_init_postgres/
✔ Run `pnpm prisma migrate deploy` to apply the migration
✔ Emitting an open telemetry span ... done
```

**생성 파일:**
```
packages/api/prisma/migrations/20260226_init_postgres/
  └─ migration.sql (자동 생성된 CREATE TABLE 등)
```

#### 태스크 2.2.3: 마이그레이션 검증

**Prisma Studio로 확인:**

```bash
pnpm --filter @saju/api exec prisma studio
```

- 브라우저 열림: http://localhost:5555
- 모든 테이블 생성 확인:
  - FortuneRequest
  - Order
  - Report
  - LlmUsage
  - PromptCache

### A-2.3 pgBouncer (Connection Pooler) 주의사항

#### A-2.3.1 Prepared Statements 비활성화 (필수)

**문제:** pgBouncer에서 prepared statements 미지원

**Prisma 설정 (이미 포함):**

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**DATABASE_URL에 쿼리 파라미터 추가 (Supabase에서 자동 적용):**

```
postgresql://...?schema=public&pgbouncer=true
```

**Prisma는 런타임에 자동 처리:**
- `prisma.fortumeRequest.findUnique()` → prepared statement 비사용
- Prisma의 쿼리 캐싱으로 성능 유지

#### A-2.3.2 마이그레이션은 DIRECT_URL 사용

**Prisma CLI 자동 처리:**
```bash
pnpm prisma migrate deploy
# → DIRECT_URL 사용 (포트 5432)
```

---

## A-3. Vercel 배포 환경변수 체크리스트

### A-3.1 필요한 환경변수 전체 목록

#### 데이터베이스 변수

| 변수 | 타입 | 설정처 | 범위 |
|------|------|--------|------|
| `DATABASE_URL` | PostgreSQL Pooled | Supabase > Copy Connection String | Production |
| `DIRECT_URL` | PostgreSQL Direct | Supabase > Copy Connection String | Production (선택) |

**주의:** DIRECT_URL은 마이그레이션 단계에서만 필요하며, 배포 후 생략 가능

#### LLM 제공자 변수

| 변수 | 타입 | 발급처 | 범위 |
|------|------|--------|------|
| `OPENAI_API_KEY` | API Key | platform.openai.com | Production, Preview |
| `OPENAI_MODEL` | String | 설정값 | Production, Preview |
| `ANTHROPIC_API_KEY` | API Key | console.anthropic.com | Production, Preview |
| `ANTHROPIC_MODEL` | String | 설정값 | Production, Preview |
| `GOOGLE_API_KEY` | API Key | console.cloud.google.com | Production, Preview |
| `GEMINI_MODEL` | String | 설정값 | Production, Preview |

#### 클라이언트 변수 (Public)

| 변수 | 타입 | 값 | 범위 |
|------|------|---|------|
| `NEXT_PUBLIC_API_URL` | String | https://api.fortunelab.com (또는 배포된 API URL) | Production, Preview |
| `EXPO_PUBLIC_API_URL` | String | https://api.fortunelab.com (같음) | Production, Preview |

### A-3.2 Vercel 설정 스크린샷/단계

**Vercel Dashboard 경로:**

```
복연구소 (web) Project
  ↓
Settings (상단 메뉴)
  ↓
Environment Variables
  ↓
Add New
```

**입력 형식:**

```
KEY: DATABASE_URL
VALUE: postgresql://postgres:PASSWORD@db.XXXXXXXXXX.supabase.co:6543/postgres?schema=public
Environments: Production / Preview (필요 시 선택)
```

### A-3.3 Vercel Edge/Serverless 제약사항

#### A-3.3.1 PostgreSQL 타임아웃

**제약:** Vercel Serverless Functions (기본 60초 제한)

**영향:**
- 대용량 리포트 생성 시 타임아웃 가능
- `callLlm()` 호출 시 토큰 제한 설정 필수

**현재 코드 (이미 최적화됨):**

```typescript
// /packages/api/src/server.ts (라인 426)
const maxTokens = body.productCode === "deep" ? 6000 : 3500;
```

**확인 사항:**
- ✓ deep 리포트: 6000 토큰 (약 15-20초)
- ✓ standard 리포트: 3500 토큰 (약 8-12초)
- 타임아웃 버퍼 확보됨

#### A-3.3.2 메모리 제약

**제약:** Vercel Serverless 512MB 메모리 (기본)

**영향:**
- Prisma Client 초기화: 약 50-80MB
- LLM API 응답: 약 20-50MB
- 여유: 약 380-430MB ✓

**최적화 (이미 적용됨):**

```typescript
// /packages/api/src/db.ts (라인 1-10)
// Singleton 패턴 → 핫 리로드 시 중복 생성 방지
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
```

#### A-3.3.3 연결 풀링 주의

**제약:** Vercel Serverless는 각 함수 인스턴스가 독립적인 연결 풀 보유

**해결:**
- Supabase 사용으로 자동 pooling (pgBouncer 6543 포트)
- Prisma의 connection pool 크기: 기본 5 (충분)

**모니터링:**
- Supabase Dashboard > Database > Pool Info 확인
- 활성 연결 수 < 200 (Supabase Free 한도)

---

## A-4. Gate 조건 (완료 판단 기준)

### A-4.1 로컬 개발 환경 체크리스트

```bash
□ .env.local 파일 생성 확인
  □ DATABASE_URL (pooled) 설정됨
  □ DIRECT_URL (direct) 설정됨
  □ LLM API 키 3종류 설정됨 (OpenAI, Anthropic, Google)

□ Supabase 연결 테스트
  pnpm --filter @saju/api exec prisma db push
  ✓ 모든 마이그레이션 적용 확인

□ Prisma 클라이언트 생성
  pnpm --filter @saju/api exec prisma generate
  ✓ node_modules/@prisma/client 확인

□ 로컬 개발 서버 실행
  pnpm dev:api
  ✓ Health check: curl http://localhost:3001/health
  ✓ 응답: {"ok":true,"service":"api","timestamp":"..."}

□ 데이터베이스 쓰기 테스트
  curl -X POST http://localhost:3001/checkout/create \
    -H "Content-Type: application/json" \
    -d '{
      "input": {"name":"Test","birthDate":"2000-01-01","birthTime":"12:00","gender":"male","calendarType":"solar"},
      "productCode":"standard"
    }'
  ✓ orderId 응답 확인

  pnpm --filter @saju/api exec prisma studio
  ✓ Order 테이블에 데이터 삽입 확인

□ 타입 체크
  pnpm typecheck:api
  ✓ 모든 타입 검사 통과

□ 빌드 테스트
  pnpm --filter @saju/api run build
  ✓ dist/ 폴더 생성 확인
```

### A-4.2 배포 환경 체크리스트

```bash
□ Vercel 환경변수 설정
  Vercel Dashboard > Settings > Environment Variables
  □ DATABASE_URL (pooled) 설정됨
  □ OPENAI_API_KEY, MODEL 설정됨
  □ ANTHROPIC_API_KEY, MODEL 설정됨
  □ GOOGLE_API_KEY, GEMINI_MODEL 설정됨

□ 배포 테스트
  git push origin main
  ✓ Vercel 자동 배포 시작
  ✓ Build logs 확인 (Prisma generate 성공)
  ✓ Deployment Status: Ready

□ Production Health Check
  curl https://api-fortunelab.vercel.app/health
  ✓ {"ok":true,"service":"api","timestamp":"..."}

□ Production DB 연결 테스트
  curl -X POST https://api-fortunelab.vercel.app/checkout/create \
    -H "Content-Type: application/json" \
    -d '{...}'
  ✓ orderId 응답 확인
```

### A-4.3 QA 게이트 스크립트 통과

```bash
□ 자동 테스트 스크립트
  pnpm test
  ✓ 모든 테스트 통과 (또는 "no test configured" OK)

□ 타입 체크 전체 패키지
  pnpm typecheck
  ✓ 모든 패키지 통과

□ 웹 빌드 테스트
  pnpm --filter @saju/web build
  ✓ .next/ 폴더 생성 확인

□ QA Gate 상태 확인
  pnpm gate:status
  ✓ Phase A 완료 상태 표시
```

### A-4.4 최종 검증

```bash
□ 마이그레이션 상태 확인
  pnpm --filter @saju/api exec prisma migrate status
  ✓ 모든 마이그레이션 "Migrated" 상태

□ 스키마 동기화
  pnpm --filter @saju/api exec prisma db push --skip-generate
  ✓ "Everything is in sync" 메시지

□ Prisma Studio 최종 검증
  pnpm --filter @saju/api exec prisma studio
  ✓ 5개 모델 테이블 모두 표시
  ✓ 쓰기/읽기 테스트 성공
```

---

## A-5. 예상 위험/블로커 및 해결책

### A-5.1 데이터베이스 연결 오류

**증상:**
```
Error: P4001
Can't reach database server at `db.XXXXXXXXXX.supabase.co:5432`
```

**원인:**
1. CONNECTION_URL 오입력 (포트, 호스트, 비밀번호)
2. Supabase IP 화이트리스트 누락 (클라우드만 해당)
3. 로컬 방화벽 차단

**해결:**
```bash
# 1. Supabase URL 재확인
#    Settings > Database > Connection string > URI

# 2. 로컬 테스트 (psql 설치 필요)
psql "postgresql://postgres:PASSWORD@db.XXXXXXXXXX.supabase.co:5432/postgres"
# \q로 종료

# 3. 방화벽 확인
#    Supabase > Project > Settings > Network
#    "Allow all IP addresses" 또는 현재 IP 추가 (develop 환경)
```

### A-5.2 pgBouncer Prepared Statement 오류

**증상:**
```
Error: prepared statement "pstmt_X" does not exist
```

**원인:**
- DATABASE_URL에 `?pgbouncer=true` 파라미터 누락
- Prisma 구버전 (<5.0)

**해결:**
```
# 올바른 DATABASE_URL 형식:
postgresql://...@db.XXXXXXXXXX.supabase.co:6543/postgres?schema=public&pgbouncer=true
```

### A-5.3 마이그레이션 실패

**증상:**
```
Error: Migration step failed.
P3011: A migration failed to apply. Read more about how to resolve migration issues in our docs
```

**원인:**
1. DIRECT_URL이 설정되지 않음
2. 기존 테이블 스키마 충돌
3. Prisma 클라이언트 버전 불일치

**해결:**
```bash
# 1. DIRECT_URL 확인
echo $DIRECT_URL

# 2. 데이터베이스 리셋 (데이터 손실 주의!)
pnpm --filter @saju/api exec prisma migrate reset
# 프롬프트에서 "y" 입력 (기존 마이그레이션 재실행)

# 3. Prisma 버전 확인
pnpm ls prisma
# 6.x 버전 확인
```

### A-5.4 Vercel 배포 실패

**증상:**
```
error: DATABASE_URL is not set (during build)
```

**원인:**
- Vercel 환경변수 누락
- Environment 범위 설정 오류 (Preview만 선택됨)

**해결:**
```
Vercel Dashboard
  ↓ Settings > Environment Variables
  ↓ DATABASE_URL 클릭
  ↓ "All" 또는 "Production" 선택
  ↓ Save
```

### A-5.5 Serverless Timeout 또는 OOM

**증상:**
```
Error: Timeout waiting for the serverless function to complete
Error: Container memory limit exceeded
```

**원인:**
- LLM 응답 시간 초과
- 메모리 누수 (Prisma 연결 풀 미해제)

**해결:**
```typescript
// 1. 타임아웃 단축 (maxTokens 감소)
const maxTokens = body.productCode === "deep" ? 4000 : 2500;

// 2. 연결 풀 크기 제한 (.env 또는 datasource)
// Prisma에서 자동 관리 (수정 불필요)

// 3. API Gateway timeout 확장 (Vercel Pro)
// 기본 60초 → 최대 900초 (Pro 요금제)
```

### A-5.6 Supabase Free Tier 한도 초과

**제약:**
- 데이터베이스 크기: 500MB
- 자동 백업: 7일 보존
- 활성 연결: 10개 (Free), 200개 (Pro)
- 요청률: 제한 없음

**모니터링:**
```
Supabase Dashboard
  ↓ Storage > Database
  ↓ 사용량 확인
```

**증가 시 해결:**
1. Pro 플랜 업그레이드 ($/월)
2. 데이터 정리 (오래된 LlmUsage 삭제)

---

## A-6. 실행 순서 (타임라인)

### Phase A 순차 실행 계획

| 단계 | 작업 | 예상 시간 | 담당 |
|------|------|---------|------|
| 1 | Supabase 프로젝트 생성 & 연결 문자열 획득 | 15분 | @jidong |
| 2 | .env.local 작성 | 5분 | @jidong |
| 3 | Prisma 마이그레이션 (로컬) | 10분 | @jidong |
| 4 | 로컬 개발 환경 테스트 | 15분 | @jidong |
| 5 | Vercel 환경변수 설정 | 10분 | @jidong |
| 6 | 배포 & 배포 테스트 | 20분 | @jidong |
| 7 | QA Gate 실행 | 10분 | @jidong |
| **합계** | | **85분 (~1.5시간)** | |

### 병렬 처리 가능 항목

- 1번: Supabase 프로젝트 생성 중 (초기화 15-30분)
- 5번: Vercel 환경변수 설정 (동시 진행 가능)

---

## A-7. 참고 자료 및 링크

### 공식 문서

1. **Supabase PostgreSQL 연결**
   - https://supabase.com/docs/guides/database/connecting-to-postgres
   - Connection Pooling: https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler

2. **Prisma PostgreSQL**
   - https://www.prisma.io/docs/orm/overview/databases/postgresql
   - Migrations: https://www.prisma.io/docs/orm/prisma-migrate/getting-started

3. **Vercel Environment Variables**
   - https://vercel.com/docs/projects/environment-variables

4. **Vercel Serverless Limits**
   - https://vercel.com/docs/functions/serverless-functions/limits

### 트러블슈팅 링크

- Prisma Error Reference: https://www.prisma.io/docs/orm/reference/error-reference
- Supabase Status: https://status.supabase.com
- Vercel Status: https://www.vercel-status.com

---

## A-8. 롤백 계획

**만약 Phase A 도중 문제가 발생한 경우:**

```bash
# 1. 로컬 개발 환경 롤백 (SQLite 복구)
cd packages/api
rm -rf prisma/migrations/20260226_init_postgres/
cp prisma/dev.db.backup prisma/dev.db
pnpm prisma migrate resolve --rolled-back init_postgres

# 2. .env.local 제거
rm .env.local

# 3. 코드 롤백
git checkout .

# 4. Vercel 환경변수 제거
# (수동으로 Vercel Dashboard에서 DATABASE_URL 삭제)
```

**대체 방안:**
- SQLite 계속 사용 (로컬 전용)
- Cloud SQLite: Turso (litefs.io) 고려

---

## A-9. 이후 Phase B 준비사항

**Phase A 완료 후 준비할 사항:**

- [ ] Phase B 시작: 로그인 벽 제거 (무료 비로그인 모드)
- [ ] GA4 이벤트 트래킹 추가
- [ ] Rate limiting 구현 (API 키 또는 IP 기반)
- [ ] LLM 모델 최적화 & 비용 절감
- [ ] Paywall UX 완성 (유료 구독 플로우)
- [ ] Analytics 대시보드 구성

---

**작성일:** 2026-02-26
**상태:** Phase A 스펙 확정
**다음 단계:** 실행 시작 (A-1.1부터)
