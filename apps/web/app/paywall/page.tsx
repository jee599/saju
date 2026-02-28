"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { track, trackCheckoutStart } from "../../lib/analytics";

/** 테스트 모드: 단일 ₩5,900 버튼. 나중에 모델 선택 원복 예정. */
const FIXED_PRICE = 5900;
const FIXED_PRICE_LABEL = "₩5,900";

function PaywallContent() {
  const params = useSearchParams();
  const router = useRouter();
  const birthDate = params.get("birthDate") ?? "";
  const birthTime = params.get("birthTime") ?? "";
  const name = params.get("name") ?? "";
  const gender = params.get("gender") ?? "other";
  const calendarType = params.get("calendarType") ?? "solar";
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
          input: { name, birthDate, birthTime, gender, calendarType },
        }),
      });

      if (!res.ok) throw new Error("결제 생성 실패");
      const data = await res.json();
      const orderId = data.data?.order?.orderId ?? data.order?.orderId;
      if (!orderId) throw new Error("주문 ID를 받지 못했습니다.");

      track("purchase_complete", { value: FIXED_PRICE });

      // 즉시 로딩 페이지로 이동 → 로딩 페이지에서 confirm 호출
      router.push(`/loading-analysis?orderId=${orderId}`);
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
        {/* Price anchoring */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <p style={{ fontSize: "0.85rem", color: "var(--t2)" }}>
            <span style={{ textDecoration: "line-through", opacity: 0.6 }}>역술가 상담 1회 50,000원~</span>
            {" → "}
            <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>AI 분석 {FIXED_PRICE_LABEL}</span>
          </p>
        </div>

        <section className="glassCard">
          <h2 style={{ textAlign: "center", fontSize: "1.2rem" }}>{name}님의 전체 사주 분석</h2>
          <p className="muted" style={{ textAlign: "center", marginTop: 4 }}>
            10개 섹션 상세 AI 분석
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
                {loading ? "주문 생성 중..." : `${FIXED_PRICE_LABEL} 결제하기`}
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
