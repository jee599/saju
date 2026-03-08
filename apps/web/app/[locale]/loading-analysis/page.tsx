"use client";

// TODO: Code-split heavy visual components (OhangCycleVisual, PillarsVisual,
// OhangDetailCard) with next/dynamic to reduce initial JS bundle size.

import React, { Suspense } from "react";
import { PageSkeleton } from "../components/Skeleton";
import { useLoadingAnalysis } from "./hooks/useLoadingAnalysis";
import { LoadingTopSection, LoadingStatusBar, EduSlide } from "./components/LoadingStages";
import { LoadingFooter } from "./components/LoadingError";

function LoadingContent() {
  const {
    t,
    orderId,
    slideIdx,
    fadeState,
    activeOhang,
    error,
    isGenerating,
    particleStyles,
    displayedLines,
    slideMeta,
    pct,
    stageText,
    remaining,
    done,
    goToSlide,
    handleTouchStart,
    handleTouchEnd,
    handleIndicatorClick,
    handleRetry,
    handleArrowClick,
    goHome,
  } = useLoadingAnalysis();

  return (
    <div className="page loadingAnalysis">
      {/* 은은한 빛 파티클 */}
      <div className="loadingParticles" aria-hidden="true">
        {particleStyles.map((ps, i) => (
          <span
            key={i}
            className="particle"
            style={{
              left: ps.left,
              animationDelay: ps.animationDelay,
              animationDuration: ps.animationDuration,
              "--particle-size": ps.size,
              "--particle-hue": `${ps.hue}`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* 배경 오로라 글로우 */}
      <div className="loadingAurora" aria-hidden="true" />

      <div className="container">
        <div className="loadingScreen2">
          <LoadingTopSection activeOhang={activeOhang} t={t} />

          <LoadingStatusBar
            t={t}
            pct={pct}
            stageText={stageText}
            remaining={remaining}
            done={done}
          />

          <EduSlide
            t={t}
            slideIdx={slideIdx}
            slideMeta={slideMeta}
            fadeState={fadeState}
            activeOhang={activeOhang}
            displayedLines={displayedLines}
            goToSlide={goToSlide}
            handleTouchStart={handleTouchStart}
            handleTouchEnd={handleTouchEnd}
            handleIndicatorClick={handleIndicatorClick}
            handleArrowClick={handleArrowClick}
          />

          <LoadingFooter
            error={error}
            isGenerating={isGenerating}
            orderId={orderId}
            onRetry={handleRetry}
            onGoHome={goHome}
            retryLabel={t("retry")}
            retryOtherLabel={t("retryOther")}
            generatingText={t("aiGenerating")}
            preparingText={t("preparing")}
            supportEmail={t("supportEmail")}
            contactSupportLabel={t("contactSupport")}
          />
        </div>
      </div>
    </div>
  );
}

export default function LoadingAnalysisPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LoadingContent />
    </Suspense>
  );
}
