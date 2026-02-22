# 사주는 빅데이터 V1 (Web-first + iPhone-ready)

한국어 우선 사주 서비스 V1 모노레포입니다.  
웹(Next.js) 중심으로 `입력 -> 미리보기 -> 페이월 -> 모의결제 -> 잠금해제 리포트` 흐름을 제공하고, Expo(iOS) 앱에서 동일 여정을 최소 구현합니다.

## 앱 구성
- `apps/web`: Next.js App Router 웹 앱
- `apps/mobile`: Expo React Native 앱 (iPhone-ready)
- `packages/api`: Fastify API (모의결제/리포트 포함)
- `packages/shared`: 웹/모바일/API 공통 타입

## 핵심 기능
- 한국어 중심, 전문가/사실형 톤, 확률 기반 문장
- 신뢰 UI: 과장 표현 지양, 면책/법적 고지 분리
- 공유 문구: Instagram/Kakao 스타일 복사 기능
- API 클라이언트 계층 + 로딩/에러/재시도 상태
- 분석 이벤트 추상화 (console + optional `window.posthog`)

## 로컬 실행
### 1) 준비
```bash
# Node 20+ 권장
node -v

# pnpm 설치 (없다면)
npm i -g pnpm

pnpm install
cp .env.example .env
```

### 2) API 실행
```bash
pnpm dev:api
```
- 기본 주소: `http://localhost:3001`
- 엔드포인트:
  - `GET /health`
  - `POST /fortune/mock`
  - `POST /report/preview`
  - `POST /checkout/create`
  - `POST /checkout/confirm`
  - `GET /report/:orderId`

### 3) Web 실행
```bash
pnpm dev:web
```
- 기본 주소: `http://localhost:3000`
- 주요 페이지:
  - `/` 랜딩(요금제/FAQ/신뢰)
  - `/free-fortune` 입력
  - `/result` 무료 미리보기 + 공유
  - `/paywall` 결제 시뮬레이션
  - `/report/[orderId]` 잠금해제 리포트
  - `/terms`, `/privacy`, `/disclaimer`

### 4) Mobile(Expo) 실행
```bash
pnpm dev:mobile
```
- Expo DevTools에서 iOS/Android/Web 선택 가능
- API URL은 `EXPO_PUBLIC_API_URL` 환경변수 사용

## iOS 시뮬레이터 실행
```bash
# Xcode 설치 + Simulator 실행 상태 필요
pnpm --filter @saju/mobile ios
```
- 또는 `pnpm dev:mobile` 실행 후 터미널에서 `i` 키 입력
- iOS 시뮬레이터에서 동일 여정:
  - 입력 -> 미리보기 -> 페이월 -> 잠금해제 리포트

## 환경변수
`.env.example` 참고:
- `NEXT_PUBLIC_API_URL=http://localhost:3001`
- `EXPO_PUBLIC_API_URL=http://localhost:3001`

## Known Limitations
- 결제는 **모의결제**로만 동작 (실제 PG 연동 없음)
- 주문/리포트 저장소는 API 프로세스 메모리(Map) 기반
- 서버 재시작 시 주문/리포트 데이터 초기화
- 인증/회원/실제 영수증 발급 미구현

## Validation Status (2026-02-22)
### 확인됨
- 코드 레벨 구현 완료:
  - 웹/모바일 사용자 여정
  - API 신규 엔드포인트
  - 공통 타입 및 응답 계약
  - 법적 페이지/신뢰 카피 반영

### 미확인
- `pnpm` 미설치 환경으로 실제 실행/타입체크 미검증
  - 시도 결과: `pnpm: command not found`
- 미검증 항목:
  - Next.js 런타임 화면 동작
  - Fastify 런타임 호출
  - Expo iOS 시뮬레이터 실기동

## 품질 메모
- 카피는 "사주는 빅데이터" 포지셔닝을 반영하되 과도한 확정 표현을 피함
- 의료/법률/투자 관련 의사결정 단독 근거 사용 금지 고지 포함
