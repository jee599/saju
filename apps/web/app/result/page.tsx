"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ProductCode, ReportPreview } from "../../lib/types";
import { webApi } from "../../lib/api";
import { buildShareText, toInputFromParams, toInputQuery } from "../../lib/fortune";
import { ButtonLink, GlassCard, PageContainer, StatusBox } from "../components/ui";

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
        <h1>무료 결과 미리보기</h1>
        {error ? <StatusBox title="오류" description={error} tone="error" /> : null}
        {!preview ? <p>결과를 불러오는 중...</p> : (
          <>
            <h2>{preview.free.headline}</h2>
            <p>{preview.free.summary}</p>
            <div className="inlineActions">
              {preview.ctas.map((c) => <ButtonLink key={c.code} href={paywallHref(c.code)}>{c.label} {c.priceLabel}</ButtonLink>)}
            </div>
            <pre className="shareText">{buildShareText("kakao", preview)}</pre>
          </>
        )}
      </GlassCard>
    </PageContainer>
  );
}

export default function ResultPage() {
  return <Suspense fallback={<main className="shell pageMain"><section className="card"><p>결과 로딩중...</p></section></main>}><ResultInner /></Suspense>;
}
