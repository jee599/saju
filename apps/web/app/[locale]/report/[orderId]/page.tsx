"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { GetReportResponse } from "../../../../lib/types";
import { webApi } from "../../../../lib/api";
import { ButtonLink, GlassCard, LengthDebugBar, PageContainer, StatusBox } from "../../components/ui";

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/g)
    .map((p) => p.replace(/\s+\n/g, "\n").trim())
    .filter(Boolean);
}

function highlightFirstSentence(paragraph: string): { lead?: string; rest?: string } {
  // Heuristic: split on the first period-like delimiter.
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
        // Highlight only the first paragraph’s first sentence.
        if (i === 0) {
          const { lead, rest } = highlightFirstSentence(p);
          return (
            <p key={i} className="reportParagraph">
              {lead ? <mark className="reportMark">{lead}</mark> : null}{rest ? ` ${rest}` : null}
            </p>
          );
        }
        return (
          <p key={i} className="reportParagraph">
            {p}
          </p>
        );
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
        setData(await webApi.report(orderId));
      } catch (e) {
        setError(e instanceof Error ? e.message : "리포트 조회 실패");
      }
    })();
  }, [orderId]);

  const [model, setModel] = useState<"preferred" | "gpt" | "claude">("preferred");

  const report = useMemo(() => {
    if (!data) return null;
    if (!data.reportsByModel) return data.report;
    if (model === "gpt") return data.reportsByModel.gpt;
    if (model === "claude") return data.reportsByModel.claude;
    return data.report;
  }, [data, model]);

  const toc = useMemo(() => report?.sections ?? [], [report]);

  return (
    <PageContainer>
      <GlassCard>
        <p className="heroEyebrow">전체 리포트</p>
        <h1>주문 리포트 상세</h1>
        <p className="lead">전문 명리 해설체와 확률 표현 원칙으로 작성된 전체 결과입니다.</p>

        <div className="buttonRow">
          <ButtonLink href="/free-fortune" variant="ghost">새로 생성</ButtonLink>
        </div>

        {error ? <StatusBox title="오류" description={error} tone="error" /> : null}

        {!data || !report ? (
          <p className="muted">리포트 로딩중...</p>
        ) : (
          <div className="reportLayout">
            <aside className="reportToc">
              <div className="tocCard">
                <h3>목차</h3>
                {data.reportsByModel ? (
                  <div className="buttonRow mt-xs" role="group" aria-label="모델 선택">
                    <button className="button ghost" onClick={() => setModel("preferred")} aria-pressed={model === "preferred"}>
                      추천본
                    </button>
                    <button className="button ghost" onClick={() => setModel("gpt")} aria-pressed={model === "gpt"}>
                      GPT
                    </button>
                    <button className="button ghost" onClick={() => setModel("claude")} aria-pressed={model === "claude"}>
                      Claude
                    </button>
                  </div>
                ) : null}
                <nav aria-label="리포트 목차">
                  {toc.map((section) => (
                    <a key={section.key} href={`#${section.key}`}>{section.title}</a>
                  ))}
                </nav>
                {report.debugLength && <LengthDebugBar values={[{ label: "유료", info: report.debugLength }]} />}
              </div>
            </aside>

            <section className="reportBody">
              <article className="reportHead">
                <h2>{report.headline}</h2>
                <p className="muted">{report.summary}</p>
              </article>

              <nav className="reportJumpNav" aria-label="리포트 빠른 이동">
                {toc.map((section) => (
                  <a key={section.key} href={`#${section.key}`}>{section.title}</a>
                ))}
                <a href="#report-checklist">실행 체크리스트</a>
              </nav>

              {report.sections.map((section) => (
                <article key={section.key} id={section.key} className="reportSection">
                  <h3>{section.title}</h3>
                  <SectionText text={section.text} />
                </article>
              ))}

              <article id="report-checklist" className="reportSection">
                <h3>실행 체크리스트</h3>
                <ul className="flatList compactList">
                  {report.recommendations.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </article>

              <p className="muted reportDisclaimer">{report.disclaimer}</p>
            </section>
          </div>
        )}
      </GlassCard>
    </PageContainer>
  );
}
