"use client";

import { Link } from "../../../../i18n/navigation";
import { track } from "../../../../lib/analytics";
import { useEffect } from "react";

interface ShareLandingProps {
  element: string;
  name: string;
  emoji: string;
  locale: string;
  heading: string;
  sub: string;
  cta: string;
}

const ELEMENT_HANJA: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};

export default function ShareLanding({ element, name, emoji, locale, heading, sub, cta }: ShareLandingProps) {
  useEffect(() => {
    track("share_land", { element, locale, referrer: document.referrer });
  }, [element, locale]);

  return (
    <div className="page">
      <div className="container" style={{ textAlign: "center", paddingTop: 60, paddingBottom: 60 }}>
        <section className={`glassCard dayMasterCard ${element}`} style={{ maxWidth: 480, margin: "0 auto" }}>
          <div className="dayMasterWatermark">{ELEMENT_HANJA[element] ?? "木"}</div>
          <div className="dayMasterEmoji">{emoji}</div>
          <h1 className="dayMasterTitle" style={{ color: `var(--element-${element})`, fontSize: "1.5rem" }}>
            {heading}
          </h1>
          <p className="dayMasterSub" style={{ marginTop: 8 }}>
            {sub}
          </p>
          <div style={{ marginTop: 24 }}>
            <Link
              href="/?ref=share"
              className="btn btn-primary btn-lg"
              onClick={() => track("share_convert", { element, locale })}
            >
              {cta}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
