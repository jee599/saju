"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../../../i18n/navigation";
import { calculateFourPillars, calculateCompatibility, ELEMENT_KR, ELEMENT_EMOJI } from "@saju/engine-saju";
import { track } from "../../../lib/analytics";

function CompatContent() {
  const t = useTranslations("compat");
  const params = useSearchParams();
  const router = useRouter();
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
    ? `${window.location.origin}/?tab=compat`
    : "";

  const handleShare = () => {
    if (!result) return;
    const text = t("shareText", { score: String(result.score), url: shareUrl });
    if (navigator.share) {
      navigator.share({ title: t("shareTitle"), text });
    } else {
      navigator.clipboard.writeText(text);
    }
    track("share_click", { channel: "copy", content_type: "compatibility" });
  };

  const handleCompatSubmit = () => {
    if (!myInput || !partnerInput) return;
    router.push(`/compatibility?my=${myInput}&partner=${partnerInput}`);
  };

  if (!hasParams || !result) {
    return (
      <main className="page">
        <div className="container">
          <section className="glassCard">
            <h2 style={{ textAlign: "center" }}>{t("title")}</h2>
            <p className="muted" style={{ textAlign: "center", marginTop: 8 }}>
              {t("desc")}
            </p>
            <div className="form" style={{ marginTop: 24 }}>
              <div className="formGroup">
                <label>{t("myBirthDate")}</label>
                <input
                  type="date"
                  className="input"
                  value={myInput}
                  onChange={(e) => setMyInput(e.target.value)}
                  aria-label={t("myBirthDateAria")}
                />
              </div>
              <div className="formGroup">
                <label>{t("partnerBirthDate")}</label>
                <input
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
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <section className="glassCard compatResult">
          <h2>{ELEMENT_EMOJI[result.myElement]} {ELEMENT_KR[result.myElement]} × {ELEMENT_EMOJI[result.partnerElement]} {ELEMENT_KR[result.partnerElement]}</h2>

          <div className="compatElements">
            <div className="compatPerson">
              <span className="compatEmoji">{ELEMENT_EMOJI[result.myElement]}</span>
              <span className="compatLabel">{t("me")}</span>
              <span className="compatElement">{ELEMENT_KR[result.myElement]}</span>
            </div>
            <span className="compatConnector">←→</span>
            <div className="compatPerson">
              <span className="compatEmoji">{ELEMENT_EMOJI[result.partnerElement]}</span>
              <span className="compatLabel">{t("partner")}</span>
              <span className="compatElement">{ELEMENT_KR[result.partnerElement]}</span>
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
      </div>
    </main>
  );
}

export default function CompatibilityPage() {
  const t = useTranslations("compat");
  return (
    <Suspense fallback={<div className="loadingScreen"><p className="muted">{t("loading")}</p></div>}>
      <CompatContent />
    </Suspense>
  );
}
