"use client";

import Link from "next/link";


import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError(t("emailError"));
      return;
    }
    setLoading(true);
    setError("");
    trackCheckoutStart(ctaPosition);
    trackFunnel("checkout_attempt", { ctaPosition });

    try {
      const input = { name, birthDate, birthTime, gender, calendarType };
      const provider = country.paymentProvider;

      // NEXT_PUBLIC_PAYMENT_PROVIDER=paddle overrides the per-country provider at runtime.
      // Stripe/Razorpay countries continue to use Stripe unless the flag is set.
      const globalProvider = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER;
      const effectiveProvider =
        globalProvider === "paddle" ? (country.code === 'kr' ? provider : "paddle")
        : globalProvider === "stripe" ? "stripe"
        : provider;

      if (effectiveProvider === "paddle") {
        // Paddle hosted checkout flow
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
        // External redirect to Paddle hosted checkout (cross-origin URL)
        window.location.href = checkoutUrl;
        return; // Keep button in loading state to prevent double-clicks during redirect
      }

      if (effectiveProvider === "stripe" || effectiveProvider === "razorpay") {
        // Stripe flow (razorpay routes through Stripe temporarily)
        const res = await fetch("/api/checkout/stripe/create", {
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
        // External redirect to Stripe hosted checkout (not router.push — cross-origin URL)
        window.location.href = checkoutUrl;
        return; // Keep button in loading state to prevent double-clicks during redirect
      }

      // Toss flow (Korean locale) — existing behavior
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
      router.push(`/${locale}/loading-analysis?orderId=${orderId}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : t("checkoutError");
      setError(errMsg);
      track("checkout_fail");
      trackAnalyticsError("checkout_error", errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        {/* Price anchoring */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <p style={{ fontSize: "0.85rem", color: "var(--t2)" }}>
            <span style={{ textDecoration: "line-through", opacity: 0.6 }}>{t("priceAnchor")}</span>
            {" → "}
            <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>{t("priceAnchorTo", { price: priceLabel })}</span>
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

          {/* Trust badges */}
          <div style={{
            display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12,
            marginTop: 20, padding: "12px 0",
            borderTop: "1px solid var(--glass-border)", borderBottom: "1px solid var(--glass-border)",
          }}>
            <span style={{ fontSize: "0.78rem", color: "var(--t2)" }}>{t("trustSecure")}</span>
            <span style={{ fontSize: "0.78rem", color: "var(--t2)" }}>{t("trustRefund")}</span>
            <span style={{ fontSize: "0.78rem", color: "var(--t2)" }}>{t("trustEmail")}</span>
          </div>

          <p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--accent-gold)", marginTop: 12, fontWeight: 500 }}>
            {t("socialProof")}
          </p>

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
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
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
            <br />{t("refundLink", { link: "" })}<Link href={`/${locale}/refund`} style={{ color: "var(--accent)" }}>{t("refundLinkText")}</Link>
          </p>
        </section>
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
