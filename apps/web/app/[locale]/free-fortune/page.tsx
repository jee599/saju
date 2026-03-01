"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { track } from "../../../lib/analytics";

function FreeFortunContent() {
  const t = useTranslations("misc.freeFortune");
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState(params.get("birthDate") ?? "");
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
    router.push(`/loading-analysis?redirect=${encodeURIComponent(`/result?${q.toString()}`)}`);
  };

  return (
    <main className="page">
      <div className="container">
        <section className="glassCard">
          <h2>{t("title")}</h2>
          <p className="muted" style={{ marginTop: 8 }}>{t("desc")}</p>

          {step === 1 && (
            <div className="form">
              <div className="formGrid">
                <div className="formGroup">
                  <label>{t("nameLabel")}</label>
                  <input
                    className="input"
                    placeholder={t("namePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="formGroup">
                  <label>{t("birthDateLabel")}</label>
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
                  {t("nextStep")}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form">
              <div className="formGrid">
                <div className="formGroup">
                  <label>{t("birthTimeLabel")}</label>
                  <input
                    type="time"
                    className="input"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                  />
                  <p className="formHelp">{t("birthTimeHelp")}</p>
                </div>
                <div className="formGroup">
                  <label>{t("genderLabel")}</label>
                  <select className="select" value={gender} onChange={(e) => setGender(e.target.value as "male" | "female" | "other")} aria-label={t("genderLabel")}>
                    <option value="other">{t("genderOther")}</option>
                    <option value="male">{t("genderMale")}</option>
                    <option value="female">{t("genderFemale")}</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label>{t("calendarLabel")}</label>
                  <select className="select" value={calendarType} onChange={(e) => setCalendarType(e.target.value as "solar" | "lunar")} aria-label={t("calendarLabel")}>
                    <option value="solar">{t("calendarSolar")}</option>
                    <option value="lunar">{t("calendarLunar")}</option>
                  </select>
                </div>
              </div>
              <div className="buttonRow">
                <button className="btn btn-ghost btn-lg" onClick={() => setStep(1)}>
                  {t("prev")}
                </button>
                <button className="btn btn-primary btn-lg" onClick={handleSubmit} style={{ flex: 1 }}>
                  {t("startAnalysis")}
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
  const t = useTranslations("misc.freeFortune");
  return (
    <Suspense fallback={<div className="loadingScreen"><p className="muted">{t("loading")}</p></div>}>
      <FreeFortunContent />
    </Suspense>
  );
}
