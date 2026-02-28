"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { GetReportResponse, ModelReportDetail } from "../../../lib/types";
import { webApi } from "../../../lib/api";
import { ButtonLink, GlassCard, LengthDebugBar, PageContainer, StatusBox } from "../../components/ui";

/**
 * 테스트 모드 리포트 페이지: 심플한 모델 비교 UI.
 */

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
        return (
          <p key={i} className="reportParagraph">
            {p}
          </p>
        );
      })}
    </div>
  );
}

const MODEL_LABELS: Record<string, string> = {
  "sonnet-chunked": "Sonnet 청크",
  "sonnet-single": "Sonnet 단일",
  "opus": "Opus",
  "gpt": "GPT-5.2",
  "gpt-mini-chunked": "GPT-mini 청크",
  "gemini": "Gemini 3.1",
  "gemini-flash-chunked": "Flash 청크",
  "haiku-chunked": "Haiku 청크",
  "sonnet": "Sonnet",
  "fallback": "Fallback",
};

const MODEL_COLORS: Record<string, string> = {
  "sonnet-chunked": "#c48b9f",
  "sonnet-single": "#e06090",
  "opus": "#7c3aed",
  "gpt": "#10a37f",
  "gpt-mini-chunked": "#50d4a0",
  "gemini": "#4285f4",
  "gemini-flash-chunked": "#6db6ff",
  "haiku-chunked": "#f59e0b",
  "sonnet": "#c48b9f",
  "fallback": "#888",
};

function fmt(ms?: number) { return ms ? ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(1)}s` : "-"; }
function fmtCost(usd?: number) { return usd ? usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(3)}` : "-"; }
function fmtChars(c?: number) { return c ? `${c.toLocaleString()}자` : "-"; }

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

  const modelKeys = useMemo(() => {
    if (!data?.reportsByModel) return [];
    return Object.keys(data.reportsByModel);
  }, [data]);

  const [activeModel, setActiveModel] = useState<string | null>(null);

  useEffect(() => {
    if (modelKeys.length > 0 && !activeModel) {
      setActiveModel(modelKeys.includes("sonnet-single") ? "sonnet-single" : modelKeys[0]);
    }
  }, [modelKeys, activeModel]);

  const report = useMemo(() => {
    if (!data) return null;
    if (data.reportsByModel && activeModel && data.reportsByModel[activeModel]) {
      return data.reportsByModel[activeModel];
    }
    return data.report;
  }, [data, activeModel]);

  const toc = useMemo(() => report?.sections ?? [], [report]);
  const hasMultiModel = modelKeys.length > 1;

  return (
    <PageContainer>
      <GlassCard>
        <p className="heroEyebrow">전체 리포트</p>
        <h1>{data?.input?.name ? `${data.input.name}님의 사주 분석 리포트` : "사주 분석 리포트"}</h1>

        <div className="buttonRow">
          <ButtonLink href="/" variant="ghost">새로 생성</ButtonLink>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const shareData = { title: "복연구소 - AI 사주 분석", text: "나의 사주 분석 결과를 확인해보세요!", url: window.location.href };
              if (navigator.share) navigator.share(shareData).catch(() => {});
              else { navigator.clipboard.writeText(window.location.href); alert("링크가 복사되었습니다!"); }
            }}
          >
            공유하기
          </button>
        </div>

        {error ? <StatusBox title="오류" description={error} tone="error" /> : null}

        {!data || !report ? (
          <p className="muted">리포트 로딩중...</p>
        ) : (
          <div className="reportLayout">
            {/* ── 모델 비교 패널 ── */}
            {hasMultiModel && data.reportsByModel && (
              <div className="modelTestPanel">
                {/* 비교 테이블 */}
                <div className="modelCompareTable">
                  <table>
                    <thead>
                      <tr>
                        <th>모델</th>
                        <th>시간</th>
                        <th>비용</th>
                        <th>글자수</th>
                        <th>토큰 (in/out)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modelKeys.map((k) => {
                        const r = data.reportsByModel![k];
                        return (
                          <tr
                            key={k}
                            className={activeModel === k ? "activeRow" : ""}
                            onClick={() => setActiveModel(k)}
                            style={{ cursor: "pointer" }}
                          >
                            <td>
                              <span className="modelDot" style={{ background: MODEL_COLORS[k] ?? "#888" }} />
                              {MODEL_LABELS[k] ?? k}
                            </td>
                            <td>{fmt(r.durationMs)}</td>
                            <td>{fmtCost(r.estimatedCostUsd)}</td>
                            <td>{fmtChars(r.charCount)}</td>
                            <td className="muted">{(r.usage?.inputTokens ?? 0).toLocaleString()} / {(r.usage?.outputTokens ?? 0).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <aside className="reportToc">
              <div className="tocCard">
                <h3>목차</h3>
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
                {activeModel && (
                  <p style={{ fontSize: "0.75rem", color: MODEL_COLORS[activeModel], marginTop: 4 }}>
                    {MODEL_LABELS[activeModel] ?? activeModel}
                  </p>
                )}
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
