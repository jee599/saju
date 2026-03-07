"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "../../../i18n/navigation";
import { Suspense, useMemo, useEffect, useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import dynamic from "next/dynamic";
import { Link } from "../../../i18n/navigation";
import { calculateFourPillars, ELEMENT_EMOJI } from "@saju/engine-saju";
import type { Element, FourPillars } from "@saju/engine-saju";
import { convertLunarToSolar } from "../../../lib/lunarConvert";
import { track, trackFunnel, trackScrollDepth, createPageTimer, trackPageEvent, trackClick, trackLanding } from "../../../lib/analytics";

const ElementRadar = dynamic(() => import("./components/ElementRadar"), { ssr: false });
const ElementCycle = dynamic(() => import("./components/ElementCycle"), { ssr: false });
const FourPillarsTable = dynamic(() => import("./components/FourPillarsTable"), { ssr: false });
const ShareButtons = dynamic(() => import("./components/ShareButtons"), { ssr: false });

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

function ResultContent() {
  const t = useTranslations("result");
  const locale = useLocale();
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
  const pageTimerRef = useRef<ReturnType<typeof createPageTimer> | null>(null);
  const maxScrollRef = useRef(0);
  const [analysis, setAnalysis] = useState<{ pillars: FourPillars; elements: ReturnType<typeof calculateFourPillars>["elements"] } | null>(null);
  const [lunarError, setLunarError] = useState(false);

  useEffect(() => {
    if (!birthDate) {
      router.replace("/");
      return;
    }
    trackLanding();
    track("report_view");
    trackPageEvent("/result");
    trackFunnel("result_view");
    pageTimerRef.current = createPageTimer("result");
    setTimeout(() => setVisible(true), 100);

    try {
      const cached = sessionStorage.getItem("free_personality");
      const cachedKey = sessionStorage.getItem("free_personality_key");
      const currentKey = `${name}_${birthDate}_${birthTime}_${gender}_${calendarType}`;
      if (cached && cachedKey === currentKey) {
        setPersonalityText(cached);
      } else {
        setPersonalityError(t("personalityError"));
      }
    } catch {
      setPersonalityError(t("personalityError"));
    }
  }, [birthDate, birthTime, name, gender, calendarType, router, t]);

  // Scroll depth tracking + cleanup
  useEffect(() => {
    const onScroll = () => {
      const depth = Math.round(
        ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100,
      );
      if (depth > maxScrollRef.current) maxScrollRef.current = depth;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (maxScrollRef.current > 0) trackScrollDepth("result", maxScrollRef.current);
      pageTimerRef.current?.stop();
    };
  }, []);

  // Compute four pillars analysis; lunar conversion is async (dynamic import)
  useEffect(() => {
    if (!birthDate) return;
    let cancelled = false;
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
      if (cancelled) return;
      const result = calculateFourPillars({ year: sy, month: sm, day: sd, hour: safeHour, minute: safeMinute });
      setAnalysis({ pillars: result.pillars, elements: result.elements });
    };

    // Convert lunar date to solar if calendarType is lunar (async dynamic import)
    if (calendarType === "lunar") {
      convertLunarToSolar(y, m, d)
        .then((solar) => compute(solar.year, solar.month, solar.day))
        .catch(() => {
          if (cancelled) return;
          setLunarError(true);
          compute(y, m, d);
        });
    } else {
      compute(y, m, d);
    }
    return () => { cancelled = true; };
  }, [birthDate, birthTime, calendarType]);

  const paywallParams = useMemo(() => new URLSearchParams({
    birthDate: birthDate ?? "",
    birthTime: birthTime ?? "",
    name,
    gender,
    calendarType,
  }).toString(), [birthDate, birthTime, name, gender, calendarType]);

  const elementSources = useMemo(() => {
    const sources: Record<Element, string[]> = {
      wood: [], fire: [], earth: [], metal: [], water: [],
    };
    if (!analysis) return sources;

    const marks: Array<{ label: string; stem: string; branch: string }> = [
      { label: t("pillarLabel.year"), stem: analysis.pillars.year.stem, branch: analysis.pillars.year.branch },
      { label: t("pillarLabel.month"), stem: analysis.pillars.month.stem, branch: analysis.pillars.month.branch },
      { label: t("pillarLabel.day"), stem: analysis.pillars.day.stem, branch: analysis.pillars.day.branch },
      { label: t("pillarLabel.hour"), stem: analysis.pillars.hour.stem, branch: analysis.pillars.hour.branch },
    ];

    for (const m of marks) {
      const stemEl = STEM_TO_ELEMENT[m.stem];
      const branchEl = BRANCH_TO_ELEMENT[m.branch];
      if (stemEl) sources[stemEl].push(t("stemSource", { label: m.label, char: m.stem }));
      if (branchEl) sources[branchEl].push(t("branchSource", { label: m.label, char: m.branch }));
    }

    return sources;
  }, [analysis, t]);

  if (!birthDate || !analysis) {
    return <div className="loadingScreen"><p className="muted">{t("noBirthDate")}</p></div>;
  }

  const { elements, pillars } = analysis;
  const mainEl = elements.dominant;
  const ELEMENTS: Element[] = ["wood", "fire", "earth", "metal", "water"];
  const ELEMENT_HANJA: Record<Element, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };

  return (
    <div className="page">
      <div className="container">
        {/* 메인 오행 카드 */}
        <section className={`glassCard dayMasterCard ${mainEl}`}>
          <div className="dayMasterWatermark">{ELEMENT_HANJA[mainEl]}</div>
          <div className="dayMasterEmoji">{ELEMENT_EMOJI[mainEl]}</div>
          <h2 className="dayMasterTitle" style={{ color: `var(--element-${mainEl})` }}>
            {t("dayMaster.title", { element: t(`elements.${mainEl}`) })}
          </h2>
          <p className="dayMasterSub">
            {t(`dayMaster.traits.${mainEl}`)}
          </p>
        </section>

        {/* 공유 버튼 — Day Master 바로 아래 */}
        <ShareButtons
          element={t(`elements.${mainEl}`)}
          elementKey={mainEl}
          name={name}
        />

        {/* 음력 변환 실패 경고 */}
        {lunarError && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,180,0,0.12)", borderRadius: 8, border: "1px solid rgba(255,180,0,0.25)" }}>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#ffb400", lineHeight: 1.5 }}>
              {t("lunarConversionError")}
            </p>
          </div>
        )}

        {/* 사주팔자 테이블 */}
        <section className="glassCard" style={{ marginTop: 16 }}>
          <h3 style={{ textAlign: "center", marginBottom: 12 }}>{t("fourPillars")}</h3>
          <FourPillarsTable pillars={pillars} dayMaster={mainEl} t={t} locale={locale} />
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
            <div key={i} className={`blurSection ${mainEl}`}>
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

        {/* 하단 공유 버튼 (두 번째 터치포인트) */}
        <ShareButtons
          element={t(`elements.${mainEl}`)}
          elementKey={mainEl}
          name={name}
        />

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
