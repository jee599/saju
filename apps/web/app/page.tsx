"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { track } from "../lib/analytics";

const ROTATING_COPIES = [
  "MBTI는 16가지. 당신의 사주는 518,400가지.",
  "역술가 5만원, AI 0원. 만세력은 같다.",
  "태어난 시간까지 넣으면 달라진다. 진짜로.",
  "사주 볼 때마다 달랐지? 만세력이 틀려서 그렇다.",
];

const STATS = [
  { value: "518,400+", label: "사주 조합 수" },
  { value: "<1초", label: "만세력 계산" },
  { value: "139건", label: "골든 테스트 검증" },
];

const FAQ_ITEMS = [
  { q: "사주(四柱)가 정확히 뭔가요?", a: "생년월일시를 기반으로 4개의 기둥(년주·월주·일주·시주)을 세워 운명의 흐름을 분석하는 동양 전통 명리학입니다. 각 기둥은 천간과 지지로 구성되며, 총 518,400가지 조합이 가능합니다." },
  { q: "무료와 유료의 차이는?", a: "무료 분석은 타고난 기질과 오행 밸런스 시각화를 제공합니다. 유료 프리미엄 리포트(₩5,900)는 올해 총운, 직업/재물, 연애/결혼, 건강, 가족 등 7개 섹션의 상세 AI 분석을 포함합니다." },
  { q: "태어난 시간을 모르면?", a: "시간 없이도 분석 가능합니다. 다만 시주(시간 기둥)가 빠지므로 정확도가 약간 낮아집니다. 부모님께 여쭤보시는 것을 추천드립니다." },
  { q: "개인정보는 안전한가요?", a: "생년월일과 성별만 사용하며, 이름은 리포트 표시용입니다. 무료 분석은 로그인 없이 이용 가능하고, 90일 후 자동 삭제됩니다." },
  { q: "AI가 사주를 어떻게 해석하나요?", a: "전통 만세력 알고리즘으로 사주를 계산한 후, Claude AI가 명리학 원칙에 기반해 현대적 언어로 해석합니다. 확정적 예언이 아닌 가능성과 경향 중심으로 분석합니다." },
];

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"saju" | "compat">("saju");
  const [birthDate, setBirthDate] = useState("1995-01-01");
  const [partnerBirthDate, setPartnerBirthDate] = useState("1995-01-01");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [rotateIdx, setRotateIdx] = useState(0);

  // Rotate copy every 4 seconds
  useState(() => {
    const timer = setInterval(() => setRotateIdx((i) => (i + 1) % ROTATING_COPIES.length), 4000);
    return () => clearInterval(timer);
  });

  const handleSajuStart = () => {
    track("input_start");
    router.push(`/free-fortune?birthDate=${birthDate}`);
  };

  const handleCompatStart = () => {
    track("compatibility_start");
    router.push(`/compatibility?my=${birthDate}&partner=${partnerBirthDate}`);
  };

  return (
    <main className="page">
      <div className="container">
        {/* ── Hero ─── */}
        <section className="glassCard" id="hero">
          <div className="heroMain">
            <p className="heroEyebrow">AI Four Pillars Analysis</p>
            <h1>나의 사주, 데이터로 풀다</h1>
            <p className="rotatingText heroSubtitle">
              {ROTATING_COPIES.map((copy, i) => (
                <span key={i}>{copy}</span>
              ))}
            </p>

            {/* Tabs */}
            <div className="tabGroup" style={{ marginTop: 24 }}>
              <button
                className={`tabBtn ${activeTab === "saju" ? "active" : ""}`}
                onClick={() => setActiveTab("saju")}
              >
                내 사주 ✦
              </button>
              <button
                className={`tabBtn ${activeTab === "compat" ? "active" : ""}`}
                onClick={() => setActiveTab("compat")}
              >
                궁합 💕
              </button>
            </div>

            {/* Saju Tab */}
            {activeTab === "saju" && (
              <div className="form">
                <div className="formGrid">
                  <div className="formGroup">
                    <label>생년월일</label>
                    <input
                      type="date"
                      className="input"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="buttonRow">
                  <button className="btn btn-primary btn-lg btn-full" onClick={handleSajuStart}>
                    무료 분석 시작
                  </button>
                </div>
              </div>
            )}

            {/* Compatibility Tab */}
            {activeTab === "compat" && (
              <div className="form">
                <div className="formGrid">
                  <div className="formGroup">
                    <label>내 생년월일</label>
                    <input
                      type="date"
                      className="input"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                  </div>
                  <div className="formGroup">
                    <label>상대 생년월일</label>
                    <input
                      type="date"
                      className="input"
                      value={partnerBirthDate}
                      onChange={(e) => setPartnerBirthDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="buttonRow">
                  <button className="btn btn-primary btn-lg btn-full" onClick={handleCompatStart}>
                    궁합 보기
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Stats Strip ─── */}
        <div className="statsStrip">
          {STATS.map((s) => (
            <div key={s.label} className="statItem">
              <div className="statValue">{s.value}</div>
              <div className="statLabel">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Free vs Premium ─── */}
        <section className="glassCard">
          <h2>무료 vs 프리미엄</h2>
          <p className="muted" style={{ marginTop: 8 }}>무료로 시작하고, 마음에 들면 전체 분석을 열어보세요.</p>
          <div className="pricingGrid" style={{ marginTop: 16 }}>
            <article className="pricingCard">
              <span className="badge badge-neutral">무료</span>
              <h3 style={{ marginTop: 8 }}>기본 분석</h3>
              <p className="price">₩0</p>
              <ul className="flatList compactList">
                <li>타고난 기질 AI 분석 (1파트)</li>
                <li>오행 밸런스 시각화</li>
                <li>일간(日干) 카드</li>
                <li>음양 비율</li>
              </ul>
            </article>
            <article className="pricingCard" style={{ borderColor: "rgba(167,139,218,0.3)" }}>
              <span className="badge badge-premium">프리미엄</span>
              <h3 style={{ marginTop: 8 }}>상세 분석</h3>
              <p className="price">₩5,900</p>
              <ul className="flatList compactList">
                <li>기본 분석 포함</li>
                <li>올해 총운</li>
                <li>직업/재물운</li>
                <li>연애/결혼운</li>
                <li>건강/가족 + 4개 섹션 더</li>
              </ul>
              <div className="buttonRow">
                <Link href="/#hero" className="btn btn-primary btn-full">무료로 시작하기</Link>
              </div>
            </article>
          </div>
        </section>

        {/* ── Precision Compare ─── */}
        <section className="glassCard">
          <h2>정밀도 비교</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
            <div className="statItem">
              <div className="statValue">16</div>
              <div className="statLabel">MBTI 유형</div>
            </div>
            <div className="statItem">
              <div className="statValue">518,400</div>
              <div className="statLabel">사주 조합</div>
            </div>
          </div>
          <p className="muted" style={{ marginTop: 12, textAlign: "center" }}>같은 질문, 32,400배 다른 해상도.</p>
        </section>

        {/* ── Engine Trust ─── */}
        <section className="glassCard">
          <h2>엔진 신뢰도</h2>
          <div className="statsStrip">
            <div className="statItem"><div className="statValue">만세력</div><div className="statLabel">전통 역법 기반</div></div>
            <div className="statItem"><div className="statValue">절기보정</div><div className="statLabel">입춘 기준 연주</div></div>
            <div className="statItem"><div className="statValue">139건</div><div className="statLabel">골든 테스트 검증</div></div>
          </div>
        </section>

        {/* ── FAQ ─── */}
        <section className="glassCard">
          <h2>자주 묻는 질문</h2>
          <div style={{ marginTop: 16 }}>
            {FAQ_ITEMS.map((faq, i) => (
              <div key={i} style={{ borderBottom: "1px solid var(--glass-border)", padding: "14px 0" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    background: "none", border: "none", color: "var(--t1)",
                    cursor: "pointer", width: "100%", textAlign: "left",
                    fontSize: "0.95rem", fontWeight: 650, padding: 0,
                    display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}
                >
                  {faq.q}
                  <span style={{ color: "var(--t3)", fontSize: "1.2rem" }}>{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <p style={{ marginTop: 8, color: "var(--t2)", fontSize: "0.9rem", lineHeight: 1.7 }}>{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
