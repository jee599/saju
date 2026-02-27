"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useMemo, useState, useEffect } from "react";
import {
  calculateFourPillars,
  analyzeElements,
  calculateCompatibility,
  FIVE_ELEMENTS,
  FIVE_ELEMENTS_KR,
  FIVE_ELEMENTS_EMOJI,
  type SajuInput,
} from "@saju/engine-saju";
import { trackEvent } from "../lib/gtag";

const ELEMENT_COLORS: Record<string, string> = {
  "木": "var(--color-element-wood)",
  "火": "var(--color-element-fire)",
  "土": "var(--color-element-earth)",
  "金": "var(--color-element-metal)",
  "水": "var(--color-element-water)",
};

function CountUpNumber({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(target * eased));
      if (progress >= 1) clearInterval(timer);
    }, 16);

    return () => clearInterval(timer);
  }, [target, duration]);

  return <span>{current}</span>;
}

function ShareButtons({ text, url }: { text: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${text}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank"
    );
  };

  return (
    <div className="rounded-2xl border border-glass-border bg-bg-card/60 p-5 text-center">
      <p className="mb-4 text-sm font-semibold text-t1">결과 공유하기</p>
      <div className="flex justify-center gap-3">
        <button
          onClick={handleCopy}
          className="rounded-xl border border-glass-border bg-bg-card px-5 py-2.5 text-xs font-medium text-t2 transition-colors hover:text-t1"
        >
          {copied ? "복사됨!" : "URL 복사"}
        </button>
        <button
          onClick={handleTwitter}
          className="rounded-xl border border-glass-border bg-bg-card px-5 py-2.5 text-xs font-medium text-t2 transition-colors hover:text-t1"
        >
          Twitter/X
        </button>
      </div>
    </div>
  );
}

