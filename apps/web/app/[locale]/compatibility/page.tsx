"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Gender } from "../../../lib/types";
import type { CompatibilityPerson, CompatibilityResult } from "../../../lib/compatibilityEngine";
import { fromCompatQuery, toCompatQuery } from "../../../lib/compatibilityEngine";
import { webApi } from "../../../lib/api";
import { Button, ButtonLink, GlassCard, PageContainer } from "../components/ui";
import { ShareButton } from "../components/ShareButton";

type FormState = "idle" | "loading" | "done" | "error";

function PersonForm({
  label,
  person,
  onChange,
  submitted,
  tForm,
}: {
  label: string;
  person: CompatibilityPerson;
  onChange: (p: CompatibilityPerson) => void;
  submitted: boolean;
  tForm: ReturnType<typeof useTranslations>;
}) {
  const nameValid = person.name.trim().length >= 2;
  const birthValid = Boolean(person.birthDate);

  return (
    <fieldset className="compatPerson">
      <legend>{label}</legend>
      <div className="heroFormGroup">
        <label>{tForm("name")}</label>
        <input
          className={`input ${submitted && !nameValid ? "inputError" : ""}`}
          value={person.name}
          onChange={(e) => onChange({ ...person, name: e.target.value })}
          placeholder={tForm("namePlaceholder")}
          autoComplete="name"
        />
        {submitted && !nameValid ? <p className="errorText">{tForm("nameError")}</p> : null}
      </div>
      <div className="heroFormGroup">
        <label>{tForm("birthDate")}</label>
        <input
          className={`input ${submitted && !birthValid ? "inputError" : ""}`}
          type="date"
          value={person.birthDate}
          onChange={(e) => onChange({ ...person, birthDate: e.target.value })}
        />
        {submitted && !birthValid ? <p className="errorText">{tForm("birthDateError")}</p> : null}
      </div>
      <div className="heroFormGroup">
        <label>{tForm("gender")}</label>
        <select
          className="select"
          value={person.gender}
          onChange={(e) => onChange({ ...person, gender: e.target.value as Gender })}
        >
          <option value="male">{tForm("genderMale")}</option>
          <option value="female">{tForm("genderFemale")}</option>
          <option value="other">{tForm("genderOther")}</option>
        </select>
      </div>
    </fieldset>
  );
}

function CompatibilityInner() {
  const t = useTranslations("compatibility");
  const tForm = useTranslations("form");
  const searchParams = useSearchParams();

  const shared = useMemo(
    () => fromCompatQuery(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const [personA, setPersonA] = useState<CompatibilityPerson>(
    shared?.a ?? { name: "", birthDate: "", gender: "male" }
  );
  const [personB, setPersonB] = useState<CompatibilityPerson>(
    shared?.b ?? { name: "", birthDate: "", gender: "female" }
  );
  const [submitted, setSubmitted] = useState(Boolean(shared));
  const [state, setState] = useState<FormState>(shared ? "loading" : "idle");
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    personA.name.trim().length >= 2 &&
    Boolean(personA.birthDate) &&
    personB.name.trim().length >= 2 &&
    Boolean(personB.birthDate);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitted(true);
    if (!canSubmit) return;
    setState("loading");
    setError(null);
    try {
      const data = await webApi.compatibility(personA, personB);
      setResult(data);
      setState("done");
      // Update URL for sharing
      const qs = toCompatQuery(personA, personB);
      window.history.replaceState(null, "", `?${qs}`);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    }
  };

  // Auto-fetch if shared params
  useMemo(() => {
    if (shared && state === "loading") {
      void (async () => {
        try {
          const data = await webApi.compatibility(shared.a, shared.b);
          setResult(data);
          setState("done");
        } catch {
          setState("error");
        }
      })();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shareUrl =
    typeof window !== "undefined" && result
      ? `${window.location.origin}${window.location.pathname}?${toCompatQuery(personA, personB)}`
      : "";

  return (
    <PageContainer>
      <GlassCard className="heroCard">
        <p className="heroEyebrow">{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
        <p className="lead">{t("lead")}</p>

        <form onSubmit={submit} className="compatForm" noValidate>
          <div className="compatGrid">
            <PersonForm
              label={t("personA")}
              person={personA}
              onChange={setPersonA}
              submitted={submitted}
              tForm={tForm}
            />
            <div className="compatVs">VS</div>
            <PersonForm
              label={t("personB")}
              person={personB}
              onChange={setPersonB}
              submitted={submitted}
              tForm={tForm}
            />
          </div>
          <div className="heroCta">
            <Button type="submit" size="lg" disabled={state === "loading"}>
              {state === "loading" ? t("loading") : t("submit")}
            </Button>
          </div>
        </form>
      </GlassCard>

      {result && state === "done" ? (
        <GlassCard>
          <h2>{t("resultTitle")}</h2>

          <div className="compatScore">
            <div className="compatScoreCircle" data-grade={result.grade}>
              <span className="compatScoreNum">{result.score}</span>
              <span className="compatScoreLabel">{t("score")}</span>
            </div>
            <span className="compatGrade">{result.grade}</span>
          </div>

          <p className="mt-sm">{result.summary}</p>

          <div className="sectionStack mt-md">
            <article className="sectionBlock">
              <h3>{t("strengths")}</h3>
              <ul className="flatList compactList">
                {result.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </article>
            <article className="sectionBlock">
              <h3>{t("challenges")}</h3>
              <ul className="flatList compactList">
                {result.challenges.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </article>
            <article className="sectionBlock">
              <h3>{t("advice")}</h3>
              <p>{result.advice}</p>
            </article>
          </div>

          <div className="buttonRow mt-md">
            <ShareButton
              url={shareUrl}
              title={t("shareTitle")}
              text={`${personA.name} & ${personB.name} — ${t("score")} ${result.score}점`}
            />
            <ButtonLink href="/free-fortune" variant="ghost">{t("trySaju")}</ButtonLink>
          </div>
        </GlassCard>
      ) : null}

      {state === "error" ? (
        <GlassCard>
          <p className="errorText">{error ?? t("errorGeneric")}</p>
          <div className="buttonRow mt-sm">
            <Button onClick={() => void submit()} variant="ghost">{t("retry")}</Button>
          </div>
        </GlassCard>
      ) : null}
    </PageContainer>
  );
}

export default function CompatibilityPage() {
  const t = useTranslations("compatibility");
  return (
    <Suspense
      fallback={
        <PageContainer>
          <GlassCard>
            <p>{t("loading")}</p>
          </GlassCard>
        </PageContainer>
      }
    >
      <CompatibilityInner />
    </Suspense>
  );
}
