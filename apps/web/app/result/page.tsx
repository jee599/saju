"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ProductCode, ReportPreview } from "@saju/shared";
import { webApi } from "../../lib/api";
import { trackEvent } from "../../lib/analytics";
import { buildShareText, toInputFromParams, toInputQuery } from "../../lib/fortune";

type LoadState = "idle" | "loading" | "success" | "error";
type ShareChannel = "instagram" | "kakao";

const channelLabels: Record<ShareChannel, string> = {
  instagram: "Instagram 스타일",
  kakao: "Kakao 메시지 스타일"
};

export default function ResultPage() {
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
    <main className="shell pageMain">
      <section className="card">
        <h1>무료 결과 미리보기</h1>
        <p className="muted">무료 영역 확인 후, 필요한 경우 결제 시뮬레이션으로 전체 리포트를 열람할 수 있습니다.</p>
        <div className="inlineActions">
          <Link href="/free-fortune">입력 수정</Link>
          <button type="button" onClick={() => void loadPreview()} className="ghostButton">
            다시 불러오기
          </button>
        </div>
      </section>

      {state === "loading" ? (
        <section className="card sectionGap">
          <p>결과를 계산하고 있습니다...</p>
        </section>
      ) : null}

      {state === "error" ? (
        <section className="card sectionGap">
          <p className="errorText">{error}</p>
          <button type="button" onClick={() => void loadPreview()}>
            재시도
          </button>
        </section>
      ) : null}

      {state === "success" && preview ? (
        <>
          <section className="card sectionGap">
            <h2>{preview.free.headline}</h2>
            <p>{preview.free.summary}</p>
            {preview.free.sections.map((section) => (
              <article key={section.key} className="sectionBlock">
                <h3>{section.title}</h3>
                <p>{section.text}</p>
              </article>
            ))}
          </section>

          <section className="card sectionGap">
            <h2>잠금 영역 미리보기</h2>
            <p className="muted">결제 시뮬레이션 완료 후 전체 문장을 확인할 수 있습니다.</p>
            {preview.paid.deep.sections.map((section) => (
              <article key={section.key} className="lockedBlock">
                <h3>{section.title}</h3>
                <p className="blurredText">{section.text}</p>
                <span className="lockBadge">잠금</span>
              </article>
            ))}

            <div className="ctaRow">
              {preview.ctas.map((cta) => (
                <Link key={cta.code} href={paywallHref(cta.code)} className="primaryLink center">
                  {cta.label} {cta.priceLabel}
                </Link>
              ))}
            </div>
          </section>

          <section className="card sectionGap">
            <h2>공유 카드 문구</h2>
            <p className="muted">채널 성격에 맞춰 문구를 복사할 수 있습니다.</p>
            {(Object.keys(channelLabels) as ShareChannel[]).map((channel) => (
              <article key={channel} className="shareItem">
                <h3>{channelLabels[channel]}</h3>
                <pre className="shareText">{buildShareText(channel, preview)}</pre>
                <button type="button" onClick={() => void copyShare(channel)}>
                  {copied === channel ? "복사됨" : "문구 복사"}
                </button>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </main>
  );
}
