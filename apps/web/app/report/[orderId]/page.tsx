"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { GetReportResponse, ModelReportDetail } from "../../../lib/types";
import { webApi } from "../../../lib/api";
import { ButtonLink, GlassCard, LengthDebugBar, PageContainer, StatusBox } from "../../components/ui";

/**
 * 테스트 모드 리포트 페이지: 모델별 개별 생성 버튼.
 */

/** 명리학 분석 30단계 */
const SAJU_STEPS = [
  "생년월일시를 만세력으로 변환하고 있습니다",
  "천간(天干) 10간을 배치하고 있습니다",
  "지지(地支) 12지를 배치하고 있습니다",
  "사주팔자 네 기둥을 세우고 있습니다",
  "일간(日干)을 확인하여 본명성을 파악 중입니다",
  "오행(木火土金水) 분포를 계산하고 있습니다",
  "음양 밸런스를 분석하고 있습니다",
  "용신(用神)과 희신을 찾고 있습니다",
  "십성(十星) 관계를 매핑하고 있습니다",
  "비견·겁재 — 자아와 경쟁심을 읽고 있습니다",
  "식신·상관 — 표현력과 창의성을 분석 중입니다",
  "정재·편재 — 재물운의 흐름을 파악 중입니다",
  "정관·편관 — 직업운과 사회적 역할을 읽고 있습니다",
  "정인·편인 — 학업운과 지적 성향을 분석 중입니다",
  "지장간(地藏干)을 풀어 숨은 기운을 찾고 있습니다",
  "12운성을 배치하여 에너지 리듬을 확인 중입니다",
  "합·충·형·파·해 관계를 분석하고 있습니다",
  "삼합(三合)과 방합을 확인하여 조화를 읽고 있습니다",
  "공망(空亡)을 확인하고 있습니다",
  "대운(大運) 타임라인을 계산하고 있습니다",
  "현재 대운의 흐름과 영향을 분석 중입니다",
  "세운(歲運) — 올해의 운세를 읽고 있습니다",
  "월운 흐름을 파악하여 시기별 조언을 준비 중입니다",
  "성격과 기질 해석을 작성하고 있습니다",
  "직업 적성과 재물운을 정리 중입니다",
  "연애·결혼운을 해석하고 있습니다",
  "건강 체질과 주의사항을 분석하고 있습니다",
  "가족·대인관계 운을 읽고 있습니다",
  "미래 3~5년 전망을 정리하고 있습니다",
  "최종 리포트를 마무리하고 있습니다",
];

const EXPECTED_DURATION_MS = 90_000; // 예상 90초

function SajuLoadingProgress({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 300);
    return () => clearInterval(interval);
  }, [startTime]);

  // 0~95%까지 점진적으로 (실제 완료되면 100%)
  const rawPct = Math.min(95, (elapsed / EXPECTED_DURATION_MS) * 100);
  // 살짝 느려지는 곡선 (제곱근)
  const pct = Math.min(95, Math.sqrt(rawPct / 95) * 95);
  const stepIndex = Math.min(
    SAJU_STEPS.length - 1,
    Math.floor((pct / 100) * SAJU_STEPS.length)
  );
  const stepText = SAJU_STEPS[stepIndex];
  const elapsedSec = Math.floor(elapsed / 1000);

  return (
    <div className="sajuLoading">
      <div className="sajuLoadingBar">
        <div className="sajuLoadingFill" style={{ width: `${pct}%` }} />
      </div>
      <div className="sajuLoadingPct">{Math.round(pct)}%</div>
      <div className="sajuLoadingStep">{stepText}</div>
      <div className="sajuLoadingTime">{elapsedSec}초 경과</div>
    </div>
  );
}

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
  { key: "sonnet-single", label: "Sonnet", color: "#e06090", desc: "4000자×5" },
  { key: "gpt", label: "GPT-5.2", color: "#10a37f", desc: "4000자×5" },
  { key: "gpt-mini-chunked", label: "GPT-mini", color: "#50d4a0", desc: "4000자×5" },
  { key: "gemini", label: "Gemini 3.1", color: "#4285f4", desc: "4000자×5" },
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
  const [modelStartTimes, setModelStartTimes] = useState<Record<string, number>>({});
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
    setModelStartTimes((prev) => ({ ...prev, [modelKey]: Date.now() }));
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
                        <SajuLoadingProgress startTime={modelStartTimes[m.key] ?? Date.now()} />
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
