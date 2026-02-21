"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FortuneInput, Gender, CalendarType } from "@saju/shared";

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

  const canSubmit = useMemo(() => {
    return Boolean(input.name.trim() && input.birthDate);
  }, [input]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const params = new URLSearchParams({
      name: input.name.trim(),
      birthDate: input.birthDate,
      gender: input.gender,
      calendarType: input.calendarType,
      ...(input.birthTime ? { birthTime: input.birthTime } : {})
    });

    router.push(`/result?${params.toString()}`);
  };

  return (
    <main>
      <section className="card">
        <h1>무료 사주 입력</h1>
        <p className="muted">결과는 확률 기반 문장으로 제공됩니다.</p>
        <form onSubmit={submit}>
          <label>이름</label>
          <input
            value={input.name}
            onChange={(e) => setInput((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="홍길동"
            required
          />

          <label>생년월일</label>
          <input
            type="date"
            value={input.birthDate}
            onChange={(e) => setInput((prev) => ({ ...prev, birthDate: e.target.value }))}
            required
          />

          <label>출생시간 (선택)</label>
          <input
            type="time"
            value={input.birthTime}
            onChange={(e) => setInput((prev) => ({ ...prev, birthTime: e.target.value }))}
          />

          <label>성별</label>
          <select
            value={input.gender}
            onChange={(e) => setInput((prev) => ({ ...prev, gender: e.target.value as Gender }))}
          >
            <option value="male">남성</option>
            <option value="female">여성</option>
            <option value="other">기타</option>
          </select>

          <label>달력 유형</label>
          <select
            value={input.calendarType}
            onChange={(e) =>
              setInput((prev) => ({ ...prev, calendarType: e.target.value as CalendarType }))
            }
          >
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>

          <button type="submit" disabled={!canSubmit}>
            결과 페이지로 이동
          </button>
        </form>
      </section>
    </main>
  );
}
