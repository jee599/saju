"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const STEPS = [
  { emoji: "🌊", label: "만세력 계산 중...", color: "var(--element-water)" },
  { emoji: "🌿", label: "오행 분석 중...", color: "var(--element-wood)" },
  { emoji: "⭐", label: "십성 배치 중...", color: "var(--element-metal)" },
  { emoji: "💫", label: "AI 해석 생성 중...", color: "var(--element-fire)" },
];

const FUN_TEXTS = [
  "518,400가지 조합 중 당신의 사주를 찾고 있어요",
  "1,000년 전통의 만세력이 AI와 만났습니다",
  "같은 날 태어나도 시간이 다르면 운명이 다릅니다",
  "3,000년 된 알고리즘 × 2026년 AI",
];

function LoadingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") ?? "/result";
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [funIdx, setFunIdx] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((s) => {
        if (s < STEPS.length - 1) return s + 1;
        return s;
      });
    }, 800);

    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return 100;
        return p + 2;
      });
    }, 60);

    const funInterval = setInterval(() => {
      setFunIdx((i) => (i + 1) % FUN_TEXTS.length);
    }, 3000);

    const redirectTimer = setTimeout(() => {
      router.push(redirectTo);
    }, 3500);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      clearInterval(funInterval);
      clearTimeout(redirectTimer);
    };
  }, [router, redirectTo]);

  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <main className="page">
      <div className="container">
        <div className="loadingScreen">
          <div className="loadingProgress">
            <svg viewBox="0 0 120 120">
              <circle className="track" cx="60" cy="60" r="52" />
              <circle
                className="fill"
                cx="60" cy="60" r="52"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
          </div>

          <div className="loadingSteps">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className={`loadingStep ${i < currentStep ? "done" : i === currentStep ? "active" : ""}`}
              >
                <span>{i < currentStep ? "✓" : step.emoji}</span>
                <span>{step.label}</span>
              </div>
            ))}
          </div>

          <p className="loadingFunText">{FUN_TEXTS[funIdx]}</p>
        </div>
      </div>
    </main>
  );
}

export default function LoadingAnalysisPage() {
  return (
    <Suspense fallback={<div className="loadingScreen"><p className="muted">준비 중...</p></div>}>
      <LoadingContent />
    </Suspense>
  );
}
