# Workstream 운영 계획

> 작성일: 2026-02-25
> 목적: Phase 0 기반 정비 작업을 병렬 가능하게 분리하되, 파일 충돌 없이 순차 merge
>
> **Canonical project root:** `/Users/jidong/saju_global`
> **Warning:** `~/.openclaw/workspace` is a legacy path from the OpenClaw agent
> environment and must NOT be used. All paths below are relative to the canonical root.

---

## Workstream 목록 & 실행 순서

```
E (LLM Compare Runner)  ──┐
F (Docs 정리)             ──┼── 병렬 가능 (파일 겹침 없음)
G (Blog 자동화 파이프라인) ──┘

        ↓ merge

A (타입 통일)  ← 선행 필수: 없음

        ↓ merge

B (Prisma/SQLite)  ← 선행: A

        ↓ merge

C (Vitest + 첫 테스트)  ← 선행: A, B

        ↓ merge

D (QA Gate 스크립트)  ← 선행: C
```

---

## Workstream E: LLM Compare Runner 확장

| 항목 | 내용 |
|------|------|
| Scope | `scripts/llm_compare.ts`, `.env.example` |
| 산출물 | Provider별 다중 모델(2+2+1~2) 비교 러너, 모델별 파일 출력 |
| 의존성 | 없음 (독립) |
| Merge 순서 | 1 (가장 먼저) |
| 검증 | `pnpm compare:llm` 실행, 키 없을 때 친절한 에러 확인 |

변경 요약:
- MODELS 단일값 → `OPENAI_MODELS`, `ANTHROPIC_MODELS`, `GEMINI_MODELS` 콤마 리스트
- 출력 파일: `{provider}-{model}.md` (예: `openai-gpt-5.3.md`, `claude-sonnet-4-6.md`)
- Gemini 429 시 친절한 안내 + 다른 모델 계속 진행
- OpenAI 모델 미발견 시 가이드 메시지
- 캐시 키에 모델명 포함
- summary.json에 모델별 usage/cost/latency + 합계

---

## Workstream F: Docs 정리

| 항목 | 내용 |
|------|------|
| Scope | `docs/ENGINE_V2_GAP_AND_ROADMAP.md` 업데이트 |
| 산출물 | V2 스펙 링크 정리, workstream 계획 크로스 레퍼런스 |
| 의존성 | 없음 (독립) |
| Merge 순서 | 1 (E와 동시) |
| 검증 | 문서 내용 확인 |

---

## Workstream G: Blog 자동화 파이프라인

| 항목 | 내용 |
|------|------|
| Scope | `/Users/jidong/dev-blog/` (별도 레포) |
| 산출물 | raw/ 저장 프로세스 문서화, 2개 이상 시 통합 포스트 생성 워크플로 정의 |
| 의존성 | 없음 (별도 레포) |
| Merge 순서 | 1 (E, F와 동시) |
| 검증 | CLAUDE.md 규칙 준수 확인 |

규칙 요약 (dev-blog/CLAUDE.md):
- raw/ 에 2개 이상 쌓이면 posts/ 에 통합 포스트 자동 생성
- 한/영 동시 생성, 보안 마스킹, 캐주얼 톤, 1500~2500자
- 파일명: `{YYYY-MM-DD}-{영문slug}.md` + `.en.md`

---

## Workstream A: 타입 통일

| 항목 | 내용 |
|------|------|
| Scope | `packages/shared/src/index.ts`, `apps/web/lib/types.ts` |
| 산출물 | ProductCode 통일, web types를 shared에서 re-export |
| 의존성 | 없음 |
| Merge 순서 | 2 (E/F/G 이후) |
| 검증 | `pnpm typecheck` 전체 통과 |

현재 불일치:
- `packages/shared`: `ProductCode = "standard" | "deep"`
- `apps/web/lib/types.ts`: `ProductCode = "full"`

---

## Workstream B: Prisma/SQLite 셋업

| 항목 | 내용 |
|------|------|
| Scope | `packages/api/prisma/`, `packages/api/package.json`, `packages/api/src/db.ts` |
| 산출물 | schema.prisma, 초기 migration, DB client 래퍼 |
| 의존성 | A (타입이 정리되어야 스키마 확정 가능) |
| Merge 순서 | 3 |
| 검증 | `pnpm prisma migrate dev` 성공, `pnpm typecheck:api` 통과 |

---

## Workstream C: Test Infra (Vitest)

| 항목 | 내용 |
|------|------|
| Scope | root `vitest.config.ts`, `packages/api/src/__tests__/`, root `package.json` (test script) |
| 산출물 | Vitest 설치, 첫 smoke test (health endpoint, 타입 검증) |
| 의존성 | A, B |
| Merge 순서 | 4 |
| 검증 | `pnpm test` 통과 |

---

## Workstream D: QA Gate 스크립트

| 항목 | 내용 |
|------|------|
| Scope | `scripts/qa_gate.ts`, `.qa/gate-status.json`, root `package.json` (gate scripts) |
| 산출물 | Phase별 Gate 검증 스크립트, 상태 파일 |
| 의존성 | C (테스트가 있어야 Gate에 포함 가능) |
| Merge 순서 | 5 |
| 검증 | `pnpm gate:check 0` 통과 |

---

---

## Phase 1 Workstreams

