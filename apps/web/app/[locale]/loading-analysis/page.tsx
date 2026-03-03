"use client";

// TODO: Code-split heavy visual components (OhangCycleVisual, PillarsVisual,
// OhangDetailCard) with next/dynamic to reduce initial JS bundle size.

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useTranslations, useLocale } from "next-intl";

/* ──────────────────────────────────────────────────
   오행 상수 (비주얼 전용 — hanja, color, emoji)
   ────────────────────────────────────────────────── */

const OHANG_VISUAL = [
  { hanja: "木", color: "var(--element-wood)", emoji: "🌿" },
  { hanja: "火", color: "var(--element-fire)", emoji: "🔥" },
  { hanja: "土", color: "var(--element-earth)", emoji: "🌍" },
  { hanja: "金", color: "var(--element-metal)", emoji: "⚔️" },
  { hanja: "水", color: "var(--element-water)", emoji: "💧" },
];

/* ──────────────────────────────────────────────────
   슬라이드 비주얼 타입 + 메타 (색상, 아이콘)
   ────────────────────────────────────────────────── */

interface SlideMeta {
  icon: string;
  color: string;
  visual?: "ohang-cycle" | "pillars" | "stems" | "sipsung";
}

const SLIDE_META: SlideMeta[] = [
  { icon: "🌌", color: "var(--accent)", visual: "pillars" },
  { icon: "☯", color: "var(--accent-gold)", visual: "ohang-cycle" },
  { icon: "🌱", color: "var(--element-wood)" },
  { icon: "⚡", color: "var(--element-fire)" },
  { icon: "✨", color: "var(--accent-secondary)", visual: "stems" },
  { icon: "🐲", color: "var(--element-earth)" },
  { icon: "⭐", color: "var(--element-metal)", visual: "sipsung" },
  { icon: "🌊", color: "var(--element-water)" },
  { icon: "🔑", color: "var(--accent)" },
];

// Analysis stages are loaded from i18n: loading.stages[0..29]

/* ──────────────────────────────────────────────────
   타이핑 애니메이션 Hook
   ────────────────────────────────────────────────── */

