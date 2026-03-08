"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "../../../../i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { calculateFourPillars } from "@saju/engine-saju";
import type { Element, FourPillars } from "@saju/engine-saju";
import { convertLunarToSolar } from "../../../../lib/lunarConvert";
import { track, trackFunnel, trackScrollDepth, createPageTimer, trackPageEvent, trackLanding } from "../../../../lib/analytics";

// ── 천간/지지 → 오행 매핑 ──
const STEM_TO_ELEMENT: Record<string, Element> = {
  "甲": "wood", "乙": "wood", "丙": "fire", "丁": "fire",
  "戊": "earth", "己": "earth", "庚": "metal", "辛": "metal",
  "壬": "water", "癸": "water",
};
const BRANCH_TO_ELEMENT: Record<string, Element> = {
  "寅": "wood", "卯": "wood", "巳": "fire", "午": "fire",
  "辰": "earth", "未": "earth", "戌": "earth", "丑": "earth",
  "申": "metal", "酉": "metal", "亥": "water", "子": "water",
};

type Analysis = {
  pillars: FourPillars;
  elements: ReturnType<typeof calculateFourPillars>["elements"];
};

export function useFortuneResult() {
  const t = useTranslations("result");
  const locale = useLocale();
  const params = useSearchParams();
  const router = useRouter();

  const name = params.get("name") ?? t("defaultUser");
  const birthDate = params.get("birthDate");
  const birthTime = params.get("birthTime");
  const gender = params.get("gender") ?? "other";
  const calendarType = params.get("calendarType") ?? "solar";

  const [visible, setVisible] = useState(false);
  const [personalityText, setPersonalityText] = useState<string | null>(null);
  const [personalityError, setPersonalityError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [lunarError, setLunarError] = useState(false);

  const pageTimerRef = useRef<ReturnType<typeof createPageTimer> | null>(null);
  const maxScrollRef = useRef(0);

  // Page init + personality cache lookup
  useEffect(() => {
    if (!birthDate) {
      router.replace("/");
      return;
    }
    trackLanding();
    track("report_view");
    trackPageEvent("/result");
    trackFunnel("result_view");
    pageTimerRef.current = createPageTimer("result");
    setTimeout(() => setVisible(true), 100);

    try {
      const cached = sessionStorage.getItem("free_personality");
      const cachedKey = sessionStorage.getItem("free_personality_key");
      const currentKey = `${name}_${birthDate}_${birthTime}_${gender}_${calendarType}`;
      if (cached && cachedKey === currentKey) {
        setPersonalityText(cached);
      } else {
        setPersonalityError(t("personalityError"));
      }
    } catch {
      setPersonalityError(t("personalityError"));
    }
  }, [birthDate, birthTime, name, gender, calendarType, router, t]);

  // Scroll depth tracking + cleanup
  useEffect(() => {
    const onScroll = () => {
      const depth = Math.round(
        ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100,
      );
      if (depth > maxScrollRef.current) maxScrollRef.current = depth;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (maxScrollRef.current > 0) trackScrollDepth("result", maxScrollRef.current);
      pageTimerRef.current?.stop();
    };
  }, []);

  // Compute four pillars analysis
  useEffect(() => {
    if (!birthDate) return;
    let cancelled = false;
    const parts = birthDate.split("-").map(Number);
    let y = parts[0] ?? 2000;
    let m = parts[1] ?? 1;
    let d = parts[2] ?? 1;
    if (isNaN(y) || isNaN(m) || isNaN(d) || y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
      const result = calculateFourPillars({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 });
      setAnalysis({ pillars: result.pillars, elements: result.elements });
      return;
    }

    const hour = birthTime ? parseInt(birthTime.split(":")[0], 10) : 12;
    const minute = birthTime ? parseInt(birthTime.split(":")[1], 10) : 0;
    const safeHour = isNaN(hour) ? 12 : hour;
    const safeMinute = isNaN(minute) ? 0 : minute;

    const compute = (sy: number, sm: number, sd: number) => {
      if (cancelled) return;
      const result = calculateFourPillars({ year: sy, month: sm, day: sd, hour: safeHour, minute: safeMinute });
      setAnalysis({ pillars: result.pillars, elements: result.elements });
    };

    if (calendarType === "lunar") {
      convertLunarToSolar(y, m, d)
        .then((solar) => compute(solar.year, solar.month, solar.day))
        .catch(() => {
          if (cancelled) return;
          setLunarError(true);
          compute(y, m, d);
        });
    } else {
      compute(y, m, d);
    }
    return () => { cancelled = true; };
  }, [birthDate, birthTime, calendarType]);

  // Element source labels
  const elementSources = useMemo(() => {
    const sources: Record<Element, string[]> = {
      wood: [], fire: [], earth: [], metal: [], water: [],
    };
    if (!analysis) return sources;

    const marks: Array<{ label: string; stem: string; branch: string }> = [
      { label: t("pillarLabel.year"), stem: analysis.pillars.year.stem, branch: analysis.pillars.year.branch },
      { label: t("pillarLabel.month"), stem: analysis.pillars.month.stem, branch: analysis.pillars.month.branch },
      { label: t("pillarLabel.day"), stem: analysis.pillars.day.stem, branch: analysis.pillars.day.branch },
      { label: t("pillarLabel.hour"), stem: analysis.pillars.hour.stem, branch: analysis.pillars.hour.branch },
    ];

    for (const m of marks) {
      const stemEl = STEM_TO_ELEMENT[m.stem];
      const branchEl = BRANCH_TO_ELEMENT[m.branch];
      if (stemEl) sources[stemEl].push(t("stemSource", { label: m.label, char: m.stem }));
      if (branchEl) sources[branchEl].push(t("branchSource", { label: m.label, char: m.branch }));
    }

    return sources;
  }, [analysis, t]);

  // Paywall query params
  const paywallParams = useMemo(() => new URLSearchParams({
    birthDate: birthDate ?? "",
    birthTime: birthTime ?? "",
    name,
    gender,
    calendarType,
  }).toString(), [birthDate, birthTime, name, gender, calendarType]);

  return {
    t,
    locale,
    name,
    birthDate,
    birthTime,
    gender,
    calendarType,
    visible,
    personalityText,
    personalityError,
    analysis,
    lunarError,
    elementSources,
    paywallParams,
  };
}
