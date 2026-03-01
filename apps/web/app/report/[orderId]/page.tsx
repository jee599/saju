"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import type { GetReportResponse, ModelReportDetail } from "../../../lib/types";
import { webApi } from "../../../lib/api";
import { ButtonLink, GlassCard, LengthDebugBar, PageContainer, StatusBox } from "../../components/ui";

/**
 * 테스트 모드 리포트 페이지: 모델별 개별 생성 버튼.
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
        return <p key={i} className="reportParagraph">{p}</p>;
      })}
    </div>
  );
}

interface ModelInfo {
  key: string;
  label: string;
  color: string;
  desc: string;
}

const MODELS: ModelInfo[] = [
  { key: "sonnet-single", label: "Sonnet", color: "#e06090", desc: "20000자×1회" },
  { key: "opus", label: "Opus", color: "#7c3aed", desc: "4000자×5" },
  { key: "gpt", label: "GPT-5.2", color: "#10a37f", desc: "20000자×1회" },
  { key: "gpt-mini-chunked", label: "GPT-mini", color: "#50d4a0", desc: "4000자×5" },
  { key: "gemini", label: "Gemini 3.1", color: "#4285f4", desc: "20000자×1회" },
  { key: "gemini-flash-chunked", label: "Flash", color: "#6db6ff", desc: "4000자×5" },
  { key: "haiku-chunked", label: "Haiku", color: "#f59e0b", desc: "4000자×5" },
];

function fmt(ms?: number) { return ms ? ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(1)}s` : ""; }
function fmtCost(usd?: number) { return usd ? usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(3)}` : ""; }
function fmtChars(c?: number) { return c ? `${c.toLocaleString()}자` : ""; }

type ModelStatus = "idle" | "loading" | "done" | "error";

interface ModelResult {
  report: ModelReportDetail;
  durationMs?: number;
  estimatedCostUsd?: number;
  charCount?: number;
  cached?: boolean;
}

export default function ReportPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [data, setData] = useState<GetReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 각 모델별 상태
  const [modelStatus, setModelStatus] = useState<Record<string, ModelStatus>>({});
  const [modelResults, setModelResults] = useState<Record<string, ModelResult>>({});
  const [modelErrors, setModelErrors] = useState<Record<string, string>>({});
  const [activeModel, setActiveModel] = useState<string | null>(null);

  // 초기 데이터 로딩 (이미 생성된 리포트 불러오기)
  useEffect(() => {
    (async () => {
      try {
        if (!orderId) return;
        const res = await webApi.report(orderId);
        setData(res);

        // 이미 생성된 리포트들 반영
        if (res.reportsByModel) {
          const statuses: Record<string, ModelStatus> = {};
          const results: Record<string, ModelResult> = {};
          for (const [key, report] of Object.entries(res.reportsByModel)) {
            statuses[key] = "done";
            results[key] = { report, charCount: (report as any).charCount, cached: true };
          }
          setModelStatus(statuses);
          setModelResults(results);
          // 첫 번째를 활성화
          const firstKey = Object.keys(results)[0];
          if (firstKey) setActiveModel(firstKey);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "리포트 조회 실패");
      }
    })();
  }, [orderId]);

  // 모델 생성 요청
  const generateModel = useCallback(async (modelKey: string) => {
    if (!orderId) return;

    setModelStatus((prev) => ({ ...prev, [modelKey]: "loading" }));
    setModelErrors((prev) => { const n = { ...prev }; delete n[modelKey]; return n; });

    try {
      const res = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, modelKey }),
      });

      let json: any;
      try {
        json = await res.json();
      } catch {
        throw new Error(`서버 응답 오류 (${res.status})`);
      }

      if (!res.ok || !json.ok) {
        throw new Error(json?.error?.message ?? "생성 실패");
      }

      const result: ModelResult = {
        report: json.data.report,
        durationMs: json.data.report.durationMs,
        estimatedCostUsd: json.data.report.estimatedCostUsd,
        charCount: json.data.report.charCount,
        cached: json.data.cached,
      };

      setModelResults((prev) => ({ ...prev, [modelKey]: result }));
      setModelStatus((prev) => ({ ...prev, [modelKey]: "done" }));
      setActiveModel(modelKey);
    } catch (e) {
      setModelStatus((prev) => ({ ...prev, [modelKey]: "error" }));
      setModelErrors((prev) => ({ ...prev, [modelKey]: e instanceof Error ? e.message : "오류" }));
    }
  }, [orderId]);

  const activeReport = activeModel ? modelResults[activeModel]?.report : null;
  const toc = useMemo(() => activeReport?.sections ?? [], [activeReport]);

  return (
    <PageContainer>
      <GlassCard>
        <p className="heroEyebrow">테스트 리포트</p>
        <h1>{data?.input?.name ? `${data.input.name}님의 사주 분석` : "사주 분석 리포트"}</h1>

        <div className="buttonRow">
          <ButtonLink href="/" variant="ghost">메인으로</ButtonLink>
        </div>

        {error ? <StatusBox title="오류" description={error} tone="error" /> : null}

        {!data ? (
          <p className="muted">로딩중...</p>
        ) : (
          <div className="reportLayout">
            {/* ── 모델 버튼 패널 ── */}
            <div className="modelTestPanel">
              <h3 style={{ fontSize: "0.85rem", color: "var(--t2)", marginBottom: 12 }}>🧪 모델별 생성</h3>

              <div className="modelButtonGrid">
                {MODELS.map((m) => {
                  const status = modelStatus[m.key] ?? "idle";
                  const result = modelResults[m.key];
                  const err = modelErrors[m.key];
                  const isActive = activeModel === m.key;

                  return (
                    <div
                      key={m.key}
                      className={`modelCard ${isActive ? "active" : ""} ${status}`}
                      style={{ "--model-color": m.color } as React.CSSProperties}
                    >
                      <div className="modelCardHeader">
                        <span className="modelDot" style={{ background: m.color }} />
                        <span className="modelCardName">{m.label}</span>
                        <span className="modelCardDesc">{m.desc}</span>
                      </div>

                      {status === "idle" && (
                        <button
                          className="btn btn-secondary modelGenBtn"
                          onClick={() => generateModel(m.key)}
                        >
                          생성
                        </button>
                      )}

                      {status === "loading" && (
                        <div className="modelCardLoading">
                          <span className="spinner" /> 생성 중...
                        </div>
                      )}

                      {status === "done" && result && (
                        <div
                          className="modelCardResult"
                          onClick={() => setActiveModel(m.key)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="modelCardStats">
                            {result.durationMs ? <span>⏱ {fmt(result.durationMs)}</span> : null}
                            {result.estimatedCostUsd ? <span>💰 {fmtCost(result.estimatedCostUsd)}</span> : null}
                            {result.charCount ? <span>📝 {fmtChars(result.charCount)}</span> : null}
                            {result.cached ? <span className="cachedBadge">캐시</span> : null}
                          </div>
                          {!isActive && (
                            <button className="btn btn-ghost modelViewBtn" onClick={() => setActiveModel(m.key)}>
                              보기
                            </button>
                          )}
                          {isActive && <span className="modelActiveBadge">▼ 표시 중</span>}
                        </div>
                      )}

                      {status === "error" && (
                        <div className="modelCardError">
                          <span>⚠️ {err}</span>
                          <button className="btn btn-ghost" onClick={() => generateModel(m.key)}>재시도</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 비교 테이블 (생성된 것만) */}
              {Object.keys(modelResults).length > 1 && (
                <div className="modelCompareTable" style={{ marginTop: 16 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>모델</th>
                        <th>시간</th>
                        <th>비용</th>
                        <th>글자수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(modelResults).map(([k, r]) => (
                        <tr
                          key={k}
                          className={activeModel === k ? "activeRow" : ""}
                          onClick={() => setActiveModel(k)}
                          style={{ cursor: "pointer" }}
                        >
                          <td>
                            <span className="modelDot" style={{ background: MODELS.find(m => m.key === k)?.color ?? "#888" }} />
                            {MODELS.find(m => m.key === k)?.label ?? k}
                          </td>
                          <td>{fmt(r.durationMs)}</td>
                          <td>{fmtCost(r.estimatedCostUsd)}</td>
                          <td>{fmtChars(r.charCount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── 리포트 본문 ── */}
            {activeReport ? (
              <>
                <aside className="reportToc">
                  <div className="tocCard">
                    <h3>목차</h3>
                    <nav aria-label="리포트 목차">
                      {toc.map((section) => (
                        <a key={section.key} href={`#${section.key}`}>{section.title}</a>
                      ))}
                    </nav>
                  </div>
                </aside>

                <section className="reportBody">
                  <article className="reportHead">
                    <h2>{activeReport.headline}</h2>
                    <p className="muted">{activeReport.summary}</p>
                    {activeModel && (
                      <p style={{
                        fontSize: "0.75rem",
                        color: MODELS.find(m => m.key === activeModel)?.color,
                        marginTop: 4
                      }}>
                        {MODELS.find(m => m.key === activeModel)?.label ?? activeModel}
                      </p>
                    )}
                  </article>

                  <nav className="reportJumpNav" aria-label="리포트 빠른 이동">
                    {toc.map((section) => (
                      <a key={section.key} href={`#${section.key}`}>{section.title}</a>
                    ))}
                  </nav>

                  {activeReport.sections.map((section) => (
                    <article key={section.key} id={section.key} className="reportSection">
                      <h3>{section.title}</h3>
                      <SectionText text={section.text} />
                    </article>
                  ))}

                  {activeReport.recommendations?.length > 0 && (
                    <article className="reportSection">
                      <h3>실행 체크리스트</h3>
                      <ul className="flatList compactList">
                        {activeReport.recommendations.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </article>
                  )}

                  <p className="muted reportDisclaimer">{activeReport.disclaimer}</p>
                </section>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--t2)" }}>
                <p style={{ fontSize: "1.2rem", marginBottom: 8 }}>👆</p>
                <p>위에서 모델을 선택하고 <strong>생성</strong> 버튼을 눌러주세요</p>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </PageContainer>
  );
}
