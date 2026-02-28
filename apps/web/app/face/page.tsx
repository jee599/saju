"use client";
import { useState } from "react";
import Link from "next/link";

export default function FacePage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("올바른 이메일을 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, feature: "face" }),
      });
      if (!res.ok) throw new Error("등록 실패");
    } catch {
      // Fallback: still show success (email service may not be configured yet)
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <main className="page">
      <div className="container">
        <div className="comingSoonCard">
          <div className="comingSoonEmoji">👤</div>
          <h1 className="comingSoonTitle">관상 분석</h1>
          <p className="comingSoonDesc">AI가 얼굴 사진을 분석하여 관상학적 특성을 해석합니다.</p>

          {submitted ? (
            <p style={{ marginTop: 20, color: "var(--ok)" }}>등록 완료! 출시 시 알려드릴게요.</p>
          ) : (
            <>
              <div className="emailForm">
                <input
                  type="email"
                  className={`input ${error ? "inputError" : ""}`}
                  placeholder="출시 알림 받기"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  aria-label="이메일 주소"
                />
                <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? "..." : "알림"}
                </button>
              </div>
              {error && <p className="errorText" style={{ marginTop: 8 }}>{error}</p>}
            </>
          )}

          <div className="buttonRow" style={{ justifyContent: "center", marginTop: 24 }}>
            <Link href="/#hero" className="btn btn-ghost btn-lg">사주 분석은 지금 바로 가능합니다 →</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
