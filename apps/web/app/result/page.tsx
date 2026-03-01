"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useMemo, useEffect, useState } from "react";
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

// 유료 잠금 섹션 (성격 제외 8개)
const LOCKED_SECTIONS = [
  { key: "직업", title: "직업" },
  { key: "연애·가족·배우자", title: "연애·가족·배우자" },
  { key: "금전", title: "금전" },
  { key: "건강", title: "건강" },
  { key: "과거", title: "과거" },
  { key: "현재", title: "현재" },
  { key: "미래", title: "미래" },
  { key: "대운 타임라인", title: "대운 타임라인" },
];

// 더미 블러 텍스트 (모든 잠금 섹션에 동일하게 사용)
const BLUR_DUMMY = "당신의 사주를 기반으로 분석한 상세한 내용이 이 섹션에 포함되어 있습니다. 오행의 흐름과 타고난 기운의 조화를 고려한 전문적인 해석을 통해 과거의 패턴과 현재의 에너지 그리고 미래의 가능성을 종합적으로 살펴봅니다. 구체적인 행동 팁과 실천 가능한 조언이 함께 제공됩니다.";

function ResultContent() {
  const params = useSearchParams();
  const router = useRouter();
  const name = params.get("name") ?? "사용자";
  const birthDate = params.get("birthDate");
  const birthTime = params.get("birthTime");
  const gender = params.get("gender") ?? "other";
  const calendarType = params.get("calendarType") ?? "solar";
  const [visible, setVisible] = useState(false);
  const [personalityText, setPersonalityText] = useState<string | null>(null);
  const [personalityLoading, setPersonalityLoading] = useState(false);
  const [personalityError, setPersonalityError] = useState<string | null>(null);

  useEffect(() => {
    if (!birthDate) {
      router.replace("/");
      return;
    }
    track("report_view");
    setTimeout(() => setVisible(true), 100);

    // 무료 성격 생성
    const cached = sessionStorage.getItem("free_personality");
    const cachedKey = sessionStorage.getItem("free_personality_key");
    const currentKey = `${name}_${birthDate}_${birthTime}_${gender}_${calendarType}`;
    if (cached && cachedKey === currentKey) {
      setPersonalityText(cached);
      return;
    }

    setPersonalityLoading(true);
    fetch("/api/report/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "free",
        input: { name, birthDate, birthTime, gender, calendarType },
      }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.ok && json.data?.section?.text) {
          setPersonalityText(json.data.section.text);
          sessionStorage.setItem("free_personality", json.data.section.text);
          sessionStorage.setItem("free_personality_key", currentKey);
        } else {
          setPersonalityError("성격 분석 생성에 실패했습니다.");
        }
      })
      .catch(() => setPersonalityError("네트워크 오류가 발생했습니다."))
      .finally(() => setPersonalityLoading(false));
  }, [birthDate, birthTime, name, gender, calendarType, router]);

  const analysis = useMemo(() => {
    if (!birthDate) return null;
    const parts = birthDate.split("-").map(Number);
    const y = parts[0] ?? 2000;
    const m = parts[1] ?? 1;
    const d = parts[2] ?? 1;
    if (isNaN(y) || isNaN(m) || isNaN(d) || y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
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

  const paywallParams = useMemo(() => new URLSearchParams({
    birthDate: birthDate ?? "",
    birthTime: birthTime ?? "",
    name,
    gender,
    calendarType,
  }).toString(), [birthDate, birthTime, name, gender, calendarType]);

  if (!birthDate || !analysis) {
    return <div className="loadingScreen"><p className="muted">생년월일 정보가 없습니다. 홈으로 이동합니다...</p></div>;
  }

  const { elements, pillars } = analysis;
  const dayEl = elements.dayMaster;
  const ELEMENTS: Element[] = ["wood", "fire", "earth", "metal", "water"];

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
          {dayEl !== elements.dominant && (
            <p style={{ marginTop: 8, fontSize: "0.78rem", color: "var(--t2)", lineHeight: 1.5 }}>
              일간은 타고난 본질이며, 오행 분포에서 가장 많은 {ELEMENT_KR[elements.dominant]}({ELEMENT_EMOJI[elements.dominant]})과는 다를 수 있습니다
            </p>
          )}
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

        {/* 무료 성격 분석 결과 */}
        <section className="glassCard" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>성격 분석</h3>
          {personalityLoading && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div className="spinner" style={{ margin: "0 auto 12px" }} />
              <p className="muted">{name}님의 성격을 AI가 분석 중입니다...</p>
            </div>
          )}
          {personalityError && (
            <p style={{ color: "#ef4444", fontSize: "0.9rem" }}>{personalityError}</p>
          )}
          {personalityText && (
            <div style={{ fontSize: "0.92rem", lineHeight: 1.8, color: "var(--t1)", whiteSpace: "pre-wrap" }}>
              {personalityText}
            </div>
          )}
        </section>

        {/* 잠금 섹션 8개 (블러) */}
        <section className="glassCard" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>
            <span className="badge badge-premium">프리미엄 분석</span>
          </h3>
          {LOCKED_SECTIONS.map((sec) => (
            <div key={sec.key} className={`blurSection ${dayEl}`}>
              <h4 style={{ color: "var(--t1)" }}>{sec.title}</h4>
              <div className="blurContent">{BLUR_DUMMY}</div>
              <div className="blurOverlay">
                <Link href={`/paywall?${paywallParams}`} className="blurUnlockBtn">
                  잠금 해제
                </Link>
              </div>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="ctaPanel" style={{ marginTop: 16 }}>
          <h3>전체 분석 잠금 해제</h3>
          <p className="muted">나머지 8개 섹션의 상세 분석을 확인하세요.</p>
          <div className="buttonRow">
            <Link href={`/paywall?${paywallParams}`} className="btn btn-primary btn-lg btn-full">
              전체 분석 잠금 해제 — ₩5,900
            </Link>
          </div>
        </section>

        {/* 궁합 */}
        <section className="glassCard" style={{ marginTop: 16, textAlign: "center" }}>
          <h3>궁합도 궁금하다면?</h3>
          <p className="muted" style={{ marginTop: 8 }}>상대방 생년월일만 입력하면 무료 궁합을 볼 수 있어요.</p>
          <div className="buttonRow" style={{ justifyContent: "center" }}>
            <Link href={`/compatibility?birthDate=${birthDate}`} className="btn btn-secondary btn-lg">
              궁합 보러 가기
            </Link>
          </div>
        </section>

        {/* 모바일 스티키 CTA */}
        <div className="stickyCta">
          <div className="stickyCtaInner">
            <Link href={`/paywall?${paywallParams}`} className="btn btn-primary btn-lg btn-full">
              전체 분석 보기 ₩5,900
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
