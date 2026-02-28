"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { GetReportResponse, ModelReportDetail } from "../../../lib/types";
import { webApi } from "../../../lib/api";
import { ButtonLink, GlassCard, LengthDebugBar, PageContainer, StatusBox } from "../../components/ui";

/**
 * 테스트 모드 리포트 페이지: 모든 모델 비교 UI.
 * 나중에 원복 시 단일 모델 뷰로 변경.
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
  "sonnet-chunked": "Sonnet (청크)",
  "sonnet-single": "Sonnet (단일)",
  "opus": "Opus",
  "gpt": "GPT-5.2",
  "gpt-mini-chunked": "GPT-mini (청크)",
  "gemini": "Gemini 3.1",
  "gemini-flash-chunked": "Gemini Flash (청크)",
  "haiku-chunked": "Haiku (청크)",
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

function formatDuration(ms?: number): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatCost(usd?: number): string {
  if (!usd) return "-";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}

function formatChars(count?: number): string {
  if (!count) return "-";
  return `${count.toLocaleString()}자`;
}

/** 테스트 비교 카드: 각 모델의 메타 정보 표시 */
function ModelCompareCard({
  model,
  report,
  isActive,
  onClick,
}: {
  model: string;
  report: ModelReportDetail;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: "1 1 0",
        minWidth: 120,
        padding: "14px 12px",
        border: isActive ? `2px solid ${MODEL_COLORS[model] ?? "#888"}` : "1px solid var(--glass-border)",
        borderRadius: "var(--radius-sm)",
        background: isActive ? `${MODEL_COLORS[model] ?? "#888"}11` : "var(--bg-card)",
        cursor: "pointer",
        textAlign: "center",
        transition: "all 0.2s",
      }}
    >
      <div style={{
        fontWeight: 700,
        fontSize: "1rem",
        color: MODEL_COLORS[model] ?? "var(--t1)",
        marginBottom: 8,
      }}>
        {MODEL_LABELS[model] ?? model}
      </div>
      <div style={{ display: "grid", gap: 4, fontSize: "0.78rem", color: "var(--t2)" }}>
        <div>⏱ {formatDuration(report.durationMs)}</div>
        <div>💰 {formatCost(report.estimatedCostUsd)}</div>
        <div>📝 {formatChars(report.charCount)}</div>
        {report.usage && (
          <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>
            {(report.usage.inputTokens ?? 0).toLocaleString()} in / {(report.usage.outputTokens ?? 0).toLocaleString()} out
          </div>
        )}
      </div>
    </button>
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

  const modelKeys = useMemo(() => {
    if (!data?.reportsByModel) return [];
    return Object.keys(data.reportsByModel);
  }, [data]);

  const [activeModel, setActiveModel] = useState<string | null>(null);

  // Set default active model when data loads
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
        <p className="lead">전문 명리 해설체와 확률 표현 원칙으로 작성된 전체 결과입니다.</p>

        <div className="buttonRow">
          <ButtonLink href="/" variant="ghost">새로 생성</ButtonLink>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const shareData = {
                title: "복연구소 - AI 사주 분석",
                text: "나의 사주 분석 결과를 확인해보세요!",
                url: window.location.href,
              };
              if (navigator.share) {
                navigator.share(shareData).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert("링크가 복사되었습니다!");
              }
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
            {/* 테스트 모드: 모델 비교 패널 */}
            {hasMultiModel && data.reportsByModel && (
              <div style={{
                marginBottom: 24,
                padding: 16,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-sm)",
              }}>
                <h3 style={{ fontSize: "0.9rem", marginBottom: 12, color: "var(--accent-gold)" }}>
                  🧪 테스트 모드 — 모델 비교 ({modelKeys.length}개)
                </h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxHeight: 320, overflowY: "auto" }}>
                  {modelKeys.map((key) => (
                    <ModelCompareCard
                      key={key}
                      model={key}
                      report={data.reportsByModel![key]}
                      isActive={activeModel === key}
                      onClick={() => setActiveModel(key)}
                    />
                  ))}
                </div>

                {/* 비교 테이블 */}
                <div style={{ marginTop: 16, overflowX: "auto" }}>
                  <table style={{
                    width: "100%",
                    fontSize: "0.7rem",
                    borderCollapse: "collapse",
                    color: "var(--t1)",
                    minWidth: 600,
                  }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>항목</th>
                        {modelKeys.map(k => (
                          <th key={k} style={{
                            padding: "6px 8px",
                            textAlign: "center",
                            color: MODEL_COLORS[k],
                            fontWeight: activeModel === k ? 700 : 400,
                          }}>
                            {MODEL_LABELS[k] ?? k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: "4px 8px" }}>⏱ 소요시간</td>
                        {modelKeys.map(k => (
                          <td key={k} style={{ padding: "4px 8px", textAlign: "center" }}>
                            {formatDuration(data.reportsByModel![k].durationMs)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 8px" }}>💰 비용</td>
                        {modelKeys.map(k => (
                          <td key={k} style={{ padding: "4px 8px", textAlign: "center" }}>
                            {formatCost(data.reportsByModel![k].estimatedCostUsd)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 8px" }}>📝 글자수</td>
                        {modelKeys.map(k => (
                          <td key={k} style={{ padding: "4px 8px", textAlign: "center" }}>
                            {formatChars(data.reportsByModel![k].charCount)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 8px" }}>🔤 입력토큰</td>
                        {modelKeys.map(k => (
                          <td key={k} style={{ padding: "4px 8px", textAlign: "center" }}>
                            {(data.reportsByModel![k].usage?.inputTokens ?? 0).toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 8px" }}>🔤 출력토큰</td>
                        {modelKeys.map(k => (
                          <td key={k} style={{ padding: "4px 8px", textAlign: "center" }}>
                            {(data.reportsByModel![k].usage?.outputTokens ?? 0).toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 8px" }}>💵 원/자</td>
                        {modelKeys.map(k => {
                          const cost = data.reportsByModel![k].estimatedCostUsd ?? 0;
                          const chars = data.reportsByModel![k].charCount ?? 1;
                          const costPerChar = cost > 0 ? (cost / chars * 1400 * 1000).toFixed(1) : "-";
                          return (
                            <td key={k} style={{ padding: "4px 8px", textAlign: "center" }}>
                              {typeof costPerChar === "string" ? costPerChar : `${costPerChar}원/1K자`}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <aside className="reportToc">
              <div className="tocCard">
                <h3>목차</h3>
                {hasMultiModel && (
                  <div className="buttonRow mt-xs" role="group" aria-label="모델 선택">
                    {modelKeys.map(k => (
                      <button
                        key={k}
                        className="button ghost"
                        onClick={() => setActiveModel(k)}
                        aria-pressed={activeModel === k}
                        style={{
                          color: activeModel === k ? MODEL_COLORS[k] : undefined,
                          fontWeight: activeModel === k ? 700 : 400,
                          borderColor: activeModel === k ? MODEL_COLORS[k] : undefined,
                        }}
                      >
                        {MODEL_LABELS[k] ?? k}
                      </button>
                    ))}
                  </div>
                )}
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
                    현재 보기: {MODEL_LABELS[activeModel] ?? activeModel}
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
