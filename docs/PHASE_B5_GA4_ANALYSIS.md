# Phase B-5: GA4 퍼널 이벤트 10개 구현 분석

## 1. 현재 분석 상태

### 1.1 설치된 Analytics 솔루션
- **PostHog 라이브러리**: `/apps/web/lib/analytics.ts`에서 PostHog 객체 감지하는 방식으로 구현
- **GA4 직접 설치**: 없음 (PostHog을 통한 간접 연동만 존재)
- **현재 추적 이벤트**:
  - `free_input_submit`: `/apps/web/app/free-fortune/page.tsx`에서만 구현
    ```typescript
    trackEvent("free_input_submit", {
      hasBirthTime: Boolean(input.birthTime),
      calendarType: input.calendarType,
      gender: input.gender
    });
    ```

### 1.2 코드 분석 결과
| 파일 | 상태 | 설명 |
|------|------|------|
| `/apps/web/lib/analytics.ts` | ✓ 기본 준비됨 | PostHog 호환 trackEvent() 함수 |
| `/apps/web/app/free-fortune/page.tsx` | 부분 구현 | 폼 제출만 추적 |
| `/apps/web/app/result/page.tsx` | 미구현 | 무료 결과 로드 추적 없음 |
| `/apps/web/app/paywall/page.tsx` | 미구현 | 결제 페이지 로드/클릭 추적 없음 |
| `/apps/web/app/report/[orderId]/page.tsx` | 미구현 | 유료 리포트 로드 추적 없음 |

---

## 2. 라우트/페이지 구조

### 2.1 주요 라우트 맵
```
/                           → 홈페이지 (hero + 가격 소개)
├─ /free-fortune           → 무료 사주 입력 폼
│  └─ /result              → 무료 결과 (요약만 공개)
│     └─ /paywall          → 결제 페이지 (상품 설명 + 버튼)
│        └─ /report/[orderId] → 유료 상세 리포트
├─ /variants               → 4개 버전 선택 페이지
├─ /privacy, /terms, /disclaimer → 정책 페이지
└─ /palm, /name, /face     → 향후 개발 예정
```

### 2.2 퍼널 흐름도
```
홈페이지 방문 (page_view)
    ↓
무료 입력 페이지 (form_start)
    ↓
이름 + 생년월일 입력 (form_step_1_complete)
    ↓
출생시간/성별/달력유형 추가 입력
    ↓
무료 리포트 생성 (form_submit)
    ↓
결과 페이지 로드 (free_report_view)
    ↓
공유 버튼 클릭 가능 (share_click - 추가 구현 필요)
    ↓
결제 페이지 진입 (paywall_view)
    ↓
결제 버튼 클릭 (checkout_click)
    ↓
리포트 페이지 로드 (checkout_complete)
    ↓
전체 리포트 스크롤 완료 (report_view_full)
```

---

## 3. GA4 설치 태스크

### 3.1 권장 설치 방식: @next/third-parties

Next.js 15.5.12 사용 중이므로, **@next/third-parties/google** 패키지 권장:

```bash
pnpm add @next/third-parties google-analytics
```

### 3.2 환경변수 설정

`.env.local` (개발) / `.env.production.local` (프로덕션):
```
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### 3.3 layout.tsx에서 GA4 초기화

```typescript
import { GoogleAnalytics } from '@next/third-parties/google'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID!} />
      </body>
    </html>
  )
}
```

**주의**:
- `NEXT_PUBLIC_` 프리픽스 필수 (클라이언트 접근)
- production 배포 전에 Google Analytics 측정 ID 생성 필요

---

## 4. 퍼널 이벤트 10개 정의

### 4.1 이벤트 1: page_view (자동)

| 속성 | 값 |
|------|-----|
| 이벤트명 | `page_view` |
| 발화 시점 | 모든 페이지 로드 (자동, GA4 라이브러리) |
| 파라미터 | page_location, page_title, page_path (자동) |
| 구현 파일 | (자동 - 추가 코드 불필요) |
| 추적 필요성 | 이미 GA4가 처리함 |

---

### 4.2 이벤트 2: form_start

| 속성 | 값 |
|------|-----|
| 이벤트명 | `form_start` |
| 발화 시점 | 무료 입력 폼에 focus 발생 (첫 input 클릭) |
| 파라미터 | `form_id: "fortune_input"`, `form_name: "무료사주입력"` |
| 구현 파일 | `/apps/web/app/free-fortune/page.tsx` |
| 트리거 | form 내 첫 input에 onFocus 핸들러 |

**구현 예시**:
```typescript
const handleFormStart = () => {
  trackEvent("form_start", {
    form_id: "fortune_input",
    form_name: "무료사주입력"
  });
};

