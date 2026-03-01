"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

/* ──────────────────────────────────────────────────
   오행 상세 데이터
   ────────────────────────────────────────────────── */

interface OhangInfo {
  hanja: string;
  ko: string;
  color: string;
  emoji: string;
  season: string;
  direction: string;
  organ: string;
  personality: string;
  description: string[];
}

const OHANG: OhangInfo[] = [
  {
    hanja: "木",
    ko: "나무",
    color: "var(--element-wood)",
    emoji: "🌿",
    season: "봄",
    direction: "동쪽",
    organ: "간·담",
    personality: "성장, 창의, 도전",
    description: [
      "木은 봄의 기운, 만물이 싹트는 생명력을 상징합니다.",
      "새로운 것을 시작하고 성장시키는 에너지예요.",
      "木이 강한 사람은 진취적이고 리더십이 있으며,",
      "부족하면 결단력이 약해지고 우유부단해질 수 있습니다.",
    ],
  },
  {
    hanja: "火",
    ko: "불",
    color: "var(--element-fire)",
    emoji: "🔥",
    season: "여름",
    direction: "남쪽",
    organ: "심장·소장",
    personality: "열정, 표현, 확산",
    description: [
      "火는 여름의 뜨거운 에너지, 빛과 열정을 나타냅니다.",
      "감정 표현이 풍부하고 사교적인 기운이에요.",
      "火가 강한 사람은 활발하고 매력적이지만,",
      "과하면 조급하거나 감정 기복이 클 수 있습니다.",
    ],
  },
  {
    hanja: "土",
    ko: "흙",
    color: "var(--element-earth)",
    emoji: "🌍",
    season: "환절기",
    direction: "중앙",
    organ: "위·비장",
    personality: "안정, 신뢰, 포용",
    description: [
      "土는 계절의 전환기, 중심을 잡아주는 안정의 기운입니다.",
      "모든 오행의 중재자이자 기반이 되는 역할을 해요.",
      "土가 강한 사람은 믿음직하고 포용력이 넓으며,",
      "부족하면 불안정하고 중심을 잡기 어려울 수 있습니다.",
    ],
  },
  {
    hanja: "金",
    ko: "쇠",
    color: "var(--element-metal)",
    emoji: "⚔️",
    season: "가을",
    direction: "서쪽",
    organ: "폐·대장",
    personality: "결단, 정의, 수렴",
    description: [
      "金은 가을의 기운, 열매를 거두고 정리하는 에너지입니다.",
      "명확한 판단력과 실행력을 상징해요.",
      "金이 강한 사람은 의리 있고 결단력이 뛰어나며,",
      "과하면 고집이 세거나 완벽주의에 빠질 수 있습니다.",
    ],
  },
  {
    hanja: "水",
    ko: "물",
    color: "var(--element-water)",
    emoji: "💧",
    season: "겨울",
    direction: "북쪽",
    organ: "신장·방광",
    personality: "지혜, 유연, 깊이",
    description: [
      "水는 겨울의 고요함, 깊은 사색과 지혜를 나타냅니다.",
      "유연하게 흐르며 어떤 그릇이든 채우는 적응력이에요.",
      "水가 강한 사람은 총명하고 관찰력이 뛰어나며,",
      "부족하면 겁이 많거나 의지력이 약해질 수 있습니다.",
    ],
  },
];

/* ──────────────────────────────────────────────────
   명리학 교육 슬라이드
   ────────────────────────────────────────────────── */

interface Slide {
  title: string;
  icon: string;
  color: string;
  visual?: "ohang-cycle" | "pillars" | "stems" | "sipsung";
  content: string[];
}

