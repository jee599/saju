"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Link } from "../../../i18n/navigation";
import { ELEMENT_EMOJI } from "@saju/engine-saju";
import type { Element } from "@saju/engine-saju";
import { useFortuneResult } from "./hooks/useFortuneResult";

const ElementRadar = dynamic(() => import("./components/ElementRadar"), { ssr: false });
const ElementCycle = dynamic(() => import("./components/ElementCycle"), { ssr: false });
const FourPillarsTable = dynamic(() => import("./components/FourPillarsTable"), { ssr: false });
const ShareButtons = dynamic(() => import("./components/ShareButtons"), { ssr: false });

const ELEMENTS: Element[] = ["wood", "fire", "earth", "metal", "water"];
const ELEMENT_HANJA: Record<Element, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };

function ResultContent() {
  const {
    t, locale, name, birthDate, visible,
    personalityText, personalityError,
    analysis, lunarError, elementSources, paywallParams,
  } = useFortuneResult();

  if (!birthDate || !analysis) {
    return <div className="loadingScreen"><p className="muted">{t("noBirthDate")}</p></div>;
  }

  const { elements, pillars } = analysis;
  const mainEl = elements.dominant;

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

        {/* 하단 공유 버튼 */}
        <ShareButtons
          element={t(`elements.${mainEl}`)}
          elementKey={mainEl}
          name={name}
          traits={t(`dayMaster.traits.${mainEl}`)}
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
