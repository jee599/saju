# MASTERPLAN — 복연구소 (FortuneLab)

> **이 문서가 모든 작업의 기준입니다.**
> 모든 작업 전에 이 문서를 읽고, 작업 후에 커밋 → 푸시 → 이 문서 업데이트합니다.

---

## 변경 로그

| 날짜 | 작업 내용 | 커밋 |
|------|----------|------|
| 2026-02-28 | MASTERPLAN v2: 4-에이전트(개발/기획/사업/디자인) 리뷰 기반 고도화. 보안이슈, 퍼널최적화, 비즈모델, UX개선 항목 추가 | — |
| 2026-02-28 | MASTERPLAN.md 생성. 기존 문서 통합 | `7c63c89` |
| 2026-02-28 | 프로덕션 긴급 버그 5건 수정 + 배포 (birthDate 전달, TEST 섹션 숨김, 폰트 통일, 언어 선택기 제거, 일간/지배오행 UX) | `67fbc53` |
| 2026-02-28 | QA 60건 일괄 수정 | `e053882` |
| 2026-02-28 | 폰트 Pretendard 통일 | `594e0bd` |
| 2026-02-27 | 프리미엄 디자인 오버홀 + 7-전략 LLM 테스트 + 랜딩 리디자인 | `2c91f61` |

---

## 1. 프로젝트 개요

**복연구소** — AI 사주 분석 서비스
- 전통 사주명리학(四柱八字)을 AI가 해석하는 유료 분석 서비스
- 무료: 일간 카드 + 오행 밸런스 + 음양 비율 (LLM 비용 $0)
- 프리미엄(₩3,900~9,900): 약 20,000~40,000자 AI 상세 분석

### 핵심 지표
- **North Star**: 결제 완료 / 일
- **PMF 기준**: 일 500건 + CVR 2%, 4주 연속
- **Guardrails**: 무료 1건 비용 ≤ $0.002, LLM 실패율 < 1%, 입력 완료율 ≥ 65%

### 타깃 사용자
- 20~39세 여성 (1차), MBTI/자기이해 콘텐츠 소비층
- 사주/운세에 호기심은 있으나 역술가 방문은 부담스러운 층

---

## 2. 기술 구조

```
saju_global/
├── apps/
│   ├── web/          # Next.js 15 (App Router) — fortunelab.store
│   └── mobile/       # Expo (React Native) — 미구현
├── packages/
│   ├── engine/saju/  # @saju/engine-saju — 만세력 엔진 (lunar-typescript)
│   ├── api/          # Fastify API + LLM 라우팅 (⚠️ 현재 미사용, web에서 직접 호출)
│   └── shared/       # 공용 타입
├── docs/             # 기존 문서들 (레퍼런스용)
├── MASTERPLAN.md     # ★ 이 문서 (모든 작업의 기준)
└── prisma/           # DB 스키마 (현재 SQLite, 추후 Supabase Postgres)
```

