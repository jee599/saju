# Phase B-5: GA4 구현 실행 가이드

## 목차
1. GA4 기본 설치
2. 핵심 5개 파일 수정 사항
3. 이벤트별 코드 스니펫
4. 테스트 및 디버깅
5. 배포 체크리스트

---

## 1. GA4 기본 설치

### 1.1 패키지 설치
```bash
cd /Users/jidong/saju_global/apps/web
pnpm add google-analytics
```

**주의**: @next/third-parties는 Next.js 15.5.12에 이미 내장되어 있으므로 별도 설치 불필요

### 1.2 환경변수 설정

**`.env.local` (개발)**:
```
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

**`.env.production.local` (프로덕션, 배포 시)**:
```
NEXT_PUBLIC_GA_ID=G-YYYYYYYYYY
```

**값 얻는 방법**:
1. [Google Analytics](https://analytics.google.com) 접속
2. 좌측 "관리" → "계정 만들기"
3. 계정 이름: `FateSaju` 또는 현재 프로젝트명
4. 웹사이트 URL: `https://[production-domain].com`
5. 데이터 스트림 생성 후 측정 ID 복사 (`G-`로 시작)

### 1.3 layout.tsx 수정

**파일**: `/Users/jidong/saju_global/apps/web/app/layout.tsx`

```typescript
import type { Metadata } from "next";
import Link from "next/link";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "사주는 빅데이터 | 확률 기반 명리 리포트",
  description: "전통 명리 프레임을 확률 언어로 재해석한 신뢰형 리포트 서비스"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="ko">
      <head>
        {/* 기존 메타데이터는 유지 */}
      </head>
      <body>
        <header className="siteHeader">
          <div className="headerInner">
            <Link href="/" className="brand">
              사주는 빅데이터
            </Link>
            <nav className="topNav" aria-label="주요 메뉴">
              <Link href="/free-fortune">사주</Link>
              <Link href="/palm">손금(개발중)</Link>
              <Link href="/name">이름풀이(개발중)</Link>
              <Link href="/face">관상(개발중)</Link>
              <Link href="/terms">이용약관</Link>
              <Link href="/privacy">개인정보</Link>
              <Link href="/disclaimer">면책고지</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="siteFooter">
          <div className="footerInner">
            <p className="footerTitle">사주는 빅데이터</p>
            <p className="muted">전통 명리 해석 문법과 확률 기반 문장 엔진을 결합한 참고 서비스입니다.</p>
            <p className="muted">의료·법률·투자 판단은 반드시 자격 있는 전문가 자문과 함께 검토해 주세요.</p>
          </div>
        </footer>

        {/* GA4 초기화 */}
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}
```

---

## 2. analytics.ts 개선

**파일**: `/Users/jidong/saju_global/apps/web/lib/analytics.ts`

현재 코드:
```typescript
export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

type PostHogLike = {
  capture: (event: string, properties?: AnalyticsProps) => void;
};

const getPostHog = (): PostHogLike | null => {
  if (typeof window === "undefined") return null;
  const maybe = (window as typeof window & { posthog?: PostHogLike }).posthog;
  return maybe ?? null;
};

export const trackEvent = (event: string, properties?: AnalyticsProps): void => {
  console.log("[analytics]", event, properties ?? {});
  const posthog = getPostHog();
  if (posthog) {
    posthog.capture(event, properties);
  }
};
```

**개선된 코드** (GA4 지원 추가):
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

/**
 * 분석 이벤트 추적 (PostHog + GA4 동시 지원)
 * @param event 이벤트명 (예: "form_submit", "checkout_click")
 * @param properties 이벤트 속성 (선택사항)
 */
export const trackEvent = (event: string, properties?: AnalyticsProps): void => {
  console.log("[analytics]", event, properties ?? {});

  // PostHog으로 전송
  const posthog = getPostHog();
  if (posthog) {
    posthog.capture(event, properties);
  }

  // GA4로 전송 (google-analytics 라이브러리)
  const gtag = getGtag();
  if (gtag) {
    gtag.event(event, properties ?? {});
  }
};

/**
 * 페이지 뷰 이벤트 (명시적 호출)
 * Note: GA4는 자동으로 page_view를 전송하므로, 선택적으로만 호출
 */