const SLIDES: Slide[] = [
  {
    title: "사주팔자란?",
    icon: "🌌",
    color: "var(--accent)",
    visual: "pillars",
    content: [
      "사주(四柱)는 태어난 연·월·일·시, 네 기둥을 뜻합니다.",
      "각 기둥은 천간(天干)과 지지(地支) 두 글자로 이루어져,",
      "총 여덟 글자 — 팔자(八字)가 됩니다.",
      "이 여덟 글자 속에 성격, 재능, 인연의 단서가 담겨 있습니다.",
    ],
  },
  {
    title: "오행 — 우주를 이루는 다섯 기운",
    icon: "☯",
    color: "var(--accent-gold)",
    visual: "ohang-cycle",
    content: [
      "우주 만물은 木·火·土·金·水 다섯 가지 기운으로 이루어집니다.",
      "각 기운은 계절, 방향, 색깔, 감정과도 연결돼 있어요.",
      "사주에서 이 오행의 비율이 당신의 타고난 기질을 결정하고,",
      "부족하거나 과한 기운이 운세의 길흉을 만들어냅니다.",
    ],
  },
  {
    title: "상생 — 서로 돕는 관계",
    icon: "🌱",
    color: "var(--element-wood)",
    content: [
      "木 → 火: 나무는 불을 피운다 (연료가 된다)",
      "火 → 土: 불은 타고 재가 되어 흙이 된다",
      "土 → 金: 흙 속에서 금속이 생겨난다",
      "金 → 水: 금속 표면에 이슬이 맺힌다",
      "水 → 木: 물은 나무를 자라게 한다",
    ],
  },
  {
    title: "상극 — 서로 억제하는 관계",
    icon: "⚡",
    color: "var(--element-fire)",
    content: [
      "木 → 土: 나무뿌리가 흙을 파고든다",
      "土 → 水: 흙이 둑을 쌓아 물을 막는다",
      "水 → 火: 물이 불을 꺼뜨린다",
      "火 → 金: 불이 금속을 녹인다",
      "金 → 木: 도끼(금속)가 나무를 벤다",
    ],
  },
  {
    title: "천간 — 하늘의 10가지 기운",
    icon: "✨",
    color: "var(--accent-secondary)",
    visual: "stems",
    content: [
      "甲(갑)·乙(을) → 木 | 丙(병)·丁(정) → 火",
      "戊(무)·己(기) → 土 | 庚(경)·辛(신) → 金",
      "壬(임)·癸(계) → 水",
      "양(陽)의 글자는 적극적, 음(陰)은 섬세한 성질입니다.",
    ],
  },
  {
    title: "지지 — 12가지 동물의 기운",
    icon: "🐲",
    color: "var(--element-earth)",
    content: [
      "子(쥐)·丑(소)·寅(호랑이)·卯(토끼)",
      "辰(용)·巳(뱀)·午(말)·未(양)",
      "申(원숭이)·酉(닭)·戌(개)·亥(돼지)",
      "12지지는 띠, 시간, 방위, 계절을 모두 나타냅니다.",
    ],
  },
  {
    title: "십성 — 나와 세상의 관계",
    icon: "⭐",
    color: "var(--element-metal)",
    visual: "sipsung",
    content: [
      "비견·겁재: 동료·경쟁자 (나와 같은 오행)",
      "식신·상관: 재능·표현력 (내가 생하는 오행)",
      "편재·정재: 재물·아버지 (내가 극하는 오행)",
      "편관·정관: 직업·명예 (나를 극하는 오행)",
      "편인·정인: 학문·어머니 (나를 생하는 오행)",
    ],
  },
  {
    title: "대운 — 10년 주기의 큰 흐름",
    icon: "🌊",
    color: "var(--element-water)",
    content: [
      "대운(大運)은 인생을 10년 단위로 나누는 큰 흐름입니다.",
      "예를 들어 30대에 火 대운이면 활발하고 사교적인 시기,",
      "40대에 金 대운이면 성과를 거두고 정리하는 시기가 됩니다.",
      "지금 어떤 대운 위에 있는지가 운세의 핵심입니다.",
    ],
  },
  {
    title: "용신 — 사주의 열쇠",
    icon: "🔑",
    color: "var(--accent)",
    content: [
      "용신(用神)은 사주의 균형을 맞추는 가장 중요한 오행입니다.",
      "마치 건강을 위해 부족한 영양소를 채우듯,",
      "용신에 해당하는 색, 방향, 직업을 활용하면",
      "운의 흐름을 유리하게 바꿀 수 있다고 합니다.",
    ],
  },
];

/* ──────────────────────────────────────────────────
   진행 단계
   ────────────────────────────────────────────────── */

