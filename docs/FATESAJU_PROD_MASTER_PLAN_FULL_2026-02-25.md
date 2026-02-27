# Fortune Engine v2 → 복연구소 프로덕션 마스터 플랜

> 작성일: 2026-02-25
> 목적: Claude Code가 이 문서 하나로 현재 상태를 파악하고, 순서대로 실행할 수 있는 태스크 정의서.
> 원칙: QA Gate 통과 전 다음 단계 금지. 한 Phase씩 순서대로.

-----

## 0. 현재 상태 (As-Is)

### 프로젝트 구조 (모노레포)

/Users/jidong/saju_global/          # canonical project root (NOT ~/.openclaw/workspace)
├─ apps/web/ # Next.js 프로덕션 앱
│  ├─ app/api/ # API 라우트 (checkout, fortune, report)
│  ├─ app/free-fortune/ # 사주 무료 분석 페이지
│  ├─ app/face/ # 관상 — Coming Soon
│  ├─ app/name/ # 작명 — Coming Soon
│  ├─ app/palm/ # 손금 — Coming Soon
│  ├─ app/paywall/ # 결제벽
│  ├─ app/report/ # 리포트 페이지
│  └─ lib/ # 유틸리티
├─ packages/
│  ├─ engine/saju/ # 만세력 엔진 (lunar-typescript 기반)
│  ├─ api/ # Prisma + 현재 SQLite
│  └─ shared/ # 공용 타입/유틸
├─ scripts/ # Gate 체크 등
├─ docs/ # 기획 문서, 프롬프트
├─ inbox/llm-compare/ # 멀티 LLM 비교 결과
└─ .qa/ # QA 관련

### 완료된 것

|항목 |상태 |상세 |
|---------------|-------|------------------------------------------|
|Phase 0 인프라 |✅ 완료 |타입 통일, Prisma/SQLite, Vitest, QA Gate 스크립트|
|사주 엔진 |✅ 완료 |@saju/engine-saju, 골든 케이스 42개, 테스트 99개 통과 |
|LLM 프롬프트 v2 |✅ 완료 |사주 해석 프롬프트 + QA 테스트 |
|멀티 LLM 비교 |✅ 2회 실행|inbox/llm-compare/ 에 결과 저장됨 |
|Coming Soon 페이지|✅ 존재 |/face, /name, /palm 라우트 있음 |
|웹앱 기본 UI |✅ 존재 |입력폼, 리포트, PaywallCTA |
|블로그 자동 생성 |✅ 완료 |dev-blog 한/영 포스트 자동 생성 |

### 미완료 / 변경 필요

|항목 |상태 |해야 할 일 |
|-------------|-------|--------------------------------------------------|
|DB |❌ 변경 필요|SQLite → Supabase PostgreSQL 전환 |
|로그인 벽 |❌ 제거 필요|무료 비로그인 + 결제 시 이메일만 수집 (Auth 제거) |
|입력폼 |❌ 변경 필요|별도 페이지 → 히어로 인라인 2스텝 폼 |
|결제 |🔄 부분 완료|Toss(한국) 테스트 연결됨. Stripe(글로벌) + Razorpay(인도) 추가 필요|
|GA4 |❌ 미구현 |퍼널 이벤트 10개 추적 (궁합/2스텝 폼 포함) |
|Rate Limiting|❌ 미구현 |IP + fingerprint + UUID 3중 체크, 일 5회 |
|비용 절감 |❌ 미구현 |6모델 비교 후 확정. 목표 무료 $0.002/건 |
|LLM 비교 테스트 |❌ 미구현 |Sonnet/Haiku/Gemini Pro/Flash/GPT 5.2/Mini 동시 비교 |
|에러 핸들링 |❌ 미구현 |LLM 실패/429/timeout UX |
|리포트 Paywall |❌ 미구현 |CTA 3중 배치 + 모바일 스티키 바 |
|미니 궁합 |❌ 미구현 |무료 바이럴 기능 (상대 생년월일 → 간단 궁합) |
|리포트 보관 |❌ 미구현 |무료 90일 보관 + 유료 영구 + 자동 삭제 크론 |
|로컬라이징 |❌ 미구현 |6개국 i18n + 8레이어 아키텍처 + K-Astrology 브랜딩 |
|카카오 공유 + OG |❌ 미구현 |바이럴 수단 |
|랜딩 리디자인 |❌ 미구현 |Soft Lavender 다크테마 |
|리텐션 |❌ 미구현 |월간 미니 운세 + 연초 신년운세 + 브라우저 알림 |
|배포 |🔄 확인 필요|Vercel 설정 확인 |