export const trackPageView = (pagePath: string, pageTitle: string): void => {
  trackEvent("page_view", {
    page_location: typeof window !== "undefined" ? window.location.href : "",
    page_path: pagePath,
    page_title: pageTitle
  });
};
```

---

## 3. 각 페이지별 구현

### 3.1 free-fortune/page.tsx

**파일**: `/Users/jidong/saju_global/apps/web/app/free-fortune/page.tsx`

**변경 사항**:
- form_start 이벤트 추가
- form_step_1_complete 이벤트 추가
- form_submit 이벤트명 변경 및 파라미터 개선

```typescript
"use client";

import { useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { CalendarType, FortuneInput, Gender } from "../../lib/types";
import { trackEvent } from "../../lib/analytics";
import { toInputQuery } from "../../lib/fortune";
import { Button, GlassCard, PageContainer } from "../components/ui";

const defaultInput: FortuneInput = {
  name: "",
  birthDate: "",
  birthTime: "",
  gender: "male",
  calendarType: "solar"
};

export default function FreeFortunePage() {
  const router = useRouter();
  const [input, setInput] = useState<FortuneInput>(defaultInput);
  const [submitted, setSubmitted] = useState(false);
  const [formStarted, setFormStarted] = useState(false);
  const [step1Completed, setStep1Completed] = useState(false);

  const nameValid = input.name.trim().length >= 2;
  const birthDateValid = Boolean(input.birthDate);
  const canSubmit = useMemo(() => nameValid && birthDateValid, [nameValid, birthDateValid]);

  // 이벤트 1: 폼 시작
  const handleFormStart = () => {
    if (!formStarted) {
      trackEvent("form_start", {
        form_id: "fortune_input",
        form_name: "무료사주입력"
      });
      setFormStarted(true);
    }
  };

  // 이벤트 2: 첫 단계 완료 (생년월일 입력)
  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInput((prev) => ({ ...prev, birthDate: newValue }));

    // birthDate가 새로 유효해지면 이벤트 발생
    if (newValue && !step1Completed) {
      trackEvent("form_step_1_complete", {
        form_id: "fortune_input",
        has_time: Boolean(input.birthTime),
        calendar_type: input.calendarType
      });
      setStep1Completed(true);
    }
  };

  // 이벤트 3: 폼 제출
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!canSubmit) return;

    trackEvent("form_submit", {
      form_id: "fortune_input",
      form_name: "무료사주입력",
      has_birth_time: Boolean(input.birthTime),
      calendar_type: input.calendarType,
      gender: input.gender
    });

    router.push(`/result?${toInputQuery(input)}`);
  };

  return (
    <PageContainer>
      <GlassCard>
        <p className="heroEyebrow">무료 리포트 입력</p>
        <h1>기본 정보 입력 후 무료 요약 리포트 확인</h1>
        <p className="lead">무료 리포트는 짧은 요약만 제공하며, 이후 단일 장문 리포트로 확장할 수 있습니다.</p>

        <form onSubmit={submit} className="form" noValidate onFocus={handleFormStart}>
          <div className="formGrid cols2">
            <div className="formGroup">
              <label htmlFor="name">이름</label>
              <input
                id="name"
                className={`input ${submitted && !nameValid ? "inputError" : ""}`}
                value={input.name}
                onChange={(e) => setInput((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="홍길동"
                autoComplete="name"
                required
              />
              {submitted && !nameValid ? <p className="errorText">이름은 2자 이상 입력해 주세요.</p> : null}
            </div>

            <div className="formGroup">
              <label htmlFor="birthDate">생년월일</label>
              <input
                id="birthDate"
                className={`input ${submitted && !birthDateValid ? "inputError" : ""}`}
                type="date"
                value={input.birthDate}
                onChange={handleBirthDateChange}
                required
              />
              {submitted && !birthDateValid ? <p className="errorText">생년월일을 입력해 주세요.</p> : null}
            </div>

            <div className="formGroup">
              <label htmlFor="birthTime">출생시간 (선택)</label>
              <input
                id="birthTime"
                className="input"
                type="time"
                value={input.birthTime}
                onChange={(e) => setInput((prev) => ({ ...prev, birthTime: e.target.value }))}
              />
              <p className="formHelp muted">미입력 시 중립 시간 기준으로 해석합니다.</p>
            </div>

            <div className="formGroup">
              <label htmlFor="gender">성별</label>
              <select
                id="gender"
                className="select"
                value={input.gender}
                onChange={(e) => setInput((prev) => ({ ...prev, gender: e.target.value as Gender }))}
              >
                <option value="male">남성</option>
                <option value="female">여성</option>
                <option value="other">기타</option>
              </select>
            </div>

            <div className="formGroup">
              <label htmlFor="calendarType">달력 유형</label>
              <select
                id="calendarType"
                className="select"
                value={input.calendarType}
                onChange={(e) => setInput((prev) => ({ ...prev, calendarType: e.target.value as CalendarType }))}
              >
                <option value="solar">양력</option>
                <option value="lunar">음력</option>
              </select>
            </div>
          </div>

          <div className="buttonRow desktopOnly">
            <Button type="submit" size="lg" disabled={!canSubmit}>무료 리포트 생성</Button>
          </div>

          <div className="stickyCta">
            <div className="stickyCtaInner">
              <p className="muted">입력 완료 후 무료 리포트를 즉시 생성합니다.</p>
              <Button type="submit" size="lg" full disabled={!canSubmit}>무료 리포트 생성</Button>
            </div>
          </div>
        </form>
      </GlassCard>
    </PageContainer>
  );
}
```

---

### 3.2 result/page.tsx

**파일**: `/Users/jidong/saju_global/apps/web/app/result/page.tsx`

**변경 사항**: free_report_view 이벤트 추가

```typescript
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ReportPreview } from "../../lib/types";
import { webApi } from "../../lib/api";
import { trackEvent } from "../../lib/analytics";
import { toInputFromParams, toInputQuery } from "../../lib/fortune";
import { ButtonLink, GlassCard, LengthDebugBar, PageContainer, StatusBox } from "../components/ui";

function ResultInner() {
  const params = useSearchParams();
  const input = useMemo(() => toInputFromParams(new URLSearchParams(params.toString())), [params]);
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventTracked, setEventTracked] = useState(false);

  useEffect(() => {
    (async () => {
      if (!input) return setError("입력값이 없습니다.");
      try {
        const data = await webApi.reportPreview(input);
        setPreview(data);

        // 이벤트 5: 무료 결과 로드 완료
        if (!eventTracked) {
          trackEvent("free_report_view", {
            report_length: data?.free.summary.length ?? 0,
            sections_count: data?.free.sections.length ?? 0,
            has_debug_info: Boolean(data?.debugLengths)
          });
          setEventTracked(true);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "불러오기 실패");
      }
    })();
  }, [input, eventTracked]);

  const paywallHref = input ? `/paywall?${toInputQuery(input)}` : "/free-fortune";

  return (
    <PageContainer>
      <GlassCard>
        <p className="heroEyebrow">무료 결과</p>
        <h1>무료 요약 리포트</h1>
        <p className="lead">짧은 요약만 먼저 확인하고, 필요하면 단일 유료 상품으로 전체 장문 리포트를 바로 열 수 있습니다.</p>

        {error ? <StatusBox title="오류" description={error} tone="error" /> : null}

        {!preview ? (
          <p className="muted">리포트를 생성하고 있습니다...</p>
        ) : (
          <>
            <h2>{preview.free.headline}</h2>
            <p className="muted mt-sm">{preview.free.summary}</p>

            {preview.debugLengths && <LengthDebugBar values={[{ label: "무료", info: preview.debugLengths.free }, { label: "유료", info: preview.debugLengths.paid }]} />}

            <div className="sectionStack mt-md">
              {preview.free.sections.map((section) => (
                <article key={section.key} className="sectionBlock">
                  <h3>{section.title}</h3>
                  <p>{section.text}</p>
                </article>
              ))}
            </div>

            <div className="ctaPanel">
              <h3>{preview.cta.label}</h3>
              <p className="muted mt-sm">{preview.cta.description}</p>
              <div className="buttonRow">
                <ButtonLink href={paywallHref} variant="primary">
                  {preview.cta.priceLabel} 결제로 전체 보기
                </ButtonLink>
              </div>
            </div>
          </>
        )}
      </GlassCard>
    </PageContainer>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<PageContainer><GlassCard><p>결과 로딩중...</p></GlassCard></PageContainer>}>
      <ResultInner />
    </Suspense>
  );
}
```

---

### 3.3 paywall/page.tsx

**파일**: `/Users/jidong/saju_global/apps/web/app/paywall/page.tsx`

**변경 사항**: paywall_view, checkout_click 이벤트 추가

```typescript
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { webApi } from "../../lib/api";
import { trackEvent } from "../../lib/analytics";
import { getPriceLabel, toInputFromParams, toInputQuery } from "../../lib/fortune";
import { Button, ButtonLink, GlassCard, PageContainer, StatusBox } from "../components/ui";

