# Phase B-5: GA4 퍼널 이벤트 스펙 (최종 요약)

## 빠른 참조 테이블

### 10개 핵심 이벤트

| # | 이벤트명 | 발화 시점 | 주요 파라미터 | 구현 파일 |
|---|---------|---------|-------------|---------|
| 1 | `page_view` | 모든 페이지 로드 | page_path, page_title | (자동 - GA4) |
| 2 | `form_start` | 폼 첫 focus | form_id, form_name | free-fortune |
| 3 | `form_step_1_complete` | birthDate 입력 완료 | form_id, has_time, calendar_type | free-fortune |
| 4 | `form_submit` | "무료 리포트 생성" 클릭 | form_id, has_birth_time, calendar_type, gender | free-fortune |
| 5 | `free_report_view` | /result 페이지 로드 완료 | report_length, sections_count | result |
| 6 | `paywall_view` | /paywall 페이지 로드 | product_code, price, currency | paywall |
| 7 | `checkout_click` | "모의 결제 진행" 클릭 | product_code, price, currency | paywall |
| 8 | `checkout_complete` | /report 페이지 로드 완료 | order_id, product_code, price | report |
| 9 | `share_click` | 공유 버튼 클릭 | share_platform, report_type | (향후) |
| 10 | `report_view_full` | 유료 리포트 끝까지 스크롤 | order_id, scroll_depth, report_length, time_on_page | report |

### 미니 궁합 이벤트 3개

| 이벤트명 | 발화 시점 | 주요 파라미터 | 상태 |
|---------|---------|-------------|-----|
| `compatibility_check_start` | 궁합 입력 페이지 진입 | check_type | 미구현 |
| `compatibility_report_view` | 궁합 결과 로드 완료 | check_type, compatibility_score | 미구현 |
| `compatibility_share_click` | 궁합 결과 공유 클릭 | share_platform, check_type | 미구현 |

---

## 퍼널 플로우 (단계별)

```
Step 1: 홈페이지 방문
└─ Event: page_view
   Parameters: {
     page_path: "/",
     page_title: "사주는 빅데이터 | 확률 기반 명리 리포트"
   }

Step 2: 무료 입력 페이지 진입
└─ Event: page_view
   Parameters: {
     page_path: "/free-fortune",
     page_title: "무료 리포트 입력"
   }

Step 3: 폼 첫 입력 시작
└─ Event: form_start
   Parameters: {
     form_id: "fortune_input",
     form_name: "무료사주입력"
   }

Step 4: 이름 입력 + 생년월일 입력
└─ Event: form_step_1_complete
   Parameters: {
     form_id: "fortune_input",
     has_time: false,           // 출생시간 입력 여부
     calendar_type: "solar"     // 양력 or 음력
   }

Step 5: 나머지 필드(시간/성별/달력) 입력 후 "무료 리포트 생성" 클릭
└─ Event: form_submit
   Parameters: {
     form_id: "fortune_input",
     form_name: "무료사주입력",
     has_birth_time: false,
     calendar_type: "solar",
     gender: "male"
   }

Step 6: 무료 결과 페이지 로드
└─ Event: page_view + free_report_view
   Parameters (free_report_view):
   {
     report_length: 285,        // 문자 수
     sections_count: 1,         // 섹션 개수
     has_debug_info: true       // 디버그 정보 포함 여부
   }

Step 7: "결제로 전체 보기" 클릭 → 결제 페이지 진입
└─ Event: page_view + paywall_view
   Parameters (paywall_view):
   {
     product_code: "full",
     price: 12900,
     currency: "KRW"
   }

Step 8: "모의 결제 진행" 버튼 클릭
└─ Event: checkout_click
   Parameters: {
     product_code: "full",
     price: 12900,
     currency: "KRW"
   }

Step 9: 유료 리포트 페이지 로드
└─ Event: page_view + checkout_complete
   Parameters (checkout_complete):
   {
     order_id: "order-abc123xyz",
     product_code: "full",
     price: 12900,
     currency: "KRW"
   }

Step 10: 유료 리포트 전체 스크롤 (마지막 섹션까지)
└─ Event: report_view_full
   Parameters: {
     order_id: "order-abc123xyz",
     scroll_depth: 100,
     report_length: 4200,       // 전체 리포트 문자 수
     time_on_page: 45           // 페이지 체류 시간 (초)
   }

[선택] 공유 버튼 클릭
└─ Event: share_click
   Parameters: {
     share_platform: "kakao",   // "instagram", "kakao", "copy"
     report_type: "free"        // "free" or "paid"
   }
```

---

## 설치 체크리스트

### Phase 1: 기본 설정 (필수)

```bash
# 1. 패키지 설치
cd /Users/jidong/saju_global/apps/web
pnpm add google-analytics

# 2. GA4 측정 ID 발급
# → Google Analytics 콘솔에서 "데이터 스트림" 생성
# → 측정 ID 복사 (G-XXXXXXX 형식)

# 3. 환경변수 설정
echo 'NEXT_PUBLIC_GA_ID=G-XXXXXXX' >> .env.local
echo 'NEXT_PUBLIC_GA_ID=G-YYYYYYY' >> .env.production.local

# 4. layout.tsx 수정
# → GoogleAnalytics 컴포넌트 추가

# 5. analytics.ts 개선
# → gtag 지원 추가
```

