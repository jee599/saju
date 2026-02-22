"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ProductCode, ReportPreview } from "../../lib/types";
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

  const paywallHref = (code: ProductCode) => (input ? `/paywall?${toInputQuery(input)}&productCode=${code}` : "/free-fortune");

  return (
    <PageContainer>
      <GlassCard>
        <p className="heroEyebrow">무료 결과</p>
        <h1>무료 리포트 미리보기</h1>
        <p className="lead">전문 명리 해설체 기반으로 생성된 7개 구조 요약입니다.</p>

        {error ? <StatusBox title="오류" description={error} tone="error" /> : null}

        {!preview ? (
          <p className="muted">리포트를 생성하고 있습니다...</p>
        ) : (
          <>
            <h2>{preview.free.headline}</h2>
            <p className="muted mt-sm">{preview.free.summary}</p>

            <LengthDebugBar
              values={[
                { label: "무료", info: preview.debugLengths.free },
                { label: "표준", info: preview.debugLengths.standard },
                { label: "심화", info: preview.debugLengths.deep }
              ]}
            />

            <div className="sectionStack mt-md">
              {preview.free.sections.map((section) => (
                <article key={section.key} className="sectionBlock">
                  <h3>{section.title}</h3>
                  <p>{section.text}</p>
                </article>
              ))}
            </div>

            <div className="ctaPanel">
              <h3>확장 리포트 선택</h3>
              <div className="buttonRow">
                {preview.ctas.map((cta) => (
                  <ButtonLink key={cta.code} href={paywallHref(cta.code)} variant={cta.code === "deep" ? "secondary" : "primary"}>
                    {cta.label} {cta.priceLabel}
                  </ButtonLink>
                ))}
              </div>
              <p className="muted">표준/심화는 잠금 해제 후 전체 장문 리포트를 제공합니다.</p>
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
