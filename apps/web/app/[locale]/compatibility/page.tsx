"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "../../../i18n/navigation";
import { Suspense, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "../../../i18n/navigation";
import { calculateFourPillars, calculateCompatibility, ELEMENT_EMOJI } from "@saju/engine-saju";
import { track } from "../../../lib/analytics";
import { getCountryByLocale } from "@saju/shared";
import { PageSkeleton } from "../components/Skeleton";

function CompatContent() {
  const t = useTranslations("compat");
  const tPaywall = useTranslations("compatPaywall");
  const locale = useLocale();
  const params = useSearchParams();
  const router = useRouter();
  const country = getCountryByLocale(locale);
  const compatPricing = country.pricing.compatibility;
  const zeroDecimalCurrencies = ["KRW", "JPY", "VND", "IDR"];
  const compatPriceLabel = compatPricing
    ? `${country.currencySymbol}${zeroDecimalCurrencies.includes(country.currency) ? compatPricing.premium.toLocaleString() : (compatPricing.premium / 100).toFixed(2)}`
    : country.priceLabel;
  const myDateParam = params.get("my");
  const partnerDateParam = params.get("partner");

  const [myInput, setMyInput] = useState("");
  const [partnerInput, setPartnerInput] = useState("");

  const hasParams = myDateParam && partnerDateParam;

  const result = useMemo(() => {
    if (!hasParams) return null;
    const [my, mm, md] = myDateParam.split("-").map(Number);
    const [py, pm, pd] = partnerDateParam.split("-").map(Number);

    if (isNaN(my) || isNaN(mm) || isNaN(md) || isNaN(py) || isNaN(pm) || isNaN(pd)) return null;

    const myResult = calculateFourPillars({ year: my, month: mm, day: md, hour: 12, minute: 0 });
    const partnerResult = calculateFourPillars({ year: py, month: pm, day: pd, hour: 12, minute: 0 });

    track("compatibility_result");
    return calculateCompatibility(myResult.pillars, partnerResult.pillars);
  }, [myDateParam, partnerDateParam, hasParams]);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}`
    : "";

  const handleShare = () => {
    if (!result) return;
    const text = t("shareText", { score: String(result.score), url: shareUrl });
    if (navigator.share) {
      navigator.share({ title: t("shareTitle"), text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    track("share_click", { channel: "copy", content_type: "compatibility" });
  };

  const handleCompatSubmit = () => {
    if (!myInput || !partnerInput) return;
    router.push(`/compatibility?my=${myInput}&partner=${partnerInput}`);
  };

  if (!hasParams || !result) {
    return (
      <div className="page">
        <div className="container">
          <section className="glassCard">
            <h2 style={{ textAlign: "center" }}>{t("title")}</h2>
            <p className="muted" style={{ textAlign: "center", marginTop: 8 }}>
              {t("desc")}
            </p>
            <div className="form" style={{ marginTop: 24 }}>
              <div className="formGroup">
                <label htmlFor="comp-myBirthDate">{t("myBirthDate")}</label>
                <input
                  id="comp-myBirthDate"
                  type="date"
                  className="input"
                  value={myInput}
                  onChange={(e) => setMyInput(e.target.value)}
                  aria-label={t("myBirthDateAria")}
                />
              </div>
              <div className="formGroup">
                <label htmlFor="comp-partnerBirthDate">{t("partnerBirthDate")}</label>
                <input
                  id="comp-partnerBirthDate"
                  type="date"
                  className="input"
                  value={partnerInput}
                  onChange={(e) => setPartnerInput(e.target.value)}
                  aria-label={t("partnerBirthDateAria")}
                />
              </div>
              <div className="buttonRow">
                <button
                  className="btn btn-primary btn-lg btn-full"
                  onClick={handleCompatSubmit}
                  disabled={!myInput || !partnerInput}
                >
                  {t("viewCompat")}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <section className="glassCard compatResult">
          <h2>{ELEMENT_EMOJI[result.myElement]} {t(`elements.${result.myElement}`)} × {ELEMENT_EMOJI[result.partnerElement]} {t(`elements.${result.partnerElement}`)}</h2>

          <div className="compatElements">
            <div className="compatPerson">
              <span className="compatEmoji">{ELEMENT_EMOJI[result.myElement]}</span>
              <span className="compatLabel">{t("me")}</span>
              <span className="compatElement">{t(`elements.${result.myElement}`)}</span>
            </div>
            <span className="compatConnector">←→</span>
            <div className="compatPerson">
              <span className="compatEmoji">{ELEMENT_EMOJI[result.partnerElement]}</span>
              <span className="compatLabel">{t("partner")}</span>
              <span className="compatElement">{t(`elements.${result.partnerElement}`)}</span>
            </div>
          </div>

          <div className="compatScore">{t("score", { score: String(result.score) })}</div>
          <p className="compatRelation">{result.relationship}</p>
          <p className="compatDesc">{result.description}</p>

          <div className="buttonRow" style={{ justifyContent: "center", marginTop: 24 }}>
            <button className="btn btn-primary btn-lg" onClick={handleShare}>
              {t("shareButton")}
            </button>
            <Link href="/#hero" className="btn btn-ghost btn-lg">
              {t("detailButton")}
            </Link>
          </div>
        </section>

        {/* Compatibility paywall upsell CTA */}
        <section className="glassCard" style={{ marginTop: 24, textAlign: "center" }}>
          <h3 style={{ marginBottom: 8 }}>{tPaywall("ctaTitle")}</h3>
          <p className="muted" style={{ marginBottom: 20 }}>{tPaywall("ctaDesc")}</p>
          <Link
            href={`/compatibility/paywall?my=${myDateParam}&partner=${partnerDateParam}`}
            className="btn btn-primary btn-lg btn-full"
            onClick={() => track("compat_paywall_cta_click")}
          >
            {tPaywall("ctaButton", { price: compatPriceLabel })}
          </Link>
        </section>
      </div>
    </div>
  );
}

export default function CompatibilityPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CompatContent />
    </Suspense>
  );
}