### Phase 2: 페이지별 구현 (5일)

```typescript
// Day 1: free-fortune/page.tsx (3개 이벤트)
✓ form_start
✓ form_step_1_complete
✓ form_submit

// Day 2: result/page.tsx (1개 이벤트)
✓ free_report_view

// Day 3: paywall/page.tsx (2개 이벤트)
✓ paywall_view
✓ checkout_click

// Day 4: report/[orderId]/page.tsx (2개 이벤트)
✓ checkout_complete
✓ report_view_full

// Day 5: 테스트 및 배포
✓ 개발 환경 테스트 (GA4 디버그 모드)
✓ 스테이징 배포 및 검증
✓ 프로덕션 배포
```

---

## 이벤트별 구현 난이도 및 예상 시간

| 이벤트 | 난이도 | 예상 시간 | 주의사항 |
|--------|--------|---------|---------|
| page_view | 쉬움 | 5분 | GA4 자동 처리 |
| form_start | 쉬움 | 15분 | onFocus 이벤트 |
| form_step_1_complete | 보통 | 20분 | 상태 변경 감지 필요 |
| form_submit | 쉬움 | 10분 | 기존 코드 수정 |
| free_report_view | 보통 | 20분 | useEffect + 중복 방지 |
| paywall_view | 쉬움 | 15분 | 마운트 시 추적 |
| checkout_click | 쉬움 | 10분 | onClick 함수 시작 |
| checkout_complete | 보통 | 20분 | useEffect + 중복 방지 |
| share_click | 보통 | 30분 | 공유 UI 구현 후 |
| report_view_full | 어려움 | 45분 | Intersection Observer |

**총 예상 시간: 12-15시간 (개발자 1명 기준)**

---

## 데이터 수집 및 활용

### 수집되는 데이터 구조 (GA4)

```json
{
  "event_name": "form_submit",
  "event_timestamp": 1234567890,
  "user_id": "(애널리틱스가 할당)",
  "session_id": "session-12345",
  "event_parameters": {
    "form_id": "fortune_input",
    "form_name": "무료사주입력",
    "has_birth_time": false,
    "calendar_type": "solar",
    "gender": "male"
  },
  "user_properties": {
    "first_visit_date": "2025-02-26",
    "user_source": "direct",
    "device_model": "iPhone 15",
    "os": "iOS"
  }
}
```

### GA4 보고서 활용

1. **퍼널 분석**
   - 경로: form_start → form_submit → free_report_view → paywall_view → checkout_complete
   - 측정 항목: 각 단계 유저 수, 이탈률

2. **세그먼트 분석**
   - 신규 사용자 vs 재방문
   - 유입 채널별 (Direct, Instagram, Kakao)
   - 결제 완료 사용자 특성

3. **A/B 테스트**
   - 페이월 카피 변형
   - 결제 버튼 위치
   - 가격 책정 실험

4. **사용자 행동**
   - 폼 완성 시간 (form_start → form_submit)
   - 페이지 체류 시간 (report_view_full의 time_on_page)
   - 공유 의도 (share_click)

---

## 트러블슈팅

### Q1: 이벤트가 GA4에 전송되지 않음

**확인 사항**:
1. GA4 측정 ID가 올바른지 확인
2. `NEXT_PUBLIC_GA_ID` 환경변수 설정 여부
3. DevTools → Network 탭에서 `google-analytics` 요청 확인
4. DevTools → Console에서 `window.gtag` 객체 존재 확인

```javascript
// 콘솔에서 실행
console.log(window.gtag);  // 함수 객체가 출력되어야 함
gtag.config('G-XXXXXXX');  // 측정 ID로 재설정 시도
```

### Q2: 중복된 이벤트가 전송됨

**원인**: PostHog + GA4 이중 전송은 의도한 설계
**해결**: 필요시 analytics.ts에서 한쪽만 활성화

```typescript
// analytics.ts에서 선택적으로 주석 처리
export const trackEvent = (event: string, properties?: AnalyticsProps): void => {
  // const posthog = getPostHog();  // 비활성화
  // if (posthog) { posthog.capture(event, properties); }

  const gtag = getGtag();  // GA4만 사용
  if (gtag) { gtag.event(event, properties ?? {}); }
};
```

### Q3: SSR 환경에서 trackEvent 오류

**해결**: `"use client"` 선언 필수

```typescript
"use client";  // 이 줄이 필수

import { trackEvent } from "../../lib/analytics";

export default function MyComponent() {
  // trackEvent 사용 가능
}
```

### Q4: 사용자 ID 추적 방법

**현재**: GA4가 자동으로 user_id 할당
**향후** (회원가입 추가 후):

```typescript
// analytics.ts에 추가
export const setUserId = (userId: string): void => {
  const gtag = getGtag();
  if (gtag) {
    gtag.config({
      'user_id': userId
    });
  }
};

// 회원가입/로그인 후 호출
setUserId('user-12345');
```

---

## 참고 자료

- [Google Analytics 공식 문서](https://developers.google.com/analytics/devguides/collection/ga4)
- [Next.js @next/third-parties](https://nextjs.org/docs/app/building-your-application/optimizing/third-party-libraries)
- [GA4 이벤트 네이밍 컨벤션](https://support.google.com/analytics/answer/13316687)
- [퍼널 분석 베스트 프랙티스](https://support.google.com/analytics/answer/9317498)
