# Fortune Engine v2 — 갭 분석 & 실행 로드맵

> 기준일: 2026-02-25
> 대상 스펙: `docs/fortune-engine-v2-spec.md`
> 현재 레포: `/Users/jidong/saju_global` (pnpm workspaces)
> **Note:** `~/.openclaw/workspace` is legacy — do NOT use.
> 실행 계획: `docs/WORKSTREAM_PLAN.md` (Phase 0 workstream 분리/순서/충돌 방지)

---

## 1. 현재 상태 요약

| 항목 | 현재 | 비고 |
|------|------|------|
| 엔진 | 사주 1개 (mock + LLM) | 손금/이름풀이/관상 없음 |
| LLM 모델 | GPT, Claude, Gemini(비교 스크립트만) | 스펙 요구 5종 중 3종, 웹앱은 2종만 |
| DB | 없음 (전부 in-memory Map) | 재시작 시 전 데이터 소멸 |
| ORM | 없음 | Prisma + SQLite 필요 |
| 스타일 | 커스텀 CSS (400줄+) | Tailwind CSS 전환 필요 |
| 테스트 | 0개 | Jest/Vitest 미설치 |
| CI/CD | 없음 | GitHub Actions 미설정 |
| 캐싱 | 파일 기반 (비교 스크립트만) | 프로덕션 프롬프트 캐싱 미구현 |
| 비용 추적 | 토큰 usage 로깅 (메모리만) | 대시보드/DB 기록 없음 |
| 다국어 | 한국어 하드코딩 | i18n 시스템 없음 |
| 타입 정합성 | 불일치 | web: `ProductCode="full"` vs shared: `"standard"|"deep"` |

---

## 2. 갭 분석 — 카테고리별

### 2.1 엔진 (4종)

| 엔진 | 현재 | V2 요구 | 갭 |
|------|------|---------|-----|
| **사주** | mock(해시 결정론) + GPT/Claude LLM 생성 | 완전한 천간/지지/오행 계산 + 멀티LLM 비교 | 계산 로직 미완, Gemini 미연동 |
| **손금** | 없음 | 이미지 업로드 → AI 분석 → 리포트 | 전체 신규 |
| **이름풀이** | 없음 | 한자/음양오행 분석 → 리포트 | 전체 신규 |
| **관상** | 없음 | 이미지 업로드 → AI 분석 → 리포트 | 전체 신규 |

**핵심 갭**: 사주 엔진조차 "mock 기반"이며, 실제 사주 계산 모듈(천간/지지 매핑, 대운 계산)이 없음. V2 스펙의 Gate 규칙상, 사주 엔진이 완벽해야 손금으로 넘어갈 수 있음.

### 2.2 LLM 멀티모델

| 모델 | 현재 상태 | 위치 | V2 요구 |
|------|----------|------|---------|
| Claude (Sonnet) | 연동됨 | `llm.ts`, `llmEngine.ts` | 유지 |
| GPT (4.1-mini) | 연동됨 | `llm.ts`, `llmEngine.ts` | 유지 |
| Gemini | `packages/api/src/llm.ts`에 추가, 비교 스크립트 | 웹앱 미반영 | 웹앱까지 확장 |
| *모델4 (미정)* | 없음 | — | 추가 필요 (예: Mistral, Llama) |
| *모델5 (미정)* | 없음 | — | 추가 필요 |

**핵심 갭**:
- 웹앱(`apps/web/lib/llmEngine.ts`)에 Gemini 미반영
- `ReportModel` 타입이 web과 shared에서 이중 정의 (동기화 필요)
- 5종 비교 UI/대시보드 미구현

### 2.3 인프라 & 데이터

| 항목 | 현재 | V2 요구 | 난이도 |
|------|------|---------|--------|
| DB | 없음 | Prisma + SQLite | 중 |
| 프롬프트 캐싱 | 파일 해시 (스크립트만) | DB 기반 + Anthropic prompt-caching API | 중 |
| 비용 기록 | 없음 | `llm_usage` 테이블, 모델별 집계 | 중 |
| 이미지 저장 | 없음 | S3-compatible (손금/관상용) | 중 |
| 환경변수 | 3개 키 | 5종 모델 키 + DB + 캐싱 플래그 | 저 |

### 2.4 프론트엔드

