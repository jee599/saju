# Fortune Engine v2 → FateSaju 프로덕션 마스터 플랜

> 작성일: 2026-02-25  
> 목적: Claude Code가 이 문서 하나로 현재 상태를 파악하고, 순서대로 실행할 수 있는 태스크 정의서.  
> 원칙: QA Gate 통과 전 다음 단계 금지. 한 Phase씩 순서대로.

-----

## 0. 현재 상태 (As-Is)

### 프로젝트 구조 (모노레포)

```text
workspace/
├─ apps/web/               # Next.js 프로덕션 앱
│  ├─ app/api/             # API 라우트 (checkout, fortune, report)
│  ├─ app/free-fortune/    # 사주 무료 분석 페이지
│  ├─ app/face/            # 관상 — Coming Soon
│  ├─ app/name/            # 작명 — Coming Soon
│  ├─ app/palm/            # 손금 — Coming Soon
│  ├─ app/paywall/         # 결제벽
│  ├─ app/report/          # 리포트 페이지
│  └─ lib/                 # 유틸리티
├─ packages/
│  ├─ engine/saju/         # 만세력 엔진 (lunar-typescript 기반)
│  ├─ api/                 # Prisma + 현재 SQLite
│  └─ shared/              # 공용 타입/유틸
├─ scripts/                # Gate 체크 등
├─ docs/                   # 기획 문서, 프롬프트
├─ inbox/llm-compare/       # 멀티 LLM 비교 결과
└─ .qa/                    # QA 관련
```

### 완료된 것

|항목|상태|상세|
|---|---:|---|
|Phase 0 인프라|✅ 완료|타입 통일, Prisma/SQLite, Vitest, QA Gate 스크립트|
|사주 엔진|✅ 완료|@saju/engine-saju, 골든 케이스 42개, 테스트 99개 통과|
|LLM 프롬프트 v2|✅ 완료|사주 해석 프롬프트 + QA 테스트|
|멀티 LLM 비교|✅ 2회 실행|inbox/llm-compare/ 에 결과 저장됨|
|Coming Soon 페이지|✅ 존재|/face, /name, /palm 라우트 있음|
|웹앱 기본 UI|✅ 존재|입력폼, 리포트, PaywallCTA|
|블로그 자동 생성|✅ 완료|dev-blog 한/영 포스트 자동 생성|

### 미완료 / 변경 필요

|항목|상태|해야 할 일|
|---|---:|---|
|DB|❌ 변경 필요|SQLite → Supabase PostgreSQL 전환|
|로그인 벽|❌ 제거 필요|무료 비로그인 + 결제 시 이메일만 수집 (Auth 제거)|
|입력폼|❌ 변경 필요|별도 페이지 → 히어로 인라인 2스텝 폼|
|결제|🔄 부분 완료|Toss(한국) 테스트 연결됨. Stripe(글로벌) + Razorpay(인도) 추가 필요|
|GA4|❌ 미구현|퍼널 이벤트 10개 추적 (궁합/2스텝 폼 포함)|
|Rate Limiting|❌ 미구현|IP + fingerprint + UUID 3중 체크, 일 5회|
|비용 절감|❌ 미구현|6모델 비교 후 확정. 목표 무료 $0.002/건|
|LLM 비교 테스트|❌ 미구현|Sonnet/Haiku/Gemini Pro/Flash/GPT 5.2/Mini 동시 비교|
|에러 핸들링|❌ 미구현|LLM 실패/429/timeout UX|
|리포트 Paywall|❌ 미구현|CTA 3중 배치 + 모바일 스티키 바|
|미니 궁합|❌ 미구현|무료 바이럴 기능 (상대 생년월일 → 간단 궁합)|
|리포트 보관|❌ 미구현|무료 90일 보관 + 유료 영구 + 자동 삭제 크론|
|로컬라이징|❌ 미구현|6개국 i18n + 8레이어 아키텍처 + K-Astrology 브랜딩|
|카카오 공유 + OG|❌ 미구현|바이럴 수단|
|랜딩 리디자인|❌ 미구현|Soft Lavender 다크테마|
|리텐션|❌ 미구현|월간 미니 운세 + 연초 신년운세 + 브라우저 알림|
|배포|🔄 확인 필요|Vercel 설정 확인|

-----

## 1. 방향성 결정 사항

풀 개발:
- 사주 분석 (엔진 완료, 프로덕션 UX + 비용 최적화 + 결제)
- 6모델 동시 비교 테스트 → 프로덕션 모델 확정 (상품화는 1개만)
- 미니 궁합 (무료, 바이럴 루프용)
- 히어로 인라인 2스텝 입력폼
- 리포트 CTA 3중 배치 + 모바일 스티키 바
- 6개국 로컬라이징 (KR, IN, US, VN, TH, BR)
- 8레이어 글로벌 아키텍처
- 영문 K-Astrology 브랜딩

Coming Soon (메뉴만):
- 작명 (/name)
- 손금 (/palm)
- 관상 (/face)
→ 이미 라우트 존재. 아이콘 + 1줄 + 이메일 수집 폼만 추가. 미리보기 카드 없음.

DB 전환:
- Prisma ORM 유지
- SQLite → Supabase PostgreSQL
- 무료 리포트 90일 보관 + 유료 영구 보관 정책
- Supabase Auth (Magic Link) + Storage (이미지용 — 나중에 손금/관상)

결제 라우팅:
- 한국: Toss Payments (기존 연결 활용)
- 글로벌: Stripe (US, VN, TH, BR)
- 인도: Razorpay (UPI 필수)
- 국가 감지 → 자동 라우팅

배포:
- Vercel (기존 설정 확인 후 유지)

-----

## 2. 실행 Phase 정의

### Phase A: DB 전환 + 인프라 정비

> 목표: 프로덕션 DB 기반 마련. 이후 모든 작업의 토대.
> Gate 조건: Supabase 연결 + 기존 테스트 전체 통과 + Vercel 배포 확인

태스크:
|#|태스크|상세|
|---:|---|---|
|A-1|Supabase 프로젝트 생성/연결|PostgreSQL 연결 문자열/환경변수 정리|
|A-2|Prisma datasource 전환|SQLite → Postgres, 마이그레이션 전략 확정|
|A-3|로컬/프리뷰/프로덕션 환경 분리|env 규칙/secret 관리|
|A-4|Vercel 배포 점검|빌드/런타임/환경변수 확인|

(이 문서는 사용자가 이어서 Phase A 태스크를 추가 작성 예정)
