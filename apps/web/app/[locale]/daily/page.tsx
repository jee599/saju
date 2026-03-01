"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../../../i18n/navigation";
import { calculateFourPillars, ELEMENT_EMOJI } from "@saju/engine-saju";
import type { Element } from "@saju/engine-saju";

// 오행 상성 관계
const ELEMENT_RELATIONS: Record<Element, { generates: Element; overcomes: Element; generatedBy: Element; overcomeBy: Element }> = {
  wood: { generates: "fire", overcomes: "earth", generatedBy: "water", overcomeBy: "metal" },
  fire: { generates: "earth", overcomes: "metal", generatedBy: "wood", overcomeBy: "water" },
  earth: { generates: "metal", overcomes: "water", generatedBy: "fire", overcomeBy: "wood" },
  metal: { generates: "water", overcomes: "wood", generatedBy: "earth", overcomeBy: "fire" },
  water: { generates: "wood", overcomes: "fire", generatedBy: "metal", overcomeBy: "earth" },
};

function generateDailyFortune(
  dayMaster: Element,
  todayElement: Element,
  todayDate: string,
  t: (key: string, values?: Record<string, string>) => string,
  tRaw: (key: string) => any
) {
  const rel = ELEMENT_RELATIONS[dayMaster];
  const dayOfWeek = new Date(todayDate).getDay();
  const weekdays = tRaw("weekdays") as string[];
  const dayMessages = tRaw("dayMessages") as string[];

  const myEl = t(`elements.${dayMaster}`);
  const todayEl = t(`elements.${todayElement}`);

  let fortune = "";
  let luck = 0;
  let advice = "";

  if (todayElement === dayMaster) {
    fortune = t("fortune.same", { element: myEl });
    luck = 1;
    advice = t("fortune.sameAdvice");
  } else if (todayElement === rel.generates) {
    fortune = t("fortune.generates", { todayEl, myEl });
    luck = 1;
    advice = t("fortune.generatesAdvice");
  } else if (todayElement === rel.generatedBy) {
    fortune = t("fortune.generatedBy", { todayEl, myEl });
    luck = 2;
    advice = t("fortune.generatedByAdvice");
  } else if (todayElement === rel.overcomes) {
    fortune = t("fortune.overcomes", { todayEl, myEl });
    luck = 1;
    advice = t("fortune.overcomesAdvice");
  } else if (todayElement === rel.overcomeBy) {
    fortune = t("fortune.overcomeBy", { todayEl, myEl });
    luck = -1;
    advice = t("fortune.overcomeByAdvice");
  }

  const luckyElement = rel.generatedBy;
  const luckyColor = t(`colors.${luckyElement}`);
  const luckyDirection = t(`directions.${luckyElement}`);

  return { fortune, luck, advice, luckyColor, luckyDirection, dayMessage: dayMessages[dayOfWeek], weekday: weekdays[dayOfWeek] };
}