function useTypewriter(lines: string[], speed = 28, lineDelay = 350) {
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
   비주얼 컴포넌트: 사주 네 기둥
   ────────────────────────────────────────────────── */

function PillarsVisual({ t }: { t: (key: string) => string }) {
  const cols = [0, 1, 2, 3];
  const tops = ["甲", "丙", "戊", "庚"];
  const bottoms = ["子", "寅", "辰", "午"];
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

function OhangCycleVisual({ activeIdx, t }: { activeIdx: number; t: (key: string) => string }) {
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
        <span className="cycleTaeguk">☯</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   비주얼 컴포넌트: 오행 상세 카드 (활성 원소)
   ────────────────────────────────────────────────── */

function OhangDetailCard({ idx, t }: { idx: number; t: (key: string) => string }) {
  const el = OHANG_VISUAL[idx];
  return (
    <div className="ohangDetailCard" style={{ "--card-accent": el.color } as React.CSSProperties}>
      <div className="ohangDetailHeader">
        <span className="ohangDetailEmoji">{el.emoji}</span>
        <div>
          <h3 className="ohangDetailTitle" style={{ color: el.color }}>
            {el.hanja} · {t(`ohang.${idx}.native`)}
          </h3>
          <p className="ohangDetailSub">{t(`ohang.${idx}.personality`)}</p>
        </div>
      </div>
      <div className="ohangDetailMeta">
        <span>🌸 {t(`ohang.${idx}.season`)}</span>
        <span>🧭 {t(`ohang.${idx}.direction`)}</span>
        <span>🫀 {t(`ohang.${idx}.organ`)}</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   메인 컴포넌트
   ────────────────────────────────────────────────── */

function LoadingContent() {
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
  const [elapsedSec, setElapsedSec] = useState(0);
  const [done, setDone] = useState(false);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");
  const [activeOhang, setActiveOhang] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const confirmCalled = useRef(false);

  // Pre-compute particle styles deterministically to avoid Math.random() hydration mismatch
  const particleStyles = useMemo(() =>
    Array.from({ length: 8 }).map((_, i) => ({
      left: `${10 + ((i * 37 + 13) % 80)}%`,
      animationDelay: `${(i * 17 + 7) % 30}s`,
      animationDuration: `${40 + ((i * 23 + 11) % 30)}s`,
      size: `${3 + ((i * 13 + 5) % 5)}px`,
      hue: [330, 40, 210, 270, 190][i % 5] as number,
    })), []);

  // 슬라이드 콘텐츠를 번역에서 가져오기
  const slideContentRaw = t.raw(`slides.${slideIdx}.content`) as string[];
  const slideContent = Array.isArray(slideContentRaw) ? slideContentRaw : [];

  const displayedLines = useTypewriter(slideContent, 25, 300);
  const slideMeta = SLIDE_META[slideIdx];

  // 슬라이드 전환 (10초 주기)
  useEffect(() => {
    let fadeTimeout: ReturnType<typeof setTimeout>;
    const timer = setInterval(() => {
      setFadeState("out");
      fadeTimeout = setTimeout(() => {
        setSlideIdx((i) => (i + 1) % SLIDE_META.length);
        setFadeState("in");
      }, 600);
    }, 10000);
    return () => {
      clearInterval(timer);
      clearTimeout(fadeTimeout);
    };
  }, []);

  // 오행 로테이션 (3초 주기)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveOhang((i) => (i + 1) % OHANG_VISUAL.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // 경과 시간
  useEffect(() => {
    const timer = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(timer);
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
        const currentKey = `${freeName}_${freeBirthDate}_${freeBirthTime}_${freeGender}_${freeCalendarType}`;
        sessionStorage.setItem("free_personality", json.data.section.text);
        sessionStorage.setItem("free_personality_key", currentKey);
      }

      setDone(true);
      const q = new URLSearchParams({
        name: freeName ?? "",
        birthDate: freeBirthDate ?? "",
        gender: freeGender ?? "other",
        calendarType: freeCalendarType ?? "solar",
        ...(freeBirthTime ? { birthTime: freeBirthTime } : {}),
      });
      setTimeout(() => router.push(`/result?${q.toString()}`), 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("genericError"));
      setIsGenerating(false);
    }
  }, [isFreeFlow, freeName, freeBirthDate, freeBirthTime, freeGender, freeCalendarType, locale, router, t]);

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
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        confirmRes = await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });

        if (confirmRes.status === 409) {
          const body = await confirmRes.json().catch(() => null);
          if (body?.error?.code === "PAYMENT_PENDING" && attempt < MAX_RETRIES) {
            // Exponential backoff: 1s, 2s, 3s, 4s, 5s, 6s, 7s, 8s
            await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
            continue;
          }
        }
        break;
      }

      if (!confirmRes || !confirmRes.ok) {
        const body = await confirmRes?.json().catch(() => null);
        // Reset confirmCalled so retry button works if needed
        confirmCalled.current = false;
        throw new Error(body?.error?.message ?? t("confirmFail"));
      }

      let personalityText: string | undefined;
      try {
        personalityText = sessionStorage.getItem("free_personality") ?? undefined;
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

      const viewToken = genBody?.data?.viewToken ?? '';
      setDone(true);
      setTimeout(() => router.push(`/report/${orderId}?token=${viewToken}`), 600);
      return;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("genericError"));
      setIsGenerating(false);
    }
  }, [orderId, router, t]);

  useEffect(() => {
    if (orderId) callConfirm();
  }, [orderId, callConfirm]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0
      ? `${m}${t("timeFormat.min")} ${s.toString().padStart(2, "0")}${t("timeFormat.sec")}`
      : `${s}${t("timeFormat.sec")}`;
  };

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
          {/* ── 상단: 오행 원 + 상세 카드 ── */}
          <div className="loadingTopSection">
            <div className="ohangVisualWrap">
              <div className="ohangGlowRing" />
              <OhangCycleVisual activeIdx={activeOhang} t={t} />
            </div>
            <div className="ohangInfoCol">
              <OhangDetailCard idx={activeOhang} t={t} />
              <div className="ohangDescSlider" aria-label={t("ohangSliderAria")}>
                <div className="ohangDescTrack" style={{ transform: `translateX(-${activeOhang * 100}%)` }}>
                  {OHANG_VISUAL.map((el, i) => (
                    <div key={el.hanja} className="ohangDescPane">
                      <strong style={{ color: el.color }}>{el.emoji} {el.hanja} {t(`ohang.${i}.native`)}</strong>
                      <p>{t(`ohang.${i}.description.0`)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 타이머 + 프로그레스 + 스텝 바 ── */}
          <div className="loadingStatusBar">
            <div className="loadingTimer">
              <span className="timerDot" />
              <span>{t("analyzing")} · {formatTime(elapsedSec)}</span>
            </div>
            {(() => {
              const EXPECTED_SEC = orderId ? 75 : 10;
              const rawByTime = done ? 100 : Math.min(97, (elapsedSec / EXPECTED_SEC) * 100);
              const pct = done ? 100 : Math.max(3, Math.min(97, Math.floor(rawByTime / 3) * 3));
              const stageIdx = done ? 29 : Math.min(29, Math.max(0, Math.floor(pct / 3) - 1));
              const stageText = t(`stages.${stageIdx}`);

              return (
                <>
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
                    <span className="loadingProgressPct">{pct}%</span>
                  </div>

                  <div className="loadingStageNow" aria-live="polite">
                    <span className="stageBadge">STEP {stageIdx + 1}/30</span>
                    <span className="stageText">{stageText}</span>
                  </div>

                  <div className="loadingSteps2">
                    {[0, 1, 2, 3, 4].map((i) => {
                      const localIdx = Math.min(29, Math.max(0, stageIdx - 2 + i));
                      const active = localIdx === stageIdx;
                      const doneState = localIdx < stageIdx;
                      return (
                        <div key={`${i}-${localIdx}`} className={`loadingStep2 ${doneState ? "done" : active ? "active" : ""}`}>
                          <span className="stepIcon">{doneState ? "✓" : `${localIdx + 1}`}</span>
                          <span className="stepLabel">{t(`stages.${localIdx}`)}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>

          {/* ── 교육 콘텐츠 슬라이드 ── */}
          <div className={`eduSlide ${fadeState}`}>
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
                <span key={i} className={`slideIndicator ${i === slideIdx ? "active" : ""}`} />
              ))}
            </div>
          </div>

          {/* ── 하단 안내 ── */}
          <div className="loadingFooter">
            {error ? (
              <div className="loadingError" aria-live="assertive">
                <p>⚠️ {error}</p>
                <button
                  className="btn btn-primary"
                  onClick={() => { setError(null); confirmCalled.current = false; if (orderId) callConfirm(); else callFreeGenerate(); }}
                >
                  {t("retry")}
                </button>
              </div>
            ) : (
              <p className="loadingHint" aria-live="polite">
                {isGenerating ? t("aiGenerating") : t("preparing")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoadingAnalysisPage() {
  const t = useTranslations("loading");
  return (
    <Suspense fallback={<div className="loadingScreen"><p className="muted">{t("preparing")}</p></div>}>
      <LoadingContent />
    </Suspense>
  );
}
