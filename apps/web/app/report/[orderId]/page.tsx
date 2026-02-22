"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { GetReportResponse } from "../../../lib/types";
import { webApi } from "../../../lib/api";
import { ButtonLink, GlassCard, PageContainer, StatusBox } from "../../components/ui";

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

  return (
    <PageContainer>
      <GlassCard>
        <h1>전체 리포트</h1>
        <ButtonLink href="/free-fortune" variant="ghost">새로 보기</ButtonLink>
        {error ? <StatusBox title="오류" description={error} tone="error" /> : null}
        {!data ? <p>리포트 로딩중...</p> : (
          <>
            <h2>{data.report.headline}</h2>
            <p>{data.report.summary}</p>
            {data.report.sections.map((s) => (
              <article key={s.key} className="sectionBlock"><h3>{s.title}</h3><p>{s.text}</p></article>
            ))}
          </>
        )}
      </GlassCard>
    </PageContainer>
  );
}