// form 첫 input에 추가
<input onFocus={handleFormStart} ... />
```

---

### 4.3 이벤트 3: form_step_1_complete

| 속성 | 값 |
|------|-----|
| 이벤트명 | `form_step_1_complete` |
| 발화 시점 | 생년월일(birthDate) 입력 완료 시 |
| 파라미터 | `form_id: "fortune_input"`, `has_time: boolean`, `calendar_type: "solar"\|"lunar"` |
| 구현 파일 | `/apps/web/app/free-fortune/page.tsx` |
| 트리거 | birthDate input onChange에서 valid 상태 변경 감지 |

**구현 예시**:
```typescript
const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setInput((prev) => ({ ...prev, birthDate: e.target.value }));

  // birthDate가 유효해지면 이벤트 발생
  if (e.target.value && !prevBirthDate) {
    trackEvent("form_step_1_complete", {
      form_id: "fortune_input",
      has_time: Boolean(input.birthTime),
      calendar_type: input.calendarType
    });
  }
};
```

---

### 4.4 이벤트 4: form_submit

| 속성 | 값 |
|------|-----|
| 이벤트명 | `form_submit` |
| 발화 시점 | "무료 리포트 생성" 버튼 클릭 (form onSubmit) |
| 파라미터 | `form_id: "fortune_input"`, `form_name: "무료사주입력"`, `has_birth_time: boolean`, `calendar_type: string`, `gender: string` |
| 구현 파일 | `/apps/web/app/free-fortune/page.tsx` |
| 트리거 | form onSubmit (이미 submit 핸들러 존재) |

**현재 코드 개선**:
```typescript
const submit = (event: React.FormEvent) => {
  event.preventDefault();
  setSubmitted(true);
  if (!canSubmit) return;

  trackEvent("form_submit", {  // 이미 존재하는 "free_input_submit" 재명명
    form_id: "fortune_input",
    form_name: "무료사주입력",
    has_birth_time: Boolean(input.birthTime),
    calendar_type: input.calendarType,
    gender: input.gender
  });

  router.push(`/result?${toInputQuery(input)}`);
};
```

---

### 4.5 이벤트 5: free_report_view

| 속성 | 값 |
|------|-----|
| 이벤트명 | `free_report_view` |
| 발화 시점 | /result 페이지에서 리포트 데이터 로드 완료 |
| 파라미터 | `report_length: number` (자유 요약 글자수), `sections_count: number`, `has_debug_info: boolean` |
| 구현 파일 | `/apps/web/app/result/page.tsx` |
| 트리거 | preview 상태가 null → 데이터 로드됨 (useEffect) |

**구현 예시**:
```typescript
useEffect(() => {
  (async () => {
    if (!input) return setError("입력값이 없습니다.");
    try {
      setPreview(await webApi.reportPreview(input));
      // 로드 완료 후 이벤트 발생
      trackEvent("free_report_view", {
        report_length: preview?.free.summary.length ?? 0,
        sections_count: preview?.free.sections.length ?? 0,
        has_debug_info: Boolean(preview?.debugLengths)
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    }
  })();
}, [input]);
```

---

### 4.6 이벤트 6: paywall_view

| 속성 | 값 |
|------|-----|
| 이벤트명 | `paywall_view` |
| 발화 시점 | /paywall 페이지 로드 완료 |
| 파라미터 | `product_code: "full"`, `price: "12900"` (KRW), `currency: "KRW"` |
| 구현 파일 | `/apps/web/app/paywall/page.tsx` |
| 트리거 | PaywallInner 컴포넌트 마운트 |

**구현 예시**:
```typescript
useEffect(() => {
  trackEvent("paywall_view", {
    product_code: "full",
    price: 12900,
    currency: "KRW"
  });
}, []);
```

---

### 4.7 이벤트 7: checkout_click

| 속성 | 값 |
|------|-----|
| 이벤트명 | `checkout_click` |
| 발화 시점 | "모의 결제 진행" 버튼 클릭 |
| 파라미터 | `product_code: "full"`, `price: 12900`, `currency: "KRW"` |
| 구현 파일 | `/apps/web/app/paywall/page.tsx` |
| 트리거 | Button onClick={()\void checkout()} 실행 직전 |

**구현 예시**:
```typescript
const checkout = async () => {
  trackEvent("checkout_click", {
    product_code: "full",
    price: 12900,
    currency: "KRW"
  });

  if (!input) return setError("입력값이 없어 결제를 시작할 수 없습니다.");
  try {
    setState("creating");
    // ... 나머지 결제 로직
  } catch (e) {
    // ...
  }
};
```

---

### 4.8 이벤트 8: checkout_complete

| 속성 | 값 |
|------|-----|
| 이벤트명 | `checkout_complete` |
| 발화 시점 | /report/[orderId] 페이지 로드 완료 |
| 파라미터 | `order_id: string`, `product_code: "full"`, `price: 12900`, `currency: "KRW"` |
| 구현 파일 | `/apps/web/app/report/[orderId]/page.tsx` |
| 트리거 | data 상태가 null → 리포트 데이터 로드됨 |

**구현 예시**:
```typescript
useEffect(() => {
  (async () => {
    try {
      if (!orderId) return;
      const report = await webApi.report(orderId);
      setData(report);

      // 로드 완료 후 이벤트 발생
      trackEvent("checkout_complete", {
        order_id: orderId,
        product_code: "full",
        price: 12900,
        currency: "KRW"
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "리포트 조회 실패");
    }
  })();
}, [orderId]);
```

---

### 4.9 이벤트 9: share_click

| 속성 | 값 |
|------|-----|
| 이벤트명 | `share_click` |
| 발화 시점 | 공유 버튼 클릭 (향후 구현) |
| 파라미터 | `share_platform: "instagram"\|"kakao"\|"copy"`, `report_type: "free"\|"paid"` |
| 구현 파일 | `/apps/web/app/result/page.tsx` 또는 `/apps/web/app/report/[orderId]/page.tsx` |
| 트리거 | 공유 버튼 onClick |

**구현 예시** (향후):
```typescript
const handleShare = (platform: "instagram" | "kakao" | "copy") => {
  trackEvent("share_click", {
    share_platform: platform,
    report_type: preview ? "free" : "paid"
  });
  // 공유 로직...
};
```

---

### 4.10 이벤트 10: report_view_full

| 속성 | 값 |
|------|-----|
| 이벤트명 | `report_view_full` |
| 발화 시점 | 유료 리포트 페이지에서 마지막 섹션까지 스크롤 |
| 파라미터 | `order_id: string`, `scroll_depth: 100`, `report_length: number`, `time_on_page: number` (초) |
| 구현 파일 | `/apps/web/app/report/[orderId]/page.tsx` |
| 트리거 | Intersection Observer로 마지막 섹션 감지 |

**구현 예시**:
```typescript
useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !fullyViewed) {
      trackEvent("report_view_full", {
        order_id: orderId,
        scroll_depth: 100,
        report_length: data?.report?.sections?.reduce((acc, s) => acc + s.text.length, 0) ?? 0,
        time_on_page: Math.round((Date.now() - pageLoadTime) / 1000)
      });
      setFullyViewed(true);
    }
  });

  const lastSection = document.querySelector(".reportSection:last-of-type");
  if (lastSection) observer.observe(lastSection);

  return () => observer.disconnect();
}, [data, orderId, fullyViewed]);
```

---

## 5. 미니 궁합(호환성) 이벤트 3개 추가

### 5.1 이벤트: compatibility_check_start

| 속성 | 값 |
|------|-----|
| 이벤트명 | `compatibility_check_start` |
| 발화 시점 | 궁합 입력 페이지 진입 (향후 구현) |
| 파라미터 | `check_type: "fortune_with_partner"` |
| 주의 | 현재 미구현, /compatibility 라우트 필요 |

---

### 5.2 이벤트: compatibility_report_view

| 속성 | 값 |
|------|-----|
| 이벤트명 | `compatibility_report_view` |
| 발화 시점 | 궁합 결과 페이지 로드 완료 |
| 파라미터 | `check_type: "fortune_with_partner"`, `report_length: number`, `compatibility_score: number` (0~100) |
| 주의 | 현재 미구현 |

---

### 5.3 이벤트: compatibility_share_click

| 속성 | 값 |
|------|-----|
| 이벤트명 | `compatibility_share_click` |
| 발화 시점 | 궁합 결과 공유 버튼 클릭 |
| 파라미터 | `share_platform: "instagram"\|"kakao"\|"copy"`, `check_type: "fortune_with_partner"` |
| 주의 | 현재 미구현 |

---

## 6. 구현 파일 목록

### 6.1 analytics.ts 유틸 파일 개선

**파일**: `/apps/web/lib/analytics.ts`

```typescript
export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

