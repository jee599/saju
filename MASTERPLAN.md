# MASTERPLAN — 복연구소 (FortuneLab)

> **이 문서가 모든 작업의 기준입니다.**
> 모든 작업 전에 이 문서를 읽고, 작업 후에 커밋 → 푸시 → 이 문서 업데이트합니다.

---

## 변경 로그

| 날짜 | 작업 내용 | 커밋 |
|------|----------|------|
| 2026-02-28 | MASTERPLAN.md 생성. 기존 문서 통합 | — |
| 2026-02-28 | 프로덕션 긴급 버그 5건 수정 + 배포 (birthDate 전달, TEST 섹션 숨김, 폰트 통일, 언어 선택기 제거, 일간/지배오행 UX) | `67fbc53` |
| 2026-02-28 | QA 60건 일괄 수정 | `e053882` |
| 2026-02-28 | 폰트 Pretendard 통일 | `594e0bd` |
| 2026-02-27 | 프리미엄 디자인 오버홀 + 7-전략 LLM 테스트 + 랜딩 리디자인 | `2c91f61` |

---

## 1. 프로젝트 개요

**복연구소** — AI 사주 분석 서비스
- 전통 사주명리학(四柱八字)을 AI가 해석하는 유료 분석 서비스
- 무료: 일간 카드 + 오행 밸런스 + 음양 비율
- 프리미엄(₩4,900~5,900): 약 30,000자 10섹션 AI 상세 분석

### 핵심 지표
- **North Star**: 결제 완료 / 일
- **PMF 기준**: 일 500건 + CVR 2%, 4주 연속
- **Guardrails**: 무료 1건 비용 ≤ $0.002, LLM 실패율 < 1%, 입력 완료율 ≥ 65%

---

## 2. 기술 구조

```
saju_global/
├── apps/
│   ├── web/          # Next.js 15 (App Router) — fortunelab.store
│   └── mobile/       # Expo (React Native) — 미구현
├── packages/
│   ├── engine/saju/  # @saju/engine-saju — 만세력 엔진 (lunar-typescript)
│   ├── api/          # Fastify API + LLM 라우팅
│   └── shared/       # 공용 타입
├── docs/             # 기존 문서들 (레퍼런스용)
├── MASTERPLAN.md     # ★ 이 문서 (모든 작업의 기준)
└── prisma/           # DB 스키마 (현재 SQLite, 추후 Supabase Postgres)
```

### 기술 스택
- **프론트**: Next.js 15, React 19, CSS 커스텀 프로퍼티 (다크 테마)
- **엔진**: `@saju/engine-saju` — lunar-typescript 기반 만세력 계산
- **LLM**: Claude (Sonnet/Opus/Haiku) + GPT + Gemini — 7가지 전략 비교
- **배포**: Vercel (프로덕션: `fortunelab.store`)
- **DB**: Prisma + SQLite (로컬) → Supabase Postgres (예정)
- **패키지 매니저**: pnpm workspace
- **폰트**: Pretendard (한글), Noto Serif KR (보조), Cormorant Garamond (한자 전용)

---

## 3. 현재 상태 (2026-02-28)

### 완료된 것 ✅

| 항목 | 상태 | 비고 |
|------|------|------|
| 만세력 엔진 | ✅ | 99 tests, 골든케이스 42개 통과 |
| 웹 프론트 (24 라우트) | ✅ | Next.js build 0 errors |
| 무료 분석 플로우 | ✅ | 이름→생년월일→시간→성별→결과 |
| 오행 시각화 | ✅ | 레이더 + 상생 사이클 + 바 차트 |
| 프리미엄 블러 티저 | ✅ | 7섹션 오행별 맛보기 |
| LLM 7전략 비교 (dev) | ✅ | Sonnet/Opus/Haiku/GPT/Gemini |
| 다크 테마 디자인 | ✅ | Celestial Rose 테마 |
| 법적 페이지 | ✅ | 이용약관, 개인정보, 환불, 면책 |
| 궁합 페이지 | ✅ | 무료 미니 궁합 |
| Coming Soon 페이지 | ✅ | 손금, 작명, 관상 (이메일 알림) |
| Vercel 배포 | ✅ | fortunelab.store 라이브 |
| GA4 이벤트 | ✅ (코드) | 11개 이벤트 구현, Measurement ID 미설정 |
| Rate Limit 미들웨어 | ✅ (코드) | IP 기반, DB 로깅 |
| 이메일 구독 API | ✅ (코드) | Prisma 미생성으로 500 에러 |
| i18n 스캐폴딩 | ✅ (코드) | ko/en 딕셔너리 구조만 |

### 미완료 / 다음 작업 ❌

