# FateSaju – Production Master Plan 구현 현황 / 앞으로 할 일

> 기준 문서(캐노니컬): `docs/PRODUCTION_MASTER_PLAN_2026-02-25.md`
>
> 프로젝트 루트: `/Users/jidong/saju_global`
>
> 작성일: 2026-02-26

---

## 0) 한 줄 요약
- **구현 완료:** Phase 0(기반 정비) + Phase 1(사주 엔진/프롬프트/QA) 중심의 “코어 기반”
- **미구현(핵심):** Phase A(DB 전환: Supabase Postgres) + Phase B(P0 런칭 블로커: 로그인 제거/GA4/Rate limit/비용절감/Paywall/i18n 등)

---

## 1) 현재 구현/완료된 것 (Master Plan의 “완료된 것” 기준)

### 1.1 Phase 0: 기반 정비 ✅
- 타입 통일 / 공용 타입 SSoT 정비
- Prisma + SQLite 셋업
- Vitest + 테스트 인프라
- QA Gate 스크립트

### 1.2 Phase 1: 사주 엔진 ✅
- `packages/engine/saju/` 만세력 엔진 (@saju/engine-saju)
- 골든 케이스 42개 + 테스트 99개 통과

### 1.3 LLM 프롬프트 v2 ✅
- 사주 해석 프롬프트 + QA 테스트 구성

### 1.4 멀티 LLM 비교 ✅ (2회 실행)
- `inbox/llm-compare/`에 결과 저장

### 1.5 웹앱 기본 라우트/구조 ✅
- Coming Soon 라우트 존재: `/face`, `/name`, `/palm`
- 기본 UI 존재: 입력폼, 리포트, paywall CTA

### 1.6 블로그 자동 생성 ✅
- dev-blog(별도 repo) 자동 생성 파이프라인 존재(단, dev.to 배포는 별도 운영 이슈 가능)

---

## 2) 미완료/변경 필요 항목 (Master Plan ‘미완료’ 목록 기준)

> 아래는 “문서상 필요”이며, 아직 전부 구현되었다고 보기 어려운 항목들이다.

### 2.1 Phase A: DB 전환 + 인프라 정비 ❌ (미착수)
- SQLite → Supabase PostgreSQL 전환
- Prisma datasource 전환 + 마이그레이션 전략 확정
- 로컬/프리뷰/프로덕션 환경 분리 및 env 규칙 확립
- Vercel 배포 점검(빌드/런타임/환경변수)

### 2.2 Phase B: P0 런칭 블로커 ❌ (미착수)
- 로그인 벽 제거(무료 비로그인, 결제 시 이메일만)
- 입력폼 UX 변경(인라인 2스텝)
- 결제 라우팅(한국 Toss + 글로벌 Stripe + 인도 Razorpay)
- GA4 퍼널 이벤트 10개 구현
- Rate limiting (IP+fingerprint+UUID) + 일 5회 제한
- 비용 절감(무료 1건 $0.002 목표) + 모델 확정(6모델 비교 기반)
- LLM 실패/429/timeout UX
- 리포트 paywall 강화(CTA 3중 + 모바일 스티키)
- 미니 궁합(무료 바이럴)
- 리포트 보관(무료 90일/유료 영구 + 크론)
- 6개국 i18n + 8레이어 아키텍처 + K-Astrology 브랜딩
- 카카오 공유 + OG
- 랜딩 리디자인(Soft Lavender 다크테마)
- 리텐션(월간 미니 운세/신년운세/브라우저 알림)
- 배포 점검(“🔄 확인 필요”)

---

## 3) 앞으로 구현할 상황(실행 순서 제안)

### 3.1 다음 1순위: Phase A (DB 전환)
**왜 먼저?** DB/환경분리/Vercel이 안정화되기 전에는 Phase B 기능을 붙여도 계속 깨질 확률이 큼.

**Gate(완료 조건) 제안**
- `pnpm test` 통과
- `pnpm typecheck` 통과
- `pnpm -C apps/web build` 통과
- Supabase 연결된 Preview 배포 확인

**실행 체크리스트**
1) Supabase 프로젝트 생성/연결
2) Prisma datasource Postgres로 전환
3) 로컬/프리뷰/프로덕션 env 분리 (.env.example 정리)
4) Vercel 배포 환경변수 설정 + 빌드 확인

### 3.2 Phase B (P0 런칭 블로커) – 우선순위 번들
- B-1: 로그인 벽 제거 + 결제 시 이메일 수집 UX
- B-2: GA4 이벤트 + 퍼널 측정
- B-3: Rate limiting + abuse 방지
- B-4: 비용 절감 + 모델 확정(6모델 테스트)
- B-5: paywall/리포트 전환 UX(CTA 3중 + 스티키)
- B-6: 미니 궁합(바이럴 루프)

---

## 4) 현재 상태 확인 커맨드(문서 기준)
```bash
cd /Users/jidong/saju_global
pnpm test
pnpm typecheck
pnpm -C apps/web build
```

---

## 5) 다음 액션(결정 필요)
- Supabase 프로젝트: 신규 생성 vs 기존 사용?
- SQLite 데이터: 유지/이관 필요 여부?
- Preview/Prod 환경: Supabase 분리 운영 여부?
