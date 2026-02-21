"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { FortuneInput, ProductCta, ReportPreview } from "@saju/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type SharePreset = "today" | "core" | "caution";

const sharePresetLabels: Record<SharePreset, string> = {
  today: "오늘의 한줄",
  core: "성향핵심",
  caution: "주의포인트"
};

const toInputFromParams = (searchParams: URLSearchParams): FortuneInput | null => {
  const name = searchParams.get("name")?.trim() ?? "";
  const birthDate = searchParams.get("birthDate") ?? "";
  const birthTime = searchParams.get("birthTime") ?? "";
  const gender = searchParams.get("gender") as FortuneInput["gender"] | null;
  const calendarType = searchParams.get("calendarType") as FortuneInput["calendarType"] | null;

  if (!name || !birthDate || !gender || !calendarType) {
    return null;
  }

  return {
    name,
    birthDate,
    birthTime,
    gender,
    calendarType
  };
};

const buildShareText = (preset: SharePreset, preview: ReportPreview): string => {
  const firstFree = preview.free.sections[0]?.text ?? preview.free.summary;

  if (preset === "today") {
    return `오늘의 한줄: ${preview.free.summary}`;
  }
  if (preset === "core") {
    return `성향핵심: ${firstFree}`;
  }
  return `주의포인트: ${preview.paid.standard.teaser}`;
};

export default function ResultPage() {
  const searchParams = useSearchParams();
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedPreset, setCopiedPreset] = useState<SharePreset | null>(null);

  const input = useMemo(() => toInputFromParams(searchParams), [searchParams]);

  useEffect(() => {
    if (!input) {
      setError("입력값이 없어 결과를 생성할 수 없습니다.");
      return;
    }

    const run = async () => {
      setLoading(true);
      setError(null);
      setCopiedPreset(null);

      try {
        const response = await fetch(`${API_URL}/report/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input)
        });

        if (!response.ok) {
          throw new Error("리포트 미리보기 생성에 실패했습니다.");
        }

        const data = (await response.json()) as ReportPreview;
        setPreview(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [input]);

  const copyShareText = async (preset: SharePreset) => {
    if (!preview) return;

    const text = buildShareText(preset, preview);
    await navigator.clipboard.writeText(text);
    setCopiedPreset(preset);
  };

  const renderCta = (cta: ProductCta) => {
    return (
      <button key={cta.code} type="button" className="secondaryButton">
        {cta.label} {cta.priceLabel}
      </button>
    );
  };

  return (
    <main>
      <section className="card">
        <h1>결과 미리보기</h1>
        <p className="muted">무료 영역은 공개, 심화 영역은 잠금 상태로 제공됩니다.</p>
        <div style={{ marginTop: 12 }}>
          <Link href="/free-fortune">입력으로 돌아가기</Link>
        </div>
      </section>

      {loading ? (
        <section className="card" style={{ marginTop: 16 }}>
          <p>리포트 생성 중입니다...</p>
        </section>
      ) : null}

      {error ? (
        <section className="card" style={{ marginTop: 16 }}>
          <p style={{ color: "#b91c1c" }}>{error}</p>
        </section>
      ) : null}

      {preview ? (
        <>
          <section className="card" style={{ marginTop: 16 }}>
            <h2>{preview.free.headline}</h2>
            <p>{preview.free.summary}</p>
            {preview.free.sections.map((section) => (
              <article key={section.key} className="sectionBlock">
                <h3>{section.title}</h3>
                <p>{section.text}</p>
              </article>
            ))}
          </section>

          <section className="card" style={{ marginTop: 16 }}>
            <h2>심화 리포트 미리보기 (잠금)</h2>
            <p className="muted">잠금된 항목은 상품 구매 후 전체 열람 가능합니다.</p>
            {preview.paid.deep.sections.map((section) => (
              <article key={section.key} className="lockedBlock">
                <h3>{section.title}</h3>
                <p className="blurredText">{section.text}</p>
                <span className="lockBadge">잠금</span>
              </article>
            ))}

            <div className="ctaRow">
              {preview.ctas.map((cta) => renderCta(cta))}
            </div>
          </section>

          <section className="card" style={{ marginTop: 16 }}>
            <h2>공유 카드 텍스트 생성기</h2>
            <p className="muted">Instagram/Kakao 공유용 문구를 바로 복사하세요.</p>

            {(["today", "core", "caution"] as SharePreset[]).map((preset) => (
              <article key={preset} className="shareItem">
                <h3>{sharePresetLabels[preset]}</h3>
                <p>{buildShareText(preset, preview)}</p>
                <button type="button" onClick={() => void copyShareText(preset)}>
                  {copiedPreset === preset ? "복사됨" : "문구 복사"}
                </button>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </main>
  );
}
