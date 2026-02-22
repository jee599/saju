"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CalendarType, FortuneInput, Gender } from "../../lib/types";
import { trackEvent } from "../../lib/analytics";
import { toInputQuery } from "../../lib/fortune";
import { Button, GlassCard, PageContainer } from "../components/ui";

const defaultInput: FortuneInput = {
  name: "",
  birthDate: "",
  birthTime: "",
  gender: "male",
  calendarType: "solar"
};

export default function FreeFortunePage() {
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

    trackEvent("free_input_submit", {
      hasBirthTime: Boolean(input.birthTime),
      calendarType: input.calendarType,
      gender: input.gender
    });

    router.push(`/result?${toInputQuery(input)}`);
  };

  return (
    <PageContainer>
      <GlassCard>
        <p className="heroEyebrow">무료 입력</p>
        <h1>사주 미리보기 생성</h1>
        <p className="lead">입력값을 바탕으로 무료 해석을 먼저 제공하고, 이후 확장 리포트 옵션을 안내합니다.</p>

        <form onSubmit={submit} className="form" noValidate>
          <div className="formGrid cols2">
            <div className="formGroup">
              <label htmlFor="name">이름</label>
              <input
                id="name"
                className={`input ${submitted && !nameValid ? "inputError" : ""}`}
                value={input.name}
                onChange={(e) => setInput((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="홍길동"
                autoComplete="name"
                required
              />
              {submitted && !nameValid ? <p className="errorText">이름은 2자 이상 입력해 주세요.</p> : null}
            </div>

            <div className="formGroup">
              <label htmlFor="birthDate">생년월일</label>
              <input
                id="birthDate"
                className={`input ${submitted && !birthDateValid ? "inputError" : ""}`}
                type="date"
                value={input.birthDate}
                onChange={(e) => setInput((prev) => ({ ...prev, birthDate: e.target.value }))}
                required
              />
              {submitted && !birthDateValid ? <p className="errorText">생년월일을 입력해 주세요.</p> : null}
            </div>

            <div className="formGroup">
              <label htmlFor="birthTime">출생시간 (선택)</label>
              <input
                id="birthTime"
                className="input"
                type="time"
                value={input.birthTime}
                onChange={(e) => setInput((prev) => ({ ...prev, birthTime: e.target.value }))}
              />
              <p className="formHelp muted">미입력 시 중립 시간 기준으로 계산됩니다.</p>
            </div>

            <div className="formGroup">
              <label htmlFor="gender">성별</label>
              <select
                id="gender"
                className="select"
                value={input.gender}
                onChange={(e) => setInput((prev) => ({ ...prev, gender: e.target.value as Gender }))}
              >
                <option value="male">남성</option>
                <option value="female">여성</option>
                <option value="other">기타</option>
              </select>
            </div>

            <div className="formGroup">
              <label htmlFor="calendarType">달력 유형</label>
              <select
                id="calendarType"
                className="select"
                value={input.calendarType}
                onChange={(e) =>
                  setInput((prev) => ({ ...prev, calendarType: e.target.value as CalendarType }))
                }
              >
                <option value="solar">양력</option>
                <option value="lunar">음력</option>
              </select>
            </div>
          </div>

          <div className="buttonRow">
            <Button type="submit" size="lg" disabled={!canSubmit}>
              미리보기 생성
            </Button>
          </div>
        </form>
      </GlassCard>
    </PageContainer>
  );
}
