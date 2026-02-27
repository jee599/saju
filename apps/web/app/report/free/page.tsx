"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  calculateFourPillars,
  analyzeElements,
  FIVE_ELEMENTS,
  FIVE_ELEMENTS_KR,
  FIVE_ELEMENTS_EMOJI,
  type SajuInput,
  type FourPillars,
  type ElementAnalysis,
  type StemHanja,
} from "@saju/engine-saju";
import ElementBars from "../../components/ElementBars";
import MiniCompatForm from "../../components/MiniCompatForm";
import { trackEvent } from "../../lib/gtag";

/* ── Element color map ───────────────────────────────── */

const ELEMENT_COLORS: Record<string, string> = {
  "木": "var(--color-element-wood)",
  "火": "var(--color-element-fire)",
  "土": "var(--color-element-earth)",
  "金": "var(--color-element-metal)",
  "水": "var(--color-element-water)",
};

const ELEMENT_BORDER_STYLES: Record<string, string> = {
  "木": "var(--color-element-wood)",
  "火": "var(--color-element-fire)",
  "土": "var(--color-element-earth)",
  "金": "var(--color-element-metal)",
  "水": "var(--color-element-water)",
};

const ELEMENT_LABELS: Record<string, string> = {
  "木": "나무",
  "火": "불",
  "土": "흙",
  "金": "쇠",
  "水": "물",
};

/* ── Stem to element mapping ─────────────────────────── */

const STEM_TO_ELEMENT: Record<string, string> = {
  "甲": "木", "乙": "木",
  "丙": "火", "丁": "火",
  "戊": "土", "己": "土",
  "庚": "金", "辛": "金",
  "壬": "水", "癸": "水",
};

/* ── Blur teaser templates ───────────────────────────── */

type ElementKey = "木" | "火" | "土" | "金" | "水";

const BLUR_TEASERS: Record<
  ElementKey,
  { title: string; emoji: string; teaser: string }[]
> = {
  "木": [
    { title: "③ 올해 총운", emoji: "🌟", teaser: "2026년은 성장과 확장의 기운이 강한 해입니다..." },
    { title: "④ 직업/재물", emoji: "💰", teaser: "木의 기운이 재물운에 새로운 싹을 틔우고 있습니다..." },
    { title: "⑤ 연애/결혼", emoji: "❤️", teaser: "봄처럼 새로운 만남의 에너지가 감지됩니다..." },
    { title: "⑥ 건강", emoji: "🏥", teaser: "간과 담에 주의가 필요한 시기입니다..." },
    { title: "⑦ 대인관계", emoji: "🤝", teaser: "새로운 인연이 성장의 계기가 됩니다..." },
    { title: "⑧ 학업/자기계발", emoji: "📚", teaser: "배움의 기운이 강하게 작용하고 있습니다..." },
    { title: "⑨ 월별 운세", emoji: "📅", teaser: "상반기와 하반기의 기운 흐름이 다릅니다..." },
  ],
  "火": [
    { title: "③ 올해 총운", emoji: "🌟", teaser: "2026년은 열정과 변화의 기운이 강한 해입니다..." },
    { title: "④ 직업/재물", emoji: "💰", teaser: "火의 에너지가 사업운에 강한 추진력을 만들고 있습니다..." },
    { title: "⑤ 연애/결혼", emoji: "❤️", teaser: "뜨거운 인연이 하반기에 찾아올 기운이 보입니다..." },
    { title: "⑥ 건강", emoji: "🏥", teaser: "심장과 소장 건강에 관심을 기울이세요..." },
    { title: "⑦ 대인관계", emoji: "🤝", teaser: "열정적인 에너지가 주변을 밝히고 있습니다..." },
    { title: "⑧ 학업/자기계발", emoji: "📚", teaser: "집중력이 높아지는 시기, 새로운 도전에 유리합니다..." },
    { title: "⑨ 월별 운세", emoji: "📅", teaser: "여름에 특히 강한 기운이 흐릅니다..." },
  ],
  "土": [
    { title: "③ 올해 총운", emoji: "🌟", teaser: "2026년은 안정과 중심의 기운이 강한 해입니다..." },
    { title: "④ 직업/재물", emoji: "💰", teaser: "土의 기운이 재물운에 안정적인 흐름을 만들고 있습니다..." },
    { title: "⑤ 연애/결혼", emoji: "❤️", teaser: "신뢰를 바탕으로 한 깊은 인연이 예상됩니다..." },
    { title: "⑥ 건강", emoji: "🏥", teaser: "위장 건강에 특별히 신경 써야 할 시기입니다..." },
    { title: "⑦ 대인관계", emoji: "🤝", teaser: "중재자 역할에서 빛을 발하는 시기입니다..." },
    { title: "⑧ 학업/자기계발", emoji: "📚", teaser: "꾸준한 노력이 결실을 맺는 해입니다..." },
    { title: "⑨ 월별 운세", emoji: "📅", teaser: "환절기마다 운세의 흐름이 변합니다..." },
  ],
  "金": [
    { title: "③ 올해 총운", emoji: "🌟", teaser: "2026년은 결단과 정리의 기운이 강한 해입니다..." },
    { title: "④ 직업/재물", emoji: "💰", teaser: "金의 기운이 재물운에 날카로운 판단력을 부여합니다..." },
    { title: "⑤ 연애/결혼", emoji: "❤️", teaser: "진지한 만남이 가을 무렵에 찾아올 수 있습니다..." },
    { title: "⑥ 건강", emoji: "🏥", teaser: "폐와 대장 건강 관리가 중요한 시기입니다..." },
    { title: "⑦ 대인관계", emoji: "🤝", teaser: "명확한 의사소통이 관계를 강화합니다..." },
    { title: "⑧ 학업/자기계발", emoji: "📚", teaser: "전문성을 깊이 있게 파는 것이 유리합니다..." },
    { title: "⑨ 월별 운세", emoji: "📅", teaser: "가을에 가장 강한 운세 흐름이 있습니다..." },
  ],
  "水": [
    { title: "③ 올해 총운", emoji: "🌟", teaser: "2026년은 지혜와 유연함의 기운이 강한 해입니다..." },
    { title: "④ 직업/재물", emoji: "💰", teaser: "水의 기운이 재물운에 유연한 흐름을 만들고 있습니다..." },
    { title: "⑤ 연애/결혼", emoji: "❤️", teaser: "깊은 감정적 교류가 있는 만남이 예상됩니다..." },
    { title: "⑥ 건강", emoji: "🏥", teaser: "신장과 방광 건강에 주의가 필요합니다..." },
    { title: "⑦ 대인관계", emoji: "🤝", teaser: "직관적인 판단이 대인관계에서 빛을 발합니다..." },
    { title: "⑧ 학업/자기계발", emoji: "📚", teaser: "창의적인 영감이 풍부해지는 시기입니다..." },
    { title: "⑨ 월별 운세", emoji: "📅", teaser: "겨울에 특히 좋은 운세 흐름이 있습니다..." },
  ],
};