function CompatibilityContent() {
  const searchParams = useSearchParams();

  const myYear = parseInt(searchParams.get("myYear") || "0", 10);
  const myMonth = parseInt(searchParams.get("myMonth") || "0", 10);
  const myDay = parseInt(searchParams.get("myDay") || "0", 10);
  const partnerYear = parseInt(searchParams.get("partnerYear") || "0", 10);
  const partnerMonth = parseInt(searchParams.get("partnerMonth") || "0", 10);
  const partnerDay = parseInt(searchParams.get("partnerDay") || "0", 10);

  const result = useMemo(() => {
    try {
      if (!myYear || !myMonth || !myDay || !partnerYear || !partnerMonth || !partnerDay) {
        return { error: "생년월일 정보가 부족합니다." };
      }

      const myInput: SajuInput = { year: myYear, month: myMonth, day: myDay, hour: 12, minute: 0 };
      const partnerInput: SajuInput = {
        year: partnerYear,
        month: partnerMonth,
        day: partnerDay,
        hour: 12,
        minute: 0,
      };

      const myResult = calculateFourPillars(myInput);
      const partnerResult = calculateFourPillars(partnerInput);
      const myAnalysis = analyzeElements(myResult.pillars);
      const partnerAnalysis = analyzeElements(partnerResult.pillars);
      const compatibility = calculateCompatibility(myResult.pillars, partnerResult.pillars);

      return { myAnalysis, partnerAnalysis, compatibility, error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "계산 오류가 발생했습니다" };
    }
  }, [myYear, myMonth, myDay, partnerYear, partnerMonth, partnerDay]);

  if (result.error || !result.compatibility || !result.myAnalysis || !result.partnerAnalysis) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-t1">궁합 분석 오류</h1>
          <p className="mt-2 text-sm text-t2">{result.error}</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-xl bg-gradient-to-r from-cta-from to-cta-to px-6 py-2.5 text-sm font-bold text-white"
          >
            돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const { myAnalysis, partnerAnalysis, compatibility } = result;

  const myEl = compatibility.myElement;
  const partnerEl = compatibility.partnerElement;
  const myIdx = FIVE_ELEMENTS.indexOf(myEl);
  const partnerIdx = FIVE_ELEMENTS.indexOf(partnerEl);

  const scoreColor =
    compatibility.score >= 70
      ? "text-element-wood"
      : compatibility.score >= 50
      ? "text-accent"
      : "text-accent-secondary";

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-glass-border bg-bg-top/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <Link href="/" className="text-base font-extrabold text-t1">
            FateSaju
          </Link>
          <span className="text-xs text-t3">궁합 분석</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 py-10">
        {/* Score Circle */}
        <div
          className="mb-8 text-center"
          style={{ animation: "fadeInUp 0.6s ease-out" }}
        >
          <div className="mx-auto mb-4 flex h-36 w-36 items-center justify-center rounded-full border-2 border-glass-border bg-bg-card/80">
            <div>
              <p className={`text-5xl font-extrabold ${scoreColor}`}>
                <CountUpNumber target={compatibility.score} />
              </p>
              <p className="text-xs text-t3">/ 100</p>
            </div>
          </div>
          <p className="text-lg font-bold text-t1">{compatibility.relationship}</p>
          <p className="mt-2 max-w-xs mx-auto text-sm text-t2">{compatibility.description}</p>
        </div>

        {/* Two Elements Display */}
        <div
          className="mb-8 grid grid-cols-2 gap-4"
          style={{ animation: "fadeInUp 0.6s ease-out 0.15s both" }}
        >
          {/* My Element */}
          <div className="rounded-xl border border-glass-border bg-bg-card/60 p-5 text-center">
            <p className="text-3xl">{FIVE_ELEMENTS_EMOJI[myIdx]}</p>
            <p
              className="mt-2 text-lg font-bold"
              style={{ color: ELEMENT_COLORS[myEl] }}
            >
              {myEl}
            </p>
            <p className="text-xs text-t2">{FIVE_ELEMENTS_KR[myIdx]}</p>
            <p className="mt-2 text-[10px] text-t3">
              {myYear}년 {myMonth}월 {myDay}일
            </p>
          </div>

          {/* Partner Element */}
          <div className="rounded-xl border border-glass-border bg-bg-card/60 p-5 text-center">
            <p className="text-3xl">{FIVE_ELEMENTS_EMOJI[partnerIdx]}</p>
            <p
              className="mt-2 text-lg font-bold"
              style={{ color: ELEMENT_COLORS[partnerEl] }}
            >
              {partnerEl}
            </p>
            <p className="text-xs text-t2">{FIVE_ELEMENTS_KR[partnerIdx]}</p>
            <p className="mt-2 text-[10px] text-t3">
              {partnerYear}년 {partnerMonth}월 {partnerDay}일
            </p>
          </div>
        </div>

        {/* Relationship Detail */}
        <div
          className="mb-8 rounded-xl border border-glass-border bg-bg-card/60 p-5"
          style={{ animation: "fadeInUp 0.6s ease-out 0.3s both" }}
        >
          <h3 className="mb-3 text-sm font-bold text-t1">오행 관계 분석</h3>
          <div className="space-y-2 text-sm text-t2">
            <p>
              <span style={{ color: ELEMENT_COLORS[myEl] }}>{myEl}</span>과{" "}
              <span style={{ color: ELEMENT_COLORS[partnerEl] }}>{partnerEl}</span>의
              관계는 <span className="font-semibold text-accent">{compatibility.relationship}</span>
              입니다.
            </p>
            <p>
              음양 조화:{" "}
              {myAnalysis.dayMaster.isYang !== partnerAnalysis.dayMaster.isYang
                ? "양과 음이 조화롭게 어우러집니다"
                : "같은 기운으로 서로를 이해하기 쉽습니다"}
            </p>
          </div>
        </div>

        {/* Share Buttons */}
        <section className="mb-8">
          <ShareButtons
            text={`우리 궁합 점수: ${compatibility.score}점! ${compatibility.relationship}`}
            url={typeof window !== "undefined" ? window.location.href : ""}
          />
        </section>

        {/* Action Buttons */}
        <div
          className="space-y-3"
          style={{ animation: "fadeInUp 0.6s ease-out 0.45s both" }}
        >
          <button
            className="w-full rounded-xl border border-glass-border bg-bg-card/60 py-3.5 text-sm font-semibold text-t1 transition-colors hover:bg-bg-card"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.share) {
                trackEvent.shareClick({ channel: "native_share", type: "compatibility" });
                navigator.share({
                  title: "FateSaju 궁합 분석",
                  text: `우리 궁합 점수: ${compatibility.score}점! ${compatibility.description}`,
                  url: window.location.href,
                });
              } else if (typeof navigator !== "undefined" && navigator.clipboard) {
                trackEvent.shareClick({ channel: "clipboard", type: "compatibility" });
                navigator.clipboard.writeText(window.location.href);
              }
            }}
          >
            상대방도 사주 보기 (공유)
          </button>

          <Link
            href={`/analyze?year=${myYear}&month=${myMonth}&day=${myDay}`}
            className="block w-full rounded-xl bg-gradient-to-r from-cta-from to-cta-to py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-cta-from/25 transition-all hover:shadow-xl"
          >
            내 사주 상세 보기
          </Link>

          <Link
            href="/"
            className="block text-center text-xs text-t3 hover:text-accent transition-colors"
          >
            처음으로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function CompatibilityPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-t2">궁합을 분석하는 중...</div>
        </div>
      }
    >
      <CompatibilityContent />
    </Suspense>
  );
}
