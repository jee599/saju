"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { track } from "../lib/analytics";

const ROTATING_COPIES = [
  "MBTI는 16가지. 사주는 518,400가지.",
  "역술가 5만원, AI 0원. 만세력은 같다.",
  "태어난 시간까지 넣으면 달라진다.",
  "사주 볼 때마다 달랐지? 만세력 때문이다.",
];

const ENGINE_PILLARS = [
  {
    icon: "📐",
    title: "정확성",
    subtitle: "만세력 기반 정밀 계산",
    desc: "1930~2010년 출생자 기준 139건의 골든 테스트를 100% 통과. 절기(節氣) 경계 자동 보정으로 연주·월주 오류를 원천 차단합니다.",
  },
  {
    icon: "📜",
    title: "정통성",
    subtitle: "5대 고전 원전 참조",
    desc: "적천수·자평진전·궁통보감·연해자평·삼명통회. 수백 년간 검증된 명리학 이론을 현대 AI가 체계적으로 해석합니다.",
  },
  {
    icon: "⚡",
    title: "접근성",
    subtitle: "1초 이내 AI 분석",
    desc: "복잡한 만세력 계산부터 오행 분석, 용신 판단까지 AI가 1초 안에 완료. 역술가 방문 없이 언제든 확인하세요.",
  },
];


const FAQ_ITEMS = [
  { q: "사주 분석은 어떤 원리에 기반하나요?", a: "생년월일시를 기반으로 4개의 기둥(년주·월주·일주·시주)을 세워 운명의 흐름을 분석하는 동양 전통 명리학입니다. 적천수·자평진전 등 5대 고전 원전을 참조합니다." },
  { q: "무료와 프리미엄의 차이는?", a: "무료 분석은 일간(日干), 오행 밸런스, 음양 비율 등 타고난 기질을 제공합니다. 프리미엄은 약 30,000자 분량의 10개 섹션 상세 AI 분석(성격, 직업, 연애, 금전, 건강, 가족, 과거, 현재, 미래, 대운 타임라인)을 포함합니다." },
  { q: "AI는 사주를 어떻게 분석하나요?", a: "만세력 엔진이 절기·역법을 정밀 계산한 후, Claude/GPT 등 최신 AI가 5대 고전 원전의 해석 체계를 적용해 개인 맞춤 리포트를 생성합니다." },
  { q: "태어난 시간을 모르면?", a: "시간 없이도 분석 가능합니다. 다만 시주(시간 기둥)가 빠져 정확도가 약간 낮아집니다. 출생신고서나 부모님께 확인해보시는 것을 권장합니다." },
  { q: "개인정보는 안전한가요?", a: "생년월일과 성별만 사용하며, 이름은 리포트 표시용입니다. 무료 분석은 로그인 없이 이용 가능하고, 90일 후 자동 삭제됩니다." },
  { q: "사주에 좋고 나쁨이 있나요?", a: "사주 자체에 좋고 나쁨은 없습니다. 타고난 기질과 시기별 흐름의 차이일 뿐이며, 본 서비스는 확률적 해석을 제공합니다. 의료·법률·투자 판단의 근거로 사용하지 마세요." },
];

const YEARS = Array.from({ length: 81 }, (_, i) => 2010 - i); // 1930~2010
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function getDaysInMonth(year: string, month: string): number[] {
  if (!year || !month) return Array.from({ length: 31 }, (_, i) => i + 1);
  const daysCount = new Date(Number(year), Number(month), 0).getDate();
  return Array.from({ length: daysCount }, (_, i) => i + 1);
}

const EARTHLY_BRANCHES = [
  { label: "자시 (子)", time: "23:00~01:00", value: "23" },
  { label: "축시 (丑)", time: "01:00~03:00", value: "1" },
  { label: "인시 (寅)", time: "03:00~05:00", value: "3" },
  { label: "묘시 (卯)", time: "05:00~07:00", value: "5" },
  { label: "진시 (辰)", time: "07:00~09:00", value: "7" },
  { label: "사시 (巳)", time: "09:00~11:00", value: "9" },
  { label: "오시 (午)", time: "11:00~13:00", value: "11" },
  { label: "미시 (未)", time: "13:00~15:00", value: "13" },
  { label: "신시 (申)", time: "15:00~17:00", value: "15" },
  { label: "유시 (酉)", time: "17:00~19:00", value: "17" },
  { label: "술시 (戌)", time: "19:00~21:00", value: "19" },
  { label: "해시 (亥)", time: "21:00~23:00", value: "21" },
];