function DailyContent() {
  const t = useTranslations("daily");
  const params = useSearchParams();
  const name = params.get("name") ?? "";
  const birthDate = params.get("birthDate") ?? "";
  const birthTime = params.get("birthTime");

  const [inputName, setInputName] = useState(name);
  const [inputDate, setInputDate] = useState(birthDate);
  const [showResult, setShowResult] = useState(!!birthDate);

  const todayStr = new Date().toISOString().split("T")[0];

  const result = useMemo(() => {
    if (!inputDate || !showResult) return null;
    const parts = inputDate.split("-").map(Number);
    const y = parts[0] ?? 2000, m = parts[1] ?? 1, d = parts[2] ?? 1;
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

    const hour = birthTime ? parseInt(birthTime.split(":")[0], 10) : 12;
    const userPillars = calculateFourPillars({ year: y, month: m, day: d, hour: isNaN(hour) ? 12 : hour, minute: 0 });

    const today = new Date();
    const todayPillars = calculateFourPillars({ year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate(), hour: today.getHours(), minute: 0 });

    const dayMaster = userPillars.elements.dayMaster;
    const todayElement = todayPillars.elements.dayMaster;
    const daily = generateDailyFortune(dayMaster, todayElement, todayStr, t, t.raw);

    return { dayMaster, todayElement, ...daily };
  }, [inputDate, birthTime, showResult, todayStr, t]);

  const handleSubmit = () => {
    if (inputDate) setShowResult(true);
  };

  const luckStars = (luck: number) => {
    const total = luck + 3;
    return "★".repeat(Math.max(1, Math.min(5, total))) + "☆".repeat(5 - Math.max(1, Math.min(5, total)));
  };

  return (
    <main className="page">
      <div className="container">
        <section className="glassCard" style={{ textAlign: "center" }}>
          <p className="heroEyebrow" style={{ color: "var(--accent-gold)" }}>{t("eyebrow")}</p>
          <h1 style={{ fontSize: "1.5rem" }}>{t("title")}</h1>
          <p className="muted" style={{ marginTop: 4 }}>{t("subtitle", { date: todayStr })}</p>
        </section>

        {!showResult ? (
          <section className="glassCard" style={{ marginTop: 16 }}>
            <h3>{t("inputTitle")}</h3>
            <div className="form" style={{ maxWidth: 360, margin: "16px auto 0" }}>
              <div className="formGroup">
                <label>{t("nameLabel")}</label>
                <input type="text" className="input" placeholder={t("namePlaceholder")} value={inputName} onChange={(e) => setInputName(e.target.value)} />
              </div>
              <div className="formGroup">
                <label>{t("birthDateLabel")}</label>
                <input type="date" className="input" value={inputDate} onChange={(e) => setInputDate(e.target.value)} min="1930-01-01" max="2010-12-31" />
              </div>
              <button className="btn btn-primary btn-lg btn-full" onClick={handleSubmit} disabled={!inputDate}>
                {t("viewFortune")}
              </button>
            </div>
          </section>
        ) : result ? (
          <>
            <section className={`glassCard dayMasterCard ${result.dayMaster}`} style={{ marginTop: 16, textAlign: "center" }}>
              <div className="dayMasterEmoji" style={{ fontSize: "2.5rem" }}>{ELEMENT_EMOJI[result.dayMaster]}</div>
              <h2 style={{ color: `var(--element-${result.dayMaster})`, fontSize: "1.2rem", marginTop: 8 }}>
                {t("yourToday", { name: inputName || t("defaultUser") })}
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--t2)", marginTop: 4 }}>
                {t("todayEnergy", { emoji: ELEMENT_EMOJI[result.todayElement], element: t(`elements.${result.todayElement}`) })}
              </p>
            </section>

            <section className="glassCard" style={{ marginTop: 12 }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <p style={{ fontSize: "1.3rem", letterSpacing: 4, color: "var(--accent-gold)" }}>
                  {luckStars(result.luck)}
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--t2)", marginTop: 4 }}>{t("weekdayFortune", { weekday: result.weekday ?? "" })}</p>
              </div>

              <p style={{ fontSize: "0.95rem", lineHeight: 1.7, color: "var(--t1)" }}>{result.fortune}</p>

              <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(196,139,159,0.08)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--accent)" }}>
                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent)" }}>{t("todayAdvice")}</p>
                <p style={{ fontSize: "0.9rem", color: "var(--t1)", marginTop: 4 }}>{result.advice}</p>
              </div>

              <p style={{ fontSize: "0.8rem", color: "var(--t2)", marginTop: 12 }}>{result.dayMessage}</p>

              <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, padding: "10px 12px", background: "var(--bg-card)", borderRadius: "var(--radius-sm)", textAlign: "center", minWidth: 120 }}>
                  <p style={{ fontSize: "0.75rem", color: "var(--t2)" }}>{t("luckyColor")}</p>
                  <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--t1)", marginTop: 2 }}>{result.luckyColor}</p>
                </div>
                <div style={{ flex: 1, padding: "10px 12px", background: "var(--bg-card)", borderRadius: "var(--radius-sm)", textAlign: "center", minWidth: 120 }}>
                  <p style={{ fontSize: "0.75rem", color: "var(--t2)" }}>{t("luckyDirection")}</p>
                  <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--t1)", marginTop: 2 }}>{result.luckyDirection}</p>
                </div>
              </div>
            </section>

            <section className="ctaPanel" style={{ marginTop: 16 }}>
              <h3>{t("ctaTitle")}</h3>
              <p className="muted">{t("ctaDesc")}</p>
              <div className="buttonRow">
                <Link href={`/result?name=${encodeURIComponent(inputName)}&birthDate=${inputDate}&birthTime=${birthTime ?? ""}`} className="btn btn-primary btn-lg">
                  {t("ctaButton")}
                </Link>
              </div>
            </section>

            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button className="btn btn-secondary" onClick={() => setShowResult(false)}>
                {t("tryAnother")}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

export default function DailyPage() {
  const t = useTranslations("daily");
  return (
    <Suspense fallback={<div className="loadingScreen"><p className="muted">{t("loading")}</p></div>}>
      <DailyContent />
    </Suspense>
  );
}
