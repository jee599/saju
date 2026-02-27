"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { track } from "../../lib/analytics";

function FreeFortunContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState(params.get("birthDate") ?? "1995-01-01");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("other");
  const [calendarType, setCalendarType] = useState<"solar" | "lunar">("solar");
  const [step, setStep] = useState(1);

  const handleStep1 = () => {
    if (name.trim().length < 2) return;
    track("input_start");
    setStep(2);
  };

  const handleSubmit = () => {
    track("input_complete");
    const q = new URLSearchParams({
      name, birthDate, gender, calendarType,
      ...(birthTime ? { birthTime } : {}),
    });
    router.push(`/loading-analysis?redirect=/result?${q.toString()}`);
  };

  return (
    <main className="page">
      <div className="container">
        <section className="glassCard">
          <h2>무료 사주 분석</h2>
          <p className="muted" style={{ marginTop: 8 }}>기본 정보를 입력하면 타고난 기질과 오행 분석을 무료로 받을 수 있습니다.</p>

          {step === 1 && (
            <div className="form">
              <div className="formGrid">
                <div className="formGroup">
                  <label>이름</label>
                  <input
                    className="input"
                    placeholder="홍길동"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
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
                <button
                  className="btn btn-primary btn-lg btn-full"
                  onClick={handleStep1}
                  disabled={name.trim().length < 2}
                >
                  다음 단계
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form">
              <div className="formGrid">
                <div className="formGroup">
                  <label>태어난 시간 (선택)</label>
                  <input
                    type="time"
                    className="input"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    placeholder="모르면 비워두세요"
                  />
                  <p className="formHelp">모르시면 비워두셔도 됩니다.</p>
                </div>
                <div className="formGroup">
                  <label>성별</label>
                  <select className="select" value={gender} onChange={(e) => setGender(e.target.value as "male" | "female" | "other")}>
                    <option value="other">선택 안 함</option>
                    <option value="male">남성</option>
                    <option value="female">여성</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label>달력</label>
                  <select className="select" value={calendarType} onChange={(e) => setCalendarType(e.target.value as "solar" | "lunar")}>
                    <option value="solar">양력</option>
                    <option value="lunar">음력</option>
                  </select>
                </div>
              </div>
              <div className="buttonRow">
                <button className="btn btn-ghost btn-lg" onClick={() => setStep(1)}>
                  이전
                </button>
                <button className="btn btn-primary btn-lg" onClick={handleSubmit} style={{ flex: 1 }}>
                  무료 분석 시작
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function FreeFortuPage() {
  return (
    <Suspense fallback={<div className="loadingScreen"><p className="muted">로딩 중...</p></div>}>
      <FreeFortunContent />
    </Suspense>
  );
}
