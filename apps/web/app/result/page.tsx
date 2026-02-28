"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useMemo, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { calculateFourPillars, ELEMENT_KR, ELEMENT_EMOJI, ELEMENT_KR_NATIVE } from "@saju/engine-saju";
import type { Element, FourPillars } from "@saju/engine-saju";
import { track } from "../../lib/analytics";

// ── 천간/지지 → 오행 매핑 ──
const STEM_TO_ELEMENT: Record<string, Element> = {
  "甲": "wood", "乙": "wood", "丙": "fire", "丁": "fire",
  "戊": "earth", "己": "earth", "庚": "metal", "辛": "metal",
  "壬": "water", "癸": "water",
};
const BRANCH_TO_ELEMENT: Record<string, Element> = {
  "寅": "wood", "卯": "wood", "巳": "fire", "午": "fire",
  "辰": "earth", "未": "earth", "戌": "earth", "丑": "earth",
  "申": "metal", "酉": "metal", "亥": "water", "子": "water",
};

// ── 띠 동물 (12지지) ──
const ZODIAC_ANIMALS: Record<string, { name: string; emoji: string }> = {
  "子": { name: "쥐", emoji: "🐭" }, "丑": { name: "소", emoji: "🐮" },
  "寅": { name: "호랑이", emoji: "🐯" }, "卯": { name: "토끼", emoji: "🐰" },
  "辰": { name: "용", emoji: "🐲" }, "巳": { name: "뱀", emoji: "🐍" },
  "午": { name: "말", emoji: "🐴" }, "未": { name: "양", emoji: "🐑" },
  "申": { name: "원숭이", emoji: "🐵" }, "酉": { name: "닭", emoji: "🐔" },
  "戌": { name: "개", emoji: "🐶" }, "亥": { name: "돼지", emoji: "🐷" },
};

// ── 천간 음양 ──
const STEM_POLARITY: Record<string, "양" | "음"> = {
  "甲": "양", "乙": "음", "丙": "양", "丁": "음", "戊": "양",
  "己": "음", "庚": "양", "辛": "음", "壬": "양", "癸": "음",
};

