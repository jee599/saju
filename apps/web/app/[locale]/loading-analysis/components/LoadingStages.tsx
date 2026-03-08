"use client";

import React from "react";
import { OHANG_VISUAL, SLIDE_META } from "../hooks/useLoadingAnalysis";
import type { SlideMeta } from "../hooks/useLoadingAnalysis";

/* ──────────────────────────────────────────────────
   비주얼 컴포넌트: 사주 네 기둥
   ────────────────────────────────────────────────── */

export function PillarsVisual({ t }: { t: (key: string) => string }) {
  const cols = [0, 1, 2, 3];
  const tops = ["\u7532", "\u4E19", "\u620A", "\u5E9A"];
  const bottoms = ["\u5B50", "\u5BC5", "\u8FB0", "\u5348"];
  const colors = [
    "var(--element-wood)",
    "var(--element-fire)",
    "var(--element-earth)",
    "var(--element-metal)",
  ];

  return (
    <div className="pillarsVisual">
      <div className="pillarsRow">
        {cols.map((i) => (
          <div key={i} className="pillar" style={{ animationDelay: `${i * 0.15}s` }}>
            <span className="pillarLabel">{t(`pillarsVisual.cols.${i}`)}</span>
            <div className="pillarBox" style={{ borderColor: colors[i] }}>
              <span className="pillarChar" style={{ color: colors[i] }}>{tops[i]}</span>
              <span className="pillarDivider" />
              <span className="pillarChar" style={{ color: colors[i] }}>{bottoms[i]}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="pillarsCaption">
        <span>{t("pillarsVisual.heaven")}</span>
        <span>{t("pillarsVisual.earth")}</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   비주얼 컴포넌트: 오행 상생 사이클
   ────────────────────────────────────────────────── */

export function OhangCycleVisual({ activeIdx, t }: { activeIdx: number; t: (key: string) => string }) {
  return (
    <div className="ohangCycleVisual">
      {OHANG_VISUAL.map((el, i) => {
        const angle = (i * 72 - 90) * (Math.PI / 180);
        const r = 42;
        const x = 50 + r * Math.cos(angle);
        const y = 50 + r * Math.sin(angle);
        const isActive = i === activeIdx;
        return (
          <div
            key={el.hanja}
            className={`cycleNode ${isActive ? "active" : ""}`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              "--node-color": el.color,
            } as React.CSSProperties}
          >
            <span className="cycleEmoji">{el.emoji}</span>
            <span className="cycleHanja">{el.hanja}</span>
            <span className="cycleKo">{t(`ohang.${i}.native`)}</span>
          </div>
        );
      })}
      <svg className="cycleLines" viewBox="0 0 100 100">
        {OHANG_VISUAL.map((_, i) => {
          const a1 = (i * 72 - 90) * (Math.PI / 180);
          const next = (i + 1) % 5;
          const a2 = (next * 72 - 90) * (Math.PI / 180);
          const r = 42;
          return (
            <line
              key={i}
              x1={50 + r * Math.cos(a1)} y1={50 + r * Math.sin(a1)}
              x2={50 + r * Math.cos(a2)} y2={50 + r * Math.sin(a2)}
              stroke={OHANG_VISUAL[i].color}
              strokeWidth="0.4"
              strokeOpacity={i === activeIdx ? 0.8 : 0.15}
              strokeDasharray={i === activeIdx ? "none" : "2 2"}
            />
          );
        })}
      </svg>
      <div className="cycleCenter">
        <span className="cycleTaeguk">{"\u262F"}</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   비주얼 컴포넌트: 오행 상세 카드
   ────────────────────────────────────────────────── */

export function OhangDetailCard({ idx, t }: { idx: number; t: (key: string) => string }) {
  const el = OHANG_VISUAL[idx];
  return (
    <div className="ohangDetailCard" style={{ "--card-accent": el.color } as React.CSSProperties}>
      <div className="ohangDetailHeader">
        <span className="ohangDetailEmoji">{el.emoji}</span>
        <div>
          <h3 className="ohangDetailTitle" style={{ color: el.color }}>
            {el.hanja} {"\u00B7"} {t(`ohang.${idx}.native`)}
          </h3>
          <p className="ohangDetailSub">{t(`ohang.${idx}.personality`)}</p>
        </div>
      </div>
      <div className="ohangDetailMeta">
        <span>{"\u{1F338}"} {t(`ohang.${idx}.season`)}</span>
        <span>{"\u{1F9ED}"} {t(`ohang.${idx}.direction`)}</span>
        <span>{"\u{1FAC0}"} {t(`ohang.${idx}.organ`)}</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   오행 슬라이더 + 상단 섹션
   ────────────────────────────────────────────────── */

export function LoadingTopSection({
  activeOhang,
  t,
}: {
  activeOhang: number;
  t: (key: string) => string;
}) {
  return (
    <div className="loadingTopSection">
      <div className="ohangVisualWrap">
        <div className="ohangGlowRing" />
        <OhangCycleVisual activeIdx={activeOhang} t={t} />
      </div>
      <div className="ohangInfoCol">
        <OhangDetailCard idx={activeOhang} t={t} />
        <div className="ohangDescSlider" aria-label={t("ohangSliderAria")}>
          {OHANG_VISUAL.map((el, i) => (
            <div key={el.hanja} className={`ohangDescPane ${i === activeOhang ? "active" : ""}`}>
              <strong style={{ color: el.color }}>{el.emoji} {el.hanja} {t(`ohang.${i}.native`)}</strong>
              <p>{t(`ohang.${i}.description.0`)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   프로그레스 바 + 상태 표시
   ────────────────────────────────────────────────── */

export function LoadingStatusBar({
  t,
  pct,
  stageText,
  remaining,
  done,
}: {
  t: (key: string) => string;
  pct: number;
  stageText: string;
  remaining: number;
  done: boolean;
}) {
  return (
    <div className="loadingStatusBar">
      <div className="loadingTimer">
        <div className="loadingTimerTop">
          <span className="timerDot" />
          <span>
            {t("analyzing")} {"\u00B7"} {remaining > 0
              ? `${t("estimatedTime")} ${remaining}${t("timeFormat.sec")}`
              : t("almostDone")}
          </span>
        </div>
        <span className="stageTextCenter">{stageText}</span>
      </div>

      <div className="loadingProgressBar">
        <div
          className="loadingProgressTrack"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("progressAria")}
        >
          <div className="loadingProgressFill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   교육 콘텐츠 슬라이드
   ────────────────────────────────────────────────── */

export function EduSlide({
  t,
  slideIdx,
  slideMeta,
  fadeState,
  activeOhang,
  displayedLines,
  goToSlide,
  handleTouchStart,
  handleTouchEnd,
  handleIndicatorClick,
  handleArrowClick,
}: {
  t: (key: string) => string;
  slideIdx: number;
  slideMeta: SlideMeta;
  fadeState: "in" | "out";
  activeOhang: number;
  displayedLines: string[];
  goToSlide: (direction: "next" | "prev") => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchEnd: (e: React.TouchEvent) => void;
  handleIndicatorClick: (targetIdx: number) => void;
  handleArrowClick: (direction: "next" | "prev") => void;
}) {
  return (
    <div className="eduSlideWrap">
      <button
        type="button"
        className="eduSlideArrow prev"
        onClick={() => handleArrowClick("prev")}
        aria-label="Previous slide"
      >
        {"\u2039"}
      </button>
      <button
        type="button"
        className="eduSlideArrow next"
        onClick={() => handleArrowClick("next")}
        aria-label="Next slide"
      >
        {"\u203A"}
      </button>
      <div
        className={`eduSlide ${fadeState}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {slideMeta.visual === "pillars" && <PillarsVisual t={t} />}
        {slideMeta.visual === "ohang-cycle" && (
          <div className="eduOhangMini">
            <OhangCycleVisual activeIdx={activeOhang} t={t} />
          </div>
        )}

        <div className="eduHeader">
          <span className="eduIcon" style={{ color: slideMeta.color }}>{slideMeta.icon}</span>
          <h2 className="eduTitle" style={{ color: slideMeta.color }}>{t(`slides.${slideIdx}.title`)}</h2>
        </div>
        <div className="eduBody">
          {displayedLines.map((line, i) => (
            <p key={i} className="eduLine">
              {line}
              {i === displayedLines.length - 1 && <span className="cursor">|</span>}
            </p>
          ))}
        </div>

        {/* 슬라이드 인디케이터 */}
        <div className="slideIndicators">
          {SLIDE_META.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`slideIndicator ${i === slideIdx ? "active" : ""}`}
              onClick={() => handleIndicatorClick(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
