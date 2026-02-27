"use client";
import { useState } from "react";
import Link from "next/link";

export default function FacePage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!email.includes("@")) return;
    // TODO: POST to /api/email/subscribe
    setSubmitted(true);
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
            <div className="emailForm">
              <input
                type="email"
                className="input"
                placeholder="출시 알림 받기"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleSubmit}>알림</button>
            </div>
          )}

          <div className="buttonRow" style={{ justifyContent: "center", marginTop: 24 }}>
            <Link href="/#hero" className="btn btn-ghost btn-lg">사주 분석은 지금 바로 가능합니다 →</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