| 항목 | 현재 | V2 요구 | 난이도 |
|------|------|---------|--------|
| CSS | 커스텀 400줄+ | Tailwind CSS | 중 |
| 컴포넌트 | `ui.tsx` 1파일 | 디자인 시스템 (shadcn/ui 또는 유사) | 중 |
| 라우팅 | 사주 전용 | 4엔진 허브 + 각 엔진별 플로우 | 고 |
| 비교 대시보드 | 없음 | 모델별 병렬 보고서 뷰 + 비용/품질 테이블 | 고 |
| 다국어 | 없음 | next-intl 또는 유사 | 중 |

### 2.5 품질 & QA

| 항목 | 현재 | V2 요구 |
|------|------|---------|
| 단위 테스트 | 0개 | 엔진 로직 커버리지 80%+ |
| 통합 테스트 | 0개 | API 엔드포인트 smoke test |
| E2E 테스트 | 0개 | 핵심 플로우 (입력→리포트) |
| CI 파이프라인 | 없음 | typecheck → test → build → deploy |
| QA Gate 자동화 | 없음 | Phase별 완료 기준 검증 스크립트 |
| 텍스트 QA | 수동 | 과장/단정 자동 감지 (선택) |

---

## 3. 타입 정합성 이슈

현재 **두 개의 타입 시스템**이 공존:

```
packages/shared/src/index.ts     →  ProductCode = "standard" | "deep"
apps/web/lib/types.ts            →  ProductCode = "full"
```

이 불일치는 V2 진행 전 반드시 해소해야 함:
- **제안**: `packages/shared`를 Single Source of Truth로 통일
- web의 `lib/types.ts`를 shared에서 re-export하거나 삭제
- `ProductCode`는 `"standard" | "deep"` 또는 V2에 맞게 재정의

---

## 4. 실행 로드맵 (Phase 순서)

V2 스펙의 **Gate 규칙**: "엔진이 완벽해질 때까지 절대 다음 단계로 넘어가지 않는다"

이 규칙을 반영한 순서:

```
┌─────────────────────────────────────────────────────────┐
│  Phase 0: 기반 정비 (Gate 시스템 + 타입 통일 + 인프라)      │
│  ─────────────────── GATE 0 ────────────────────────────│
│  Phase 1: 사주 엔진 완성                                 │
│  ─────────────────── GATE 1 ────────────────────────────│
│  Phase 2: 손금 엔진                                      │
│  ─────────────────── GATE 2 ────────────────────────────│
│  Phase 3: 이름풀이 엔진                                  │
│  ─────────────────── GATE 3 ────────────────────────────│
│  Phase 4: 관상 엔진                                      │
│  ─────────────────── GATE 4 ────────────────────────────│
│  Phase 5: API 통합 + 프롬프트 캐싱                       │
│  ─────────────────── GATE 5 ────────────────────────────│
│  Phase 6: UI/UX + 다국어                                │
│  ─────────────────── GATE 6 ────────────────────────────│
│  Phase 7: 비용 추적 대시보드 + 런칭 준비                  │
└─────────────────────────────────────────────────────────┘
```

### Phase 0: 기반 정비 (선행 필수)

**목적**: 이후 모든 Phase가 의존하는 인프라 구축

| # | 작업 | 산출물 |
|---|------|--------|
| 0-1 | 타입 통일 (`shared` SSoT) | `ProductCode` 정의 통일, web 타입 shared로 마이그레이션 |
| 0-2 | Prisma + SQLite 셋업 | `prisma/schema.prisma`, migration, seed 스크립트 |
| 0-3 | 테스트 인프라 (Vitest) | `vitest.config.ts`, 첫 smoke test 1개 |
| 0-4 | CI 파이프라인 | `.github/workflows/ci.yml` (typecheck → test → build) |
| 0-5 | QA Gate 자동화 스크립트 | `scripts/qa_gate.ts` — Phase별 완료 기준 검증 |
| 0-6 | LLM 프로바이더 통합 | 5종 모델 callLlm 통합 (llm.ts + 웹앱 동기화) |
| 0-7 | .env 정리 | 5종 API 키 + DB URL + 기능 플래그 |

**Gate 0 통과 조건**:
- [ ] `pnpm typecheck` 전체 통과
- [ ] `pnpm test` 통과 (최소 1개)
- [ ] `pnpm build` 통과
- [ ] Prisma migrate 정상
- [ ] 5종 LLM callLlm smoke test 통과
- [ ] qa_gate.ts --phase=0 성공

---

### Phase 1: 사주 엔진 완성

**목적**: mock → 실제 사주 계산 + 5종 LLM 비교 품질 확보

