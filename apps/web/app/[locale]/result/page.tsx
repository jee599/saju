"use client";

// TODO: Code-split heavy SVG/chart components (ElementRadar, ElementCycle,
// FourPillarsTable) with next/dynamic to reduce initial JS bundle size.

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useMemo, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../../../i18n/navigation";
import { calculateFourPillars, ELEMENT_EMOJI } from "@saju/engine-saju";
import type { Element, FourPillars } from "@saju/engine-saju";
import { convertLunarToSolar } from "../../../lib/lunarConvert";
import { track } from "../../../lib/analytics";

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

// ── 천간 음양 ──
const STEM_POLARITY: Record<string, "yang" | "yin"> = {
  "甲": "yang", "乙": "yin", "丙": "yang", "丁": "yin", "戊": "yang",
  "己": "yin", "庚": "yang", "辛": "yin", "壬": "yang", "癸": "yin",
};

// ── 오행 레이더 차트 ──
function ElementRadar({ balance, t }: { balance: Record<Element, number>; t: (key: string, values?: Record<string, string>) => string }) {
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
    <svg viewBox="0 0 220 230" style={{ width: "100%", maxWidth: 280, margin: "0 auto", display: "block" }} role="img" aria-label={t("radar.aria")}>
      <title>{t("radar.aria")}</title>
      <desc>{t("radar.desc")}</desc>
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
      {gridLevels.map(level => (
        <polygon
          key={level}
          points={elements.map((_, i) => `${px(i, R * level)},${py(i, R * level)}`).join(" ")}
          fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={level === 1.0 ? 1.5 : 0.8}
          strokeDasharray={level < 1 ? "3 4" : "none"}
        />
      ))}
      {elements.map((_, i) => (
        <line key={i} x1={cx} y1={cy} x2={px(i, R)} y2={py(i, R)}
          stroke="rgba(255,255,255,0.1)" strokeWidth={0.8} />
      ))}
      <polygon points={dataPoints} fill="url(#radarFill)" stroke="url(#radarStroke)" strokeWidth={1.5} />
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

// ── 오행 상생 사이클 ──
function ElementCycle({ dominant, weakest, balance, t }: { dominant: Element; weakest: Element; balance: Record<Element, number>; t: (key: string) => string }) {
  const elements: Element[] = ["wood", "fire", "earth", "metal", "water"];
  const labels = ["木", "火", "土", "金", "水"];
  const cx = 110, cy = 110, R = 65;

  const angle = (i: number) => (Math.PI / 2) + (2 * Math.PI * i) / 5;
  const px = (i: number) => cx + R * Math.cos(-angle(i));
  const py = (i: number) => cy - R * Math.sin(-angle(i));

  const maxBal = Math.max(...elements.map(e => balance[e]), 1);
  const nodeRadius = (el: Element) => {
    const ratio = balance[el] / maxBal;
    return 14 + ratio * 14;
  };

  return (
    <svg viewBox="0 0 220 220" style={{ width: "100%", maxWidth: 260, margin: "0 auto", display: "block" }} role="img" aria-label={t("cycle.aria")}>
      <title>{t("cycle.aria")}</title>
      <desc>{t("cycle.desc")}</desc>
      <defs>
        <marker id="arrowCycle" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={4} markerHeight={4} orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(196,139,159,0.5)" />
        </marker>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={30} />
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
                fill={`var(--element-${el})`}>{t("cycle.strong")}</text>
            )}
            {isWeakest && (
              <text x={px(i)} y={py(i) + nodeR + 10} textAnchor="middle" fontSize={8} fontWeight={600}
                fill="rgba(255,255,255,0.3)">{t("cycle.weak")}</text>
            )}
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={12} fill="rgba(30,21,51,0.8)" stroke="rgba(220,207,243,0.1)" strokeWidth={0.5} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={600}
        fill="rgba(255,255,255,0.3)">{t("cycle.center")}</text>
    </svg>
  );
}

