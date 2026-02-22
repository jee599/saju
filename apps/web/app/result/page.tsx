"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import type { ProductCode, ReportPreview } from "@saju/shared";
import { useSearchParams } from "next/navigation";
import { webApi } from "../../lib/api";
import { trackEvent } from "../../lib/analytics";
import { buildShareText, toInputFromParams, toInputQuery } from "../../lib/fortune";
import { Button, ButtonLink, GlassCard, PageContainer, SectionTitle, SkeletonBlock, StatusBox } from "../components/ui";

type LoadState = "idle" | "loading" | "success" | "error";
type ShareChannel = "instagram" | "kakao";

const channelLabels: Record<ShareChannel, string> = {
  instagram: "Instagram 스타일",
  kakao: "Kakao 메시지 스타일"
};

function ResultPageInner() {
  const searchParams = useSearchParams();
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<ShareChannel | null>(null);

  const input = useMemo(() => toInputFromParams(new URLSearchParams(searchParams.toString())), [searchParams]);

  const loadPreview = async () => {
    if (!input) {
      setState("error");
      setError("입력값이 누락되어 결과를 생성할 수 없습니다.");
      return;
    }

    setState("loading");
    setError(null);

    try {
      const data = await webApi.reportPreview(input);
      setPreview(data);
      setState("success");
      trackEvent("preview_loaded", { seed: data.seed, ctaCount: data.ctas.length });
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "결과 조회에 실패했습니다.");
      trackEvent("preview_load_failed");
    }
  };

  useEffect(() => {
    void loadPreview();
  }, [input]);

  const copyShare = async (channel: ShareChannel) => {
    if (!preview) return;
    await navigator.clipboard.writeText(buildShareText(channel, preview));
    setCopied(channel);
    trackEvent("share_text_copied", { channel });
  };

  const paywallHref = (productCode: ProductCode): string => {
    if (!input) return "/free-fortune";
    return `/paywall?${toInputQuery(input)}&productCode=${productCode}`;
  };

  return (
    <PageContainer>
      <div className={state === "success" ? "hasStickyCta" : ""}>
        <GlassCard>
          <p className="heroEyebrow">무료 결과</p>
          <h1>입력값 기반 미리보기</h1>
          <p className="lead">무료 영역 확인 후 필요 시 결제 시뮬레이션으로 전체 리포트를 확인할 수 있습니다.</p>
          <div className="inlineActions">
            <ButtonLink href="/free-fortune" variant="ghost">
              입력 수정
            </ButtonLink>
            <Button type="button" onClick={() => void loadPreview()} variant="secondary">
              다시 불러오기
            </Button>
          </div>
        </GlassCard>

        {state === "loading" ? (
          <GlassCard>
            <div className="loadingRow">
              <span className="spinner" />
              결과를 계산하고 있습니다...
            </div>
            <div className="mt-md">
              <SkeletonBlock lines={4} />
            </div>
          </GlassCard>
        ) : null}

        {state === "error" ? (
          <GlassCard>
            <StatusBox
              title="결과를 불러오지 못했습니다"
              description={error ?? "잠시 후 다시 시도해 주세요."}
              tone="error"
              action={
                <Button type="button" onClick={() => void loadPreview()} variant="danger">
                  재시도
                </Button>
              }
            />
          </GlassCard>
        ) : null}

        {state === "success" && preview ? (
          <>
            <GlassCard>
              <SectionTitle title={preview.free.headline} subtitle={preview.free.summary} />
              {preview.free.sections.length === 0 ? (
                <div className="emptyState">
                  <h3>표시할 무료 항목이 없습니다</h3>
                  <p className="muted">입력값을 다시 확인하고 결과를 다시 생성해 주세요.</p>
                </div>
              ) : (
                preview.free.sections.map((section) => (
                  <article key={section.key} className="sectionBlock">
                    <h3>{section.title}</h3>
                    <p>{section.text}</p>
                  </article>
                ))
              )}
            </GlassCard>

            <GlassCard>
              <SectionTitle title="잠금 영역 미리보기" subtitle="결제 시뮬레이션 완료 후 전체 문장을 확인할 수 있습니다." />
              {preview.paid.deep.sections.map((section) => (
                <article key={section.key} className="lockedBlock">
                  <h3>{section.title}</h3>
                  <p className="blurredText">{section.text}</p>
                  <span className="badge badge-soft mt-xs">
                    잠금
                  </span>
                </article>
              ))}
            </GlassCard>

            <GlassCard>
              <SectionTitle title="공유 카드 문구" subtitle="채널별 톤에 맞춘 문구를 복사해 바로 공유할 수 있습니다." />
              {(Object.keys(channelLabels) as ShareChannel[]).map((channel) => (
                <article key={channel} className="shareCard">
                  <div className="shareChannel">
                    <h3>{channelLabels[channel]}</h3>
                    <Button type="button" variant="ghost" size="sm" onClick={() => void copyShare(channel)}>
                      {copied === channel ? "복사됨" : "문구 복사"}
                    </Button>
                  </div>
                  <pre className="shareText">{buildShareText(channel, preview)}</pre>
                  <p className="shareHint muted">텍스트를 그대로 붙여넣어도 줄바꿈이 유지됩니다.</p>
                </article>
              ))}
            </GlassCard>
          </>
        ) : null}
      </div>

      {state === "success" && preview ? (
        <div className="stickyCta" role="region" aria-label="리포트 구매 선택">
          <div className="stickyCtaInner">
            {preview.ctas.map((cta) => (
              <ButtonLink key={cta.code} href={paywallHref(cta.code)} full variant={cta.code === "deep" ? "secondary" : "primary"}>
                {cta.label} · {cta.priceLabel}
              </ButtonLink>
            ))}
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}


export default function ResultPage() {
  return (
    <Suspense fallback={<main className="shell pageMain"><section className="card"><p>결과를 불러오는 중...</p></section></main>}>
      <ResultPageInner />
    </Suspense>
  );
}
