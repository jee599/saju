"use client";

import { Suspense, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { track } from "../../../lib/analytics";
import { PageSkeleton } from "../components/Skeleton";

interface RetrievedOrder {
  orderId: string;
  productCode: string;
  createdAt: string;
  viewUrl: string;
}

function RetrieveContent() {
  const t = useTranslations("retrieve");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RetrievedOrder[] | null>(null);

  const handleSubmit = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError(t("emailError"));
      return;
    }
    setError("");
    setLoading(true);
    setResults(null);
    track("retrieve_search");

    try {
      const res = await fetch("/api/report/retrieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        setError(t("rateLimited"));
        return;
      }

      if (!res.ok) {
        setError(t("error"));
        return;
      }

      const data = await res.json();
      if (!data.ok || !data.data?.orders?.length) {
        setResults([]);
        return;
      }

      setResults(data.data.orders);
      track("retrieve_found", { count: data.data.orders.length });
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const getProductLabel = (code: string) => {
    if (code === "compat" || code === "compatibility") return t("productCompat");
    return t("productSaju");
  };

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
              <label htmlFor="retrieve-email">{t("emailLabel")}</label>
              <input
                id="retrieve-email"
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
                aria-describedby={error ? "retrieve-email-error" : undefined}
              />
              {error && <p id="retrieve-email-error" className="errorText" role="alert">{error}</p>}
            </div>
            <div className="buttonRow">
              <button
                className="btn btn-primary btn-lg btn-full"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? t("loading") : t("submitBtn")}
              </button>
            </div>
          </div>
        </section>

        {/* Results */}
        {results !== null && results.length === 0 && (
          <section className="glassCard" style={{ marginTop: 16, textAlign: "center" }}>
            <p className="muted">{t("noResults")}</p>
          </section>
        )}

        {results !== null && results.length > 0 && (
          <section className="glassCard" style={{ marginTop: 16 }}>
            <h3 style={{ marginBottom: 16 }}>{t("resultTitle")}</h3>
            <ul className="flatList" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {results.map((order) => (
                <li key={order.orderId} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid var(--t2, rgba(255,255,255,0.08))",
                }}>
                  <div>
                    <strong>{getProductLabel(order.productCode)}</strong>
                    <br />
                    <span className="muted" style={{ fontSize: "0.85em" }}>
                      {t("orderDate")}: {new Date(order.createdAt).toLocaleDateString(locale)}
                    </span>
                  </div>
                  <a
                    href={order.viewUrl}
                    className="btn btn-primary"
                    onClick={() => track("retrieve_view_report")}
                  >
                    {t("viewReport")}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

export default function RetrievePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RetrieveContent />
    </Suspense>
  );
}
