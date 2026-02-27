"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

const STEPS = [
  { emoji: "\uD83C\uDF0A", label: "만세력 계산 중..." },
  { emoji: "\uD83C\uDF3F", label: "오행 분석 중..." },
  { emoji: "\u2B50", label: "십성 배치 중..." },
  { emoji: "\uD83D\uDCAB", label: "AI 해석 생성 중..." },
] as const;

const FUN_TEXTS = [
  "518,400가지 조합 중 당신의 사주를 찾고 있어요",
  "60갑자의 비밀을 해독하고 있어요",
  "오행의 균형을 분석하고 있어요",
  "당신만의 운명 지도를 그리고 있어요",
] as const;

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const year = searchParams.get("year") || "";
  const month = searchParams.get("month") || "";
  const day = searchParams.get("day") || "";

  const [currentStep, setCurrentStep] = useState(0);
  const [funTextIndex, setFunTextIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!year || !month || !day) {
      router.replace("/");
      return;
    }

    // Step progression
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 700);

    // Fun text rotation
    const textInterval = setInterval(() => {
      setFunTextIndex((prev) => (prev + 1) % FUN_TEXTS.length);
    }, 1200);

    // Progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 2;
      });
    }, 55);

    // Redirect after 3 seconds
    const timeout = setTimeout(() => {
      router.replace(
        `/report/free?year=${year}&month=${month}&day=${day}&hour=12&minute=0`
      );
    }, 3000);

    return () => {
      clearInterval(stepInterval);
      clearInterval(textInterval);
      clearInterval(progressInterval);
      clearTimeout(timeout);
    };
  }, [year, month, day, router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      {/* Background radial gradient */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cta-from/8 blur-[160px]" />
      </div>

      <div className="relative w-full max-w-md text-center">
        {/* Spinning circle */}
        <div className="mx-auto mb-8 h-28 w-28">
          <svg
            className="h-full w-full"
            viewBox="0 0 120 120"
            style={{ animation: "spin-slow 3s linear infinite" }}
          >
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="rgba(167,139,218,0.15)"
              strokeWidth="4"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${progress * 3.27} 327`}
              transform="rotate(-90 60 60)"
              className="transition-all duration-200"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#A78BDA" />
                <stop offset="100%" stopColor="#D4A5C0" />
              </linearGradient>
            </defs>
          </svg>
          <p className="relative -mt-[76px] text-3xl">
            {STEPS[currentStep]?.emoji}
          </p>
        </div>

        {/* Step indicators */}
        <div className="mb-8 space-y-3">
          {STEPS.map((step, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-center gap-2 text-sm transition-all duration-300 ${
                idx <= currentStep
                  ? "text-t1 opacity-100"
                  : "text-t3 opacity-40"
              }`}
            >
              <span>{step.emoji}</span>
              <span
                className={
                  idx === currentStep ? "font-semibold text-accent" : ""
                }
              >
                {step.label}
              </span>
              {idx < currentStep && (
                <span className="text-element-wood">&#10003;</span>
              )}
            </div>
          ))}
        </div>

        {/* Fun rotating text */}
        <p
          className="text-sm text-t2 transition-opacity duration-300"
          style={{ animation: "pulse-glow 2s ease-in-out infinite" }}
        >
          {FUN_TEXTS[funTextIndex]}
        </p>

        {/* Date display */}
        <p className="mt-4 text-xs text-t3">
          {year}년 {month}월 {day}일
        </p>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-t2">로딩 중...</div>
        </div>
      }
    >
      <AnalyzeContent />
    </Suspense>
  );
}