| # | 작업 | 산출물 |
|---|------|--------|
| 1-1 | 사주 계산 모듈 | `packages/engine/saju/` — 천간/지지 매핑, 오행 분석, 대운 계산 |
| 1-2 | 프롬프트 v2 | 계산 결과를 LLM에 넘기는 구조화된 프롬프트 |
| 1-3 | 5종 모델 병렬 생성 | 동일 입력 → 5개 보고서 동시 생성 |
| 1-4 | 품질 자동 스코어링 | 빈 섹션 수, 글자 수, JSON 유효성, 금지 표현 검출 |
| 1-5 | 비용 DB 기록 | `llm_usage` 테이블에 매 호출 기록 |
| 1-6 | 단위 테스트 | 사주 계산 로직 커버리지 80%+, 프롬프트 파싱 테스트 |
| 1-7 | 비교 러너 업그레이드 | `scripts/llm_compare.ts` → 5종 + DB 기록 + 자동 스코어링 |

**Gate 1 통과 조건**:
- [ ] 사주 계산: 10개 표준 테스트 케이스 100% 정답
- [ ] 5종 LLM 모두 유효 JSON 리포트 생성 (성공률 95%+)
- [ ] 금지 표현(단정/공포/의료 단정) 자동 검출 0건
- [ ] 글자 수: 유료 기준 ±25% 이내
- [ ] 비용 기록: 모든 호출 DB 저장 확인
- [ ] `pnpm test` 전체 통과
- [ ] qa_gate.ts --phase=1 성공

---

### Phase 2: 손금 엔진

**Gate 1 통과 전 착수 금지**

| # | 작업 |
|---|------|
| 2-1 | 이미지 업로드 API (multer/S3) |
| 2-2 | 손금 분석 프롬프트 설계 (이미지→텍스트 분석) |
| 2-3 | Vision API 연동 (GPT-4o Vision, Claude Vision, Gemini Vision) |
| 2-4 | 리포트 스키마 정의 (손금 전용 섹션) |
| 2-5 | 테스트: 표준 손금 이미지 5장 × 3종 모델 |

**Gate 2 통과 조건**:
- [ ] 표준 이미지 5장 모두 유효 리포트 생성
- [ ] JSON 파싱 성공률 95%+
- [ ] qa_gate.ts --phase=2 성공

---

### Phase 3: 이름풀이 엔진

**Gate 2 통과 전 착수 금지**

| # | 작업 |
|---|------|
| 3-1 | 한자 분해/음양오행 매핑 로직 |
| 3-2 | 이름풀이 프롬프트 설계 |
| 3-3 | 리포트 스키마 정의 |
| 3-4 | 5종 모델 비교 테스트 |

**Gate 3 통과 조건**: Phase 1과 동일 패턴 (테스트 케이스, 성공률, 금지 표현)

---

### Phase 4: 관상 엔진

**Gate 3 통과 전 착수 금지**

Phase 2(손금)와 유사한 Vision 기반 파이프라인.

---

### Phase 5~7

Gate 4 통과 후 진행. API 통합 캐싱 → UI/다국어 → 비용 대시보드 순서.

---

## 5. QA Gate 시스템 설계

### 5.1 아키텍처

```
scripts/qa_gate.ts --phase=N
        │
        ▼
┌─────────────────────────┐
│  1. 정적 검증            │  typecheck, lint, build
│  2. 테스트 실행           │  vitest (해당 phase 태그)
│  3. Phase별 커스텀 체크    │  계산 정확도, LLM 성공률 등
│  4. 결과 기록             │  .qa/gate-results.json
│  5. Pass/Fail 판정        │  ALL pass → phase 완료 기록
└─────────────────────────┘
        │
        ▼ (Fail 시)
  PR merge 차단 / 다음 Phase 작업 차단
```

### 5.2 Gate 상태 파일

```jsonc
// .qa/gate-status.json (git tracked)
{
  "gates": {
    "0": { "status": "passed", "passedAt": "2026-03-01T10:00:00Z", "hash": "abc123" },
    "1": { "status": "in_progress", "passedAt": null },
    "2": { "status": "blocked", "blockedBy": 1 },
    "3": { "status": "blocked", "blockedBy": 2 },
    "4": { "status": "blocked", "blockedBy": 3 }
  }
}
```

### 5.3 CI 연동

```yaml
# .github/workflows/ci.yml (요약)
jobs:
  gate-check:
    steps:
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - run: pnpm tsx scripts/qa_gate.ts --phase=current
      # PR 라벨에 'phase-N' 포함 시 해당 Gate 검증
      # Gate 미통과 시 merge 차단
```

### 5.4 개발 플로우에 반영하는 방법

