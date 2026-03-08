"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "saju_onboarded";
const SLIDE_COUNT = 3;
const AUTO_ADVANCE_MS = 4000;

const slides = [
  {
    titleKey: "slide1Title" as const,
    textKey: "slide1Text" as const,
    visual: (
      <div className="onb-visual">
        <span className="onb-emoji-lg">☯️</span>
        <div className="onb-pillars">
          <span>年</span><span>月</span><span>日</span><span>時</span>
        </div>
      </div>
    ),
  },
  {
    titleKey: "slide2Title" as const,
    textKey: "slide2Text" as const,
    visual: (
      <div className="onb-visual">
        <div className="onb-elements">
          <span>🌿</span><span>🔥</span><span>⛰️</span><span>⚙️</span><span>🌊</span>
        </div>
      </div>
    ),
  },
  {
    titleKey: "slide3Title" as const,
    textKey: "slide3Text" as const,
    visual: (
      <div className="onb-visual">
        <span className="onb-emoji-lg">🤖</span>
        <span className="onb-emoji-lg onb-sparkle">✨</span>
      </div>
    ),
  },
];

export default function OnboardingCarousel() {
  const t = useTranslations("onboarding");
  const [dismissed, setDismissed] = useState(true);
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef(0);
  const touchDeltaRef = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Check localStorage after mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const val = localStorage.getItem(STORAGE_KEY);
    if (!val) setDismissed(false);
  }, []);

  // Auto-advance
  useEffect(() => {
    if (dismissed || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDE_COUNT);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [dismissed, isPaused]);

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }, []);

  const goTo = useCallback((idx: number) => {
    setCurrent(idx);
    setIsPaused(true);
  }, []);

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    touchDeltaRef.current = 0;
    setIsPaused(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchDeltaRef.current = e.touches[0].clientX - touchStartRef.current;
  }, []);

  const onTouchEnd = useCallback(() => {
    const delta = touchDeltaRef.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0 && current < SLIDE_COUNT - 1) {
        setCurrent((p) => p + 1);
      } else if (delta > 0 && current > 0) {
        setCurrent((p) => p - 1);
      }
    }
    // Resume auto-advance after 6s
    setTimeout(() => setIsPaused(false), 6000);
  }, [current]);

  if (dismissed) return null;

  return (
    <section
      className="onb-carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        ref={trackRef}
        className="onb-track"
        style={{ transform: `translateX(-${current * 100}%)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {slides.map((slide, i) => (
          <div key={i} className="onb-slide">
            <div className="onb-card glassCard">
              {slide.visual}
              <h3 className="onb-title">{t(slide.titleKey)}</h3>
              <p className="onb-text">{t(slide.textKey)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="onb-controls">
        <div className="onb-dots">
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <button
              key={i}
              className={`onb-dot ${i === current ? "active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <button className="onb-skip" onClick={dismiss}>
          {t("skip")}
        </button>
      </div>
    </section>
  );
}
