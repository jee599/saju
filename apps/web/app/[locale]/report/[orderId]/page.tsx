"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { GetReportResponse } from "../../../../lib/types";
import { webApi } from "../../../../lib/api";
import { ButtonLink, GlassCard, PageContainer, StatusBox } from "../../components/ui";

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/g)
    .map((p) => p.replace(/\s+\n/g, "\n").trim())
    .filter(Boolean);
}

function highlightFirstSentence(paragraph: string): { lead?: string; rest?: string } {
  const idx = paragraph.search(/[.!?]\s/);
  if (idx === -1) return { lead: paragraph };
  const cut = idx + 1;
  return {
    lead: paragraph.slice(0, cut).trim(),
    rest: paragraph.slice(cut).trim()
  };
}

function SectionText({ text }: { text: string }) {
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 0) return null;
  return (
    <div className="reportText">
      {paragraphs.map((p, i) => {
        if (i === 0) {
          const { lead, rest } = highlightFirstSentence(p);
          return (
            <p key={i} className="reportParagraph">
              {lead ? <mark className="reportMark">{lead}</mark> : null}{rest ? ` ${rest}` : null}
            </p>
          );
        }
        return <p key={i} className="reportParagraph">{p}</p>;
      })}
    </div>
  );
}

export default function ReportPage() {
  const t = useTranslations("report");
  const { orderId } = useParams<{ orderId: string }>();
  const [data, setData] = useState<GetReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!orderId) return;
        const res = await webApi.report(orderId);
        setData(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("fetchFail"));
      }
    })();
  }, [orderId, t]);

  const report = data?.report;
  const sections = useMemo(() =>
    (report?.sections ?? []).filter(s => s.text && !s.text.includes("(생성 실패)") && s.text.trim().length > 10),
    [report]
  );

  return (
    <PageContainer>
      <GlassCard>
        <h1>{data?.input?.name ? t("titleWithName", { name: data.input.name }) : t("titleDefault")}</h1>

        <div className="buttonRow">
          <ButtonLink href="/" variant="ghost">{t("backHome")}</ButtonLink>
        </div>

        {error ? <StatusBox title={t("error")} description={error} tone="error" /> : null}

        {!data ? (
          <p className="muted">{t("loading")}</p>
        ) : !report ? (
          <p className="muted">{t("notReady")}</p>
        ) : (
          <div className="reportLayout">
            <aside className="reportToc">
              <div className="tocCard">
                <h3>{t("toc")}</h3>
                <nav aria-label={t("tocAria")}>
                  {sections.map((section) => (
                    <a key={section.key} href={`#${section.key}`}>{section.title}</a>
                  ))}
                </nav>
              </div>
            </aside>

            <section className="reportBody">
              <article className="reportHead">
                <h2>{report.headline}</h2>
                <p className="muted">{report.summary}</p>
              </article>

              <nav className="reportJumpNav" aria-label={t("jumpNavAria")}>
                {sections.map((section) => (
                  <a key={section.key} href={`#${section.key}`}>{section.title}</a>
                ))}
              </nav>

              {sections.map((section) => (
                <article key={section.key} id={section.key} className="reportSection">
                  <h3>{section.title}</h3>
                  <SectionText text={section.text} />
                </article>
              ))}

              {report.recommendations?.length > 0 && (
                <article className="reportSection">
                  <h3>{t("checklist")}</h3>
                  <ul className="flatList compactList">
                    {report.recommendations.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>
              )}

              <p className="muted reportDisclaimer">{report.disclaimer}</p>
            </section>
          </div>
        )}
      </GlassCard>
    </PageContainer>
  );
}