#### 규칙 1: 브랜치 네이밍 강제

```
phase-0/setup-prisma
phase-1/saju-calc-module
phase-1/llm-5model-compare
phase-2/palmistry-upload    ← Gate 1 미통과 시 PR merge 차단
```

#### 규칙 2: PR merge 조건

```
PR → phase-N/* 브랜치:
  1. CI 전체 통과 (typecheck + test + build)
  2. 해당 Phase의 qa_gate 통과
  3. Gate N-1이 이미 passed 상태

  세 조건 모두 충족해야 merge 가능
```

#### 규칙 3: 로컬 개발 시 Gate 확인

```bash
# 현재 Phase 상태 확인
pnpm gate:status

# 특정 Phase Gate 실행
pnpm gate:check 1

# 다음 Phase 착수 가능 여부 확인
pnpm gate:next
```

#### 규칙 4: Gate 통과 이력 관리

- `.qa/gate-status.json`은 git에 커밋
- Gate 통과 시 자동으로 커밋 해시 기록
- 이후 Phase에서 이전 Phase 코드를 깨뜨리면 → 이전 Gate 재검증 트리거

### 5.5 제안하는 pnpm 스크립트

```json
{
  "gate:status": "tsx scripts/qa_gate.ts --status",
  "gate:check": "tsx scripts/qa_gate.ts --phase",
  "gate:next": "tsx scripts/qa_gate.ts --next"
}
```

---

## 6. 우선순위 액션 아이템 (즉시 착수 가능)

### 즉시 (이번 주)

| 우선순위 | 작업 | 이유 |
|---------|------|------|
| P0 | 타입 통일 (web↔shared) | 모든 작업의 전제조건, 현재 빌드는 되지만 런타임 불일치 위험 |
| P0 | Prisma + SQLite 셋업 | 비용 기록, 캐싱, 리포트 저장 모두 DB 의존 |
| P0 | Vitest 설치 + 첫 테스트 | Gate 시스템의 기반 |
| P1 | QA Gate 스크립트 골격 | Phase 진행 관리의 핵심 |
| P1 | 웹앱 Gemini 연동 | 이미 API에 추가됨, 웹앱 llmEngine.ts 동기화만 필요 |

### 단기 (2주 내)

| 우선순위 | 작업 | Phase |
|---------|------|-------|
| P1 | GitHub Actions CI | 0 |
| P1 | 사주 계산 모듈 시작 (천간/지지) | 1 |
| P2 | Tailwind CSS 마이그레이션 | 0 |
| P2 | llm_usage DB 테이블 + 기록 로직 | 1 |

### 중기 (4주 내)

| 우선순위 | 작업 | Phase |
|---------|------|-------|
| P2 | 사주 프롬프트 v2 (계산 결과 기반) | 1 |
| P2 | 5종 모델 자동 비교 + 스코어링 | 1 |
| P3 | 비교 대시보드 UI | 1~5 |
| P3 | 프롬프트 캐싱 (Anthropic beta) | 5 |

---

## 7. 리스크 & 의사결정 필요 항목

| # | 항목 | 선택지 | 권장 |
|---|------|--------|------|
| R1 | 4~5번째 LLM 모델 선정 | Mistral / Llama(로컬) / Cohere / DeepSeek | Mistral + DeepSeek (비용 다양성) |
| R2 | 사주 계산 라이브러리 | 직접 구현 vs lunar-javascript 활용 vs 한국 오픈소스 | lunar-javascript 기반 확장 |
| R3 | 이미지 분석 모델 (손금/관상) | GPT-4o Vision / Claude Vision / Gemini Vision | 3종 병렬 비교 (Phase 2에서) |
| R4 | DB 선택 | SQLite(로컬) vs Postgres(Supabase) | Phase 0~4: SQLite, Phase 5+: Postgres 전환 |
| R5 | ProductCode 통일 | `"standard"|"deep"` vs `"full"` vs 새 체계 | V2 엔진별 `"saju"|"palm"|"name"|"face"` + 등급 분리 |

---

## 8. 요약: 현재 위치와 다음 한 걸음

```
현재: ████░░░░░░░░░░░░░░░░  Phase 0 (기반 정비) 진입 전
목표: ████████████████████  Phase 7 (런칭 준비) 완료

다음 한 걸음:
  1. 타입 통일 (30분)
  2. Prisma 셋업 (1시간)
  3. Vitest + 첫 테스트 (30분)
  4. qa_gate.ts 골격 (1시간)
  → Gate 0 통과 → Phase 1 착수
```