// ── 사주팔자 테이블 ──
function FourPillarsTable({ pillars, dayMaster, t }: { pillars: FourPillars; dayMaster: Element; t: (key: string) => string }) {
  const cols = [
    { label: t("pillarsTable.cols.0"), sub: t("pillarsTable.colsSub.0"), pillar: pillars.hour, idx: 0 },
    { label: t("pillarsTable.cols.1"), sub: t("pillarsTable.colsSub.1"), pillar: pillars.day, idx: 1 },
    { label: t("pillarsTable.cols.2"), sub: t("pillarsTable.colsSub.2"), pillar: pillars.month, idx: 2 },
    { label: t("pillarsTable.cols.3"), sub: t("pillarsTable.colsSub.3"), pillar: pillars.year, idx: 3 },
  ];

  return (
    <div className="fourPillarsTableWrap">
    <table className="fourPillarsTable" role="table" aria-label={t("pillarsTable.aria")}>
      <thead>
        <tr>
          <th></th>
          {cols.map((col) => (
            <th key={col.idx} className={col.idx === 1 ? "pillarHighlightCol" : ""}>
              {col.label}<span className="pillarSubLabel">{col.sub}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr className="pillarRowStem">
          <td className="pillarRowLabel">{t("pillarsTable.stemRow")}</td>
          {cols.map((col) => {
            const stemEl = STEM_TO_ELEMENT[col.pillar.stem] ?? "earth";
            const polarity = STEM_POLARITY[col.pillar.stem] ?? "yang";
            return (
              <td key={col.idx} className={col.idx === 1 ? "pillarHighlightCol" : ""}>
                <span className="pillarChar" style={{ color: `var(--element-${stemEl})` }}>{col.pillar.stem}</span>
                <span className="pillarPolTag">{t(`polarity.${polarity}`)}</span>
              </td>
            );
          })}
        </tr>
        <tr className="pillarRowBranch">
          <td className="pillarRowLabel">{t("pillarsTable.branchRow")}</td>
          {cols.map((col) => {
            const branchEl = BRANCH_TO_ELEMENT[col.pillar.branch] ?? "earth";
            return (
              <td key={col.idx} className={col.idx === 1 ? "pillarHighlightCol" : ""}>
                <span className="pillarChar" style={{ color: `var(--element-${branchEl})` }}>{col.pillar.branch}</span>
              </td>
            );
          })}
        </tr>
        <tr className="pillarRowKr">
          <td className="pillarRowLabel"></td>
          {cols.map((col) => (
            <td key={col.idx} className={col.idx === 1 ? "pillarHighlightCol" : ""}>
              <span className="pillarKrName">{col.pillar.fullKr}</span>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
    </div>
  );
}

function ResultContent() {
  const t = useTranslations("result");
  const params = useSearchParams();
  const router = useRouter();
  const name = params.get("name") ?? t("defaultUser");
  const birthDate = params.get("birthDate");
  const birthTime = params.get("birthTime");
  const gender = params.get("gender") ?? "other";
  const calendarType = params.get("calendarType") ?? "solar";
  const [visible, setVisible] = useState(false);
  const [personalityText, setPersonalityText] = useState<string | null>(null);
  const [personalityError, setPersonalityError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{ pillars: FourPillars; elements: ReturnType<typeof calculateFourPillars>["elements"] } | null>(null);
  const [lunarError, setLunarError] = useState(false);

  useEffect(() => {
    if (!birthDate) {
      router.replace("/");
      return;
    }
    track("report_view");
    setTimeout(() => setVisible(true), 100);

    const cached = sessionStorage.getItem("free_personality");
    const cachedKey = sessionStorage.getItem("free_personality_key");
    const currentKey = `${name}_${birthDate}_${birthTime}_${gender}_${calendarType}`;
    if (cached && cachedKey === currentKey) {
      setPersonalityText(cached);
    } else {
      setPersonalityError(t("personalityError"));
    }
  }, [birthDate, birthTime, name, gender, calendarType, router, t]);

  // Compute four pillars analysis; lunar conversion is async (dynamic import)
  useEffect(() => {
    if (!birthDate) return;
    const parts = birthDate.split("-").map(Number);
    let y = parts[0] ?? 2000;
    let m = parts[1] ?? 1;
    let d = parts[2] ?? 1;
    if (isNaN(y) || isNaN(m) || isNaN(d) || y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
      const result = calculateFourPillars({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 });
      setAnalysis({ pillars: result.pillars, elements: result.elements });
      return;
    }

    const hour = birthTime ? parseInt(birthTime.split(":")[0], 10) : 12;
    const minute = birthTime ? parseInt(birthTime.split(":")[1], 10) : 0;
    const safeHour = isNaN(hour) ? 12 : hour;
    const safeMinute = isNaN(minute) ? 0 : minute;

    const compute = (sy: number, sm: number, sd: number) => {
      const result = calculateFourPillars({ year: sy, month: sm, day: sd, hour: safeHour, minute: safeMinute });
      setAnalysis({ pillars: result.pillars, elements: result.elements });
    };

    // Convert lunar date to solar if calendarType is lunar (async dynamic import)
    if (calendarType === "lunar") {
      convertLunarToSolar(y, m, d)
        .then((solar) => compute(solar.year, solar.month, solar.day))
        .catch(() => {
          setLunarError(true);
          compute(y, m, d); // fallback to treating as solar
        });
    } else {
      compute(y, m, d);
    }
  }, [birthDate, birthTime, calendarType]);

  const paywallParams = useMemo(() => new URLSearchParams({
    birthDate: birthDate ?? "",
    birthTime: birthTime ?? "",
    name,
    gender,
    calendarType,
  }).toString(), [birthDate, birthTime, name, gender, calendarType]);

  if (!birthDate || !analysis) {
    return <div className="loadingScreen"><p className="muted">{t("noBirthDate")}</p></div>;
  }

  const { elements, pillars } = analysis;
  const dayEl = elements.dayMaster;
  const ELEMENTS: Element[] = ["wood", "fire", "earth", "metal", "water"];
  const elementSources = useMemo(() => {
    const sources: Record<Element, string[]> = {
      wood: [], fire: [], earth: [], metal: [], water: [],
    };

    const marks: Array<{ label: string; stem: string; branch: string }> = [
      { label: "년", stem: pillars.year.stem, branch: pillars.year.branch },
      { label: "월", stem: pillars.month.stem, branch: pillars.month.branch },
      { label: "일", stem: pillars.day.stem, branch: pillars.day.branch },
      { label: "시", stem: pillars.hour.stem, branch: pillars.hour.branch },
    ];

    for (const m of marks) {
      const stemEl = STEM_TO_ELEMENT[m.stem];
      const branchEl = BRANCH_TO_ELEMENT[m.branch];
      if (stemEl) sources[stemEl].push(`${m.label}간(${m.stem})`);
      if (branchEl) sources[branchEl].push(`${m.label}지(${m.branch})`);
    }

    return sources;
  }, [pillars]);

  return (
    <div className="page">
      <div className="container">
        {/* 일간 카드 */}
        <section className={`glassCard dayMasterCard ${dayEl}`}>
          <div className="dayMasterWatermark">{elements.dayMasterHanja}</div>
          <div className="dayMasterEmoji">{ELEMENT_EMOJI[dayEl]}</div>
          <h2 className="dayMasterTitle" style={{ color: `var(--element-${dayEl})` }}>
            {t("dayMaster.title", { element: t(`elements.${dayEl}`) })}
          </h2>
          <p className="dayMasterSub">
            {t("dayMaster.sub", { name, hanja: elements.dayMasterHanja })}
          </p>
          {dayEl !== elements.dominant && (
            <p style={{ marginTop: 8, fontSize: "0.78rem", color: "var(--t2)", lineHeight: 1.5 }}>
              {t("dayMaster.note", { dominant: `${t(`elements.${elements.dominant}`)}(${ELEMENT_EMOJI[elements.dominant]})` })}
            </p>
          )}
        </section>

        {/* 음력 변환 실패 경고 */}
        {lunarError && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,180,0,0.12)", borderRadius: 8, border: "1px solid rgba(255,180,0,0.25)" }}>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#ffb400", lineHeight: 1.5 }}>
              음력 날짜 변환에 실패하여 양력으로 계산되었습니다.
            </p>
          </div>
        )}

        {/* 사주팔자 테이블 */}
        <section className="glassCard" style={{ marginTop: 16 }}>
          <h3 style={{ textAlign: "center", marginBottom: 12 }}>{t("fourPillars")}</h3>
          <FourPillarsTable pillars={pillars} dayMaster={dayEl} t={t} />
        </section>

        {/* 오행 시각화 */}
        <section className="glassCard" style={{ marginTop: 16 }}>
          <h3 style={{ textAlign: "center", marginBottom: 8 }}>{t("elementDist")}</h3>
          <div className="elementChartsGrid">
            <div>
              <ElementRadar balance={elements.balance} t={t} />
              <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--t2)", marginTop: 4 }}>{t("radarLabel")}</p>
            </div>
            <div>
              <ElementCycle dominant={elements.dominant} weakest={elements.weakest} balance={elements.balance} t={t} />
              <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--t2)", marginTop: 4 }}>{t("cycleLabel")}</p>
            </div>
          </div>
        </section>

        {/* 오행 바 차트 */}
        <section className="glassCard" style={{ marginTop: 16 }}>
          <h3>{t("elementBalance")}</h3>
          <div className="elementBars">
            {ELEMENTS.map((el) => (
              <div key={el} className={`elementBarRow ${el === elements.dominant ? "dominant" : ""}`}>
                <span className="elementBarLabel">
                  {ELEMENT_EMOJI[el]} {t(`elements.${el}`)} ({t(`elementsNative.${el}`)})
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
              {t("strongEnergy", { emoji: ELEMENT_EMOJI[elements.dominant], name: t(`elements.${elements.dominant}`) })}
            </span>
            {" · "}
            <span style={{ color: `var(--element-${elements.weakest})` }}>
              {t("weakEnergy", { emoji: ELEMENT_EMOJI[elements.weakest], name: t(`elements.${elements.weakest}`) })}
            </span>
          </p>
          <p style={{ marginTop: 10, fontSize: "0.82rem", color: "var(--t2)", lineHeight: 1.6 }}>
            {t("elementSources")} {ELEMENTS.map((el) => `${t(`elements.${el}`)} ${t("elementSourceCount", { count: String(elementSources[el].length) })}${elementSources[el].length ? ` (${elementSources[el].join(", ")})` : ""}`).join(" · ")}
          </p>

          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: "0.9rem", color: "var(--t2)" }}>{t("yinYang")}</h4>
            <div className="yinYangBar">
              <div className="yinYangYang" style={{ width: visible ? `${elements.yinYang.yang}%` : "0%" }} />
              <div className="yinYangYin" style={{ width: visible ? `${elements.yinYang.yin}%` : "0%" }} />
            </div>
            <div className="yinYangLabels">
              <span>{t("yangLabel", { pct: String(elements.yinYang.yang) })}</span>
              <span>{t("yinLabel", { pct: String(elements.yinYang.yin) })}</span>
            </div>
          </div>
        </section>

        {/* 성격 분석 */}
        <section className="glassCard" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>{t("personality")}</h3>
          {personalityError && (
            <p style={{ color: "var(--error)", fontSize: "0.9rem" }}>{personalityError}</p>
          )}
          {personalityText && (
            <div className="personalityResult">
              {personalityText.split(/\n\s*\n/).filter(Boolean).map((block, i) => {
                const lines = block.trim().split("\n");
                const first = lines[0]?.trim() ?? "";
                const isHeading = /^[■●★▶▷◆◇►☆※✦✧⭐🔮💫🌟📌🎯💡🔑]/.test(first)
                  || /^#+\s/.test(first)
                  || /^【.*】$/.test(first)
                  || /^\[.*\]$/.test(first)
                  || (first.length <= 20 && lines.length === 1);
                if (isHeading) {
                  const cleaned = first.replace(/^#+\s*/, "").replace(/^[■●★▶▷◆◇►☆※✦✧⭐🔮💫🌟📌🎯💡🔑]\s*/, "");
                  return <h4 key={i} className="personalityHeading">{cleaned || first}</h4>;
                }
                return <p key={i} className="personalityParagraph">{block.trim()}</p>;
              })}
            </div>
          )}
        </section>

        {/* 잠금 섹션 */}
        <section className="glassCard" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>
            <span className="badge badge-premium">{t("premiumBadge")}</span>
          </h3>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className={`blurSection ${dayEl}`}>
              <h4 className="lockedSectionTitle">{t(`lockedSections.${i}`)}</h4>
              <div className="blurContent">{t("blurDummy")}</div>
            </div>
          ))}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <Link href={`/paywall?${paywallParams}`} className="btn btn-primary btn-lg btn-full">
              {t("unlockAll")}
            </Link>
            <p className="muted" style={{ marginTop: 8, fontSize: "0.8rem" }}>{t("unlockDesc")}</p>
          </div>
        </section>

        {/* 궁합 */}
        <section className="glassCard" style={{ marginTop: 16, textAlign: "center" }}>
          <h3>{t("compatTitle")}</h3>
          <p className="muted" style={{ marginTop: 8 }}>{t("compatDesc")}</p>
          <div className="buttonRow" style={{ justifyContent: "center" }}>
            <Link href={`/compatibility?birthDate=${birthDate}`} className="btn btn-secondary btn-lg">
              {t("compatCta")}
            </Link>
          </div>
        </section>

        {/* 스티키 CTA */}
        <div className="stickyCta" role="complementary" aria-label="Unlock full report">
          <div className="stickyCtaInner">
            <Link href={`/paywall?${paywallParams}`} className="btn btn-primary btn-lg btn-full">
              {t("stickyUnlock")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  const t = useTranslations("result");
  return (
    <Suspense fallback={<div className="loadingScreen"><p className="muted">{t("loading")}</p></div>}>
      <ResultContent />
    </Suspense>
  );
}
