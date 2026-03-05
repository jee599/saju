"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "../../i18n/navigation";
import { track, trackFunnel, trackFormStep, trackChoice, trackPageEvent, createPageTimer, trackLanding } from "../../lib/analytics";

/* ─── helpers ─── */

function useIsTouchDevice() {
  return useSyncExternalStore(
    () => () => {},
    () => {
      if (typeof window === "undefined") return false;
      return window.matchMedia("(pointer: coarse), (max-width: 767px)").matches;
    },
    () => false,
  );
}

const BRANCH_VALUES = ["23", "1", "3", "5", "7", "9", "11", "13", "15", "17", "19", "21"];
const YEARS = Array.from({ length: 81 }, (_, i) => 2010 - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function getDaysInMonth(year: string, month: string): number[] {
  if (!year || !month) return Array.from({ length: 31 }, (_, i) => i + 1);
  const daysCount = new Date(Number(year), Number(month), 0).getDate();
  return Array.from({ length: daysCount }, (_, i) => i + 1);
}

function padTwo(n: number) {
  return n.toString().padStart(2, "0");
}



/* ─── Home Page ─── */

export default function HomePage() {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const isKorean = locale === "ko";
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [hour, setHour] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const calendarType = "solar" as const;
  const [city, setCity] = useState(isKorean ? "Seoul" : "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isTouch = useIsTouchDevice();

  const nameRef = useRef<HTMLInputElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const pageTimerRef = useRef<ReturnType<typeof createPageTimer> | null>(null);
  const trackedStepsRef = useRef<Set<string>>(new Set());
  const [magneticOffset, setMagneticOffset] = useState({ x: 0, y: 0 });
  const loadingUrlRef = useRef("");

  const handleMagneticMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isTouch) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * 0.3;
      const dy = (e.clientY - cy) * 0.3;
      setMagneticOffset({ x: dx, y: dy });
    },
    [isTouch],
  );

  const handleMagneticLeave = useCallback(() => {
    setMagneticOffset({ x: 0, y: 0 });
  }, []);

  const availableDays = getDaysInMonth(year, month);

  useEffect(() => {
    trackLanding(); // UTM capture + session start (once per session)
    trackPageEvent("/");
    trackFunnel("form_start");
    pageTimerRef.current = createPageTimer("home");
    return () => {
      pageTimerRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse), (max-width: 767px)").matches) return;
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

  // Track form steps
  useEffect(() => {
    if (hasName && !trackedStepsRef.current.has("name")) {
      trackedStepsRef.current.add("name");
      trackFormStep("form_step_name");
    }
  }, [hasName]);
  useEffect(() => {
    if (hasDate && !trackedStepsRef.current.has("date")) {
      trackedStepsRef.current.add("date");
      trackFunnel("form_step_birthdate");
      trackChoice("calendar_type", calendarType);
    }
  }, [hasDate, calendarType]);
  useEffect(() => {
    if (hour !== "" && !trackedStepsRef.current.has("time")) {
      trackedStepsRef.current.add("time");
      trackFunnel("form_step_birthtime");
      trackChoice("birth_time", hour === "skip" ? "skipped" : hour);
    }
  }, [hour]);
  useEffect(() => {
    if (hasGender && !trackedStepsRef.current.has("gender")) {
      trackedStepsRef.current.add("gender");
      trackFunnel("form_step_gender");
      trackChoice("gender", gender);
    }
  }, [hasGender, gender]);

  const birthDate = hasDate ? `${year}-${padTwo(+month)}-${padTwo(+day)}` : "";
  const hasTime = hour !== "";
  const birthTime = hour !== "" && hour !== "skip" ? `${padTwo(+hour)}:00` : "";
  const canAnalyze = hasName && hasDate && hasGender;

  const handleAnalyze = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    track("input_complete");
    trackFunnel("form_complete");
    pageTimerRef.current?.stop();

    const q = new URLSearchParams({
      name,
      birthDate,
      gender,
      calendarType,
      ...(birthTime ? { birthTime } : {}),
      ...(city ? { city } : {}),
    });
    loadingUrlRef.current = `/loading-analysis?${q.toString()}`;

    router.push(loadingUrlRef.current);
  };

  return (
    <div className="page constellationPage">

      <section id="hero" className="constellationHero">
        <div className="heroMain constellationHeroMain">
          <h1 className="constellationTitle">{t("hero.landingTitle")}</h1>
          <p className="constellationSub">{t("hero.landingSub")}</p>
          <form
            className="cForm"
            onSubmit={(e) => {
              e.preventDefault();
              handleAnalyze();
            }}
          >
            {/* ① 생년월일 — 항상 표시 */}
            <div className="cRow">
              <label className="cLabel" htmlFor="birthYear">{t("form.step2Label")}</label>
              <div className="cDateRow">
                <select id="birthYear" name="birthYear" className="cSelect cSelectYear" value={year} onChange={(e) => setYear(e.target.value)}>
                  <option value="">{t("form.yearPlaceholder")}</option>
                  {YEARS.map((y) => <option key={y} value={y}>{y}{t("form.yearSuffix")}</option>)}
                </select>
                <select id="birthMonth" name="birthMonth" className="cSelect" value={month} onChange={(e) => setMonth(e.target.value)}>
                  <option value="">{t("form.monthPlaceholder")}</option>
                  {MONTHS.map((m) => <option key={m} value={m}>{m}{t("form.monthSuffix")}</option>)}
                </select>
                <select id="birthDay" name="birthDay" className="cSelect" value={day} onChange={(e) => setDay(e.target.value)}>
                  <option value="">{t("form.dayPlaceholder")}</option>
                  {availableDays.map((d) => <option key={d} value={d}>{d}{t("form.daySuffix")}</option>)}
                </select>
              </div>
            </div>

            {/* ② 태어난 시간 — 날짜 입력 후 */}
            <div className={`cRow cReveal ${hasDate ? "cVisible" : ""}`}>
              <label className="cLabel" htmlFor="birthTime">{t("form.step3Label")}</label>
              <select id="birthTime" name="birthTime" className="cSelect cSelectFull" value={hour} onChange={(e) => setHour(e.target.value)}>
                <option value="">{t("form.selectTime")}</option>
                <option value="skip">{t("form.unknownTime")}</option>
                {BRANCH_VALUES.map((val, idx) => (
                  <option key={val} value={val}>{t(`branches.${idx}.label`)} · {t(`branches.${idx}.time`)}</option>
                ))}
              </select>
              {!isKorean && (
                <>
                  <label className="cLabel" htmlFor="city">{t("form.cityLabel")}</label>
                  <input
                    id="city"
                    name="city"
                    className="cInput"
                    placeholder={t("form.cityPlaceholder")}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </>
              )}
            </div>

            {/* ③ 성별 — 시간 선택 후 */}
            <div className={`cRow cReveal ${hasTime ? "cVisible" : ""}`}>
              <label className="cLabel">{t("form.step4Label")}</label>
              <div className="cGenderPills">
                {([
                  { label: t("form.male"), value: "male" as const },
                  { label: t("form.female"), value: "female" as const },
                ]).map((opt) => (
                  <button key={opt.value} type="button" className={`cMiniPill cGenderPill ${gender === opt.value ? "active" : ""}`} onClick={() => setGender(opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ④ 이름 + CTA — 성별 선택 후 */}
            <div className={`cRow cReveal ${hasGender ? "cVisible" : ""}`}>
              <label className="cLabel" htmlFor="name">{t("form.step1Label")}</label>
              <input
                ref={nameRef}
                id="name"
                className="cInput"
                placeholder={t("form.namePlaceholder")}
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                ref={ctaRef}
                type="submit"
                className="cCta"
                disabled={!canAnalyze || isSubmitting}
              >
                {isSubmitting ? t("form.analyzing") : t("form.startFree")}
              </button>
            </div>
          </form>
        </div>
      </section>

      <nav className="cLegalLinks">
        <Link href="/terms">{tc("footer.terms")}</Link>
        <Link href="/privacy">{tc("footer.privacy")}</Link>
        <Link href="/refund">{tc("footer.refund")}</Link>
        <Link href="/disclaimer">{tc("footer.legal")}</Link>
      </nav>
    </div>
  );
}