type CheckoutState = "idle" | "creating" | "confirming" | "failed";

function PaywallInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<CheckoutState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [paywallEventTracked, setPaywallEventTracked] = useState(false);

  const input = useMemo(() => toInputFromParams(new URLSearchParams(searchParams.toString())), [searchParams]);

  // 이벤트 6: 페이월 페이지 로드
  useEffect(() => {
    if (!paywallEventTracked) {
      trackEvent("paywall_view", {
        product_code: "full",
        price: 12900,
        currency: "KRW"
      });
      setPaywallEventTracked(true);
    }
  }, [paywallEventTracked]);

  // 이벤트 7: 결제 버튼 클릭
  const checkout = async () => {
    trackEvent("checkout_click", {
      product_code: "full",
      price: 12900,
      currency: "KRW"
    });

    if (!input) return setError("입력값이 없어 결제를 시작할 수 없습니다.");
    try {
      setState("creating");
      const created = await webApi.checkoutCreate({ productCode: "full", input });
      setState("confirming");
      const confirmed = await webApi.checkoutConfirm({ orderId: created.order.orderId });
      router.push(`/report/${confirmed.order.orderId}?${toInputQuery(input)}`);
    } catch (e) {
      setState("failed");
      setError(e instanceof Error ? e.message : "결제 시뮬레이션 실패");
    }
  };

  return (
    <PageContainer>
      <GlassCard>
        <p className="heroEyebrow">리포트 잠금 해제</p>
        <h1>단일 장문 리포트</h1>
        <p className="lead">실제 청구 없는 모의 결제로 전체 리포트를 즉시 확인할 수 있습니다.</p>

        <article className="pricingCard mt-sm">
          <h3>상품 구성</h3>
          <p className="price">{getPriceLabel("full")}</p>
          <ul className="flatList compactList">
            <li>대화형 한국어 장문 리포트</li>
            <li>성격·직업·연애·금전·건강·가족·배우자 분석</li>
            <li>각 도메인 과거→현재→미래 + 대운 타임라인</li>
          </ul>
        </article>

        <div className="buttonRow mt-md">
          <ButtonLink href={input ? `/result?${toInputQuery(input)}` : "/free-fortune"} variant="ghost">결과로 돌아가기</ButtonLink>
          <Button onClick={() => void checkout()} disabled={state === "creating" || state === "confirming"}>
            {state === "creating" ? "주문 생성 중..." : state === "confirming" ? "결제 확인 중..." : "모의 결제 진행"}
          </Button>
        </div>

        {error ? <StatusBox title="오류" description={error} tone="error" /> : null}
      </GlassCard>
    </PageContainer>
  );
}

