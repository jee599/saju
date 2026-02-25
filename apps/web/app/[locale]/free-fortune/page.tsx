"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "../../../i18n/navigation";
import type { CalendarType, FortuneInput, Gender } from "../../../lib/types";
import { trackEvent } from "../../../lib/analytics";
import { toInputQuery } from "../../../lib/fortune";
import { Button, GlassCard, PageContainer } from "../components/ui";

const defaultInput: FortuneInput = {
  name: "",
  birthDate: "",
  birthTime: "",
  gender: "male",
  calendarType: "solar"
};

export default function FreeFortunePage() {
  const t = useTranslations();
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
        <p className="heroEyebrow">{t("hero.eyebrow")}</p>
        <h1>{t("hero.title")}</h1>
        <p className="lead">{t("hero.lead")}</p>

        <form onSubmit={submit} className="form" noValidate>
          <div className="formGrid cols2">
            <div className="formGroup">
              <label htmlFor="name">{t("form.name")}</label>
              <input
                id="name"
                className={`input ${submitted && !nameValid ? "inputError" : ""}`}
                value={input.name}
                onChange={(e) => setInput((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t("form.namePlaceholder")}
                autoComplete="name"
                required
              />
              {submitted && !nameValid ? <p className="errorText">{t("form.nameError")}</p> : null}
            </div>

            <div className="formGroup">
              <label htmlFor="birthDate">{t("form.birthDate")}</label>
              <input
                id="birthDate"
                className={`input ${submitted && !birthDateValid ? "inputError" : ""}`}
                type="date"
                value={input.birthDate}
                onChange={(e) => setInput((prev) => ({ ...prev, birthDate: e.target.value }))}
                required
              />
              {submitted && !birthDateValid ? <p className="errorText">{t("form.birthDateError")}</p> : null}
            </div>

            <div className="formGroup">
              <label htmlFor="birthTime">{t("form.birthTime")}</label>
              <input
                id="birthTime"
                className="input"
                type="time"
                value={input.birthTime}
                onChange={(e) => setInput((prev) => ({ ...prev, birthTime: e.target.value }))}
              />
              <p className="formHelp muted">{t("hero.help")}</p>
            </div>

            <div className="formGroup">
              <label htmlFor="gender">{t("form.gender")}</label>
              <select
                id="gender"
                className="select"
                value={input.gender}
                onChange={(e) => setInput((prev) => ({ ...prev, gender: e.target.value as Gender }))}
              >
                <option value="male">{t("form.genderMale")}</option>
                <option value="female">{t("form.genderFemale")}</option>
                <option value="other">{t("form.genderOther")}</option>
              </select>
            </div>

            <div className="formGroup">
              <label htmlFor="calendarType">{t("form.solar")}/{t("form.lunar")}</label>
              <select
                id="calendarType"
                className="select"
                value={input.calendarType}
                onChange={(e) => setInput((prev) => ({ ...prev, calendarType: e.target.value as CalendarType }))}
              >
                <option value="solar">{t("form.solar")}</option>
                <option value="lunar">{t("form.lunar")}</option>
              </select>
            </div>
          </div>

          <div className="buttonRow desktopOnly">
            <Button type="submit" size="lg" disabled={!canSubmit}>{t("hero.cta")}</Button>
          </div>

          <div className="stickyCta">
            <div className="stickyCtaInner">
              <Button type="submit" size="lg" full disabled={!canSubmit}>{t("hero.cta")}</Button>
            </div>
          </div>
        </form>
      </GlassCard>
    </PageContainer>
  );
}
