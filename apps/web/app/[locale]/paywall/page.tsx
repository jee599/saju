"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { track, trackCheckoutStart } from "../../../lib/analytics";
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

  const country = getCountryByLocale(locale);
  const priceLabel = country.priceLabel;

  useEffect(() => {
    track("paywall_view");
  }, []);

  const handleCheckout = async (ctaPosition: "top" | "middle" | "sticky") => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError(t("emailError"));
      return;
    }
    setLoading(true);
    setError("");
    trackCheckoutStart(ctaPosition);

    try {
      const input = { name, birthDate, birthTime, gender, calendarType };

      if (country.paymentProvider === "stripe") {
        // Stripe: Create checkout session → redirect to Stripe hosted page
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
        if (!checkoutUrl) throw new Error(t("noOrderId"));

        track("purchase_complete", { value: country.pricing.saju.premium, currency: country.currency });
        window.location.href = checkoutUrl;
      } else {
        // Toss / Razorpay / test mode: Create order → redirect to loading
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

        track("purchase_complete", { value: country.pricing.saju.premium, currency: country.currency });
        router.push(`/loading-analysis?orderId=${orderId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("checkoutError"));
      track("checkout_fail");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
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

          <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--t2)", marginTop: 12 }}>
            {t("socialProof")}
          </p>

          {/* Email + checkout */}
          <div className="form" style={{ maxWidth: 400, margin: "20px auto 0" }}>
            <div className="formGroup">
              <label>{t("emailLabel")}</label>
              <input
                type="email"
                className={`input ${error ? "inputError" : ""}`}
                placeholder="email@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
              />
              {error && <p className="errorText">{error}</p>}
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
            <br />{t("refundLink", { link: "" })}<a href="/refund" style={{ color: "var(--accent)" }}>{t("refundLinkText")}</a>
          </p>
        </section>
      </div>
    </main>
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
