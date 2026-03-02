"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
            <span className="cycleKo">{t(`ohang.${i}.ko`)}</span>
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
            {el.hanja} · {t(`ohang.${idx}.ko`)}
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
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [done, setDone] = useState(false);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");
  const [activeOhang, setActiveOhang] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const confirmCalled = useRef(false);

  // 슬라이드 콘텐츠를 번역에서 가져오기
  const slideContentRaw = t.raw(`slides.${slideIdx}.content`) as string[];
  const slideContent = Array.isArray(slideContentRaw) ? slideContentRaw : [];

  const displayedLines = useTypewriter(slideContent, 25, 300);
  const slideMeta = SLIDE_META[slideIdx];

  // 슬라이드 전환 (10초 주기)
  useEffect(() => {
    const timer = setInterval(() => {
      setFadeState("out");
      setTimeout(() => {
        setSlideIdx((i) => (i + 1) % SLIDE_META.length);
        setFadeState("in");
      }, 600);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // 오행 로테이션 (3초 주기)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveOhang((i) => (i + 1) % OHANG_VISUAL.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // 스텝 진행
  useEffect(() => {
    const stepsCount = 5;
    const timer = setInterval(() => {
      setStepIdx((s) => (s < stepsCount - 1 ? s + 1 : s));
    }, 12000);
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
      const confirmRes = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (!confirmRes.ok) {
        const body = await confirmRes.json().catch(() => null);
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

      if (!genRes.ok) {
        const body = await genRes.json().catch(() => null);
        throw new Error(body?.error?.message ?? t("reportFail"));
      }

      setDone(true);
      setTimeout(() => router.push(`/report/${orderId}`), 600);
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
    <main className="page loadingAnalysis">
      {/* 은은한 빛 파티클 */}
      <div className="loadingParticles" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="particle"
            style={{
              left: `${10 + Math.random() * 80}%`,
              animationDelay: `${Math.random() * 30}s`,
              animationDuration: `${40 + Math.random() * 30}s`,
              "--particle-size": `${3 + Math.random() * 5}px`,
              "--particle-hue": `${[330, 40, 210, 270, 190][i % 5]}`,
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
            <OhangDetailCard idx={activeOhang} t={t} />
          </div>

          {/* ── 타이머 + 프로그레스 + 스텝 바 ── */}
          <div className="loadingStatusBar">
            <div className="loadingTimer">
              <span className="timerDot" />
              <span>{t("analyzing")} · {formatTime(elapsedSec)}</span>
            </div>
            {(() => {
              const EXPECTED_SEC = orderId ? 60 : 3;
              const rawPct = done ? 100 : Math.min(95, (elapsedSec / EXPECTED_SEC) * 100);
              const pct = done ? 100 : Math.min(95, Math.round(Math.sqrt(rawPct / 95) * 95));
              return (
                <div className="loadingProgressBar">
                  <div className="loadingProgressTrack">
                    <div className="loadingProgressFill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="loadingProgressPct">{pct}%</span>
                </div>
              );
            })()}
            <div className="loadingSteps2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`loadingStep2 ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""}`}
                >
                  <span className="stepIcon">{i < stepIdx ? "✓" : t(`steps.${i}.emoji`)}</span>
                  <span className="stepLabel">{t(`steps.${i}.label`)}</span>
                </div>
              ))}
            </div>
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
              <div className="loadingError">
                <p>⚠️ {error}</p>
                <button
                  className="btn btn-primary"
                  onClick={() => { setError(null); confirmCalled.current = false; callConfirm(); }}
                >
                  {t("retry")}
                </button>
              </div>
            ) : (
              <p className="loadingHint">
                {isGenerating ? t("aiGenerating") : t("preparing")}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
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