| 우선순위 | 항목 | 상태 | 설명 |
|----------|------|------|------|
| 🔴 P0 | Supabase DB 전환 | ❌ | SQLite → Postgres. 이메일/리포트/결제 전부 의존 |
| 🔴 P0 | Toss Payments 결제 | ❌ | 키 발급 + 연동 필요. 매출의 근간 |
| 🔴 P0 | GA4 Measurement ID | ❌ | NEXT_PUBLIC_GA_ID 환경변수 설정 |
| 🟡 P1 | 이메일 발송 서비스 | ❌ | Resend/SendGrid. 구독 알림 발송 |
| 🟡 P1 | 결제 후 리포트 생성 | ❌ | 결제 완료 → LLM 호출 → 리포트 저장 |
| 🟡 P1 | 비용 최적화 | ❌ | 무료 1건 $0.002 목표. 프롬프트 캐싱 |
| 🟢 P2 | 모바일 앱 | ❌ | Expo 스캐폴딩만 존재 |
| 🟢 P2 | 다국어 (en, ja) | ❌ | i18n 구조만, 번역 없음 |
| 🟢 P2 | 카카오/SNS 공유 | ❌ | OG 태그만 설정 |
| 🟢 P2 | 리텐션 (월간 운세) | ❌ | 설계만 |

---

## 4. 사용자(대표) 액션 필요 항목

> Claude가 코드로 해결할 수 없고, 사용자가 직접 해야 하는 것

| # | 항목 | 상태 | 설명 |
|---|------|------|------|
| 1 | Supabase 프로젝트 설정 | ❌ | 프로젝트 생성 → Connection string 제공 |
| 2 | Toss Payments 키 발급 | ❌ | 사업자등록 → API 키 발급 → 환경변수 설정 |
| 3 | GA4 Measurement ID | ❌ | Google Analytics → NEXT_PUBLIC_GA_ID |
| 4 | 이메일 서비스 가입 | ❌ | Resend 또는 SendGrid 계정 생성 |
| 5 | 도메인 DNS 확인 | ✅ | fortunelab.store 연결 완료 |
| 6 | Vercel 환경변수 | 🟡 | ANTHROPIC_API_KEY, OPENAI_API_KEY는 설정됨. DB/결제 키 미설정 |

---

## 5. 프로젝트 구조 (주요 파일)

### 웹앱 라우트 (`apps/web/app/`)
```
page.tsx                  # 홈페이지 (Progressive Form + 랜딩)
result/page.tsx           # 무료 결과 (일간카드 + 오행 + 블러)
paywall/page.tsx          # 결제 페이지
loading-analysis/page.tsx # 로딩 애니메이션 (리디렉트)
free-fortune/page.tsx     # 무료 사주 (별도 입력폼)
compatibility/page.tsx    # 궁합 페이지
palm/page.tsx             # 손금 (Coming Soon)
name/page.tsx             # 작명 (Coming Soon)
face/page.tsx             # 관상 (Coming Soon)
report/[orderId]/page.tsx # 유료 리포트 (결제 후)
api/test/generate/        # LLM 테스트 (dev only)
api/report/preview/       # 리포트 미리보기
api/cron/cleanup-reports/ # 리포트 정리 크론
api/email/subscribe/      # 이메일 구독
```

### 엔진 (`packages/engine/saju/src/`)
```
index.ts                  # calculateFourPillars() 메인 함수
__tests__/golden.test.ts  # 골든 테스트 케이스
```

### LLM (`apps/web/lib/`)
```
llmEngine.ts              # generateSingleModelReport, generateChunkedReport
types.ts                  # FortuneInput, ProductCode 등
analytics.ts              # track() GA4 이벤트
```

---

## 6. 작업 규칙 (제1의 룰)

```
모든 작업 전:
  1. MASTERPLAN.md 읽기
  2. 현재 상태 파악

모든 작업 후:
  1. git add + commit
  2. git push origin main
  3. vercel --prod (from /Users/jidong/saju_global)
  4. MASTERPLAN.md 변경 로그 업데이트
  5. MASTERPLAN.md도 함께 커밋/푸시
```

---

## 7. 빌드/배포 명령어

```bash
# 개발
cd /Users/jidong/saju_global
pnpm dev:web              # localhost:3000

# 테스트
pnpm test                 # Vitest (99 tests)
pnpm typecheck            # 전체 타입 체크

# 빌드
pnpm -C apps/web build    # Next.js 프로덕션 빌드

# 배포
vercel --prod             # ★ 루트에서 실행 (apps/web 아님!)
                          # → fortunelab.store 자동 alias
```

---

## 8. 기존 문서 (레퍼런스)

> 아래 문서들은 `docs/` 폴더에 보관. MASTERPLAN.md가 최신 기준이므로 참고용으로만 사용.

| 문서 | 용도 |
|------|------|
| `docs/STATUS.md` | 이전 단계별 진행상황 (→ 이 문서로 대체) |
| `docs/ROADMAP.md` | 8주 로드맵 (초기 계획) |
| `docs/TECH_SPEC.md` | 기술 아키텍처 상세 |
| `docs/PRODUCT_BRIEF.md` | 제품 요구사항 |
| `docs/PRODUCTION_MASTER_PLAN_2026-02-25.md` | 이전 마스터플랜 v3 |
| `docs/MASTERPLAN_IMPLEMENTATION_STATUS_2026-02-26.md` | 이전 구현 현황 |
| `docs/PHASE_A_DB_MIGRATION_*.md` | Supabase 마이그레이션 가이드 |
| `docs/PHASE_B5_*.md` | GA4 이벤트 스펙 |
| `docs/GTM_CONVERSION_PLAYBOOK.md` | 마케팅 전략 |
| `docs/MODEL_ROUTING.md` | LLM 모델 선택 전략 |
| `docs/fortune-engine-v2-spec.md` | 엔진 v2 스펙 |