/* ── Pillar labels ───────────────────────────────────── */

const PILLAR_LABELS = ["년주", "월주", "일주", "시주"] as const;
const PILLAR_KEYS: (keyof FourPillars)[] = ["year", "month", "day", "hour"];

/* ── Share Buttons Component ─────────────────────────── */

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

/* ── CTA Button Component ────────────────────────────── */

function CTAButton({ position }: { position: "cta1" | "cta2" | "sticky" }) {
  return (
    <div className="rounded-2xl border border-cta-from/20 bg-gradient-to-r from-cta-from/10 to-cta-to/10 p-6 text-center backdrop-blur-sm">
      <p className="mb-1 text-sm font-medium text-t2">
        7개 섹션의 상세 분석이 준비되어 있습니다.
      </p>
      <p className="mb-4 text-xs text-t3">
        올해 총운, 직업/재물, 연애, 건강, 대인관계, 학업, 월별 운세
      </p>
      <button
        onClick={() => trackEvent.checkoutStart({ cta_position: position, price_variant: 5900 })}
        className="rounded-xl bg-gradient-to-r from-cta-from to-cta-to px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-cta-from/25 transition-all hover:shadow-xl hover:shadow-cta-from/30"
      >
        ₩5,900으로 전체 분석 보기
      </button>
    </div>
  );
}

/* ── Blur Section Component ──────────────────────────── */