// ── 오행 레이더 차트 (Premium SVG) ──
function ElementRadar({ balance }: { balance: Record<Element, number> }) {
  const elements: Element[] = ["wood", "fire", "earth", "metal", "water"];
  const labels = ["木", "火", "土", "金", "水"];
  const cx = 110, cy = 105, R = 68;

  const angle = (i: number) => (Math.PI / 2) + (2 * Math.PI * i) / 5;
  const px = (i: number, r: number) => cx + r * Math.cos(-angle(i));
  const py = (i: number, r: number) => cy - r * Math.sin(-angle(i));

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const maxVal = Math.max(...elements.map(e => balance[e]), 1);

  const dataPoints = elements.map((el, i) => {
    const ratio = Math.min(balance[el] / maxVal, 1);
    return `${px(i, R * ratio)},${py(i, R * ratio)}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 220 230" style={{ width: "100%", maxWidth: 280, margin: "0 auto", display: "block" }} role="img" aria-label="오행 레이더 차트">
      <title>오행 레이더 차트</title>
      <desc>목, 화, 토, 금, 수 오행의 분포를 보여주는 레이더 차트</desc>
      <defs>
        <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C48B9F" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.1} />
        </linearGradient>
        <linearGradient id="radarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C48B9F" />
          <stop offset="100%" stopColor="#D4AF37" />
        </linearGradient>
      </defs>
      {/* Background grid - thicker lines */}
      {gridLevels.map(level => (
        <polygon
          key={level}
          points={elements.map((_, i) => `${px(i, R * level)},${py(i, R * level)}`).join(" ")}
          fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={level === 1.0 ? 1.5 : 0.8}
          strokeDasharray={level < 1 ? "3 4" : "none"}
        />
      ))}
      {/* Axis lines - thicker */}
      {elements.map((_, i) => (
        <line key={i} x1={cx} y1={cy} x2={px(i, R)} y2={py(i, R)}
          stroke="rgba(255,255,255,0.1)" strokeWidth={0.8} />
      ))}
      {/* Data polygon */}
      <polygon points={dataPoints} fill="url(#radarFill)" stroke="url(#radarStroke)" strokeWidth={1.5} />
      {/* Data dots */}
      {elements.map((el, i) => {
        const ratio = Math.min(balance[el] / maxVal, 1);
        const dotX = px(i, R * ratio);
        const dotY = py(i, R * ratio);
        return (
          <g key={el}>
            <circle cx={dotX} cy={dotY} r={5} fill={`var(--element-${el})`} opacity={0.2} />
            <circle cx={dotX} cy={dotY} r={3} fill={`var(--element-${el})`} />
          </g>
        );
      })}
      {/* Labels - separated from percentage to avoid overlap */}
      {elements.map((el, i) => {
        const labelR = R + 28;
        const lx = px(i, labelR);
        const ly = py(i, labelR);
        return (
          <g key={el}>
            <text x={lx} y={ly - 6} textAnchor="middle" dominantBaseline="central"
              fontSize={12} fontWeight={700} fill={`var(--element-${el})`}>
              {labels[i]}
            </text>
            <text x={lx} y={ly + 8} textAnchor="middle" dominantBaseline="central"
              fontSize={9} fontWeight={500} fill="rgba(255,255,255,0.5)">
              {balance[el]}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── 오행 상생 사이클 (Premium SVG) ──
function ElementCycle({ dominant, weakest, balance }: { dominant: Element; weakest: Element; balance: Record<Element, number> }) {
  const elements: Element[] = ["wood", "fire", "earth", "metal", "water"];
  const labels = ["木", "火", "土", "金", "水"];
  const cx = 110, cy = 110, R = 65;

  const angle = (i: number) => (Math.PI / 2) + (2 * Math.PI * i) / 5;
  const px = (i: number) => cx + R * Math.cos(-angle(i));
  const py = (i: number) => cy - R * Math.sin(-angle(i));

  // Scale circle size by balance proportion (min 14, max 28)
  const maxBal = Math.max(...elements.map(e => balance[e]), 1);
  const nodeRadius = (el: Element) => {
    const ratio = balance[el] / maxBal;
    return 14 + ratio * 14;
  };

  return (
    <svg viewBox="0 0 220 220" style={{ width: "100%", maxWidth: 260, margin: "0 auto", display: "block" }} role="img" aria-label="오행 상생 사이클">
      <title>오행 상생 사이클</title>
      <desc>목→화→토→금→수 순환 관계를 보여주는 상생 다이어그램</desc>
      <defs>
        <marker id="arrowCycle" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={4} markerHeight={4} orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(196,139,159,0.5)" />
        </marker>
      </defs>
      {/* Connection ring */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={30} />
      {/* 상생 arrows */}
      {elements.map((_, i) => {
        const next = (i + 1) % 5;
        const x1 = px(i), y1 = py(i), x2 = px(next), y2 = py(next);
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const offset = 24;
        return (
          <line key={`gen-${i}`}
            x1={x1 + dx / len * offset} y1={y1 + dy / len * offset}
            x2={x2 - dx / len * offset} y2={y2 - dy / len * offset}
            stroke="rgba(196,139,159,0.3)" strokeWidth={1.5} markerEnd="url(#arrowCycle)"
          />
        );
      })}
      {/* Element nodes - sized by proportion */}
      {elements.map((el, i) => {
        const isDominant = el === dominant;
        const isWeakest = el === weakest;
        const nodeR = nodeRadius(el);
        return (
          <g key={el}>
            {isDominant && (
              <circle cx={px(i)} cy={py(i)} r={nodeR + 4} fill="none"
                stroke={`var(--element-${el})`} strokeWidth={1} opacity={0.3}>
                <animate attributeName="r" values={`${nodeR + 2};${nodeR + 6};${nodeR + 2}`} dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={px(i)} cy={py(i)} r={nodeR}
              fill={`var(--element-${el})`}
              opacity={isDominant ? 0.85 : isWeakest ? 0.3 : 0.55}
              stroke={isDominant ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.08)"}
              strokeWidth={isDominant ? 1.5 : 0.5}
            />
            <text x={px(i)} y={py(i)} textAnchor="middle" dominantBaseline="central"
              fontSize={Math.max(10, nodeR * 0.5)} fontWeight={700} fill="#fff">
              {labels[i]}
            </text>
            {isDominant && (
              <text x={px(i)} y={py(i) + nodeR + 12} textAnchor="middle" fontSize={8} fontWeight={600}
                fill={`var(--element-${el})`}>강</text>
            )}
            {isWeakest && (
              <text x={px(i)} y={py(i) + nodeR + 10} textAnchor="middle" fontSize={8} fontWeight={600}
                fill="rgba(255,255,255,0.3)">약</text>
            )}
          </g>
        );
      })}
      {/* Center label */}
      <circle cx={cx} cy={cy} r={12} fill="rgba(30,21,51,0.8)" stroke="rgba(220,207,243,0.1)" strokeWidth={0.5} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={600}
        fill="rgba(255,255,255,0.3)">상생</text>
    </svg>
  );
}

// ── 사주팔자 테이블 (Clean Table) ──
function FourPillarsTable({ pillars, dayMaster }: { pillars: FourPillars; dayMaster: Element }) {
  const cols = [
    { label: "시주", sub: "時柱", pillar: pillars.hour },
    { label: "일주", sub: "日柱", pillar: pillars.day },
    { label: "월주", sub: "月柱", pillar: pillars.month },
    { label: "년주", sub: "年柱", pillar: pillars.year },
  ];

  return (
    <div className="fourPillarsTableWrap">
    <table className="fourPillarsTable" role="table" aria-label="사주팔자 테이블">
      <thead>
        <tr>
          <th></th>
          {cols.map((col) => (
            <th key={col.label} className={col.label === "일주" ? "pillarHighlightCol" : ""}>
              {col.label}<span className="pillarSubLabel">{col.sub}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr className="pillarRowStem">
          <td className="pillarRowLabel">천간</td>
          {cols.map((col) => {
            const stemEl = STEM_TO_ELEMENT[col.pillar.stem] ?? "earth";
            const polarity = STEM_POLARITY[col.pillar.stem] ?? "양";
            return (
              <td key={col.label} className={col.label === "일주" ? "pillarHighlightCol" : ""}>
                <span className="pillarChar" style={{ color: `var(--element-${stemEl})` }}>{col.pillar.stem}</span>
                <span className="pillarPolTag">{polarity}</span>
              </td>
            );
          })}
        </tr>
        <tr className="pillarRowBranch">
          <td className="pillarRowLabel">지지</td>
          {cols.map((col) => {
            const branchEl = BRANCH_TO_ELEMENT[col.pillar.branch] ?? "earth";
            return (
              <td key={col.label} className={col.label === "일주" ? "pillarHighlightCol" : ""}>
                <span className="pillarChar" style={{ color: `var(--element-${branchEl})` }}>{col.pillar.branch}</span>
              </td>
            );
          })}
        </tr>
        <tr className="pillarRowKr">
          <td className="pillarRowLabel"></td>
          {cols.map((col) => (
            <td key={col.label} className={col.label === "일주" ? "pillarHighlightCol" : ""}>
              <span className="pillarKrName">{col.pillar.fullKr}</span>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
    </div>
  );
}

// 오행별 블러 맛보기 템플릿
const BLUR_TEASERS: Record<Element, { sections: Array<{ title: string; teaser: string; icon: string }> }> = {
  wood: {
    sections: [
      { title: "올해 총운", teaser: "2026년은 성장과 확장의 기운이 강한 해입니다...", icon: "🌿" },
      { title: "직업/재물", teaser: "木의 기운이 재물운에 새로운 싹을 틔우고 있습니다...", icon: "🌿" },
      { title: "연애/결혼", teaser: "봄처럼 새로운 만남의 에너지가 감지됩니다...", icon: "🌿" },
      { title: "건강", teaser: "木의 에너지가 간과 담에 영향을 주고 있습니다...", icon: "🌿" },
      { title: "가족/대인", teaser: "가족 관계에서 새로운 성장의 계기가 보입니다...", icon: "🌿" },
      { title: "월별 운세", teaser: "상반기와 하반기의 흐름이 뚜렷하게 갈립니다...", icon: "🌿" },
      { title: "대운 타임라인", teaser: "10년 주기의 대운 흐름에서 전환점이 다가옵니다...", icon: "🌿" },
    ],
  },
  fire: {
    sections: [
      { title: "올해 총운", teaser: "2026년은 열정과 변화의 기운이 강한 해입니다...", icon: "🔥" },
      { title: "직업/재물", teaser: "火의 에너지가 사업운에 강한 추진력을 만들고 있습니다...", icon: "🔥" },
      { title: "연애/결혼", teaser: "뜨거운 인연이 하반기에 찾아올 기운이 보입니다...", icon: "🔥" },
      { title: "건강", teaser: "심장과 소장에 火 기운이 집중되고 있습니다...", icon: "🔥" },
      { title: "가족/대인", teaser: "주변에 활력을 불어넣는 역할이 강해집니다...", icon: "🔥" },
      { title: "월별 운세", teaser: "여름철 운기가 특히 강하게 작용합니다...", icon: "🔥" },
      { title: "대운 타임라인", teaser: "인생의 가장 활발한 시기가 다가오고 있습니다...", icon: "🔥" },
    ],
  },
  earth: {
    sections: [
      { title: "올해 총운", teaser: "2026년은 안정과 수확의 기운이 강한 해입니다...", icon: "⛰️" },
      { title: "직업/재물", teaser: "土의 기운이 재물을 단단히 지켜주고 있습니다...", icon: "⛰️" },
      { title: "연애/결혼", teaser: "신뢰를 기반으로 한 깊은 인연이 보입니다...", icon: "⛰️" },
      { title: "건강", teaser: "비위(소화기)에 土 기운이 집중됩니다...", icon: "⛰️" },
      { title: "가족/대인", teaser: "가족의 중심 역할이 더 강해지는 시기입니다...", icon: "⛰️" },
      { title: "월별 운세", teaser: "환절기마다 운기의 변화가 뚜렷합니다...", icon: "⛰️" },
      { title: "대운 타임라인", teaser: "안정적인 기반 위에 새로운 도약이 준비됩니다...", icon: "⛰️" },
    ],
  },
  metal: {
    sections: [
      { title: "올해 총운", teaser: "2026년은 결실과 정리의 기운이 강한 해입니다...", icon: "⚙️" },
      { title: "직업/재물", teaser: "金의 에너지가 커리어에 날카로운 판단력을 줍니다...", icon: "⚙️" },
      { title: "연애/결혼", teaser: "진지하고 명확한 관계를 원하는 시기입니다...", icon: "⚙️" },
      { title: "건강", teaser: "폐와 대장에 金 기운이 집중됩니다...", icon: "⚙️" },
      { title: "가족/대인", teaser: "관계 정리와 핵심 인연에 집중하는 시기입니다...", icon: "⚙️" },
      { title: "월별 운세", teaser: "가을철 운기가 절정에 달합니다...", icon: "⚙️" },
      { title: "대운 타임라인", teaser: "성과를 거두고 다음 단계를 준비하는 전환기입니다...", icon: "⚙️" },
    ],
  },
  water: {
    sections: [
      { title: "올해 총운", teaser: "2026년은 지혜와 유연함의 기운이 강한 해입니다...", icon: "🌊" },
      { title: "직업/재물", teaser: "水의 흐름이 새로운 기회를 끌어오고 있습니다...", icon: "🌊" },
      { title: "연애/결혼", teaser: "감성적이고 깊은 교류가 이루어지는 시기입니다...", icon: "🌊" },
      { title: "건강", teaser: "신장과 방광에 水 기운이 집중됩니다...", icon: "🌊" },
      { title: "가족/대인", teaser: "소통과 이해가 관계를 깊게 만드는 시기입니다...", icon: "🌊" },
      { title: "월별 운세", teaser: "겨울철 운기가 가장 강하게 작용합니다...", icon: "🌊" },
      { title: "대운 타임라인", teaser: "내면의 성장이 외적 변화로 이어지는 시기입니다...", icon: "🌊" },
    ],
  },
};

// ── 6 Test Strategies ──
const TEST_STRATEGIES = [
  { id: 1, label: "Sonnet 4.6", sub: "3,000자 x 10 청크", color: "#7c5cfc" },
  { id: 2, label: "Sonnet 4.6", sub: "30,000자 원샷", color: "#7c5cfc" },
  { id: 3, label: "Opus 4.6", sub: "30,000자 원샷", color: "#c04cfc" },
  { id: 4, label: "GPT 5.2", sub: "30,000자 원샷", color: "#10a37f" },
  { id: 5, label: "Gemini 3.1 Pro", sub: "30,000자 원샷", color: "#4285f4" },
  { id: 6, label: "Gemini Flash", sub: "3,000자 x 10 청크", color: "#4285f4" },
  { id: 7, label: "Haiku 4.5", sub: "3,000자 x 10 청크", color: "#e8954f" },
] as const;

type TestResult = {
  strategy: number;
  label: string;
  modelName: string;
  mode: string;
  totalChars: number;
  durationMs: number;
  costUsd: number;
  usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  report: {
    headline: string;
    summary: string;
    sections: Array<{ key: string; title: string; text: string }>;
  };
};

type TestState = {
  loading: boolean;
  error?: string;
  result?: TestResult;
};

function ResultContent() {
  const params = useSearchParams();
  const router = useRouter();
  const name = params.get("name") ?? "사용자";
  const birthDate = params.get("birthDate");
  const birthTime = params.get("birthTime");
  const gender = params.get("gender") ?? "other";
  const calendarType = params.get("calendarType") ?? "solar";
  const [visible, setVisible] = useState(false);
  const [testStates, setTestStates] = useState<Record<number, TestState>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!birthDate) {
      router.replace("/");
      return;
    }
    track("report_view");
    setTimeout(() => setVisible(true), 100);
  }, [birthDate, router]);

  if (!birthDate) {
    return <div className="loadingScreen"><p className="muted">생년월일 정보가 없습니다. 홈으로 이동합니다...</p></div>;
  }

  const analysis = useMemo(() => {
    const parts = birthDate.split("-").map(Number);
    const y = parts[0] ?? 2000;
    const m = parts[1] ?? 1;
    const d = parts[2] ?? 1;
    if (isNaN(y) || isNaN(m) || isNaN(d) || y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
      // Fallback to safe defaults
      const result = calculateFourPillars({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 });
      return { pillars: result.pillars, elements: result.elements };
    }
    const hour = birthTime ? parseInt(birthTime.split(":")[0], 10) : 12;
    const minute = birthTime ? parseInt(birthTime.split(":")[1], 10) : 0;
    const safeHour = isNaN(hour) ? 12 : hour;
    const safeMinute = isNaN(minute) ? 0 : minute;
    const result = calculateFourPillars({ year: y, month: m, day: d, hour: safeHour, minute: safeMinute });
    return { pillars: result.pillars, elements: result.elements };
  }, [birthDate, birthTime]);

  const { elements, pillars } = analysis;
  const dayEl = elements.dayMaster;
  const teasers = BLUR_TEASERS[dayEl];
  const ELEMENTS: Element[] = ["wood", "fire", "earth", "metal", "water"];

  const runTest = useCallback(async (strategy: number) => {
    setTestStates((prev) => ({ ...prev, [strategy]: { loading: true } }));
    try {
      const resp = await fetch("/api/test/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy,
          input: { name, birthDate, birthTime, gender, calendarType },
        }),
      });
      const json = await resp.json();
      if (!json.ok) {
        setTestStates((prev) => ({ ...prev, [strategy]: { loading: false, error: json.error?.message ?? "실패" } }));
        return;
      }
      setTestStates((prev) => ({ ...prev, [strategy]: { loading: false, result: json.data } }));
    } catch (err) {
      setTestStates((prev) => ({
        ...prev,
        [strategy]: { loading: false, error: err instanceof Error ? err.message : "네트워크 오류" },
      }));
    }
  }, [name, birthDate, birthTime, gender, calendarType]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <main className="page">
      <div className="container">
        {/* 무료 파트 1: 일간 카드 (Premium) */}
        <section className={`glassCard dayMasterCard ${dayEl}`}>
          <div className="dayMasterWatermark">{elements.dayMasterHanja}</div>
          <div className="dayMasterEmoji">{ELEMENT_EMOJI[dayEl]}</div>
          <h2 className="dayMasterTitle" style={{ color: `var(--element-${dayEl})` }}>
            당신은 {ELEMENT_KR[dayEl]}의 사람입니다
          </h2>
          <p className="dayMasterSub">
            {name}님의 일간(日干)은 <strong style={{ color: `var(--element-${dayEl})` }}>{elements.dayMasterHanja}</strong>입니다
          </p>
          {/* 띠 표시 제거 */}
        </section>

        {/* 사주팔자 테이블 */}
        <section className="glassCard" style={{ marginTop: 16 }}>
          <h3 style={{ textAlign: "center", marginBottom: 12 }}>사주팔자 (四柱八字)</h3>
          <FourPillarsTable pillars={pillars} dayMaster={dayEl} />
        </section>

        {/* 오행 시각화: 레이더 + 상생 사이클 */}
        <section className="glassCard" style={{ marginTop: 16 }}>
          <h3 style={{ textAlign: "center", marginBottom: 8 }}>오행 분포</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "center" }}>
            <div>
              <ElementRadar balance={elements.balance} />
              <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--t2)", marginTop: 4 }}>오행 레이더</p>
            </div>
            <div>
              <ElementCycle dominant={elements.dominant} weakest={elements.weakest} balance={elements.balance} />
              <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--t2)", marginTop: 4 }}>상생 사이클</p>
            </div>
          </div>
        </section>

        {/* 무료 파트 2: 오행 바 차트 */}
        <section className="glassCard" style={{ marginTop: 16 }}>
          <h3>오행 밸런스</h3>
          <div className="elementBars">
            {ELEMENTS.map((el) => (
              <div key={el} className={`elementBarRow ${el === elements.dominant ? "dominant" : ""}`}>
                <span className="elementBarLabel">
                  {ELEMENT_EMOJI[el]} {ELEMENT_KR[el]} ({ELEMENT_KR_NATIVE[el]})
                </span>
                <div className="elementBarTrack">
                  <div
                    className={`elementBarFill ${el}`}
                    style={{ width: visible ? `${elements.balance[el]}%` : "0%" }}
                  />
                </div>
                <span className="elementBarValue">{elements.balance[el]}%</span>
              </div>
            ))}
          </div>

          <p style={{ marginTop: 12, fontSize: "0.9rem" }}>
            <span style={{ color: `var(--element-${elements.dominant})` }}>
              {ELEMENT_EMOJI[elements.dominant]} {ELEMENT_KR[elements.dominant]} 에너지가 강합니다
            </span>
            {" · "}
            <span style={{ color: `var(--element-${elements.weakest})` }}>
              {ELEMENT_EMOJI[elements.weakest]} {ELEMENT_KR[elements.weakest]} 에너지가 부족합니다
            </span>
          </p>

          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: "0.9rem", color: "var(--t2)" }}>음양 밸런스</h4>
            <div className="yinYangBar">
              <div className="yinYangYang" style={{ width: visible ? `${elements.yinYang.yang}%` : "0%" }} />
              <div className="yinYangYin" style={{ width: visible ? `${elements.yinYang.yin}%` : "0%" }} />
            </div>
            <div className="yinYangLabels">
              <span>양(陽) {elements.yinYang.yang}%</span>
              <span>음(陰) {elements.yinYang.yin}%</span>
            </div>
          </div>
        </section>

        {/* CTA: 결제 */}
        <section className="ctaPanel" style={{ marginTop: 16 }}>
          <h3>더 깊이 알아볼까요?</h3>
          <p className="muted">블러를 해제하고 전체 분석을 확인하세요.</p>
          <div className="buttonRow">
            <Link href={`/paywall?birthDate=${birthDate}&birthTime=${birthTime ?? ""}&name=${name}&gender=${gender}&calendarType=${calendarType}&model=sonnet`} className="btn btn-primary btn-lg btn-full">
              ₩5,900 · Sonnet 분석 보기
            </Link>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            TEST: 6가지 전략 비교 (dev only)
           ══════════════════════════════════════════════ */}
        {process.env.NODE_ENV === "development" && <section className="glassCard" style={{ marginTop: 24, border: "2px dashed #f59e0b", background: "rgba(245,158,11,0.04)" }}>
          <h3 style={{ color: "#f59e0b", marginBottom: 4 }}>TEST: LLM 품질 비교</h3>
          <p className="muted" style={{ marginBottom: 16, fontSize: "0.85rem" }}>
            각 버튼을 클릭하면 해당 전략으로 리포트를 생성합니다. 캐싱 없이 매번 새로 호출합니다.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {TEST_STRATEGIES.map((s) => {
              const state = testStates[s.id];
              return (
                <button
                  key={s.id}
                  onClick={() => runTest(s.id)}
                  disabled={state?.loading}
                  style={{
                    padding: "10px 8px",
                    border: `1.5px solid ${s.color}`,
                    borderRadius: 10,
                    background: state?.result ? `${s.color}18` : "var(--bg2)",
                    cursor: state?.loading ? "wait" : "pointer",
                    textAlign: "left",
                    opacity: state?.loading ? 0.6 : 1,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", color: s.color }}>
                    {s.id}. {s.label}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--t2)" }}>{s.sub}</div>
                  {state?.loading && (
                    <div style={{ fontSize: "0.75rem", color: "#f59e0b", marginTop: 4 }}>생성 중...</div>
                  )}
                  {state?.result && (
                    <div style={{ fontSize: "0.7rem", color: "var(--t2)", marginTop: 4 }}>
                      {state.result.totalChars.toLocaleString()}자 · ${state.result.costUsd} · {(state.result.durationMs / 1000).toFixed(1)}s
                    </div>
                  )}
                  {state?.error && (
                    <div style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: 4 }}>{state.error}</div>
                  )}
                </button>
              );
            })}
          </div>
        </section>}

        {/* TEST 결과 출력 */}
        {process.env.NODE_ENV === "development" && TEST_STRATEGIES.map((s) => {
          const state = testStates[s.id];
          if (!state?.result) return null;
          const r = state.result;
          return (
            <section key={`result-${s.id}`} className="glassCard" style={{ marginTop: 12 }}>
              {/* 헤더: 비용 정보 */}
              <div style={{
                background: `${s.color}15`,
                border: `1px solid ${s.color}40`,
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 12,
              }}>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: s.color }}>
                  {s.id}. {r.label}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 6, fontSize: "0.8rem", color: "var(--t2)" }}>
                  <span>모델: <b>{r.modelName}</b></span>
                  <span>모드: <b>{r.mode === "chunked" ? "청크(x10)" : "원샷"}</b></span>
                  <span>총 글자: <b>{r.totalChars.toLocaleString()}자</b></span>
                  <span>소요: <b>{(r.durationMs / 1000).toFixed(1)}s</b></span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 4, fontSize: "0.8rem" }}>
                  <span>입력 토큰: <b>{(r.usage.inputTokens ?? 0).toLocaleString()}</b></span>
                  <span>출력 토큰: <b>{(r.usage.outputTokens ?? 0).toLocaleString()}</b></span>
                  <span style={{ color: "#ef4444", fontWeight: 700 }}>비용: ${r.costUsd}</span>
                </div>
              </div>

              {/* 섹션별 내용 */}
              {r.report.sections.map((sec, idx) => {
                const sectionKey = `${s.id}-${idx}`;
                const isExpanded = expandedSections[sectionKey] ?? (idx === 0);
                return (
                  <div key={idx} style={{ marginBottom: 8 }}>
                    <button
                      onClick={() => toggleSection(sectionKey)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 12px",
                        background: "var(--bg2)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                        {sec.title}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--t2)" }}>
                        {sec.text.length.toLocaleString()}자 {isExpanded ? "▲" : "▼"}
                      </span>
                    </button>
                    {isExpanded && (
                      <div style={{
                        padding: "12px",
                        fontSize: "0.85rem",
                        lineHeight: 1.7,
                        color: "var(--t1)",
                        whiteSpace: "pre-wrap",
                        borderLeft: `3px solid ${s.color}40`,
                        marginLeft: 4,
                        marginTop: 4,
                      }}>
                        {sec.text}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          );
        })}

        {/* 블러 7파트 */}
        <section className="glassCard" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>
            <span className="badge badge-premium">프리미엄 분석</span>
          </h3>
          {teasers.sections.map((sec, i) => (
            <div key={i} className={`blurSection ${dayEl}`}>
              <h4 style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--t1)" }}>
                {sec.icon} {sec.title}
              </h4>
              <p className="blurTeaser">{sec.teaser}</p>
              <div className="blurContent">
                이 섹션에서는 당신의 사주를 기반으로 한 상세한 분석이 포함되어 있습니다.
                오행의 흐름과 십성의 배치를 고려한 전문적인 해석을 확인해보세요.
                과거의 패턴과 현재의 기운, 그리고 미래의 흐름을 연결하여 분석합니다.
              </div>
              <div className="blurOverlay" />
            </div>
          ))}
        </section>

        {/* CTA #2 */}
        <section className="ctaPanel" style={{ marginTop: 16 }}>
          <h3>더 깊이 알아볼까요?</h3>
          <p className="muted">위 블러를 해제하고 전체 분석을 확인하세요.</p>
          <div className="buttonRow">
            <Link href={`/paywall?birthDate=${birthDate}&birthTime=${birthTime ?? ""}&name=${name}&gender=${gender}&calendarType=${calendarType}&model=sonnet`} className="btn btn-primary btn-lg btn-full">
              ₩5,900 · Sonnet 분석 보기
            </Link>
          </div>
        </section>

        {/* 궁합 */}
        <section className="glassCard" style={{ marginTop: 16, textAlign: "center" }}>
          <h3>궁합도 궁금하다면?</h3>
          <p className="muted" style={{ marginTop: 8 }}>상대방 생년월일만 입력하면 무료 궁합을 볼 수 있어요.</p>
          <div className="buttonRow" style={{ justifyContent: "center" }}>
            <Link href="/?tab=compat" className="btn btn-secondary btn-lg">
              궁합 보러 가기
            </Link>
          </div>
        </section>

        {/* 모바일 스티키 CTA */}
        <div className="stickyCta">
          <div className="stickyCtaInner">
            <Link href={`/paywall?birthDate=${birthDate}&birthTime=${birthTime ?? ""}&name=${name}&gender=${gender}&calendarType=${calendarType}&model=sonnet`} className="btn btn-primary btn-lg btn-full">
              상세 분석 보기
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="loadingScreen"><p className="muted">분석 결과를 불러오는 중...</p></div>}>
      <ResultContent />
    </Suspense>
  );
}