export default function PaywallPage() {
  return (
    <Suspense fallback={<PageContainer><GlassCard><p>결제 페이지 로딩중...</p></GlassCard></PageContainer>}>
      <PaywallInner />
    </Suspense>
  );
}
```

---

### 3.4 report/[orderId]/page.tsx

**파일**: `/Users/jidong/saju_global/apps/web/app/report/[orderId]/page.tsx`

**변경 사항**: checkout_complete, report_view_full 이벤트 추가

```typescript
"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import type { GetReportResponse } from "../../../lib/types";
import { webApi } from "../../../lib/api";
import { trackEvent } from "../../../lib/analytics";
import { ButtonLink, GlassCard, LengthDebugBar, PageContainer, StatusBox } from "../../components/ui";

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/g)
    .map((p) => p.replace(/\s+\n/g, "\n").trim())
    .filter(Boolean);
}

function highlightFirstSentence(paragraph: string): { lead?: string; rest?: string } {
  const idx = paragraph.search(/[.!?]\s/);
  if (idx === -1) return { lead: paragraph };
  const cut = idx + 1;
  return {
    lead: paragraph.slice(0, cut).trim(),
    rest: paragraph.slice(cut).trim()
  };
}

function SectionText({ text }: { text: string }) {
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 0) return null;

  return (
    <div className="reportText">
      {paragraphs.map((p, i) => {
        if (i === 0) {
          const { lead, rest } = highlightFirstSentence(p);
          return (
            <p key={i} className="reportParagraph">
              {lead ? <mark className="reportMark">{lead}</mark> : null}{rest ? ` ${rest}` : null}
            </p>
          );
        }
        return (
          <p key={i} className="reportParagraph">
            {p}
          </p>
        );
      })}
    </div>
  );
}

