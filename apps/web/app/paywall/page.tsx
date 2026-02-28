"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
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
  const gender = params.get("gender") ?? "other";
  const calendarType = params.get("calendarType") ?? "solar";
  const [selectedModel, setSelectedModel] = useState(params.get("model") ?? "sonnet");
  const config = MODEL_CONFIG[selectedModel] ?? MODEL_CONFIG.sonnet;
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    track("paywall_view");
  }, []);

  const handleCheckout = async (ctaPosition: "top" | "middle" | "sticky") => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError("올바른 이메일 형식을 입력해주세요.");
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
          model: selectedModel,
          input: { name, birthDate, birthTime, gender, calendarType },
        }),
      });

      if (!res.ok) throw new Error("결제 생성 실패");
      const data = await res.json();
      const orderId = data.data?.order?.orderId ?? data.order?.orderId;
      if (!orderId) throw new Error("주문 ID를 받지 못했습니다.");

      const confirmRes = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (!confirmRes.ok) throw new Error("결제 확인 실패");

      track("purchase_complete", { price_variant: selectedModel, value: config.price });
      router.push(`/loading-analysis?redirect=${encodeURIComponent(`/report/${orderId}`)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "결제 중 오류가 발생했습니다.");
      track("checkout_fail");
    } finally {
      setLoading(false);
    }
  };

  const models = [
    { key: "gpt", label: "GPT 분석", sub: "~40,000자 · 10섹션", price: "₩3,900", badge: "" },
    { key: "sonnet", label: "Sonnet 분석", sub: "~30,000자 · 10섹션", price: "₩5,900", badge: "추천" },
    { key: "opus", label: "Opus 분석", sub: "~20,000자 · 최고품질", price: "₩9,900", badge: "프리미엄" },
  ];

  return (
    <main className="page">
      <div className="container">
        {/* Price anchoring */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <p style={{ fontSize: "0.85rem", color: "var(--t2)" }}>
            <span style={{ textDecoration: "line-through", opacity: 0.6 }}>역술가 상담 1회 50,000원~</span>
            {" → "}
            <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>AI 분석 {config.priceLabel}부터</span>
          </p>
        </div>

        {/* Model selection */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
          {models.map((m) => (
            <button
              key={m.key}
              onClick={() => setSelectedModel(m.key)}
              style={{
                padding: "14px 8px",
                border: selectedModel === m.key ? "2px solid var(--accent)" : "1px solid var(--glass-border)",
                borderRadius: "var(--radius-sm)",
                background: selectedModel === m.key ? "rgba(196,139,159,0.1)" : "var(--bg-card)",
                cursor: "pointer",
                textAlign: "center",
                position: "relative",
                transition: "all 0.2s",
              }}
            >
              {m.badge && (
                <span style={{
                  position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
                  background: m.badge === "추천" ? "var(--accent)" : "var(--accent-gold)",
                  color: "#fff", fontSize: "0.65rem", fontWeight: 700,
                  padding: "2px 8px", borderRadius: 10,
                }}>{m.badge}</span>
              )}
              <div style={{ fontWeight: 700, fontSize: "1.1rem", color: selectedModel === m.key ? "var(--accent)" : "var(--t1)", marginTop: m.badge ? 4 : 0 }}>
                {m.price}
              </div>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--t1)", marginTop: 4 }}>{m.label}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--t2)", marginTop: 2 }}>{m.sub}</div>
            </button>
          ))}
        </div>

        <section className="glassCard">
          <h2 style={{ textAlign: "center", fontSize: "1.2rem" }}>{name}님의 전체 사주 분석</h2>
          <p className="muted" style={{ textAlign: "center", marginTop: 4 }}>
            {config.chars} · {config.sections} 상세 AI 분석
          </p>

          <div style={{ marginTop: 20, textAlign: "left" }}>
            <ul className="flatList compactList">
              <li>📊 올해 총운 — 전체적인 운세 흐름</li>
              <li>💼 직업/재물 — 커리어와 재물의 방향</li>
              <li>💕 연애/결혼 — 인연의 시기와 특성</li>
              <li>💰 금전운 — 재물의 흐름과 투자 시기</li>
              <li>🏥 건강 — 주의할 건강 포인트</li>
              <li>👨‍👩‍👧‍👦 가족·배우자 — 관계의 흐름</li>
              <li>⏳ 과거·현재·미래 — 시간 흐름 분석</li>
              <li>📅 대운 타임라인 — 10년 주기 분석</li>
            </ul>
          </div>

          {/* Trust badges */}
          <div style={{
            display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12,
            marginTop: 20, padding: "12px 0",
            borderTop: "1px solid var(--glass-border)", borderBottom: "1px solid var(--glass-border)",
          }}>
            <span style={{ fontSize: "0.78rem", color: "var(--t2)" }}>🔒 안전한 결제</span>
            <span style={{ fontSize: "0.78rem", color: "var(--t2)" }}>↩️ 24시간 환불 보장</span>
            <span style={{ fontSize: "0.78rem", color: "var(--t2)" }}>📧 이메일 리포트 전송</span>
          </div>

          {/* User count social proof */}
          <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--t2)", marginTop: 12 }}>
            이미 분석을 완료한 사용자들이 있습니다
          </p>

          {/* Email + checkout */}
          <div className="form" style={{ maxWidth: 400, margin: "20px auto 0" }}>
            <div className="formGroup">
              <label>이메일 (리포트를 이메일로도 보내드려요)</label>
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

          <p className="muted" style={{ marginTop: 16, fontSize: "0.8rem", textAlign: "center" }}>
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
