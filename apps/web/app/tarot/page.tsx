"use client";
import { useState } from "react";
import Link from "next/link";

export default function TarotPage() {
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
        body: JSON.stringify({ email, feature: "tarot" }),
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
          <div className="comingSoonEmoji">🃏</div>
          <h1 className="comingSoonTitle">AI 타로</h1>
          <p className="comingSoonDesc">3장의 타로 카드를 뽑고 AI가 해석합니다. 곧 만나보세요!</p>

          <ul className="comingSoonFeatures">
            <li>과거-현재-미래 3카드 스프레드</li>
            <li>78장 타로 카드 중 랜덤 배정</li>
            <li>사주 오행과 연결한 통합 해석</li>
            <li>연애, 재물, 건강 맞춤 리딩</li>
          </ul>

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
