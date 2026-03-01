"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { GetReportResponse } from "../../../lib/types";
import { webApi } from "../../../lib/api";
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
        setError(e instanceof Error ? e.message : "리포트 조회 실패");
      }
    })();
  }, [orderId]);

  const report = data?.report;
  const sections = useMemo(() =>
    (report?.sections ?? []).filter(s => s.text && !s.text.includes("(생성 실패)") && s.text.trim().length > 10),
    [report]
  );

  return (
    <PageContainer>
      <GlassCard>
        <h1>{data?.input?.name ? `${data.input.name}님의 사주 분석` : "사주 분석 리포트"}</h1>

        <div className="buttonRow">
          <ButtonLink href="/" variant="ghost">메인으로</ButtonLink>
        </div>

        {error ? <StatusBox title="오류" description={error} tone="error" /> : null}

        {!data ? (
          <p className="muted">로딩중...</p>
        ) : !report ? (
          <p className="muted">리포트가 아직 생성되지 않았습니다.</p>
        ) : (
          <div className="reportLayout">
            <aside className="reportToc">
              <div className="tocCard">
                <h3>목차</h3>
                <nav aria-label="리포트 목차">
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

              <nav className="reportJumpNav" aria-label="리포트 빠른 이동">
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
                  <h3>실행 체크리스트</h3>
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