### 확인 사항 (Claude Code가 먼저 체크)

1. 현재 Supabase 프로젝트가 이미 있는지 확인 (기존 복연구소에서 쓰던 것)
2. Prisma schema에 어떤 모델이 정의되어 있는지 확인
3. apps/web/.env 또는 .env.local에 어떤 변수가 있는지 확인
4. Vercel에 연결된 도메인 확인

-----

### Phase A: DB 전환 + 인프라 정비

> 목표: 프로덕션 DB 기반 마련. 이후 모든 작업의 토대.
> Gate 조건: Supabase 연결 + 기존 테스트 전체 통과 + Vercel 배포 확인

|# |태스크 |상세 |
|---|-------------------------------|---------------------------------------------------------------------------------------------------|
|A-1|Prisma → Supabase PostgreSQL 전환|`prisma/schema.prisma` datasource 변경. `.env`에 `DATABASE_URL` Supabase connection string. 마이그레이션 실행.|
|A-2|Supabase 프로젝트 설정 확인 |Auth(Magic Link), RLS 정책, Storage 버킷(나중에 이미지용) |
|A-3|기존 테스트 전체 통과 확인 |`pnpm test` — 99개 테스트 깨지는 거 없는지 |
|A-4|Vercel 배포 상태 확인 |빌드 성공 여부, 환경 변수 세팅, 도메인 연결 |
|A-5|환경 변수 정리 |`.env.example` 생성. Supabase URL/Key, Toss Key, Anthropic Key, GA4 ID 등 |

-----

### Phase B: P0 태스크 (런칭 블로커)

> 목표: 사주 서비스 한국 런칭 가능 상태. 비용/보안/UX 최소 요건 충족.
> Gate 조건: P0 전부 완료 + 6모델 비교 완료→프로덕션 모델 확정 + 히어로 인라인 폼 + 3중 CTA + 궁합 바이럴 + 로컬 E2E 테스트 통과

B-1: 로그인 벽 제거 → 이메일 수집 전환
(원문 그대로)

B-2: 멀티 LLM 비교 테스트 (6모델 동시 비교)
(원문 그대로)

B-3: 무료 티어 비용 절감 (B-2 결과 반영)
(원문 그대로)

B-4: Rate Limiting (3중 체크)
(원문 그대로)

B-5: GA4 설치
(원문 그대로)

B-6: 에러 핸들링
(원문 그대로)

B-7: 법적 필수 페이지 + Footer 구현
(원문 그대로)

B-8: 리포트 페이지 Paywall 레이아웃 구현
(원문 그대로)

B-9: 히어로 인라인 2스텝 입력폼
(원문 그대로)

B-10: 리포트 보관 정책 구현
(원문 그대로)

-----

### Phase C: 6개국 글로벌 아키텍처
(원문 그대로)

-----

### Phase D: 디자인 시스템 v2 + 바이럴 + Coming Soon 강화
(원문 그대로)

-----

### Phase E: Prompt Caching + 비용 고도화
(원문 그대로)

-----

### Phase F: 리텐션 루프 (런칭 후 데이터 기반)
(원문 그대로)

-----

## 3. 실행 순서 요약
(원문 그대로)

## 4. 각 Phase 시작 전 Claude Code 체크리스트
(원문 그대로)

## 5. 기술 스택
(원문 그대로)

## 6. 국가별 Config 타입 정의
(원문 그대로)

## 7. 핵심 숫자 (참고)
(원문 그대로)

## 8. 이 문서 사용법
(원문 그대로)
