"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ReportPreview } from "../../lib/types";
import { webApi } from "../../lib/api";
import { toInputFromParams, toInputQuery } from "../../lib/fortune";
import { ButtonLink, GlassCard, LengthDebugBar, PageContainer, StatusBox } from "../components/ui";

function ResultInner() {
  const params = useSearchParams();
  const input = useMemo(() => toInputFromParams(new URLSearchParams(params.toString())), [params]);
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!input) return setError("입력값이 없습니다.");
      try {
        setPreview(await webApi.reportPreview(input));
      } catch (e) {
        setError(e instanceof Error ? e.message : "불러오기 실패");
      }
    })();
  }, [input]);

  const paywallHref = input ? `/paywall?${toInputQuery(input)}` : "/free-fortune";

  return (
    <PageContainer>
      <GlassCard>
        <p className="heroEyebrow">무료 결과</p>
        <h1>무료 요약 리포트</h1>
        <p className="lead">짧은 요약만 먼저 확인하고, 필요하면 단일 유료 상품으로 전체 장문 리포트를 바로 열 수 있습니다.</p>

        {error ? <StatusBox title="오류" description={error} tone="error" /> : null}

        {!preview ? (
          <p className="muted">리포트를 생성하고 있습니다...</p>
        ) : (
          <>
            <h2>{preview.free.headline}</h2>
            <p className="muted mt-sm">{preview.free.summary}</p>

            {preview.debugLengths && <LengthDebugBar values={[{ label: "무료", info: preview.debugLengths.free }, { label: "유료", info: preview.debugLengths.paid }]} />}

            <div className="sectionStack mt-md">
              {preview.free.sections.map((section) => (
                <article key={section.key} className="sectionBlock">
                  <h3>{section.title}</h3>
                  <p>{section.text}</p>
                </article>
              ))}
            </div>

            <div className="ctaPanel">
              <h3>{preview.cta.label}</h3>
              <p className="muted mt-sm">{preview.cta.description}</p>
              <div className="buttonRow">
                <ButtonLink href={paywallHref} variant="primary">
                  {preview.cta.priceLabel} 결제로 전체 보기
                </ButtonLink>
              </div>
            </div>
          </>
        )}
      </GlassCard>
    </PageContainer>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<PageContainer><GlassCard><p>결과 로딩중...</p></GlassCard></PageContainer>}>
      <ResultInner />
    </Suspense>
  );
}