const STEPS = [
  { emoji: "📅", label: "만세력 계산" },
  { emoji: "☯", label: "오행 분석" },
  { emoji: "⭐", label: "십성 배치" },
  { emoji: "📊", label: "대운 해석" },
  { emoji: "🤖", label: "AI 생성" },
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

function PillarsVisual() {
  const pillars = [
    { label: "연주", top: "甲", bottom: "子", color: "var(--element-wood)" },
    { label: "월주", top: "丙", bottom: "寅", color: "var(--element-fire)" },
    { label: "일주", top: "戊", bottom: "辰", color: "var(--element-earth)" },
    { label: "시주", top: "庚", bottom: "午", color: "var(--element-metal)" },
  ];
  return (
    <div className="pillarsVisual">
      <div className="pillarsRow">
        {pillars.map((p, i) => (
          <div key={p.label} className="pillar" style={{ animationDelay: `${i * 0.15}s` }}>
            <span className="pillarLabel">{p.label}</span>
            <div className="pillarBox" style={{ borderColor: p.color }}>
              <span className="pillarChar" style={{ color: p.color }}>{p.top}</span>
              <span className="pillarDivider" />
              <span className="pillarChar" style={{ color: p.color }}>{p.bottom}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="pillarsCaption">
        <span>天干 (하늘)</span>
        <span>地支 (땅)</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   비주얼 컴포넌트: 오행 상생 사이클
   ────────────────────────────────────────────────── */

function OhangCycleVisual({ activeIdx }: { activeIdx: number }) {
  return (
    <div className="ohangCycleVisual">
      {OHANG.map((el, i) => {
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
            <span className="cycleKo">{el.ko}</span>
          </div>
        );
      })}
      <svg className="cycleLines" viewBox="0 0 100 100">
        {OHANG.map((_, i) => {
          const a1 = (i * 72 - 90) * (Math.PI / 180);
          const next = (i + 1) % 5;
          const a2 = (next * 72 - 90) * (Math.PI / 180);
          const r = 42;
          return (
            <line
              key={i}
              x1={50 + r * Math.cos(a1)} y1={50 + r * Math.sin(a1)}
              x2={50 + r * Math.cos(a2)} y2={50 + r * Math.sin(a2)}
              stroke={OHANG[i].color}
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

function OhangDetailCard({ info }: { info: OhangInfo }) {
  return (
    <div className="ohangDetailCard" style={{ "--card-accent": info.color } as React.CSSProperties}>
      <div className="ohangDetailHeader">
        <span className="ohangDetailEmoji">{info.emoji}</span>
        <div>
          <h3 className="ohangDetailTitle" style={{ color: info.color }}>
            {info.hanja} · {info.ko}
          </h3>
          <p className="ohangDetailSub">{info.personality}</p>
        </div>
      </div>
      <div className="ohangDetailMeta">
        <span>🌸 {info.season}</span>
        <span>🧭 {info.direction}</span>
        <span>🫀 {info.organ}</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   메인 컴포넌트
   ────────────────────────────────────────────────── */

function LoadingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const legacyRedirect = params.get("redirect");

  const [slideIdx, setSlideIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");
  const [activeOhang, setActiveOhang] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const confirmCalled = useRef(false);

  const slide = SLIDES[slideIdx];
  const displayedLines = useTypewriter(slide.content, 25, 300);

  // 슬라이드 전환 (10초 주기)
  useEffect(() => {
    const timer = setInterval(() => {
      setFadeState("out");
      setTimeout(() => {
        setSlideIdx((i) => (i + 1) % SLIDES.length);
        setFadeState("in");
      }, 600);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // 오행 로테이션 (3초 주기)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveOhang((i) => (i + 1) % OHANG.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // 스텝 진행
  useEffect(() => {
    const timer = setInterval(() => {
      setStepIdx((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  // 경과 시간
  useEffect(() => {
    const timer = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Legacy redirect
  useEffect(() => {
    if (legacyRedirect && !orderId) {
      const timer = setTimeout(() => router.push(legacyRedirect), 3500);
      return () => clearTimeout(timer);
    }
  }, [legacyRedirect, orderId, router]);

  // checkout/confirm + 유료 리포트 생성
  const callConfirm = useCallback(async () => {
    if (!orderId || confirmCalled.current) return;
    confirmCalled.current = true;
    setIsGenerating(true);

    try {
      // 1. 결제 확인
      const confirmRes = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (!confirmRes.ok) {
        const body = await confirmRes.json().catch(() => null);
        throw new Error(body?.error?.message ?? "결제 확인에 실패했습니다.");
      }

      // 2. 캐시된 성격 텍스트 가져오기
      let personalityText: string | undefined;
      try {
        personalityText = sessionStorage.getItem("free_personality") ?? undefined;
      } catch {}

      // 3. 유료 리포트 생성 (9섹션)
      const genRes = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "paid", orderId, personalityText }),
      });

      if (!genRes.ok) {
        const body = await genRes.json().catch(() => null);
        throw new Error(body?.error?.message ?? "리포트 생성에 실패했습니다.");
      }

      router.push(`/report/${orderId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setIsGenerating(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    if (orderId) callConfirm();
  }, [orderId, callConfirm]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}분 ${s.toString().padStart(2, "0")}초` : `${s}초`;
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
          {/* ── 상단: 오행 원 + 상세 카드 (가로 배치) ── */}
          <div className="loadingTopSection">
            <div className="ohangVisualWrap">
              <div className="ohangGlowRing" />
              <OhangCycleVisual activeIdx={activeOhang} />
            </div>
            <OhangDetailCard info={OHANG[activeOhang]} />
          </div>

          {/* ── 타이머 + 스텝 바 ── */}
          <div className="loadingStatusBar">
            <div className="loadingTimer">
              <span className="timerDot" />
              <span>분석 중 · {formatTime(elapsedSec)}</span>
            </div>
            <div className="loadingSteps2">
              {STEPS.map((step, i) => (
                <div
                  key={i}
                  className={`loadingStep2 ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""}`}
                >
                  <span className="stepIcon">{i < stepIdx ? "✓" : step.emoji}</span>
                  <span className="stepLabel">{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── 교육 콘텐츠 슬라이드 ── */}
          <div className={`eduSlide ${fadeState}`}>
            {/* 비주얼 영역 */}
            {slide.visual === "pillars" && <PillarsVisual />}
            {slide.visual === "ohang-cycle" && (
              <div className="eduOhangMini">
                <OhangCycleVisual activeIdx={activeOhang} />
              </div>
            )}

            <div className="eduHeader">
              <span className="eduIcon" style={{ color: slide.color }}>{slide.icon}</span>
              <h2 className="eduTitle" style={{ color: slide.color }}>{slide.title}</h2>
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
              {SLIDES.map((_, i) => (
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
                  다시 시도
                </button>
              </div>
            ) : (
              <p className="loadingHint">
                {isGenerating
                  ? "AI가 당신만의 사주를 정밀 분석하고 있습니다 ✨"
                  : "준비 중..."}
              </p>
            )}
          </div>
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