type PostHogLike = {
  capture: (event: string, properties?: AnalyticsProps) => void;
};

type GtagLike = {
  event: (eventName: string, eventParams?: Record<string, any>) => void;
};

const getPostHog = (): PostHogLike | null => {
  if (typeof window === "undefined") return null;
  const maybe = (window as typeof window & { posthog?: PostHogLike }).posthog;
  return maybe ?? null;
};

const getGtag = (): GtagLike | null => {
  if (typeof window === "undefined") return null;
  const maybe = (window as typeof window & { gtag?: GtagLike }).gtag;
  return maybe ?? null;
};

export const trackEvent = (event: string, properties?: AnalyticsProps): void => {
  console.log("[analytics]", event, properties ?? {});

  // PostHog 지원
  const posthog = getPostHog();
  if (posthog) {
    posthog.capture(event, properties);
  }

  // GA4 지원
  const gtag = getGtag();
  if (gtag) {
    gtag.event(event, properties ?? {});
  }
};

export const trackPageView = (pagePath: string, pageTitle: string): void => {
  trackEvent("page_view", {
    page_location: typeof window !== "undefined" ? window.location.href : "",
    page_path: pagePath,
    page_title: pageTitle
  });
};

// GA4 E-commerce 추적 헬퍼 (향후)
export const trackEcommerceEvent = (eventName: string, ecommerceData: any): void => {
  trackEvent(eventName, {
    ...ecommerceData,
    currency: "KRW"
  });
};
```

### 6.2 각 컴포넌트별 이벤트 추가 위치

| 파일 | 이벤트명 | 위치 |
|------|---------|------|
| `/apps/web/app/free-fortune/page.tsx` | form_start | 첫 input onFocus |
| ↑ | form_step_1_complete | birthDate onChange |
| ↑ | form_submit | form onSubmit (기존 "free_input_submit" 개선) |
| `/apps/web/app/result/page.tsx` | free_report_view | preview 로드 완료 후 useEffect |
| `/apps/web/app/paywall/page.tsx` | paywall_view | 컴포넌트 마운트 useEffect |
| ↑ | checkout_click | checkout() 함수 시작 |
| `/apps/web/app/report/[orderId]/page.tsx` | checkout_complete | data 로드 완료 후 useEffect |
| ↑ | report_view_full | Intersection Observer로 마지막 섹션 감지 |

---

## 7. 구현 권장 순서

### Phase 1: GA4 기본 설치 (1-2일)
1. @next/third-parties/google 패키지 설치
2. layout.tsx에 GoogleAnalytics 컴포넌트 추가
3. 환경변수 설정 (개발/프로덕션)
4. 개발 환경에서 GA4 디버그 모드 확인

### Phase 2: 핵심 퍼널 이벤트 5개 구현 (2-3일)
1. analytics.ts 개선 (gtag 지원 추가)
2. form_start, form_step_1_complete, form_submit (free-fortune)
3. free_report_view (result)
4. paywall_view, checkout_click (paywall)
5. checkout_complete, report_view_full (report)

### Phase 3: 부가 기능 이벤트 (1-2일)
1. share_click 구현 (공유 버튼 UI 개발 후)
2. 미니 궁합 이벤트 3개 (향후 /compatibility 라우트 구현 후)

### Phase 4: A/B 테스트 세팅 (GA4 콘솔)
1. 이벤트 변환 목표 설정
2. 퍼널 분석 보고서 설정
3. 세그먼트 생성 (신규/재방문, 유입 채널)

---

## 8. Gate 조건 및 체크리스트

### 구현 Gate:
- [ ] GA4 측정 ID 발급 (Google Analytics 콘솔)
- [ ] 환경변수 설정 완료
- [ ] layout.tsx에 GA4 초기화 코드 추가
- [ ] analytics.ts gtag 지원 추가
- [ ] free-fortune 페이지 3개 이벤트 추가
- [ ] result 페이지 1개 이벤트 추가
- [ ] paywall 페이지 2개 이벤트 추가
- [ ] report 페이지 2개 이벤트 추가

### QA 체크리스트:
- [ ] 개발 환경에서 GA4 디버그 모드로 이벤트 확인
- [ ] 프로덕션 빌드 후 GA4 실제 전송 확인
- [ ] 퍼널 이벤트 순서 검증 (result → paywall → report)
- [ ] 이벤트 파라미터 일관성 확인
- [ ] 환불된 주문에 대한 역추적 로직 검토

---

## 9. 향후 확장 항목

1. **User ID 추적**: 회원가입/로그인 구현 후 user_id 추가
2. **세션 분석**: session_id 추가로 사용자 경로 추적
3. **리텐션 분석**: 재방문 사용자 세그먼트 추가
4. **환불 이벤트**: 환불 발생 시 별도 이벤트 추적
5. **A/B 테스트**: 가격 실험(3,900 vs 4,900), 페이월 카피 변형 등
6. **LTV 분석**: 장기 고객가치 추적 (재구매 패턴)