function padTwo(n: number) {
  return n.toString().padStart(2, "0");
}

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [hour, setHour] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [calendarType, setCalendarType] = useState<"solar" | "lunar">("solar");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  const availableDays = getDaysInMonth(year, month);

  // Auto-focus name input on mount
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Reset day if it exceeds available days in selected month
  useEffect(() => {
    if (day && Number(day) > availableDays.length) {
      setDay("");
    }
  }, [year, month, day, availableDays.length]);

  // Step logic: each step unlocks when previous is done
  const hasName = name.trim().length >= 1;
  const hasDate = year !== "" && month !== "" && day !== "";
  const hasGender = gender !== "";

  const birthDate = hasDate ? `${year}-${padTwo(+month)}-${padTwo(+day)}` : "";
  const birthTime = hour !== "" && hour !== "skip" ? `${padTwo(+hour)}:00` : "";

  const canAnalyze = hasName && hasDate && hasGender;

  const handleAnalyze = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    track("input_complete");
    const q = new URLSearchParams({
      name,
      birthDate,
      gender,
      calendarType,
      ...(birthTime ? { birthTime } : {}),
    });
    router.push(`/loading-analysis?redirect=${encodeURIComponent(`/result?${q.toString()}`)}`);
  };

  return (
    <main className="page">
      <div className="container">
        {/* ── Hero ─── */}
        <section className="glassCard" id="hero">
          <div className="heroMain">
            <p className="heroEyebrow">AI Four Pillars Analysis</p>
            <h1>사주는, 빅데이터입니다</h1>
            <p className="rotatingText heroSubtitle">
              {ROTATING_COPIES.map((copy, i) => (
                <span key={i}>{copy}</span>
              ))}
            </p>

            {/* ── Progressive Form ─── */}
            <div className="progressiveForm">
              {/* Step 1: 이름 */}
              <div className="formStep visible">
                <div className="formStepLabel">
                  <span className="stepNum">1</span> 이름
                </div>
                <input
                  ref={nameRef}
                  className="input"
                  placeholder="이름을 입력하세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  aria-label="이름"
                />
              </div>

              {/* Step 2: 생년월일 */}
              <div className={`formStep ${hasName ? "visible" : ""}`}>
                <div className="formStepLabel">
                  <span className="stepNum">2</span> 생년월일
                </div>
                <div className="pillGroup" style={{ marginBottom: 10 }}>
                  <button
                    type="button"
                    className={`pill ${calendarType === "solar" ? "selected" : ""}`}
                    onClick={() => setCalendarType("solar")}
                  >
                    양력
                  </button>
                  <button
                    type="button"
                    className={`pill ${calendarType === "lunar" ? "selected" : ""}`}
                    onClick={() => setCalendarType("lunar")}
                  >
                    음력
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    className="select"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    style={{ flex: 1.2 }}
                    aria-label="출생 년도"
                  >
                    <option value="">년도</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}년</option>
                    ))}
                  </select>
                  <select
                    className="select"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    style={{ flex: 1 }}
                    aria-label="출생 월"
                  >
                    <option value="">월</option>
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>{m}월</option>
                    ))}
                  </select>
                  <select
                    className="select"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    style={{ flex: 1 }}
                    aria-label="출생 일"
                  >
                    <option value="">일</option>
                    {availableDays.map((d) => (
                      <option key={d} value={d}>{d}일</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 3: 태어난 시간 (12지지) */}
              <div className={`formStep ${hasDate ? "visible" : ""}`}>
                <div className="formStepLabel">
                  <span className="stepNum">3</span> 태어난 시간
                  <button
                    className="skipBtn"
                    onClick={() => setHour("skip")}
                    type="button"
                  >
                    모르겠어요 →
                  </button>
                </div>
                <div className="branchGrid">
                  <button
                    type="button"
                    className={`branchPill ${hour === "skip" ? "selected" : ""}`}
                    onClick={() => setHour("skip")}
                  >
                    <span className="branchName">모름</span>
                    <span className="branchTime">시간을 모를 때</span>
                  </button>
                  {EARTHLY_BRANCHES.map((b) => (
                    <button
                      key={b.value}
                      type="button"
                      className={`branchPill ${hour === b.value ? "selected" : ""}`}
                      onClick={() => setHour(b.value)}
                    >
                      <span className="branchName">{b.label}</span>
                      <span className="branchTime">{b.time}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 4: 성별 */}
              <div className={`formStep ${hour !== "" ? "visible" : ""}`}>
                <div className="formStepLabel">
                  <span className="stepNum">4</span> 성별
                </div>
                <div className="pillGroup">
                  {[
                    { label: "남성", value: "male" as const },
                    { label: "여성", value: "female" as const },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      className={`pill ${gender === opt.value ? "selected" : ""}`}
                      onClick={() => setGender(opt.value)}
                      type="button"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className={`formCta ${canAnalyze ? "visible" : ""}`}>
                <button
                  className="btn btn-primary btn-lg btn-full"
                  onClick={handleAnalyze}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "분석 준비 중..." : "무료 분석 시작"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section Divider ─── */}
        <div className="sectionDivider" />

        {/* ── Engine Trust ─── */}
        <section className="landingSection engineTrust">
          <h2 className="sectionHeading">정통 명리학을 해석하는 AI</h2>
          <p className="sectionSubheading">
            전문가에게 받던 분석을 누구나 쉽게 확인하세요. 전문가의 깊이와 AI의 접근성, 둘 다 놓치지 않아요.
          </p>

          {/* 3 pillar cards */}
          <div className="enginePillars">
            {ENGINE_PILLARS.map((p) => (
              <article key={p.title} className="enginePillarCard">
                <h3>{p.title}</h3>
                <p className="enginePillarSub">{p.subtitle}</p>
                <p className="enginePillarDesc">{p.desc}</p>
              </article>
            ))}
          </div>

          <div className="sectionCta">
            <Link href="/#hero" className="btn btn-secondary btn-lg">
              내 분석 리포트 보기 &rsaquo;
            </Link>
          </div>
        </section>

        {/* ── Section Divider ─── */}
        <div className="sectionDivider" />

        {/* ── Free vs Premium ─── */}
        <section className="landingSection">
          <h2 className="sectionHeading">무료로 시작하세요</h2>
          <p className="sectionSubheading">
            기본 분석은 무료. 마음에 들면 프리미엄으로 전체 분석을 열어보세요.
          </p>
          <div className="pricingGrid">
            <article className="pricingCard">
              <span className="badge badge-neutral">무료</span>
              <h3 style={{ marginTop: 12 }}>기본 분석</h3>
              <p className="price">₩0</p>
              <ul className="flatList compactList">
                <li>타고난 기질 AI 분석 (1파트)</li>
                <li>오행 밸런스 시각화</li>
                <li>일간(日干) 카드</li>
                <li>음양 비율</li>
              </ul>
            </article>
            <article className="pricingCard pricingCardPremium">
              <span className="badge badge-premium">프리미엄</span>
              <h3 style={{ marginTop: 12 }}>상세 분석</h3>
              <p className="price">₩4,900</p>
              <ul className="flatList compactList">
                <li>기본 분석 포함</li>
                <li>약 20,000~40,000자 AI 장문 분석</li>
                <li>10개 섹션 (성격·직업·연애·금전·건강 등)</li>
                <li>대운 타임라인 (10년 주기)</li>
                <li>AI 모델 선택 (Opus / Sonnet / GPT)</li>
              </ul>
              <div className="buttonRow">
                <Link href="/#hero" className="btn btn-primary btn-full">
                  무료로 시작하기
                </Link>
              </div>
            </article>
          </div>
        </section>

        {/* ── Section Divider ─── */}
        <div className="sectionDivider" />

        {/* ── FAQ ─── */}
        <section className="landingSection">
          <h2 className="sectionHeading">자주 묻는 질문</h2>
          <div className="faqList">
            {FAQ_ITEMS.map((faq, i) => (
              <div key={i} className="faqItem">
                <button
                  className="faqQuestion"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  {faq.q}
                  <span className="faqToggle" aria-hidden="true">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <p className="faqAnswer">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ─── */}
        <section className="landingSection" style={{ textAlign: "center" }}>
          <h2 className="sectionHeading">나의 사주, 지금 확인하세요</h2>
          <p className="sectionSubheading">
            무료로 시작하고, AI가 분석한 당신만의 리포트를 받아보세요.
          </p>
          <div className="sectionCta">
            <Link href="/#hero" className="btn btn-primary btn-lg">
              무료 분석 시작 &rsaquo;
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
