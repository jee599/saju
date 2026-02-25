"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "../../i18n/navigation";
import type { CalendarType, FortuneInput, Gender } from "../../lib/types";
import { trackEvent } from "../../lib/analytics";
import { toInputQuery } from "../../lib/fortune";
import { Button, ButtonLink, GlassCard, PageContainer, SectionTitle } from "./components/ui";

const defaultInput: FortuneInput = {
  name: "",
  birthDate: "",
  birthTime: "",
  gender: "male",
  calendarType: "solar"
};

export default function HomePage() {
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

    trackEvent("hero_form_submit", {
      hasBirthTime: Boolean(input.birthTime),
      calendarType: input.calendarType,
      gender: input.gender
    });

    router.push(`/result?${toInputQuery(input)}`);
  };

  const pricingPoints = t.raw("pricing.points") as string[];

  return (
    <PageContainer>
      {/* Hero + Inline Form */}
      <GlassCard className="heroCard">
        <p className="heroEyebrow">{t("hero.eyebrow")}</p>
        <h1>{t("hero.title")}</h1>
        <p className="lead">{t("hero.lead")}</p>

        <form onSubmit={submit} className="heroForm" noValidate>
          <div className="heroFormGrid">
            <div className="heroFormGroup">
              <label htmlFor="hero-name">{t("form.name")}</label>
              <input
                id="hero-name"
                className={`input ${submitted && !nameValid ? "inputError" : ""}`}
                value={input.name}
                onChange={(e) => setInput((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t("form.namePlaceholder")}
                autoComplete="name"
                required
              />
              {submitted && !nameValid ? <p className="errorText">{t("form.nameError")}</p> : null}
            </div>

            <div className="heroFormGroup">
              <label htmlFor="hero-birthDate">{t("form.birthDate")}</label>
              <input
                id="hero-birthDate"
                className={`input ${submitted && !birthDateValid ? "inputError" : ""}`}
                type="date"
                value={input.birthDate}
                onChange={(e) => setInput((prev) => ({ ...prev, birthDate: e.target.value }))}
                required
              />
              {submitted && !birthDateValid ? <p className="errorText">{t("form.birthDateError")}</p> : null}
            </div>

            <div className="heroFormGroup">
              <label htmlFor="hero-gender">{t("form.gender")}</label>
              <select
                id="hero-gender"
                className="select"
                value={input.gender}
                onChange={(e) => setInput((prev) => ({ ...prev, gender: e.target.value as Gender }))}
              >
                <option value="male">{t("form.genderMale")}</option>
                <option value="female">{t("form.genderFemale")}</option>
                <option value="other">{t("form.genderOther")}</option>
              </select>
            </div>

            <div className="heroFormGroup">
              <label htmlFor="hero-birthTime">{t("form.birthTime")}</label>
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
              {t("form.solar")}
            </label>
            <label>
              <input
                type="radio"
                name="calendarType"
                value="lunar"
                checked={input.calendarType === "lunar"}
                onChange={() => setInput((prev) => ({ ...prev, calendarType: "lunar" as CalendarType }))}
              />
              {t("form.lunar")}
            </label>
          </div>

          <div className="heroCta">
            <Button type="submit" size="lg" disabled={!canSubmit}>
              {t("hero.cta")}
            </Button>
          </div>
          <p className="heroHelp">{t("hero.help")}</p>
        </form>
      </GlassCard>

      {/* Pricing */}
      <GlassCard>
        <SectionTitle title={t("pricing.title")} subtitle={t("pricing.subtitle")} />
        <div className="pricingGrid">
          <article className="pricingCard">
            <p className="badge badge-neutral">{t("pricing.productDesc")}</p>
            <h3>{t("pricing.productTitle")}</h3>
            <p className="price">{t("pricing.price")}</p>
            <ul className="flatList compactList">
              {pricingPoints.map((point: string) => <li key={point}>{point}</li>)}
            </ul>
            <div className="buttonRow">
              <ButtonLink href="/free-fortune" variant="ghost" full>
                {t("pricing.freeCta")}
              </ButtonLink>
            </div>
          </article>
        </div>
      </GlassCard>

      {/* Trust */}
      <GlassCard>
        <SectionTitle title={t("trust.title")} subtitle={t("trust.subtitle")} />
        <div className="trustGrid">
          {(t.raw("trust.items") as Array<{ icon: string; title: string; desc: string }>).map((item) => (
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
