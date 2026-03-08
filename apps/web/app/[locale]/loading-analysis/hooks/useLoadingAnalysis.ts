"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "../../../../i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  trackFunnel,
  trackError as trackAnalyticsError,
  createPageTimer,
  trackPageEvent,
} from "../../../../lib/analytics";

/* ──────────────────────────────────────────────────
   타이핑 애니메이션 Hook
   ────────────────────────────────────────────────── */

export function useTypewriter(lines: string[], speed = 28, lineDelay = 350) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);

  useEffect(() => {
    setDisplayedLines([]);
    setCurrentLine(0);
    setCurrentChar(0);
  }, [lines]);

  useEffect(() => {
    if (currentLine >= lines.length) return;
    const line = lines[currentLine];

    if (currentChar < line.length) {
      const timer = setTimeout(() => {
        setDisplayedLines((prev) => {
          const copy = [...prev];
          copy[currentLine] = line.slice(0, currentChar + 1);
          return copy;
        });
        setCurrentChar((c) => c + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setCurrentLine((l) => l + 1);
        setCurrentChar(0);
      }, lineDelay);
      return () => clearTimeout(timer);
    }
  }, [currentLine, currentChar, lines, speed, lineDelay]);

  return displayedLines;
}

/* ──────────────────────────────────────────────────
   SLIDE_META 상수
   ────────────────────────────────────────────────── */

export interface SlideMeta {
  icon: string;
  color: string;
  visual?: "ohang-cycle" | "pillars" | "stems" | "sipsung";
}

export const SLIDE_META: SlideMeta[] = [
  { icon: "\u{1F30C}", color: "var(--accent)", visual: "pillars" },
  { icon: "\u262F", color: "var(--accent-gold)", visual: "ohang-cycle" },
  { icon: "\u{1F331}", color: "var(--element-wood)" },
  { icon: "\u26A1", color: "var(--element-fire)" },
  { icon: "\u2728", color: "var(--accent-secondary)", visual: "stems" },
  { icon: "\u{1F432}", color: "var(--element-earth)" },
  { icon: "\u2B50", color: "var(--element-metal)", visual: "sipsung" },
  { icon: "\u{1F30A}", color: "var(--element-water)" },
  { icon: "\u{1F511}", color: "var(--accent)" },
];

/* ──────────────────────────────────────────────────
   오행 상수 (비주얼 전용)
   ────────────────────────────────────────────────── */

export const OHANG_VISUAL = [
  { hanja: "\u6728", color: "var(--element-wood)", emoji: "\u{1F33F}" },
  { hanja: "\u706B", color: "var(--element-fire)", emoji: "\u{1F525}" },
  { hanja: "\u571F", color: "var(--element-earth)", emoji: "\u{1F30D}" },
  { hanja: "\u91D1", color: "var(--element-metal)", emoji: "\u2694\uFE0F" },
  { hanja: "\u6C34", color: "var(--element-water)", emoji: "\u{1F4A7}" },
];

/* ──────────────────────────────────────────────────
   메인 Hook
   ────────────────────────────────────────────────── */