> Phase 0 Gate 통과 (2026-02-25). Phase 1 착수.

### 실행 순서

```
1-A (골든 케이스 + 엔진 패키지)  ← 완료
        ↓
1-B (사주 계산 모듈 구현)  ← 완료 (lunar-typescript 기반)
        ↓
1-C (Gate 1 업데이트)  ← 완료
        ↓
1-D (LLM 프롬프트 v2 + 5종 비교)  ← 다음
        ↓
1-E (비용 DB 기록 + 스코어링)
```

### Workstream 1-A: 골든 테스트 케이스 (완료)

| 항목 | 내용 |
|------|------|
| Scope | `packages/engine/saju/src/__tests__/fixtures/golden-cases.json` |
| 산출물 | 42개 골든 케이스 (경계값 위주: 입춘/야자시/절기/윤년/12시주) |
| 검증소스 | A2: lunar-typescript + @fullstackfamily/manseryeok 교차 검증 |
| 상태 | ✅ 완료 — 76/76 테스트 통과 |

### Workstream 1-B: 사주 계산 모듈 (완료)

| 항목 | 내용 |
|------|------|
| Scope | `packages/engine/saju/` (새 패키지) |
| 산출물 | `calculateFourPillars()` API, 타입 정의 |
| 엔진 | lunar-typescript v1.8.6 (exact 입춘/절기 boundaries) |
| 의존성 | lunar-typescript, @fullstackfamily/manseryeok (검증용) |
| 상태 | ✅ 완료 — 42 골든 케이스 100% 통과 |

교차 검증 결과:
- **일치**: 대부분 케이스 (일반 날짜, 윤년, 12시주 등)
- **차이**: 진태양시(~32분) 보정 관련 경계 케이스
  - manseryeok: 서울 경도 기준 진태양시 보정 적용
  - lunar-typescript: 표준시 기반 (보정 없음)
  - → 표준시 기반 채택 (보편적 접근, 추후 옵션으로 진태양시 추가 가능)

### Workstream 1-C: Gate 1 업데이트 (완료)

| 항목 | 내용 |
|------|------|
| Scope | `scripts/qa_gate.ts` Phase 1 체크 |
| 산출물 | 골든 테스트 100% 통과 체크, 엔진 typecheck |
| 상태 | ✅ 완료 |

### Workstream 1-D: LLM 프롬프트 v2 + 5종 비교 (예정)

| 항목 | 내용 |
|------|------|
| Scope | `packages/api/src/reportPrompt.ts`, `scripts/llm_compare.ts` |
| 산출물 | 사주 계산 결과 기반 구조화 프롬프트, 5종 모델 비교 |
| 의존성 | 1-B |

### Workstream 1-E: 비용 DB 기록 + 스코어링 (예정)

| 항목 | 내용 |
|------|------|
| Scope | `packages/api/src/`, `scripts/qa_gate.ts` |
| 산출물 | llm_usage DB 기록, 자동 품질 스코어링 |
| 의존성 | 1-D |

### Phase 1 파일 소유권

| 파일/디렉토리 | 1-A | 1-B | 1-C | 1-D | 1-E |
|--------------|-----|-----|-----|-----|-----|
| `packages/engine/saju/` | ✏️ | ✏️ | | | |
| `packages/engine/saju/src/__tests__/` | ✏️ | | | | |
| `scripts/qa_gate.ts` | | | ✏️ | | ✏️* |
| `packages/api/src/reportPrompt.ts` | | | | ✏️ | |
| `scripts/llm_compare.ts` | | | | ✏️ | |
| `packages/api/src/` (DB 기록) | | | | | ✏️ |

---

## 진행 규칙

1. 각 workstream 완료 시: 커밋 + typecheck/build 확인 + 변경 파일 목록 출력
2. 충돌 위험 감지 시: 선행 workstream 먼저 merge 후 rebase
3. 같은 파일을 두 workstream이 건드리지 않도록 scope 엄격 분리
4. 블로그 레포는 별도 git이므로 충돌 불가

---

## 파일 소유권 매트릭스 (충돌 방지)

| 파일/디렉토리 | E | F | G | A | B | C | D |
|--------------|---|---|---|---|---|---|---|
| `scripts/llm_compare.ts` | ✏️ | | | | | | |
| `.env.example` | ✏️ | | | | | | |
| `docs/ENGINE_V2_*` | | ✏️ | | | | | |
| `docs/WORKSTREAM_PLAN.md` | | ✏️ | | | | | |
| `/Users/jidong/dev-blog/` | | | ✏️ | | | | |
| `packages/shared/src/index.ts` | | | | ✏️ | | | |
| `apps/web/lib/types.ts` | | | | ✏️ | | | |
| `packages/api/prisma/` | | | | | ✏️ | | |
| `packages/api/src/db.ts` | | | | | ✏️ | | |
| `vitest.config.ts` | | | | | | ✏️ | |
| `packages/api/src/__tests__/` | | | | | | ✏️ | |
| `scripts/qa_gate.ts` | | | | | | | ✏️ |
| `.qa/` | | | | | | | ✏️ |
| `package.json` (scripts) | ✏️* | | | | | ✏️* | ✏️* |

*`package.json`은 scripts 섹션만 각자 추가 — 키 이름이 다르므로 충돌 없음
