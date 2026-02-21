# 8-Week Roadmap

## Milestone 1 (Week 1-2): MVP Skeleton
- 목표: 입력 -> mock 결과까지 웹/앱에서 동작
- 산출물
  - 모노레포 + 공통 타입 + API
  - 웹 랜딩 + 무료 사주 폼
  - Expo 모바일 폼
  - 기본 문서(제품/기술/로드맵)

## Milestone 2 (Week 3-4): Core Product UX
- 목표: 사용자 신뢰를 높이는 결과 경험
- 작업
  - 결과 템플릿 버전 1(성향/강점/주의/오늘의 한줄)
  - UX 개선(입력 검증, 로딩 skeleton, 재시도)
  - 이벤트 수집(Amplitude/PostHog)
  - 다국어 준비(ko 기본, en 구조)

## Milestone 3 (Week 5-6): Real Engine + Accounts Beta
- 목표: mock에서 실제 계산/해석 파이프라인으로 전환
- 작업
  - 사주 계산 모듈 초안(천간/지지/오행 기초)
  - AI 해석 레이어(프롬프트 + 안전 가드)
  - 이메일/소셜 로그인 베타
  - 결과 저장/조회 API

## Milestone 4 (Week 7-8): Monetization Readiness
- 목표: 유료 전환 테스트 가능 상태
- 작업
  - 결제 연동 베타(토스/Stripe 중 1개)
  - 유료 상세 리포트 상품 1종
  - A/B 테스트(무료 결과 길이, paywall 위치)
  - 운영 대시보드(전환, 재방문, 결제 성공률)

## Success Metrics by Week 8
- 무료 결과 완료율 >= 65%
- D1 재방문율 >= 20%
- 유료 전환(실험군) >= 2%
- API p95 응답시간 <= 700ms (mock 기준)
