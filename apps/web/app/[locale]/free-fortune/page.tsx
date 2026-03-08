"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "../../../i18n/navigation";
import { useTranslations } from "next-intl";
import { track } from "../../../lib/analytics";
import { PageSkeleton } from "../components/Skeleton";

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
    if (!birthDate) return;
    track("input_complete");
    const q = new URLSearchParams({
      name, birthDate, gender, calendarType,
      ...(birthTime ? { birthTime } : {}),
    });
    router.push(`/loading-analysis?${q.toString()}`);
  };

  return (
    <div className="page">
      <div className="container">
        <section className="glassCard">
          <h2>{t("title")}</h2>
          <p className="muted" style={{ marginTop: 8 }}>{t("desc")}</p>

          {step === 1 && (
            <div className="form">
              <div className="formGrid">
                <div className="formGroup">
                  <label htmlFor="ff-name">{t("nameLabel")}</label>
                  <input
                    id="ff-name"
                    className="input"
                    placeholder={t("namePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="formGroup">
                  <label htmlFor="ff-birthDate">{t("birthDateLabel")}</label>
                  <input
                    id="ff-birthDate"
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
                  <label htmlFor="ff-birthTime">{t("birthTimeLabel")}</label>
                  <input
                    id="ff-birthTime"
                    type="time"
                    className="input"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                  />
                  <p className="formHelp">{t("birthTimeHelp")}</p>
                </div>
                <div className="formGroup">
                  <label htmlFor="ff-gender">{t("genderLabel")}</label>
                  <select id="ff-gender" name="gender" className="select" value={gender} onChange={(e) => setGender(e.target.value as "male" | "female" | "other")} aria-label={t("genderLabel")}>
                    <option value="other">{t("genderOther")}</option>
                    <option value="male">{t("genderMale")}</option>
                    <option value="female">{t("genderFemale")}</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label htmlFor="ff-calendarType">{t("calendarLabel")}</label>
                  <select id="ff-calendarType" name="calendarType" className="select" value={calendarType} onChange={(e) => setCalendarType(e.target.value as "solar" | "lunar")} aria-label={t("calendarLabel")}>
                    <option value="solar">{t("calendarSolar")}</option>
                    <option value="lunar">{t("calendarLunar")}</option>
                  </select>
                </div>
              </div>
              <div className="buttonRow">
                <button className="btn btn-ghost btn-lg" onClick={() => setStep(1)}>
                  {t("prev")}
                </button>
                <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={!birthDate} style={{ flex: 1 }}>
                  {t("startAnalysis")}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function FreeFortuPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FreeFortunContent />
    </Suspense>
  );
}