export default function ReportPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [data, setData] = useState<GetReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutCompleteTracked, setCheckoutCompleteTracked] = useState(false);
  const [reportViewFullTracked, setReportViewFullTracked] = useState(false);
  const pageLoadTimeRef = useRef<number>(Date.now());
  const lastSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!orderId) return;
        const report = await webApi.report(orderId);
        setData(report);

        // 이벤트 8: 결제 완료 (리포트 로드됨)
        if (!checkoutCompleteTracked) {
          trackEvent("checkout_complete", {
            order_id: orderId,
            product_code: "full",
            price: 12900,
            currency: "KRW"
          });
          setCheckoutCompleteTracked(true);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "리포트 조회 실패");
      }
    })();
  }, [orderId, checkoutCompleteTracked]);

  // 이벤트 10: 전체 리포트 뷰 (마지막 섹션까지 스크롤)
  useEffect(() => {
    if (!data || !data.report) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !reportViewFullTracked) {
          const reportLength = data.report?.sections?.reduce((acc, s) => acc + s.text.length, 0) ?? 0;
          trackEvent("report_view_full", {
            order_id: orderId,
            scroll_depth: 100,
            report_length: reportLength,
            time_on_page: Math.round((Date.now() - pageLoadTimeRef.current) / 1000)
          });
          setReportViewFullTracked(true);
        }
      },
      { threshold: 0.5 }
    );

    // 마지막 섹션 찾기
    const lastSection = document.querySelector(".reportSection:last-of-type");
    if (lastSection) {
      observer.observe(lastSection);
      lastSectionRef.current = lastSection as HTMLElement;
    }

    return () => {
      if (lastSectionRef.current) {
        observer.unobserve(lastSectionRef.current);
      }
      observer.disconnect();
    };
  }, [data, orderId, reportViewFullTracked]);

  const [model, setModel] = useState<"preferred" | "gpt" | "claude">("preferred");

  const report = useMemo(() => {
    if (!data) return null;
    if (!data.reportsByModel) return data.report;
    if (model === "gpt") return data.reportsByModel.gpt;
    if (model === "claude") return data.reportsByModel.claude;
    return data.report;
  }, [data, model]);

  const toc = useMemo(() => report?.sections ?? [], [report]);

  return (
    <PageContainer>
      <GlassCard>
        <p className="heroEyebrow">전체 리포트</p>
        <h1>주문 리포트 상세</h1>
        <p className="lead">전문 명리 해설체와 확률 표현 원칙으로 작성된 전체 결과입니다.</p>

        <div className="buttonRow">
          <ButtonLink href="/free-fortune" variant="ghost">새로 생성</ButtonLink>
        </div>

        {error ? <StatusBox title="오류" description={error} tone="error" /> : null}

        {!data || !report ? (
          <p className="muted">리포트 로딩중...</p>
        ) : (
          <div className="reportLayout">
            <aside className="reportToc">
              <div className="tocCard">
                <h3>목차</h3>
                {data.reportsByModel ? (
                  <div className="buttonRow mt-xs" role="group" aria-label="모델 선택">
                    <button className="button ghost" onClick={() => setModel("preferred")} aria-pressed={model === "preferred"}>
                      추천본
                    </button>
                    <button className="button ghost" onClick={() => setModel("gpt")} aria-pressed={model === "gpt"}>
                      GPT
                    </button>
                    <button className="button ghost" onClick={() => setModel("claude")} aria-pressed={model === "claude"}>
                      Claude
                    </button>
                  </div>
                ) : null}
                <nav aria-label="리포트 목차">
                  {toc.map((section) => (
                    <a key={section.key} href={`#${section.key}`}>{section.title}</a>
                  ))}
                </nav>
                {report.debugLength && <LengthDebugBar values={[{ label: "유료", info: report.debugLength }]} />}
              </div>
            </aside>

            <section className="reportBody">
              <article className="reportHead">
                <h2>{report.headline}</h2>
                <p className="muted">{report.summary}</p>
              </article>

              <nav className="reportJumpNav" aria-label="리포트 빠른 이동">
                {toc.map((section) => (
                  <a key={section.key} href={`#${section.key}`}>{section.title}</a>
                ))}
                <a href="#report-checklist">실행 체크리스트</a>
              </nav>

              {report.sections.map((section) => (
                <article key={section.key} id={section.key} className="reportSection">
                  <h3>{section.title}</h3>
                  <SectionText text={section.text} />
                </article>
              ))}

              <article id="report-checklist" className="reportSection">
                <h3>실행 체크리스트</h3>
                <ul className="flatList compactList">
                  {report.recommendations.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </article>

              <p className="muted reportDisclaimer">{report.disclaimer}</p>
            </section>
          </div>
        )}
      </GlassCard>
    </PageContainer>
  );
}
```

---

## 4. 테스트 및 디버깅

### 4.1 로컬 개발 환경 테스트

```bash
# GA4 디버그 모드 활성화 (Chrome DevTools)
# 1. F12 → Console
# 2. gtag.js 라이브러리가 로드되었는지 확인
window.gtag

