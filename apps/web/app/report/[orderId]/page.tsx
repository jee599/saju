"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { GetReportResponse } from "../../../lib/types";
import { webApi } from "../../../lib/api";
import { ButtonLink, GlassCard, LengthDebugBar, PageContainer, StatusBox } from "../../components/ui";

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

  const toc = useMemo(() => data?.report.sections ?? [], [data]);

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

        {!data ? (
          <p className="muted">리포트 로딩중...</p>
        ) : (
          <div className="reportLayout">
            <aside className="reportToc">
              <div className="tocCard">
                <h3>목차</h3>
                <nav aria-label="리포트 목차">
                  {toc.map((section) => (
                    <a key={section.key} href={`#${section.key}`}>{section.title}</a>
                  ))}
                </nav>
                <LengthDebugBar values={[{ label: "유료", info: data.report.debugLength }]} />
              </div>
            </aside>

            <section className="reportBody">
              <article className="reportHead">
                <h2>{data.report.headline}</h2>
                <p className="muted">{data.report.summary}</p>
              </article>

              <nav className="reportJumpNav" aria-label="리포트 빠른 이동">
                {toc.map((section) => (
                  <a key={section.key} href={`#${section.key}`}>{section.title}</a>
                ))}
                <a href="#report-checklist">실행 체크리스트</a>
              </nav>

              {data.report.sections.map((section) => (
                <article key={section.key} id={section.key} className="reportSection">
                  <h3>{section.title}</h3>
                  <p>{section.text}</p>
                </article>
              ))}

              <article id="report-checklist" className="reportSection">
                <h3>실행 체크리스트</h3>
                <ul className="flatList compactList">
                  {data.report.recommendations.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </article>

              <p className="muted reportDisclaimer">{data.report.disclaimer}</p>
            </section>
          </div>
        )}
      </GlassCard>
    </PageContainer>
  );
}