export function useLoadingAnalysis() {
  const t = useTranslations("loading");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get("orderId");

  // Free flow params
  const freeName = params.get("name");
  const freeBirthDate = params.get("birthDate");
  const freeBirthTime = params.get("birthTime");
  const freeGender = params.get("gender");
  const freeCalendarType = params.get("calendarType");
  const isFreeFlow = !orderId && !!freeBirthDate;

  const [slideIdx, setSlideIdx] = useState(0);
  // elapsedSec state is only for display; ref tracks actual value for callbacks
  const [elapsedSec, setElapsedSec] = useState(0);
  const elapsedSecRef = useRef(0);
  const [done, setDone] = useState(false);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");
  const [activeOhang, setActiveOhang] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const confirmCalled = useRef(false);
  const pageTimerRef = useRef<ReturnType<typeof createPageTimer> | null>(null);
  const trackedRef = useRef(false);
  const autoSlideRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Pre-compute particle styles deterministically
  const particleStyles = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => ({
        left: `${10 + ((i * 37 + 13) % 80)}%`,
        animationDelay: `${(i * 17 + 7) % 30}s`,
        animationDuration: `${40 + ((i * 23 + 11) % 30)}s`,
        size: `${3 + ((i * 13 + 5) % 5)}px`,
        hue: [330, 40, 210, 270, 190][i % 5] as number,
      })),
    [],
  );

  // 슬라이드 콘텐츠
  const slideContentRaw = t.raw(`slides.${slideIdx}.content`) as string[];
  const slideContent = Array.isArray(slideContentRaw) ? slideContentRaw : [];
  const displayedLines = useTypewriter(slideContent, 25, 300);
  const slideMeta = SLIDE_META[slideIdx];

  // Track page view + loading start
  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackPageEvent("/loading-analysis");
    trackFunnel("loading_start", { flow: orderId ? "paid" : "free" });
    pageTimerRef.current = createPageTimer("loading");
    return () => {
      pageTimerRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 슬라이드 전환
  const goToSlide = useCallback((direction: "next" | "prev") => {
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    setFadeState("out");
    fadeTimeoutRef.current = setTimeout(() => {
      setSlideIdx((i) => {
        if (direction === "next") return (i + 1) % SLIDE_META.length;
        return (i - 1 + SLIDE_META.length) % SLIDE_META.length;
      });
      setFadeState("in");
    }, 500);
  }, []);

  // 자동 슬라이드 (10초 주기)
  useEffect(() => {
    autoSlideRef.current = setInterval(() => goToSlide("next"), 10000);
    return () => {
      if (autoSlideRef.current) clearInterval(autoSlideRef.current);
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, [goToSlide]);

  // 터치 스와이프 핸들러
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        goToSlide(dx < 0 ? "next" : "prev");
        if (autoSlideRef.current) clearInterval(autoSlideRef.current);
        autoSlideRef.current = setInterval(() => goToSlide("next"), 10000);
      }
    },
    [goToSlide],
  );

  const handleIndicatorClick = useCallback(
    (targetIdx: number) => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      setFadeState("out");
      fadeTimeoutRef.current = setTimeout(() => {
        setSlideIdx(targetIdx);
        setFadeState("in");
      }, 500);
      if (autoSlideRef.current) clearInterval(autoSlideRef.current);
      autoSlideRef.current = setInterval(() => goToSlide("next"), 10000);
    },
    [goToSlide],
  );

  // 오행 로테이션 (3초 주기)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveOhang((i) => (i + 1) % OHANG_VISUAL.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // 경과 시간 — ref tracks actual, state for display only
  useEffect(() => {
    const timer = setInterval(() => {
      elapsedSecRef.current += 1;
      setElapsedSec(elapsedSecRef.current);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 평균 응답 시간 (localStorage에서 읽기)
  const avgResponseTime = useMemo(() => {
    try {
      const stored = localStorage.getItem("avg_llm_response_sec");
      if (stored) {
        const val = parseInt(stored, 10);
        if (!isNaN(val) && val > 0) return val;
      }
    } catch {}
    return orderId ? 120 : 6;
  }, [orderId]);

  // Helper: 평균 응답 시간 저장
  const saveAvgResponseTime = useCallback(() => {
    try {
      const elapsed = elapsedSecRef.current;
      const prev = localStorage.getItem("avg_llm_response_sec");
      const prevVal = prev ? parseInt(prev, 10) : 0;
      const avg = prevVal > 0 ? Math.round((prevVal + elapsed) / 2) : elapsed;
      localStorage.setItem("avg_llm_response_sec", String(avg));
    } catch {}
  }, []);

  // Free flow: 무료 성격분석 생성
  const callFreeGenerate = useCallback(async () => {
    if (!isFreeFlow || confirmCalled.current) return;
    confirmCalled.current = true;
    setIsGenerating(true);

    try {
      const res = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "free",
          input: {
            name: freeName,
            birthDate: freeBirthDate,
            birthTime: freeBirthTime,
            gender: freeGender,
            calendarType: freeCalendarType,
          },
          locale,
        }),
      });

      const json = await res.json();
      if (json.ok && json.data?.section?.text) {
        try {
          const currentKey = `${freeName}_${freeBirthDate}_${freeBirthTime}_${freeGender}_${freeCalendarType}`;
          sessionStorage.setItem("free_personality", json.data.section.text);
          sessionStorage.setItem("free_personality_key", currentKey);
        } catch {}
      }

      setDone(true);
      trackFunnel("loading_complete", { flow: "free" });
      pageTimerRef.current?.stop();
      saveAvgResponseTime();
      const q = new URLSearchParams({
        name: freeName ?? "",
        birthDate: freeBirthDate ?? "",
        gender: freeGender ?? "other",
        calendarType: freeCalendarType ?? "solar",
        ...(freeBirthTime ? { birthTime: freeBirthTime } : {}),
      });
      setTimeout(() => router.push(`/result?${q.toString()}`), 600);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : t("genericError");
      setError(errMsg);
      trackAnalyticsError("loading_free_error", errMsg);
      setIsGenerating(false);
    }
  }, [
    isFreeFlow,
    freeName,
    freeBirthDate,
    freeBirthTime,
    freeGender,
    freeCalendarType,
    locale,
    router,
    t,
    saveAvgResponseTime,
  ]);

  useEffect(() => {
    if (isFreeFlow) callFreeGenerate();
  }, [isFreeFlow, callFreeGenerate]);

  // checkout/confirm + 유료 리포트 생성
  const callConfirm = useCallback(async () => {
    if (!orderId || confirmCalled.current) return;
    confirmCalled.current = true;
    setIsGenerating(true);

    try {
      // Retry logic for 409 PAYMENT_PENDING (webhook race condition)
      const MAX_RETRIES = 8;
      let confirmRes: Response | null = null;
      let confirmBody: Record<string, unknown> | null = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        confirmRes = await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });

        if (confirmRes.status === 409) {
          confirmBody = await confirmRes.json().catch(() => null);
          if (
            (confirmBody as { error?: { code?: string } })?.error?.code ===
              "PAYMENT_PENDING" &&
            attempt < MAX_RETRIES
          ) {
            // Exponential backoff: 1s, 2s, 3s, 4s, 5s, 6s, 7s, 8s
            await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
            continue;
          }
        }
        break;
      }

      if (!confirmRes || !confirmRes.ok) {
        const body =
          confirmBody ?? (await confirmRes?.json().catch(() => null));
        confirmCalled.current = false;
        const code = body?.error?.code;
        const errorKey =
          code === "PAYMENT_PENDING"
            ? "errorPending"
            : code === "PAYMENT_NOT_PAID"
              ? "errorNotPaid"
              : code === "PAYMENT_VERIFICATION_REQUIRED"
                ? "errorVerification"
                : null;
        throw new Error(errorKey ? t(errorKey) : t("confirmFail"));
      }

      let personalityText: string | undefined;
      try {
        personalityText =
          sessionStorage.getItem("free_personality") ?? undefined;
      } catch {}

      const genRes = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "paid", orderId, personalityText }),
      });

      const genBody = await genRes.json().catch(() => null);
      if (!genRes.ok) {
        throw new Error(genBody?.error?.message ?? t("reportFail"));
      }

      const viewToken = genBody?.data?.viewToken ?? "";
      setDone(true);
      trackFunnel("loading_complete", { flow: "paid" });
      trackFunnel("checkout_complete");
      pageTimerRef.current?.stop();
      saveAvgResponseTime();
      setTimeout(
        () => router.push(`/report/${orderId}?token=${viewToken}`),
        600,
      );
      return;
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : t("genericError");
      setError(errMsg);
      trackAnalyticsError("loading_paid_error", errMsg);
      setIsGenerating(false);
    }
  }, [orderId, router, t, saveAvgResponseTime]);

  useEffect(() => {
    if (orderId) callConfirm();
  }, [orderId, callConfirm]);

  // Retry handler
  const handleRetry = useCallback(() => {
    setError(null);
    confirmCalled.current = false;
    if (orderId) callConfirm();
    else callFreeGenerate();
  }, [orderId, callConfirm, callFreeGenerate]);

  // Go home handler
  const goHome = useCallback(() => {
    router.push("/");
  }, [router]);

  // Navigation arrow handlers (reset auto-slide timer)
  const handleArrowClick = useCallback(
    (direction: "next" | "prev") => {
      goToSlide(direction);
      if (autoSlideRef.current) clearInterval(autoSlideRef.current);
      autoSlideRef.current = setInterval(() => goToSlide("next"), 10000);
    },
    [goToSlide],
  );

  const formatTime = useCallback(
    (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return m > 0
        ? `${m}${t("timeFormat.min")} ${s.toString().padStart(2, "0")}${t("timeFormat.sec")}`
        : `${s}${t("timeFormat.sec")}`;
    },
    [t],
  );

  // Progress calculation values
  const progressCap = 95;
  const progressK = orderId ? 0.015 : 0.08;
  const rawPct = done ? 100 : progressCap * (1 - Math.exp(-progressK * elapsedSec));
  const pct = done ? 100 : Math.max(3, Math.min(progressCap, Math.floor(rawPct)));
  const stageIdx = done ? 29 : Math.min(29, Math.max(0, Math.floor((pct * 30) / 100)));
  const stageText = t(`stages.${stageIdx}`);
  const remaining = done ? 0 : Math.max(0, avgResponseTime - elapsedSec);

  return {
    t,
    orderId,
    slideIdx,
    elapsedSec,
    done,
    fadeState,
    activeOhang,
    error,
    isGenerating,
    particleStyles,
    slideContent,
    displayedLines,
    slideMeta,
    avgResponseTime,
    pct,
    stageIdx,
    stageText,
    remaining,
    goToSlide,
    handleTouchStart,
    handleTouchEnd,
    handleIndicatorClick,
    handleRetry,
    handleArrowClick,
    goHome,
    formatTime,
  };
}