# 3. 수동 이벤트 발동
gtag('event', 'form_start', {
  form_id: 'fortune_input',
  form_name: '무료사주입력'
});

# 4. 콘솔에서 확인
console.log('이벤트 발동됨')
```

### 4.2 GA4 디버그 모드 사용 (권장)

**Google Analytics 설정**:
1. Google Analytics 콘솔 접속
2. 좌측 "관리" → "데이터 확인" → "디버그 보기"
3. 디버그 모드 활성화
4. 개발 환경에서 `/result` → `/paywall` → `/report` 순서로 네비게이션
5. 실시간으로 이벤트 수신 확인

### 4.3 콘솔 로그 확인

```javascript
// 터미널/DevTools 콘솔에서 확인
[analytics] form_start Object { form_id: "fortune_input", form_name: "무료사주입력" }
[analytics] form_step_1_complete Object { form_id: "fortune_input", has_time: false, calendar_type: "solar" }
[analytics] form_submit Object { form_id: "fortune_input", form_name: "무료사주입력", has_birth_time: false, calendar_type: "solar", gender: "male" }
[analytics] free_report_view Object { report_length: 285, sections_count: 1, has_debug_info: true }
[analytics] paywall_view Object { product_code: "full", price: 12900, currency: "KRW" }
[analytics] checkout_click Object { product_code: "full", price: 12900, currency: "KRW" }
[analytics] checkout_complete Object { order_id: "abc123", product_code: "full", price: 12900, currency: "KRW" }
[analytics] report_view_full Object { order_id: "abc123", scroll_depth: 100, report_length: 4200, time_on_page: 12 }
```

---

## 5. 배포 체크리스트

### 배포 전 확인 사항

```
[ ] GA4 측정 ID 발급 완료
[ ] .env.production.local에 NEXT_PUBLIC_GA_ID 설정
[ ] npm run build 성공
[ ] npm run verify 성공
[ ] 개발 환경에서 모든 이벤트 콘솔 확인됨
[ ] 스테이징 환경에서 GA4 실제 전송 확인됨
    - GA4 디버그 보기에서 이벤트 수신
    - 24시간 후 실시간 리포트에서 데이터 표시
[ ] 불필요한 console.log("[analytics]", ...) 검토 (프로덕션에서는 선택적으로 제거)
```

### 배포 후 모니터링 (첫 7일)

```
Day 1: 기본 페이지 뷰 및 이벤트 수신 확인
Day 2-3: 퍼널 완성도 검증 (form → paywall → report)
Day 4-7: 사용자 세그먼트 분석 (신규/재방문 비중)
```

---

## 6. 주의사항

1. **환경변수**: GA4 ID는 `NEXT_PUBLIC_` 프리픽스 필수
2. **SSR/CSR**: trackEvent는 클라이언트에서만 실행 (`useEffect` 또는 이벤트 핸들러)
3. **중복 추적**: 같은 이벤트가 PostHog + GA4로 이중 전송되도록 설계됨 (의도함)
4. **타이밍**: 이벤트 추적은 라우트 변경 **전후**가 아닌 명확한 액션 시점에
5. **오류 처리**: trackEvent가 실패해도 사용자 흐름에 영향 없도록 설계
