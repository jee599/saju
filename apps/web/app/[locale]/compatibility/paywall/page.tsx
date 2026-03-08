"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "../../../../i18n/navigation";
import { Suspense, useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "../../../../i18n/navigation";
import { track, trackFunnel, trackError as trackAnalyticsError, createPageTimer, trackPageEvent } from "../../../../lib/analytics";
import { getCountryByLocale } from "@saju/shared";
import { PageSkeleton } from "../../components/Skeleton";

function CompatPaywallContent() {
  const t = useTranslations("compatPaywall");
  const locale = useLocale();
  const params = useSearchParams();
  const router = useRouter();
  const myDate = params.get("my") ?? "";
  const partnerDate = params.get("partner") ?? "";
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const checkoutInFlight = useRef(false);
  const pageTimerRef = useRef<ReturnType<typeof createPageTimer> | null>(null);

  const country = getCountryByLocale(locale);
  const compatPricing = country.pricing.compatibility;
  const zeroDecimalCurrencies = ["KRW", "JPY", "VND", "IDR"];
  const priceLabel = compatPricing
    ? `${country.currencySymbol}${zeroDecimalCurrencies.includes(country.currency) ? compatPricing.premium.toLocaleString() : (compatPricing.premium / 100).toFixed(2)}`
    : country.priceLabel;

  useEffect(() => {
    track("compat_paywall_view");
    trackPageEvent("/compatibility/paywall");
    trackFunnel("compat_paywall_view");
    pageTimerRef.current = createPageTimer("compat_paywall");
    return () => { pageTimerRef.current?.stop(); };
  }, []);

  const handleCheckout = async (ctaPosition: "top" | "sticky" = "top") => {
    if (checkoutInFlight.current) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError(t("emailError"));
      return;
    }
    checkoutInFlight.current = true;
    setLoading(true);
    setError("");
    trackFunnel("compat_checkout_attempt", { ctaPosition });

    try {
      const provider = country.paymentProvider;
      // Reuse existing checkout APIs with productCode "compat"
      // The input uses the two birth dates
      const input = {
        name: "compatibility",
        birthDate: myDate,
        birthTime: "",
        gender: "other",
        calendarType: "solar",
        partnerDate,
      };

      if (provider === "paddle") {
        const res = await fetch("/api/checkout/paddle/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productCode: "compat",
            input,
            email: email || undefined,
            locale,
          }),
        });

        if (!res.ok) throw new Error(t("createFail"));
        const data = await res.json();
        const checkoutUrl = data.data?.checkoutUrl;
        if (!checkoutUrl) throw new Error(t("noCheckoutUrl"));

        const price = compatPricing?.premium ?? country.pricing.saju.premium;
        track("checkout_start", { value: price, currency: country.currency, product: "compatibility" });
        window.location.href = checkoutUrl;
        return;
      }

      // Toss flow (Korean locale)
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: "compat",
          input,
          email: email || undefined,
          locale,
        }),
      });

      if (!res.ok) throw new Error(t("createFail"));
      const data = await res.json();
      const orderId = data.data?.order?.orderId ?? data.order?.orderId;
      if (!orderId) throw new Error(t("noOrderId"));

      const price = compatPricing?.premium ?? country.pricing.saju.premium;
      track("checkout_start", { value: price, currency: country.currency, product: "compatibility" });
      router.push(`/loading-analysis?orderId=${orderId}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : t("checkoutError");
      setError(errMsg);
      track("compat_checkout_fail");
      trackAnalyticsError("compat_checkout_error", errMsg);
    } finally {
      setLoading(false);
      checkoutInFlight.current = false;
    }
  };

  return (
    <div className="page">
      <div className="container paywallContainerPadded">
        {/* Price anchoring */}
        <div className="paywallPriceAnchor">
          <p className="paywallPriceAnchorText">
            <span className="paywallPriceStrike">{t("priceAnchor")}</span>
            <br />
            <span className="paywallPriceHighlight">{t("priceAnchorTo", { price: priceLabel })}</span>
          </p>
        </div>

        <section className="glassCard">
          <h2 className="paywallHeading">{t("heading")}</h2>
          <p className="muted paywallSubheading">
            {t("subheading")}
          </p>

          <div className="paywallSectionsList">
            <ul className="flatList compactList">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <li key={i}>{t(`sections.${i}`)}</li>
              ))}
            </ul>
          </div>

          {/* Trust badges */}
          <div className="paywallTrustBadges">
            <span className="paywallTrustItem">
              <svg className="paywallTrustIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {t("trustSecure")}
            </span>
            <span className="paywallTrustItem">
              <svg className="paywallTrustIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              {t("trustRefund")}
            </span>
            <span className="paywallTrustItem">
              <svg className="paywallTrustIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
              </svg>
              {t("trustEmail")}
            </span>
          </div>

          {/* Social proof */}
          <div className="paywallSocialProof">
            <span className="paywallStars">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span className="paywallRating">4.8</span>
            <span className="paywallDot">&middot;</span>
            <span className="paywallProofText">
              {t("socialProof", { count: t("socialProofCount") })}
            </span>
          </div>

          {/* Email + checkout */}
          <div className="form paywallForm">
            <div className="formGroup">
              <label htmlFor="compat-paywall-email">{t("emailLabel")}</label>
              <input
                id="compat-paywall-email"
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
                aria-describedby={error ? "compat-paywall-email-error" : undefined}
              />
              {error && <p id="compat-paywall-email-error" className="errorText" role="alert">{error}</p>}
            </div>
            <div className="buttonRow">
              <button
                className="btn btn-cta-gold btn-lg btn-full"
                onClick={() => handleCheckout("top")}
                disabled={loading}
              >
                {loading ? t("checkoutLoading") : t("checkoutBtn", { price: priceLabel })}
              </button>
            </div>
          </div>

          <p className="muted paywallAfterPurchase">
            {t("afterPurchase")}
            <br />{t("refundLink", { link: "" })}<Link href="/refund" className="paywallRefundLink">{t("refundLinkText")}</Link>
          </p>
        </section>
      </div>

      {/* Sticky bottom CTA */}
      <div className="stickyCta paywallStickyCta">
        <div className="stickyCtaInner">
          <button
            className="btn btn-cta-gold btn-lg btn-full"
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

export default function CompatPaywallPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CompatPaywallContent />
    </Suspense>
  );
}
