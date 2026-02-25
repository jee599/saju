"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CalendarType, FortuneInput, Gender } from "../lib/types";
import { trackEvent } from "../lib/analytics";
import { toInputQuery } from "../lib/fortune";
import { Button, ButtonLink, GlassCard, PageContainer, SectionTitle } from "./components/ui";

const pricing = {
  title: "장문 리포트",
  price: "₩12,900",
  desc: "대화형 한국어 장문 해설",
  points: [
    "성격/직업/연애/금전/건강/가족·배우자 6개 도메인",
    "도메인별 과거→현재→미래 흐름 설명",
    "용어 의미를 문장 안에서 풀어주는 확률형 결론",
    "마지막 대운 타임라인 정리"
  ]
} as const;

const trustItems = [
  {
    icon: "🔒",
    title: "재현성 확보",
    desc: "입력값 해시 기반의 결정론적(seed) 생성으로 같은 입력에 같은 결과"
  },
  {
    icon: "📊",
    title: "확률 기반 표현",
    desc: "확정 예언형 문구 대신 가능성·경향 중심으로 서술"
  },
  {
    icon: "⚖️",
    title: "책임 있는 안내",
    desc: "중요 의사결정 단독 근거 사용 금지 원칙을 전면 고지"
  }
] as const;

const defaultInput: FortuneInput = {
  name: "",
  birthDate: "",
  birthTime: "",
  gender: "male",
  calendarType: "solar"
};

export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = useState<FortuneInput>(defaultInput);
  const [submitted, setSubmitted] = useState(false);

  const nameValid = input.name.trim().length >= 2;
  const birthDateValid = Boolean(input.birthDate);
  const canSubmit = useMemo(() => nameValid && birthDateValid, [nameValid, birthDateValid]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!canSubmit) return;

    trackEvent("hero_form_submit", {
      hasBirthTime: Boolean(input.birthTime),
      calendarType: input.calendarType,
      gender: input.gender
    });

    router.push(`/result?${toInputQuery(input)}`);
  };

  return (
    <PageContainer>
      {/* ── Hero + Inline Form ── */}
      <GlassCard className="heroCard">
        <p className="heroEyebrow">✦ AI 확률 기반 사주 분석</p>
        <h1>당신의 사주를 AI가 분석합니다</h1>
        <p className="lead">
          전통 명리 해석에 확률 언어를 결합한 무료 요약 리포트를 지금 바로 받아보세요.
        </p>

        <form onSubmit={submit} className="heroForm" noValidate>
          <div className="heroFormGrid">
            <div className="heroFormGroup">
              <label htmlFor="hero-name">이름</label>
              <input
                id="hero-name"
                className={`input ${submitted && !nameValid ? "inputError" : ""}`}
                value={input.name}
                onChange={(e) => setInput((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="홍길동"
                autoComplete="name"
                required
              />
              {submitted && !nameValid ? <p className="errorText">이름은 2자 이상 입력해 주세요.</p> : null}
            </div>

            <div className="heroFormGroup">
              <label htmlFor="hero-birthDate">생년월일</label>
              <input
                id="hero-birthDate"
                className={`input ${submitted && !birthDateValid ? "inputError" : ""}`}
                type="date"
                value={input.birthDate}
                onChange={(e) => setInput((prev) => ({ ...prev, birthDate: e.target.value }))}
                required
              />
              {submitted && !birthDateValid ? <p className="errorText">생년월일을 입력해 주세요.</p> : null}
            </div>

            <div className="heroFormGroup">
              <label htmlFor="hero-gender">성별</label>
              <select
                id="hero-gender"
                className="select"
                value={input.gender}
                onChange={(e) => setInput((prev) => ({ ...prev, gender: e.target.value as Gender }))}
              >
                <option value="male">남성</option>
                <option value="female">여성</option>
                <option value="other">기타</option>
              </select>
            </div>

            <div className="heroFormGroup">
              <label htmlFor="hero-birthTime">출생시간 (선택)</label>
              <input
                id="hero-birthTime"
                className="input"
                type="time"
                value={input.birthTime}
                onChange={(e) => setInput((prev) => ({ ...prev, birthTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="heroFormMeta">
            <label>
              <input
                type="radio"
                name="calendarType"
                value="solar"
                checked={input.calendarType === "solar"}
                onChange={() => setInput((prev) => ({ ...prev, calendarType: "solar" as CalendarType }))}
              />
              양력
            </label>
            <label>
              <input
                type="radio"
                name="calendarType"
                value="lunar"
                checked={input.calendarType === "lunar"}
                onChange={() => setInput((prev) => ({ ...prev, calendarType: "lunar" as CalendarType }))}
              />
              음력
            </label>
          </div>

          <div className="heroCta">
            <Button type="submit" size="lg" disabled={!canSubmit}>
              ✦ 무료 리포트 시작
            </Button>
          </div>
          <p className="heroHelp">출생시간 미입력 시 중립 시간 기준으로 해석합니다.</p>
        </form>
      </GlassCard>

      {/* ── Pricing ── */}
      <GlassCard>
        <SectionTitle title="요금" subtitle="선택 피로 없이 단일 상품으로 제공됩니다." />
        <div className="pricingGrid">
          <article className="pricingCard">
            <p className="badge badge-neutral">{pricing.desc}</p>
            <h3>{pricing.title}</h3>
            <p className="price">{pricing.price}</p>
            <ul className="flatList compactList">
              {pricing.points.map((point) => <li key={point}>{point}</li>)}
            </ul>
            <div className="buttonRow">
              <ButtonLink href="/free-fortune" variant="ghost" full>
                무료 결과 먼저 확인하기
              </ButtonLink>
            </div>
          </article>
        </div>
      </GlassCard>

      {/* ── Trust ── */}
      <GlassCard>
        <SectionTitle title="신뢰 안내" subtitle="의사결정 보조 도구로 안전하게 사용할 수 있도록 설계했습니다." />
        <div className="trustGrid">
          {trustItems.map((item) => (
            <div key={item.title} className="trustItem">
              <div className="trustIcon">{item.icon}</div>
              <div>
                <p><strong>{item.title}</strong></p>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </PageContainer>
  );
}