### 기술 스택
- **프론트**: Next.js 15, React 19, CSS 커스텀 프로퍼티 (Celestial Rose 다크 테마)
- **엔진**: `@saju/engine-saju` — lunar-typescript 기반 만세력 계산 (99 tests)
- **LLM**: Claude (Sonnet 4.6/Opus 4.6) + GPT 5.2 + Gemini 3.1 — 7가지 전략 비교
- **배포**: Vercel (프로덕션: `fortunelab.store`)
- **DB**: Prisma + SQLite (로컬) → Supabase Postgres (예정)
- **패키지 매니저**: pnpm workspace
- **폰트**: Pretendard (한글), Noto Serif KR (보조), Cormorant Garamond (한자 전용)
- **디자인**: Celestial Rose 다크 테마 (accent: #C48B9F, gold: #D4AF37, 오행 5색 시스템)

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
| Rate Limit 미들웨어 | ✅ (코드) | IP 기반 (⚠️ 서버리스에서 무효) |
| 이메일 구독 API | ✅ (코드) | Prisma 미생성으로 500 에러 |
| i18n 스캐폴딩 | ✅ (코드) | ko/en 딕셔너리 구조만 |

---

## 4. 🚨 긴급 수정 필요 (보안/비즈니스 블로커)

> 4-에이전트 리뷰에서 발견된 즉시 처리 항목

### 🔴 보안 이슈

| # | 항목 | 파일 | 설명 | 작업량 |
|---|------|------|------|--------|
| S1 | `/api/test/generate` 프로덕션 노출 | `api/test/generate/route.ts` | 인증 없이 누구나 LLM 호출 가능. 1회당 $0.5~$2 비용 발생 위험 | 30분 |
| S2 | 리포트 접근 인증 없음 | `api/report/[orderId]/route.ts` | orderId만 알면 타인 리포트 접근 가능 | 2시간 |
| S3 | URL 파라미터 인코딩 누락 | `result/page.tsx:525,685,705` | paywall 링크에 name 미인코딩 | 30분 |
| S4 | Rate Limit 서버리스 무효 | `middleware.ts` | 인메모리 Map이 서버리스에서 초기화됨 | 3시간 |
| S5 | CSP 헤더 없음 | `next.config.ts` | 외부 스크립트 주입 취약 | 3시간 |

### 🔴 React 코드 이슈

| # | 항목 | 파일 | 설명 | 작업량 |
|---|------|------|------|--------|
| R1 | Hooks 규칙 위반 | `result/page.tsx:380-384` | 조건부 return 후 useMemo/useCallback 호출 | 1시간 |
| R2 | 궁합 링크 broken | `result/page.tsx` | `/?tab=compat` → 존재하지 않는 탭. `/compatibility`로 수정 필요 | 5분 |

---

## 5. 미완료 / 다음 작업 (우선순위별)

### 🔴 P0 — 매출 파이프라인 (Week 1)

| # | 항목 | 상태 | 설명 | 담당 |
|---|------|------|------|------|
| 1 | Supabase DB 전환 | ❌ | SQLite → Postgres. 이메일/리포트/결제 전부 의존 | 대표+Claude |
| 2 | Toss Payments 결제 | ❌ | 사업자등록 → 키 발급 → `/api/toss/webhook` 구현 | 대표+Claude |
| 3 | GA4 Measurement ID | ❌ | `NEXT_PUBLIC_GA_MEASUREMENT_ID` 환경변수 1개 설정 (5분) | 대표 |
| 4 | CTA 카피 수정 | ❌ | "₩5,900 · Sonnet 분석 보기" → "나머지 7파트 열기 ₩5,900" (모델명 제거) | Claude |
| 5 | 보안 이슈 S1~S3 수정 | ❌ | test 엔드포인트 차단, 리포트 인증, URL 인코딩 | Claude |
| 6 | 궁합 링크 수정 (R2) | ❌ | `/?tab=compat` → `/compatibility?my=${birthDate}` | Claude |

### 🟡 P1 — 전환율 최적화 (Week 2-3)

| # | 항목 | 상태 | 설명 |
|---|------|------|------|
| 7 | Resend 이메일 서비스 | ❌ | 결제 완료 → 리포트 링크 발송, 구독 알림 |
| 8 | 결제 후 리포트 파이프라인 | ❌ | 결제 확인 → LLM 호출 → DB 저장 → 이메일 발송 |
| 9 | 페이월 신뢰 요소 추가 | ❌ | 소셜 증명, 보안 배지, 환불 보장, 샘플 미리보기 |
| 10 | 블러 티저 개인화 | ❌ | 고정 텍스트 → 오행별/연도별 맞춤 문구 |
| 11 | 블러 내 인라인 잠금해제 CTA | ❌ | 블러 오버레이 위에 직접 "잠금 해제" 버튼 배치 |
| 12 | 결과→페이월 CTA 재배치 | ❌ | 블러 3개 노출 후 첫 CTA, 나머지 후 두 번째 CTA |
| 13 | 모델 선택 UI | ❌ | 결과 페이지에서 GPT/Sonnet/Opus 3-tier 가격 선택 |
| 14 | 리포트 헤더 개인화 | ❌ | "주문 리포트 상세" → "${이름}님의 사주 분석 리포트" |
| 15 | 리포트 공유 기능 | ❌ | 링크 복사 + 카카오 공유 + SNS 공유 |
| 16 | 카카오 공유 SDK 연동 | ❌ | 공유 카드 3종 (한줄/성향/주의) + 개인화 OG 이미지 |
| 17 | 입력 폼 중복 제거 | ❌ | page.tsx와 free-fortune/page.tsx 통합 → 공통 컴포넌트 |
| 18 | 접근성(a11y) 개선 | ❌ | --t3 대비율 수정, 블러 aria-hidden, SVG aria-label |

### 🟢 P2 — 리텐션 & 성장 (Week 4+)

| # | 항목 | 상태 | 설명 |
|---|------|------|------|
| 19 | 일간 운세 (매일 재방문) | ❌ | 사주 입력 후 일진 기반 무료 100~200자 운세 (Haiku $0.002 이하) |
| 20 | 궁합 프리미엄 업셀 | ❌ | 궁합 결과 하단 "프리미엄 궁합 분석 ₩4,900" |
| 21 | 사주+궁합 번들 | ❌ | ₩8,900 패키지 (단품 대비 할인) |
| 22 | 월간 운세 구독 | ❌ | ₩4,900/월, 매달 운세 업데이트 |
| 23 | 타로/꿈해몽 추가 | ❌ | 꿈해몽(텍스트입력→AI) > 타로(3장뽑기→AI) |
| 24 | 동적 OG 이미지 생성 | ❌ | `/api/og?name=...&element=wood` → 카카오/인스타 공유 이미지 |
| 25 | 다국어 (en, ja) | ❌ | i18n 번역. SEO 자산으로 "Four Pillars of Destiny" 롱테일 |
| 26 | 모바일 앱 | ❌ | Expo 스캐폴딩만 존재 |
| 27 | CI/CD 파이프라인 | ❌ | GitHub Actions: typecheck → test → build |
| 28 | Sentry 에러 모니터링 | ❌ | 현재 console.error만 존재 |
| 29 | 컴포넌트 시스템 정비 | ❌ | ui.tsx 확장, globals.css 모듈화 |
| 30 | 프론트엔드 테스트 | ❌ | API/LLM/폼 유효성 테스트 (현재 엔진만 99개) |

---

## 6. 단가 분석 (Unit Economics)

### LLM 비용 per 유료 리포트

| 모델 | 가격(KRW) | 목표 분량 | LLM 비용(USD) | LLM 비용(KRW) | 마진율 |
|------|----------|----------|--------------|--------------|--------|
| GPT 5.2 | ₩3,900 | 40,000자 | $0.228 | ≈307원 | 88.7% |
| Sonnet 4.6 | ₩5,900 | 30,000자 | $0.186 | ≈251원 | 92.4% |
| Opus 4.6 | ₩9,900 | 20,000자 | $0.630 | ≈851원 | 88.0% |

> 무료 분석은 클라이언트 엔진만 사용, LLM 비용 $0

### 월간 고정 비용

| 항목 | 월 비용 |
|------|--------|
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| Resend (이메일) | $20 |
| 도메인 | ≈$1.5 |
| **합계** | **≈$66.5 (약 9만원)** |

### 매출 시나리오

| 단계 | DAU | CVR | 일 결제 | 월 매출 |
|------|-----|-----|---------|---------|
| 런칭 초기 | 1,000 | 1% | 10건 | 177만원 |
| 성장기 | 5,000 | 1.5% | 75건 | 1,327만원 |
| PMF 달성 | 25,000 | 2% | 500건 | 8,850만원 |

---

## 7. 사용자(대표) 액션 필요 항목

> Claude가 코드로 해결할 수 없고, 사용자가 직접 해야 하는 것

| # | 항목 | 상태 | 설명 | 긴급도 |
|---|------|------|------|--------|
| 1 | **사업자등록** | ❌ | Toss Payments 필수 전제. 통신판매업 신고 포함 | 🔴 |
| 2 | **Supabase 프로젝트 생성** | ❌ | 프로젝트 생성 → Connection string 제공 | 🔴 |
| 3 | **Toss Payments 키 발급** | ❌ | 사업자등록 후 → API 키 발급 → 환경변수 설정 | 🔴 |
| 4 | **GA4 Measurement ID** | ❌ | Google Analytics → `NEXT_PUBLIC_GA_MEASUREMENT_ID` | 🔴 |
| 5 | 이메일 서비스 가입 | ❌ | Resend 계정 생성 (무료 플랜: 월 3,000이메일) | 🟡 |
| 6 | 도메인 DNS 확인 | ✅ | fortunelab.store 연결 완료 | — |
| 7 | Vercel 환경변수 | 🟡 | API키 설정됨. DB/결제/GA 키 미설정 | 🟡 |
| 8 | 개인정보처리방침 강화 | ❌ | LLM API 국외이전 고지, CPO 지정, PIPA 준수 | 🟡 |
| 9 | 이용약관 보강 | ❌ | 전자상거래법 의무 기재사항 추가 | 🟡 |

---

## 8. 법적/규제 체크리스트

| # | 항목 | 상태 | 설명 |
|---|------|------|------|
| 1 | 사업자등록증 | ❌ | Toss Payments 연동 필수 전제 |
| 2 | 통신판매업 신고 | ❌ | 시/군/구청 또는 온라인 |
| 3 | 개인정보 국외 이전 고지 | ❌ | LLM API에 이름/생년월일 전송 = 국외 이전 (PIPA 28조의8) |
| 4 | 개인정보 보호책임자(CPO) 지정 | ❌ | 법적 의무 |
| 5 | 이용약관 전자상거래법 준수 | ❌ | 사업자 정보, 청약철회 등 의무 기재 |
| 6 | 면책 고지 강화 | 🟡 | 기본 면책 존재, "확률 기반 참고 리포트" 포지셔닝 유지 |
| 7 | 환불 정책 법적 검토 | 🟡 | "24시간 이내 미열람 시 환불" — 전자상거래법 17조 방어 가능 |

---

## 9. 퍼널 최적화 전략

### 현재 퍼널

```
홈(히어로+폼) → 입력(4단계) → 로딩(3.5초) → 무료 결과 → Paywall → 결제 → 리포트
                                                  ↓
                                            궁합 크로스셀
```

### 핵심 개선 포인트

| 구간 | 현재 문제 | 개선안 | 예상 효과 |
|------|----------|--------|----------|
| 결과→Paywall | CTA 2개 중복, 모델명 노출 | CTA 통일 + 모델명 제거 | CTR +10~20% |
| 블러 티저 | 7개 동일 텍스트, CTA와 분리됨 | 개인화 + 인라인 잠금해제 | CTR +15~25% |
| Paywall | 신뢰 요소 0개 | 소셜증명+보안배지+샘플 | CVR +20~40% |
| 리포트 | 공유 기능 없음 | 카카오/SNS 공유 카드 | 오가닉 유입 +5~10% |
| 재방문 | 리텐션 기능 없음 | 일간 운세 + 이메일 알림 | D7 리텐션 5%→15% |

---

## 10. 디자인 개선 사항

### 현재 강점
- Celestial Rose 다크 테마 — 사주/운세 도메인에 적합한 신비로운 분위기
- 오행 5색 시스템 일관성 (CSS 커스텀 프로퍼티)
- 일간 카드 오행별 테마 — 개인화 감각
- `prefers-reduced-motion` 접근성 배려

### 개선 필요

| 우선순위 | 항목 | 설명 |
|---------|------|------|
| P0 | CTA 버튼 텍스트 통일 | 스티키 "상세 분석 보기" vs 본문 "₩5,900 · Sonnet" 불일치 |
| P0 | Paywall 신뢰 요소 | 보안결제 아이콘, "7일 환불 보장", 사용자 후기 |
| P1 | 접근성 대비율 | `--t3: #7A7490` → `#8E89A8` (WCAG AA 4.5:1 충족) |
| P1 | 블러 섹션 이모지 차별화 | 같은 이모지 7번 반복 → 섹션별 고유 아이콘 |
| P1 | 모바일 12지지 UX | 2열 13개 → 3열 또는 5구간 그루핑 |
| P1 | FAQ 토글 애니메이션 | 즉시 삽입 → 부드러운 accordion |
| P2 | font-weight 표준화 | 650/740/780 비표준 → 600/700/800 |
| P2 | globals.css 모듈화 | 1,900줄 단일 파일 → 기능별 분리 |
| P2 | Tailwind 결정 | 사용하지 않으면 제거, 사용하면 전면 이관 |

### 디자인 레퍼런스
- **퍼널/페이월**: Medium (스크롤 트리거), 12min (인라인 잠금해제)
- **모바일 폼**: 토스 (Progressive Form 최고 수준)
- **데이터 시각화**: Spotify Wrapped (스토리텔링 시각화)
- **사주/운세 감성**: Co—Star (미니멀 신비로움)
- **신뢰 요소**: 클래스101 (환불보장, 수강생수, 후기)

---

## 11. 기술 부채 & 코드 품질

| 항목 | 위치 | 설명 | 작업량 |
|------|------|------|--------|
| LLM 코드 중복 | `packages/api/src/llm.ts` vs `apps/web/lib/llmEngine.ts` | 두 구현의 모델명 불일치. packages/api는 구버전 | 2~3시간 |
| 프롬프트 중복 | `reportPrompt.ts` vs `llmEngine.ts` | 두 곳에 `buildPaidReportPrompt` 존재 | 1시간 |
| mockEngine 메모리 누수 | `mockEngine.ts` | globalThis 스토어에 TTL 없음 | Supabase 전환 시 해소 |
| 미사용 패키지 | `package.json` | `react-mobile-picker` 미사용 | 5분 |
| 테스트 부재 | 전체 | 엔진만 99개. API/LLM/폼 테스트 0개 | 8~16시간 |
| CI/CD 없음 | 루트 | GitHub Actions 미설정 | 2시간 |
| 에러 모니터링 없음 | API 라우트 | console.error만. Sentry 등 미연결 | 2시간 |

---

## 12. 실행 로드맵

### Week 1 (매출 파이프라인 완성)
- [ ] 대표: 사업자등록 + Toss Payments 계정 개설
- [ ] 대표: Supabase 프로젝트 생성 → Connection string 제공
- [ ] 대표: GA4 Measurement ID 설정
- [ ] Claude: Toss 결제 연동 (`/api/checkout/create`, `/api/toss/webhook`)
- [ ] Claude: 결제→LLM→리포트→이메일 파이프라인
- [ ] Claude: 보안 이슈 S1~S3 수정
- [ ] Claude: CTA 카피 수정 + 궁합 링크 수정
- [ ] 배포 + 첫 실결제 테스트

### Week 2 (마케팅 채널 오픈)
- [ ] 대표: Resend 계정 생성
- [ ] Claude: 이메일 서비스 연동 (결제 후 리포트 링크 발송)
- [ ] Claude: 카카오 공유 버튼 구현
- [ ] Claude: 페이월 신뢰 요소 추가
- [ ] 인스타 사주 계정 협찬 1건 테스트

### Week 3 (전환율 최적화)
- [ ] GA4 퍼널 분석 기반 이탈 지점 파악
- [ ] Claude: 블러 티저 개인화 + 인라인 CTA
- [ ] Claude: 모델 선택 UI (3-tier)
- [ ] Claude: 리포트 공유 기능 + 동적 OG 이미지
- [ ] 법적 페이지 강화

### Week 4+ (리텐션 & 성장)
- [ ] 일간 운세 기능 출시
- [ ] 궁합 프리미엄 업셀
- [ ] 사주+궁합 번들 상품
- [ ] 꿈해몽/타로 Coming Soon 추가
- [ ] SEO 최적화 (구조화 데이터, 사이트맵)

---

## 13. 프로젝트 구조 (주요 파일)

### 웹앱 라우트 (`apps/web/app/`)
```
page.tsx                  # 홈페이지 (Progressive Form + 랜딩)
result/page.tsx           # 무료 결과 (일간카드 + 오행 + 블러)
paywall/page.tsx          # 결제 페이지
loading-analysis/page.tsx # 로딩 애니메이션 (리디렉트)
free-fortune/page.tsx     # 무료 사주 (별도 입력폼 — 통합 예정)
compatibility/page.tsx    # 궁합 페이지
palm/page.tsx             # 손금 (Coming Soon)
name/page.tsx             # 작명 (Coming Soon)
face/page.tsx             # 관상 (Coming Soon)
report/[orderId]/page.tsx # 유료 리포트 (결제 후)
api/test/generate/        # LLM 테스트 (⚠️ 프로덕션 차단 필요)
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
mockEngine.ts             # ⚠️ 인메모리 Mock (Supabase 전환 시 제거)
types.ts                  # FortuneInput, ProductCode 등
analytics.ts              # track() GA4 이벤트
```

---

## 14. 작업 규칙 (제1의 룰)

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

## 15. 빌드/배포 명령어

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

## 16. 기존 문서 (레퍼런스)

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
| `docs/GTM_CONVERSION_PLAYBOOK.md` | 마케팅/전환 전략 |
| `docs/MODEL_ROUTING.md` | LLM 모델 선택 전략 |
| `docs/fortune-engine-v2-spec.md` | 엔진 v2 스펙 |
| `docs/회의록_사업기획_사주서비스_2026-02-22.md` | 사업 기획 회의록 |
