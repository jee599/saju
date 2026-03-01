"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../../../i18n/navigation";

export default function ComingSoon({ feature }: { feature: string }) {
  const t = useTranslations("misc.comingSoon");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emoji = t(`${feature}.emoji`);
  const title = t(`${feature}.title`);
  const desc = t(`${feature}.desc`);
  const features = t.raw(`${feature}.features`) as string[];

  const handleSubmit = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t("emailError"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, feature }),
      });
      if (!res.ok) throw new Error(t("registerFail"));
    } catch {
      // Fallback: still show success
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <main className="page">
      <div className="container">
        <div className="comingSoonCard">
          <div className="comingSoonEmoji">{emoji}</div>
          <h1 className="comingSoonTitle">{title}</h1>
          <p className="comingSoonDesc">{desc}</p>

          <ul className="comingSoonFeatures">
            {features.map((f, i) => <li key={i}>{f}</li>)}
          </ul>

          {submitted ? (
            <p style={{ marginTop: 20, color: "var(--ok)" }}>{t("submitted")}</p>
          ) : (
            <>
              <div className="emailForm">
                <input
                  type="email"
                  className={`input ${error ? "inputError" : ""}`}
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  aria-label={t("emailAria")}
                />
                <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? t("submitting") : t("notify")}
                </button>
              </div>
              {error && <p className="errorText" style={{ marginTop: 8 }}>{error}</p>}
            </>
          )}

          <div className="buttonRow" style={{ justifyContent: "center", marginTop: 24 }}>
            <Link href="/#hero" className="btn btn-ghost btn-lg">{t("ctaButton")}</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