function BlurSection({
  title,
  emoji,
  teaser,
  borderColor,
}: {
  title: string;
  emoji: string;
  teaser: string;
  borderColor: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-glass-border bg-bg-card/60 p-5"
      style={{ borderLeftWidth: "4px", borderLeftColor: borderColor }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-t1">{title}</h3>
          <p className="mt-1 text-sm text-t2">{teaser}</p>
        </div>
      </div>
      {/* Blurred fake content */}
      <div className="relative mt-3">
        <div className="select-none space-y-2" style={{ filter: "blur(6px)" }}>
          <div className="h-3 w-full rounded bg-white/6" />
          <div className="h-3 w-11/12 rounded bg-white/5" />
          <div className="h-3 w-10/12 rounded bg-white/4" />
          <div className="h-3 w-full rounded bg-white/6" />
          <div className="h-3 w-9/12 rounded bg-white/5" />
          <div className="h-3 w-11/12 rounded bg-white/4" />
        </div>
        {/* Gradient mask overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-bg-card/60 to-bg-card/90" />
      </div>
    </div>
  );
}

/* ── Main Report Content ─────────────────────────────── */

function FreeReportContent() {
  const searchParams = useSearchParams();

  const year = parseInt(searchParams.get("year") || "2000", 10);
  const month = parseInt(searchParams.get("month") || "1", 10);
  const day = parseInt(searchParams.get("day") || "1", 10);
  const hour = parseInt(searchParams.get("hour") || "12", 10);
  const minute = parseInt(searchParams.get("minute") || "0", 10);

  const { pillars, elementAnalysis, error } = useMemo(() => {
    try {
      const input: SajuInput = { year, month, day, hour, minute };
      const result = calculateFourPillars(input);
      const analysis = analyzeElements(result.pillars);
      return { pillars: result.pillars, elementAnalysis: analysis, error: null };
    } catch (e) {
      return {
        pillars: null,
        elementAnalysis: null,
        error: e instanceof Error ? e.message : "계산 오류가 발생했습니다",
      };
    }
  }, [year, month, day, hour, minute]);

  if (error || !pillars || !elementAnalysis) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-t1">분석 오류</h1>
          <p className="mt-2 text-sm text-t2">{error}</p>
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

  const dayMaster = elementAnalysis.dayMaster;
  const dayMasterElement = dayMaster.element as ElementKey;

  useEffect(() => {
    trackEvent.reportView({ dayMasterElement: dayMaster.elementEn });
    trackEvent.paywallView();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build bar chart data
  const elementsData = FIVE_ELEMENTS.map((el, idx) => {
    const key = ["wood", "fire", "earth", "metal", "water"][idx] as keyof typeof elementAnalysis.elements;
    const pct = elementAnalysis.elements[key];
    return {
      element: el,
      elementKr: FIVE_ELEMENTS_KR[idx]!,
      label: ELEMENT_LABELS[el] || "",
      percentage: pct,
      colorClass: "",
      colorVar: ELEMENT_COLORS[el] || "#888",
      isHighest: false,
    };
  });

  // Mark highest
  const maxPct = Math.max(...elementsData.map((d) => d.percentage));
  elementsData.forEach((d) => {
    if (d.percentage === maxPct && maxPct > 0) d.isHighest = true;
  });

  // Get teaser data for day master element
  const teasers = BLUR_TEASERS[dayMasterElement] || BLUR_TEASERS["木"];
  const borderColor = ELEMENT_BORDER_STYLES[dayMasterElement] || "var(--color-accent)";

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-glass-border bg-bg-top/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <Link href="/" className="text-base font-extrabold text-t1">
            FateSaju
          </Link>
          <span className="text-xs text-t3">
            {year}년 {month}월 {day}일 분석
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        {/* ─── Section 1: 사주 팔자 카드 ──────────── */}
        <section className="mb-8" style={{ animation: "fadeInUp 0.6s ease-out" }}>
          <h2 className="mb-1 text-t1">① 사주 팔자 카드</h2>
          <p className="mb-5 text-sm text-t2">
            {year}년 {month}월 {day}일 태어난 당신의 사주입니다
          </p>

          <div className="grid grid-cols-4 gap-3">
            {PILLAR_KEYS.map((key, idx) => {
              const pillar = pillars[key];
              const stemElement = STEM_TO_ELEMENT[pillar.stem] || "木";
              const stemColor = ELEMENT_COLORS[stemElement];

              return (
                <div
                  key={key}
                  className="rounded-xl border border-glass-border bg-bg-card/80 p-3 text-center"
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-t3">
                    {PILLAR_LABELS[idx]}
                  </p>
                  <p
                    className="font-serif text-2xl font-bold md:text-3xl"
                    style={{ color: stemColor }}
                  >
                    {pillar.stem}
                  </p>
                  <p className="font-serif text-2xl font-bold text-t1 md:text-3xl">
                    {pillar.branch}
                  </p>
                  <p className="mt-1 text-[11px] text-t2">
                    {pillar.stemKr}{pillar.branchKr}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Section 2: 오행 밸런스 ────────────── */}
        <section className="mb-8" style={{ animation: "fadeInUp 0.6s ease-out 0.15s both" }}>
          <h2 className="mb-1 text-t1">② 오행 밸런스</h2>
          <p className="mb-5 text-sm text-t2">
            당신의 오행 분포와 일주 원소를 분석합니다
          </p>

          {/* Day master card */}
          <div
            className="mb-6 rounded-xl border border-glass-border p-5 text-center"
            style={{
              backgroundColor: `color-mix(in srgb, ${ELEMENT_COLORS[dayMasterElement]} 8%, var(--color-bg-card))`,
            }}
          >
            <p className="text-3xl">{dayMaster.emoji}</p>
            <p
              className="mt-2 text-lg font-bold"
              style={{ color: ELEMENT_COLORS[dayMasterElement] }}
            >
              당신은 {dayMasterElement}({dayMaster.elementKr})의 사람입니다
            </p>
            <p className="mt-1 text-xs text-t2">
              일주 천간: {dayMaster.stem} ({dayMaster.isYang ? "양" : "음"})
            </p>
          </div>

          {/* Five element bar chart */}
          <div className="mb-6 rounded-xl border border-glass-border bg-bg-card/60 p-5">
            <ElementBars data={elementsData} />
          </div>

          {/* Yin-yang bar */}
          <div className="mb-6 rounded-xl border border-glass-border bg-bg-card/60 p-5">
            <p className="mb-3 text-sm font-semibold text-t1">음양 밸런스</p>
            <div className="flex h-6 overflow-hidden rounded-full bg-white/4">
              <div
                className="flex items-center justify-center rounded-l-full text-[11px] font-bold text-white transition-all duration-1000"
                style={{
                  width: `${elementAnalysis.yinYang.yang}%`,
                  background: "linear-gradient(90deg, #A78BDA, #D4A5C0)",
                }}
              >
                양 {elementAnalysis.yinYang.yang}%
              </div>
              <div
                className="flex items-center justify-center rounded-r-full text-[11px] font-bold text-t2 transition-all duration-1000"
                style={{
                  width: `${elementAnalysis.yinYang.yin}%`,
                  background: "rgba(255,255,255,0.06)",
                }}
              >
                음 {elementAnalysis.yinYang.yin}%
              </div>
            </div>
          </div>

          {/* Deficient elements note */}
          {elementAnalysis.deficient.length > 0 && (
            <div className="rounded-xl border border-accent-secondary/20 bg-accent-secondary/5 p-4">
              <p className="text-sm text-accent-secondary">
                {elementAnalysis.deficient.map((el) => {
                  const idx = FIVE_ELEMENTS.indexOf(el);
                  return `${FIVE_ELEMENTS_EMOJI[idx]} ${el}`;
                }).join(", ")}{" "}
                에너지가 부족합니다
              </p>
              <p className="mt-1 text-xs text-t3">
                부족한 오행을 보완하는 방법은 상세 분석에서 확인할 수 있습니다
              </p>
            </div>
          )}
        </section>

        {/* ─── CTA #1 ────────────────────────────── */}
        <section className="mb-8">
          <CTAButton position="cta1" />
        </section>

        {/* ─── Mini Compatibility Section ─────────── */}
        <section className="mb-8">
          <MiniCompatForm />
        </section>

        {/* ─── Blur Sections (7 sections) ────────── */}
        <section className="mb-8 space-y-4">
          {teasers.map((t, idx) => (
            <BlurSection
              key={idx}
              title={t.title}
              emoji={t.emoji}
              teaser={t.teaser}
              borderColor={borderColor}
            />
          ))}
        </section>

        {/* ─── CTA #2 ────────────────────────────── */}
        <section className="mb-8">
          <CTAButton position="cta2" />
        </section>

        {/* ─── Share Buttons ────────────────────── */}
        <section className="mb-8">
          <ShareButtons
            text={`나는 ${dayMasterElement}(${dayMaster.elementKr})의 사람! 내 사주 오행 분석 결과는?`}
            url={typeof window !== "undefined" ? window.location.href : ""}
          />
        </section>

        {/* ─── Disclaimer ────────────────────────── */}
        <section className="mb-8 text-center">
          <p className="text-xs leading-relaxed text-t3">
            본 서비스는 전통 명리 해석을 AI로 재구성한 참고 정보입니다.
            <br />
            의료, 법률, 투자 판단은 전문가 자문과 함께 검토해 주세요.
          </p>
        </section>
      </main>

      {/* ─── Sticky CTA (Mobile only) ────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-glass-border bg-bg-bottom/95 p-3 backdrop-blur-xl md:hidden">
        <button
          onClick={() => trackEvent.checkoutStart({ cta_position: "sticky", price_variant: 5900 })}
          className="w-full rounded-xl bg-gradient-to-r from-cta-from to-cta-to py-3 text-sm font-bold text-white shadow-lg shadow-cta-from/25"
        >
          ₩5,900으로 전체 분석 보기
        </button>
      </div>
    </div>
  );
}

/* ── Page Export ──────────────────────────────────────── */

export default function FreeReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-t2">분석 결과를 불러오는 중...</div>
        </div>
      }
    >
      <FreeReportContent />
    </Suspense>
  );
}
