"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReportPreview } from "../../../lib/types";
import { ApiClientError, webApi } from "../../../lib/api";
import { trackPreviewView, trackCtaClick, trackError } from "../../../lib/analytics";
import { toInputFromParams, toInputQuery } from "../../../lib/fortune";
import { ButtonLink, GlassCard, LengthDebugBar, PageContainer, StatusBox } from "../components/ui";

function ResultInner() {
  const t = useTranslations("result");
  const params = useSearchParams();
  const input = useMemo(() => toInputFromParams(new URLSearchParams(params.toString())), [params]);
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    (async () => {
      if (!input) return setError("Missing input");
      setError(null);
      setErrorCode(null);
      try {
        const result = await webApi.reportPreview(input);
        setPreview(result);
        trackPreviewView();
      } catch (e) {
        if (e instanceof ApiClientError) {
          setError(e.message);
          setErrorCode(e.code);
          trackError(e.code);
        } else {
          setError(e instanceof Error ? e.message : t("errorTitle"));
          trackError("UNKNOWN");
        }
      }
    })();
  }, [input, retryCount, t]);

  const paywallHref = input ? `/paywall?${toInputQuery(input)}` : "/free-fortune";

  return (
    <PageContainer>
      <GlassCard>
        <h1>{t("loading").replace("…", "")}</h1>

        {error ? (
          <div>
            <StatusBox title={t("errorTitle")} description={error} tone="error" />
            {errorCode !== "RATE_LIMIT_EXCEEDED" && (
              <div className="buttonRow" style={{ marginTop: 12 }}>
                <button className="btn btn-primary" onClick={() => setRetryCount((c) => c + 1)}>
                  {t("retry")}
                </button>
                <ButtonLink href="/" variant="ghost">{t("backHome")}</ButtonLink>
              </div>
            )}
            {errorCode === "RATE_LIMIT_EXCEEDED" && (
              <div className="buttonRow" style={{ marginTop: 12 }}>
                <ButtonLink href="/" variant="ghost">{t("backHome")}</ButtonLink>
              </div>
            )}
          </div>
        ) : null}

        {!preview && !error ? (
          <p className="muted">{t("loading")}</p>
        ) : preview ? (
          <>
            {/* CTA #1: top banner */}
            <div className="ctaBanner">
              <span>{t("ctaBanner")} — {preview.cta.priceLabel}</span>
              <ButtonLink href={paywallHref} variant="primary" size="sm" onClick={() => trackCtaClick("top_banner")}>
                {t("ctaSticky")}
              </ButtonLink>
            </div>

            <h2>{preview.free.headline}</h2>
            <p className="muted mt-sm">{preview.free.summary}</p>

            {preview.debugLengths && <LengthDebugBar values={[{ label: "Free", info: preview.debugLengths.free }, { label: "Paid", info: preview.debugLengths.paid }]} />}

            <div className="sectionStack mt-md">
              {preview.free.sections.map((section) => (
                <article key={section.key} className="sectionBlock">
                  <h3>{section.title}</h3>
                  <p>{section.text}</p>
                </article>
              ))}
            </div>

            {/* Retention notice */}
            {preview.retention && !preview.retention.isPermanent && (
              <p className="retentionNotice">
                {t("retentionNotice", { days: preview.retention.daysRemaining ?? 0 })}
              </p>
            )}

            {/* CTA #2: locked paid section preview */}
            <div className="ctaPanel">
              <h3>{t("ctaLocked")}</h3>
              <div className="lockedPreview">
                {preview.paid.sections.slice(0, 3).map((section) => (
                  <div key={section.key} className="lockedItem">
                    <span className="lockedIcon">&#128274;</span>
                    <span>{section.title}</span>
                  </div>
                ))}
              </div>
              <div className="buttonRow">
                <ButtonLink href={paywallHref} variant="primary" onClick={() => trackCtaClick("locked_preview")}>
                  {preview.cta.priceLabel} — {t("ctaSticky")}
                </ButtonLink>
              </div>
            </div>
          </>
        ) : null}
      </GlassCard>

      {/* CTA #3: mobile sticky bar */}
      {preview && (
        <div className="stickyCta">
          <span className="stickyLabel">{preview.cta.priceLabel}</span>
          <ButtonLink href={paywallHref} variant="primary" size="sm" onClick={() => trackCtaClick("sticky_bar")}>{t("ctaSticky")}</ButtonLink>
        </div>
      )}
    </PageContainer>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<PageContainer><GlassCard><p>Loading...</p></GlassCard></PageContainer>}>
      <ResultInner />
    </Suspense>
  );
}
