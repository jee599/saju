"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation";
import { track } from "../../lib/analytics";
import BottomSheet from "./components/BottomSheet";

function useIsTouchDevice() {
  return useSyncExternalStore(
    () => () => {},
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
}

const BRANCH_VALUES = ["23", "1", "3", "5", "7", "9", "11", "13", "15", "17", "19", "21"];

const YEARS = Array.from({ length: 81 }, (_, i) => 2010 - i); // 1930~2010
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function getDaysInMonth(year: string, month: string): number[] {
  if (!year || !month) return Array.from({ length: 31 }, (_, i) => i + 1);
  const daysCount = new Date(Number(year), Number(month), 0).getDate();
  return Array.from({ length: daysCount }, (_, i) => i + 1);
}

function padTwo(n: number) {
  return n.toString().padStart(2, "0");
}

export default function HomePage() {
  const t = useTranslations("home");
  const router = useRouter();
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [hour, setHour] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [calendarType, setCalendarType] = useState<"solar" | "lunar">("solar");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [timeSheetOpen, setTimeSheetOpen] = useState(false);
  const isTouch = useIsTouchDevice();

  const nameRef = useRef<HTMLInputElement>(null);

  const availableDays = getDaysInMonth(year, month);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    if (day && Number(day) > availableDays.length) {
      setDay("");
    }
  }, [year, month, day, availableDays.length]);

  const hasName = name.trim().length >= 1;
  const hasDate = year !== "" && month !== "" && day !== "";
  const hasGender = gender !== "";

  const birthDate = hasDate ? `${year}-${padTwo(+month)}-${padTwo(+day)}` : "";
  const birthTime = hour !== "" && hour !== "skip" ? `${padTwo(+hour)}:00` : "";

  const canAnalyze = hasName && hasDate && hasGender;

  const handleAnalyze = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    track("input_complete");
    const q = new URLSearchParams({
      name,
      birthDate,
      gender,
      calendarType,
      ...(birthTime ? { birthTime } : {}),
    });
    router.push(`/loading-analysis?redirect=${encodeURIComponent(`/result?${q.toString()}`)}`);
  };

  // Read translated arrays
  const copies = [0, 1, 2, 3].map((i) => t(`hero.copies.${i}`));
  const pillarIcons = ["\u{1F4D0}", "\u{1F4DC}", "\u26A1"];

  return (
    <main className="page">
      <div className="container">
        {/* ── Hero ─── */}
        <section className="glassCard" id="hero">
          <div className="heroMain">
            <p className="heroEyebrow">{t("hero.eyebrow")}</p>
            <h1>{t("hero.title")}</h1>
            <p className="rotatingText heroSubtitle">
              {copies.map((copy, i) => (
                <span key={i}>{copy}</span>
              ))}
            </p>

            {/* ── Progressive Form ─── */}
            <div className="progressiveForm">
              {/* Step 1 */}
              <div className="formStep visible">
                <div className="formStepLabel">
                  <span className="stepNum">1</span> {t("form.step1Label")}
                </div>
                <input
                  ref={nameRef}
                  className="input"
                  placeholder={t("form.namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  aria-label={t("form.nameAria")}
                />
              </div>

              {/* Step 2 */}
              <div className={`formStep ${hasName ? "visible" : ""}`}>
                <div className="formStepLabel">
                  <span className="stepNum">2</span> {t("form.step2Label")}
                </div>
                <div className="pillGroup" style={{ marginBottom: 10 }}>
                  <button
                    type="button"
                    className={`pill ${calendarType === "solar" ? "selected" : ""}`}
                    onClick={() => setCalendarType("solar")}
                  >
                    {t("form.solar")}
                  </button>
                  <button
                    type="button"
                    className={`pill ${calendarType === "lunar" ? "selected" : ""}`}
                    onClick={() => setCalendarType("lunar")}
                  >
                    {t("form.lunar")}
                  </button>
                </div>
                {isTouch && (
                  <button type="button" className="sheetTrigger" onClick={() => setDateSheetOpen(true)}>
                    <span className={hasDate ? "sheetTriggerValue" : ""}>
                      {hasDate ? `${year}${t("form.yearSuffix")} ${month}${t("form.monthSuffix")} ${day}${t("form.daySuffix")}` : t("form.step2Label")}
                    </span>
                    <span className="sheetTriggerChevron">▼</span>
                  </button>
                )}
                <BottomSheet open={dateSheetOpen} onClose={() => setDateSheetOpen(false)} title={t("form.step2Label")}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      className="select"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      style={{ flex: 1.2 }}
                      aria-label={t("form.yearAria")}
                    >
                      <option value="">{t("form.yearPlaceholder")}</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y}{t("form.yearSuffix")}</option>
                      ))}
                    </select>
                    <select
                      className="select"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      style={{ flex: 1 }}
                      aria-label={t("form.monthAria")}
                    >
                      <option value="">{t("form.monthPlaceholder")}</option>
                      {MONTHS.map((m) => (
                        <option key={m} value={m}>{m}{t("form.monthSuffix")}</option>
                      ))}
                    </select>
                    <select
                      className="select"
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                      style={{ flex: 1 }}
                      aria-label={t("form.dayAria")}
                    >
                      <option value="">{t("form.dayPlaceholder")}</option>
                      {availableDays.map((d) => (
                        <option key={d} value={d}>{d}{t("form.daySuffix")}</option>
                      ))}
                    </select>
                  </div>
                  {isTouch && hasDate && (
                    <button
                      type="button"
                      className="btn btn-primary btn-full"
                      style={{ marginTop: 16 }}
                      onClick={() => setDateSheetOpen(false)}
                    >
                      {t("form.confirm")}
                    </button>
                  )}
                </BottomSheet>
              </div>

              {/* Step 3 */}
              <div className={`formStep ${hasDate ? "visible" : ""}`}>
                <div className="formStepLabel">
                  <span className="stepNum">3</span> {t("form.step3Label")}
                  <button
                    className="skipBtn"
                    onClick={() => setHour("skip")}
                    type="button"
                  >
                    {t("form.skipTime")}
                  </button>
                </div>
                {isTouch && (
                  <button type="button" className="sheetTrigger" onClick={() => setTimeSheetOpen(true)}>
                    <span className={hour ? "sheetTriggerValue" : ""}>
                      {hour === "skip" ? t("form.unknownTime") : hour ? t(`branches.${BRANCH_VALUES.indexOf(hour)}.label`) : t("form.step3Label")}
                    </span>
                    <span className="sheetTriggerChevron">▼</span>
                  </button>
                )}
                <BottomSheet open={timeSheetOpen} onClose={() => setTimeSheetOpen(false)} title={t("form.step3Label")}>
                  <div className="branchGrid">
                    <button
                      type="button"
                      className={`branchPill ${hour === "skip" ? "selected" : ""}`}
                      onClick={() => { setHour("skip"); if (isTouch) setTimeout(() => setTimeSheetOpen(false), 200); }}
                    >
                      <span className="branchName">{t("form.unknownTime")}</span>
                      <span className="branchTime">{t("form.unknownTimeDesc")}</span>
                    </button>
                    {BRANCH_VALUES.map((val, idx) => (
                      <button
                        key={val}
                        type="button"
                        className={`branchPill ${hour === val ? "selected" : ""}`}
                        onClick={() => { setHour(val); if (isTouch) setTimeout(() => setTimeSheetOpen(false), 200); }}
                      >
                        <span className="branchName">{t(`branches.${idx}.label`)}</span>
                        <span className="branchTime">{t(`branches.${idx}.time`)}</span>
                      </button>
                    ))}
                  </div>
                </BottomSheet>
              </div>

              {/* Step 4 */}
              <div className={`formStep ${hour !== "" ? "visible" : ""}`}>
                <div className="formStepLabel">
                  <span className="stepNum">4</span> {t("form.step4Label")}
                </div>
                <div className="pillGroup">
                  {[
                    { label: t("form.male"), value: "male" as const },
                    { label: t("form.female"), value: "female" as const },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      className={`pill ${gender === opt.value ? "selected" : ""}`}
                      onClick={() => setGender(opt.value)}
                      type="button"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className={`formCta ${canAnalyze ? "visible" : ""}`}>
                <button
                  className="btn btn-primary btn-lg btn-full"
                  onClick={handleAnalyze}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t("form.analyzing") : t("form.startFree")}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="sectionDivider" />

        {/* ── Engine Trust ─── */}
        <section className="landingSection engineTrust">
          <h2 className="sectionHeading">{t("engine.heading")}</h2>
          <p className="sectionSubheading">{t("engine.subheading")}</p>

          <div className="enginePillars">
            {[0, 1, 2].map((i) => (
              <article key={i} className="enginePillarCard">
                <h3>{t(`engine.pillars.${i}.title`)}</h3>
                <p className="enginePillarSub">{t(`engine.pillars.${i}.subtitle`)}</p>
                <p className="enginePillarDesc">{t(`engine.pillars.${i}.desc`)}</p>
              </article>
            ))}
          </div>

          <div className="sectionCta">
            <Link href="/#hero" className="btn btn-secondary btn-lg">
              {t("engine.cta")} &rsaquo;
            </Link>
          </div>
        </section>

        <div className="sectionDivider" />

        {/* ── Free vs Premium ─── */}
        <section className="landingSection">
          <h2 className="sectionHeading">{t("pricing.heading")}</h2>
          <p className="sectionSubheading">{t("pricing.subheading")}</p>
          <div className="pricingGrid">
            <article className="pricingCard">
              <span className="badge badge-neutral">{t("pricing.free.badge")}</span>
              <h3 style={{ marginTop: 12 }}>{t("pricing.free.title")}</h3>
              <p className="price">{t("pricing.free.price")}</p>
              <ul className="flatList compactList">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i}>{t(`pricing.free.features.${i}`)}</li>
                ))}
              </ul>
            </article>
            <article className="pricingCard pricingCardPremium">
              <span className="badge badge-premium">{t("pricing.premium.badge")}</span>
              <h3 style={{ marginTop: 12 }}>{t("pricing.premium.title")}</h3>
              <p className="price">{t("pricing.premium.price")}</p>
              <ul className="flatList compactList">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i}>{t(`pricing.premium.features.${i}`)}</li>
                ))}
              </ul>
              <div className="buttonRow">
                <Link href="/#hero" className="btn btn-primary btn-full">
                  {t("pricing.premium.cta")}
                </Link>
              </div>
            </article>
          </div>
        </section>

        <div className="sectionDivider" />

        {/* ── FAQ ─── */}
        <section className="landingSection">
          <h2 className="sectionHeading">{t("faq.heading")}</h2>
          <div className="faqList">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="faqItem">
                <button
                  className="faqQuestion"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  {t(`faq.items.${i}.q`)}
                  <span className="faqToggle" aria-hidden="true">{openFaq === i ? "\u2212" : "+"}</span>
                </button>
                {openFaq === i && (
                  <p className="faqAnswer">{t(`faq.items.${i}.a`)}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ─── */}
        <section className="landingSection" style={{ textAlign: "center" }}>
          <h2 className="sectionHeading">{t("finalCta.heading")}</h2>
          <p className="sectionSubheading">{t("finalCta.subheading")}</p>
          <div className="sectionCta">
            <Link href="/#hero" className="btn btn-primary btn-lg">
              {t("finalCta.cta")} &rsaquo;
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
