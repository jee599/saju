"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ReportPreview } from "../../lib/types";
import { ApiClientError, webApi } from "../../lib/api";
import { trackPreviewView, trackCtaClick, trackError } from "../../lib/analytics";
import { toInputFromParams, toInputQuery } from "../../lib/fortune";
import { ButtonLink, GlassCard, LengthDebugBar, PageContainer, StatusBox } from "../components/ui";

function ResultInner() {
  const params = useSearchParams();
  const input = useMemo(() => toInputFromParams(new URLSearchParams(params.toString())), [params]);
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    (async () => {
      if (!input) return setError("입력값이 없습니다.");
      setError(null);
      setErrorCode(null);
      try {
        const result = await webApi.reportPreview(input);
        setPreview(result);
        trackPreviewView();
      } catch (e) {
        if (e instanceof ApiClientError) {
          setError(e.message);
          setErrorCode(e.code);
          trackError(e.code);
        } else {
          setError(e instanceof Error ? e.message : "불러오기 실패");
          trackError("UNKNOWN");
        }
      }
    })();
  }, [input, retryCount]);

  const paywallHref = input ? `/paywall?${toInputQuery(input)}` : "/free-fortune";

  return (
    <PageContainer>
      <GlassCard>
        <p className="heroEyebrow">무료 결과</p>
        <h1>무료 요약 리포트</h1>
        <p className="lead">짧은 요약만 먼저 확인하고, 필요하면 단일 유료 상품으로 전체 장문 리포트를 바로 열 수 있습니다.</p>

        {error ? (
          <div>
            <StatusBox title="오류" description={error} tone="error" />
            {errorCode !== "RATE_LIMIT_EXCEEDED" && (
              <div className="buttonRow" style={{ marginTop: 12 }}>
                <button className="btn btn-primary" onClick={() => setRetryCount((c) => c + 1)}>
                  다시 시도
                </button>
                <ButtonLink href="/" variant="ghost">처음으로</ButtonLink>
              </div>
            )}
            {errorCode === "RATE_LIMIT_EXCEEDED" && (
              <div className="buttonRow" style={{ marginTop: 12 }}>
                <ButtonLink href="/" variant="ghost">홈으로 돌아가기</ButtonLink>
              </div>
            )}
          </div>
        ) : null}

        {!preview && !error ? (
          <p className="muted">리포트를 생성하고 있습니다...</p>
        ) : preview ? (
          <>
            {/* CTA #1: 상단 배너 */}
            <div className="ctaBanner">
              <span>{preview.cta.priceLabel}</span>
              <ButtonLink href={paywallHref} variant="primary" size="sm" onClick={() => trackCtaClick("top_banner")}>
                전체 리포트 보기
              </ButtonLink>
            </div>

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

            {/* 보관 안내 */}
            {preview.retention && !preview.retention.isPermanent && (
              <p className="retentionNotice">
                이 무료 리포트는 {preview.retention.daysRemaining}일간 보관됩니다.
                유료 리포트는 영구 보관됩니다.
              </p>
            )}

            {/* CTA #2: 잠긴 유료 섹션 미리보기 */}
            <div className="ctaPanel">
              <h3>더 자세한 분석이 궁금하다면</h3>
              <p className="muted mt-sm">성격, 직업, 연애, 금전, 건강, 가족 — 6개 도메인을 과거-현재-미래 흐름으로 읽어드립니다.</p>
              <div className="lockedPreview">
                {preview.paid.sections.slice(0, 3).map((section) => (
                  <div key={section.key} className="lockedItem">
                    <span className="lockedIcon">&#128274;</span>
                    <span>{section.title}</span>
                  </div>
                ))}
                <p className="muted" style={{ fontSize: "0.85rem", marginTop: 8 }}>외 {Math.max(0, preview.paid.sections.length - 3)}개 섹션 + 대운 타임라인</p>
              </div>
              <div className="buttonRow">
                <ButtonLink href={paywallHref} variant="primary" onClick={() => trackCtaClick("locked_preview")}>
                  {preview.cta.priceLabel} 전체 장문 리포트 열기
                </ButtonLink>
              </div>
            </div>
          </>
        ) : null}
      </GlassCard>

      {/* CTA #3: 모바일 스티키 바 */}
      {preview && (
        <div className="stickyCta">
          <span className="stickyLabel">{preview.cta.priceLabel} — 장문 리포트</span>
          <ButtonLink href={paywallHref} variant="primary" size="sm" onClick={() => trackCtaClick("sticky_bar")}>결제하기</ButtonLink>
        </div>
      )}
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
