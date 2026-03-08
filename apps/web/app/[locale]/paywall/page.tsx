"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "../../../i18n/navigation";
import { Suspense, useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "../../../i18n/navigation";
import { track, trackCheckoutStart, trackFunnel, trackError as trackAnalyticsError, createPageTimer, trackPageEvent, trackLanding } from "../../../lib/analytics";
import { getCountryByLocale } from "@saju/shared";

function PaywallContent() {
  const t = useTranslations("paywall");
  const locale = useLocale();
  const params = useSearchParams();
  const router = useRouter();
  const birthDate = params.get("birthDate") ?? "";
  const birthTime = params.get("birthTime") ?? "";
  const name = params.get("name") ?? "";
  const gender = params.get("gender") ?? "other";
  const calendarType = params.get("calendarType") ?? "solar";
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const checkoutInFlight = useRef(false);
  const pageTimerRef = useRef<ReturnType<typeof createPageTimer> | null>(null);

  const country = getCountryByLocale(locale);
  const priceLabel = country.priceLabel;

  useEffect(() => {
    trackLanding();
    track("paywall_view");
    trackPageEvent("/paywall");
    trackFunnel("paywall_view");
    pageTimerRef.current = createPageTimer("paywall");
    return () => { pageTimerRef.current?.stop(); };
  }, []);

  const handleCheckout = async (ctaPosition: "top" | "middle" | "sticky" = "top") => {
    if (checkoutInFlight.current) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError(t("emailError"));
      return;
    }
    checkoutInFlight.current = true;
    setLoading(true);
    setError("");
    trackCheckoutStart(ctaPosition);
    trackFunnel("checkout_attempt", { ctaPosition });

    try {
      const input = { name, birthDate, birthTime, gender, calendarType };
      const provider = country.paymentProvider;

      if (provider === "paddle") {
        // Paddle hosted checkout flow (all non-KR countries)
        const res = await fetch("/api/checkout/paddle/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productCode: "full",
            input,
            email: email || undefined,
            locale,
          }),
        });

        if (!res.ok) throw new Error(t("createFail"));
        const data = await res.json();
        const checkoutUrl = data.data?.checkoutUrl;
        if (!checkoutUrl) throw new Error(t("noCheckoutUrl"));

        track("checkout_start", { value: country.pricing.saju.premium, currency: country.currency });
        window.location.href = checkoutUrl;
        return;
      }

      // Toss flow (Korean locale)
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: "full",
          input,
          email: email || undefined,
          locale,
        }),
      });

      if (!res.ok) throw new Error(t("createFail"));
      const data = await res.json();
      const orderId = data.data?.order?.orderId ?? data.order?.orderId;
      if (!orderId) throw new Error(t("noOrderId"));

      track("checkout_start", { value: country.pricing.saju.premium, currency: country.currency });
      router.push(`/loading-analysis?orderId=${orderId}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : t("checkoutError");
      setError(errMsg);
      track("checkout_fail");
      trackAnalyticsError("checkout_error", errMsg);
    } finally {
      setLoading(false);
      checkoutInFlight.current = false;
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ paddingBottom: 100 }}>
        {/* Price anchoring — enhanced */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <p style={{ fontSize: "1.1rem", color: "var(--t2)", lineHeight: 1.6 }}>
            <span style={{ textDecoration: "line-through", opacity: 0.5, fontSize: "1.05rem" }}>{t("priceAnchor")}</span>
            <br />
            <span style={{ color: "var(--accent-gold)", fontWeight: 700, fontSize: "1.2rem" }}>{t("priceAnchorTo", { price: priceLabel })}</span>
            <span style={{
              display: "inline-block", marginLeft: 8, padding: "2px 8px",
              fontSize: "0.72rem", fontWeight: 700, borderRadius: 6,
              background: "rgba(251, 191, 36, 0.15)", color: "var(--accent-gold)",
              border: "1px solid rgba(251, 191, 36, 0.3)",
            }}>-90%</span>
          </p>
        </div>

        <section className="glassCard">
          <h2 style={{ textAlign: "center", fontSize: "1.2rem" }}>{t("heading", { name })}</h2>
          <p className="muted" style={{ textAlign: "center", marginTop: 4 }}>
            {t("subheading")}
          </p>

          <div style={{ marginTop: 20, textAlign: "left" }}>
            <ul className="flatList compactList">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <li key={i}>{t(`sections.${i}`)}</li>
              ))}
            </ul>
          </div>

          {/* Trust badges with icons */}
          <div style={{
            display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14,
            marginTop: 20, padding: "14px 0",
            borderTop: "1px solid var(--glass-border)", borderBottom: "1px solid var(--glass-border)",
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "var(--t2)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {t("trustSecure")}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "var(--t2)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              {t("trustRefund")}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "var(--t2)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
              </svg>
              {t("trustEmail")}
            </span>
          </div>

          {/* Social proof with star rating */}
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <span style={{ color: "#fbbf24", fontSize: "0.9rem", letterSpacing: "1px" }}>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span style={{ fontSize: "0.82rem", color: "var(--t2)", marginLeft: 6, fontWeight: 600 }}>4.8</span>
            <span style={{ fontSize: "0.78rem", color: "var(--t3)", margin: "0 6px" }}>&middot;</span>
            <span style={{ fontSize: "0.82rem", color: "var(--accent-gold)", fontWeight: 500 }}>
              {t("socialProof", { count: t("socialProofCount") })}
            </span>
          </div>

          {/* Email + checkout */}
          <div className="form" style={{ maxWidth: "min(400px, 100%)", margin: "20px auto 0" }}>
            <div className="formGroup">
              <label htmlFor="paywall-email">{t("emailLabel")}</label>
              <input
                id="paywall-email"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                className={`input ${error ? "inputError" : ""}`}
                placeholder="email@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                aria-label={t("emailLabel")}
                aria-invalid={!!error}
                aria-describedby={error ? "paywall-email-error" : undefined}
              />
              {error && <p id="paywall-email-error" className="errorText" role="alert">{error}</p>}
            </div>
            <div className="buttonRow">
              <button
                className="btn btn-primary btn-lg btn-full"
                onClick={() => handleCheckout("top")}
                disabled={loading}
              >
                {loading ? t("checkoutLoading") : t("checkoutBtn", { price: priceLabel })}
              </button>
            </div>
          </div>

          <p className="muted" style={{ marginTop: 16, fontSize: "0.8rem", textAlign: "center" }}>
            {t("afterPurchase")}
            <br />{t("refundLink", { link: "" })}<Link href="/refund" style={{ color: "var(--accent)" }}>{t("refundLinkText")}</Link>
          </p>
        </section>
      </div>

      {/* Sticky bottom CTA */}
      <div className="stickyCta paywallStickyCta">
        <div className="stickyCtaInner">
          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={() => handleCheckout("sticky")}
            disabled={loading}
          >
            {loading ? t("checkoutLoading") : t("checkoutBtn", { price: priceLabel })}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaywallPage() {
  const t = useTranslations("paywall");
  return (
    <Suspense fallback={<div className="loadingScreen"><p className="muted">{t("loading")}</p></div>}>
      <PaywallContent />
    </Suspense>
  );
}
