"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { track, trackCheckoutStart } from "../../lib/analytics";

const MODEL_CONFIG: Record<string, { label: string; chars: string; price: number; priceLabel: string; sections: string }> = {
  opus: { label: "Claude Opus 4.6", chars: "~20,000자", price: 9900, priceLabel: "₩9,900", sections: "10개 섹션" },
  sonnet: { label: "Claude Sonnet 4.6", chars: "~30,000자", price: 5900, priceLabel: "₩5,900", sections: "10개 섹션" },
  gpt: { label: "GPT 5.3", chars: "~40,000자", price: 3900, priceLabel: "₩3,900", sections: "10개 섹션" },
};

function PaywallContent() {
  const params = useSearchParams();
  const router = useRouter();
  const birthDate = params.get("birthDate") ?? "";
  const birthTime = params.get("birthTime") ?? "";
  const name = params.get("name") ?? "";
  const modelParam = params.get("model") ?? "sonnet";
  const config = MODEL_CONFIG[modelParam] ?? MODEL_CONFIG.sonnet;
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  track("paywall_view");

  const handleCheckout = async (ctaPosition: "top" | "middle" | "sticky") => {
    if (!email || !email.includes("@")) {
      setError("이메일을 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    trackCheckoutStart(ctaPosition);

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: "full",
          model: modelParam,
          input: { name, birthDate, birthTime, gender: "other", calendarType: "solar" },
        }),
      });

      if (!res.ok) throw new Error("결제 생성 실패");
      const data = await res.json();
      const orderId = data.data?.order?.orderId ?? data.order?.orderId;

      // Confirm (mock)
      const confirmRes = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (!confirmRes.ok) throw new Error("결제 확인 실패");

      track("purchase_complete", { price_variant: modelParam, value: config.price });
      router.push(`/loading-analysis?redirect=/report/${orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "결제 중 오류가 발생했습니다.");
      track("checkout_fail");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <div className="container">
        <section className="glassCard" style={{ textAlign: "center" }}>
          <span className="badge badge-premium">{config.label}</span>
          <h1 style={{ marginTop: 16 }}>{config.priceLabel}</h1>
          <p className="muted" style={{ marginTop: 8 }}>{config.chars} · {config.sections} 상세 AI 분석</p>

          <div style={{ marginTop: 24, textAlign: "left" }}>
            <ul className="flatList compactList">
              <li>성격 분석 — 타고난 기질과 성향</li>
              <li>직업/재물 — 커리어와 재물의 방향</li>
              <li>연애/결혼 — 인연의 시기와 특성</li>
              <li>금전운 — 재물의 흐름과 투자 시기</li>
              <li>건강 — 주의할 건강 포인트</li>
              <li>가족·배우자 — 관계의 흐름</li>
              <li>과거·현재·미래 — 시간 흐름 분석</li>
              <li>대운 타임라인 — 10년 주기 분석</li>
            </ul>
          </div>

          <div className="form" style={{ maxWidth: 400, margin: "24px auto 0" }}>
            <div className="formGroup">
              <label>이메일 (리포트 보관용)</label>
              <input
                type="email"
                className={`input ${error ? "inputError" : ""}`}
                placeholder="email@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
              />
              {error && <p className="errorText">{error}</p>}
            </div>
            <div className="buttonRow">
              <button
                className="btn btn-primary btn-lg btn-full"
                onClick={() => handleCheckout("top")}
                disabled={loading}
              >
                {loading ? "결제 처리 중..." : `${config.priceLabel} 결제하기`}
              </button>
            </div>
          </div>

          <p className="muted" style={{ marginTop: 16, fontSize: "0.8rem" }}>
            결제 후 즉시 전체 리포트를 확인할 수 있습니다.
            <br />환불 정책은 <a href="/refund" style={{ color: "var(--accent)" }}>여기</a>에서 확인하세요.
          </p>
        </section>
      </div>
    </main>
  );
}

export default function PaywallPage() {
  return (
    <Suspense fallback={<div className="loadingScreen"><p className="muted">결제 페이지 로딩 중...</p></div>}>
      <PaywallContent />
    </Suspense>
  );
}
