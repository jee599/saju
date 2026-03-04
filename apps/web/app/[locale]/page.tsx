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

/* ─── Constellation Canvas ─── */

const STAR_COLORS = ["#7BC4A0", "#D4848A", "#D4B878", "#B8BCC8", "#7BA4D4"];

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

const RGB = STAR_COLORS.map(hexToRgb);

interface ShootTarget {
  x: number;
  y: number;
}

interface OrbitStar {
  orbitR: number;
  angle: number;
  speed: number;
  size: number;
  alpha: number;
  colorIdx: number;
  twinkleRate: number;
  twinkleOffset: number;
}

interface BgStar {
  x: number;
  y: number;
  size: number;
  alpha: number;
  rate: number;
  offset: number;
}

interface ShootingStar {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startTime: number;
  duration: number;
  colorIdx: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
  done: boolean;
  settled: boolean;
}

function ConstellationCanvas({
  shootFrom,
  onShootComplete,
  parallax,
}: {
  shootFrom: ShootTarget | null;
  onShootComplete: () => void;
  parallax: { x: number; y: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    stars: OrbitStar[];
    bgStars: BgStar[];
    ringRadii: number[];
    shootingStar: ShootingStar | null;
  }>({ stars: [], bgStars: [], ringRadii: [], shootingStar: null });
  const frameRef = useRef<number>(0);
  const timeRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const onCompleteRef = useRef(onShootComplete);
  onCompleteRef.current = onShootComplete;

  // Handle shootFrom prop
  useEffect(() => {
    if (!shootFrom) return;
    const { w, h } = sizeRef.current;
    const cx = w / 2;
    const cy = h * 0.44;
    const state = stateRef.current;
    // Land on a visible orbit on the RIGHT side (angle between -π/4 and π/4)
    const targetOrbit = state.ringRadii[4] ?? 200;
    const targetAngle = -Math.PI / 4 + Math.random() * (Math.PI / 2);
    const endX = cx + Math.cos(targetAngle) * targetOrbit;
    const endY = cy + Math.sin(targetAngle) * targetOrbit;

    state.shootingStar = {
      startX: shootFrom.x,
      startY: shootFrom.y,
      endX,
      endY,
      startTime: timeRef.current,
      duration: 0.8,
      colorIdx: Math.floor(Math.random() * 5),
      trail: [],
      done: false,
      settled: false,
    };
  }, [shootFrom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const setup = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };

      const baseR = Math.min(w, h) * 0.442;
      const rings = [
        { r: baseR * 0.22, count: 5, speed: 0.12, sizes: [0.8, 1.6] },
        { r: baseR * 0.38, count: 8, speed: -0.07, sizes: [0.7, 1.8] },
        { r: baseR * 0.55, count: 10, speed: 0.045, sizes: [0.6, 2.0] },
        { r: baseR * 0.72, count: 14, speed: -0.028, sizes: [0.5, 1.8] },
        { r: baseR * 0.88, count: 16, speed: 0.018, sizes: [0.5, 1.6] },
        { r: baseR * 1.05, count: 12, speed: -0.012, sizes: [0.4, 1.4] },
        { r: baseR * 1.2, count: 8, speed: 0.008, sizes: [0.4, 1.2] },
      ];

      const stars: OrbitStar[] = [];
      for (const ring of rings) {
        for (let i = 0; i < ring.count; i++) {
          stars.push({
            orbitR: ring.r,
            angle: Math.random() * Math.PI * 2,
            speed: ring.speed * (0.85 + Math.random() * 0.3),
            size: ring.sizes[0] + Math.random() * (ring.sizes[1] - ring.sizes[0]),
            alpha: 0.4 + Math.random() * 0.6,
            colorIdx: Math.floor(Math.random() * 5),
            twinkleRate: 1.5 + Math.random() * 3.5,
            twinkleOffset: Math.random() * Math.PI * 2,
          });
        }
      }

      const bgStars: BgStar[] = [];
      for (let i = 0; i < 60; i++) {
        bgStars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: 0.2 + Math.random() * 0.6,
          alpha: 0.08 + Math.random() * 0.2,
          rate: 1.0 + Math.random() * 2.5,
          offset: Math.random() * Math.PI * 2,
        });
      }

      stateRef.current.stars = stars;
      stateRef.current.bgStars = bgStars;
      stateRef.current.ringRadii = rings.map((r) => r.r);
    };

    setup();
    window.addEventListener("resize", setup);

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const render = () => {
      const { w, h } = sizeRef.current;
      timeRef.current += 0.016;
      const t = timeRef.current;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h * 0.44;
      const { stars, bgStars, ringRadii, shootingStar } = stateRef.current;

      // Background stars
      for (const s of bgStars) {
        const a = s.alpha * (0.1 + 0.9 * Math.pow(Math.max(0, Math.sin(t * s.rate + s.offset)), 2));
        ctx.fillStyle = `rgba(200,200,220,${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Orbit guide rings
      for (const r of ringRadii) {
        ctx.strokeStyle = "rgba(184,169,212,0.035)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Orbit stars
      for (const s of stars) {
        const ang = s.angle + t * s.speed;
        const x = cx + Math.cos(ang) * s.orbitR;
        const y = cy + Math.sin(ang) * s.orbitR;
        const tw = 0.15 + 0.85 * Math.pow((0.5 + 0.5 * Math.sin(t * s.twinkleRate + s.twinkleOffset)), 1.5);
        const al = s.alpha * tw;
        const col = RGB[s.colorIdx]!;

        if (s.size > 0.8 && al > 0.3) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, s.size * 7);
          g.addColorStop(0, `rgba(${col.r},${col.g},${col.b},${al * 0.35})`);
          g.addColorStop(0.4, `rgba(${col.r},${col.g},${col.b},${al * 0.1})`);
          g.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, s.size * 7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${al})`;
        ctx.beginPath();
        ctx.arc(x, y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Center glow
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50);
      cg.addColorStop(0, "rgba(184,169,212,0.06)");
      cg.addColorStop(1, "rgba(184,169,212,0)");
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(cx, cy, 50, 0, Math.PI * 2);
      ctx.fill();

      // Shooting star animation
      if (shootingStar && !shootingStar.settled) {
        const elapsed = t - shootingStar.startTime;
        const progress = Math.min(elapsed / shootingStar.duration, 1);
        const eased = easeOutCubic(progress);
        const col = RGB[shootingStar.colorIdx]!;

        const curX = shootingStar.startX + (shootingStar.endX - shootingStar.startX) * eased;
        const curY = shootingStar.startY + (shootingStar.endY - shootingStar.startY) * eased;

        // Add trail point
        shootingStar.trail.push({ x: curX, y: curY, alpha: 1 });

        // Draw trail
        for (let i = shootingStar.trail.length - 1; i >= 0; i--) {
          const tp = shootingStar.trail[i]!;
          tp.alpha -= 0.04;
          if (tp.alpha <= 0) {
            shootingStar.trail.splice(i, 1);
            continue;
          }
          const sz = 2.5 * tp.alpha;
          // Glow
          const tg = ctx.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, sz * 4);
          tg.addColorStop(0, `rgba(${col.r},${col.g},${col.b},${tp.alpha * 0.3})`);
          tg.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0)`);
          ctx.fillStyle = tg;
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, sz * 4, 0, Math.PI * 2);
          ctx.fill();
          // Core
          ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${tp.alpha})`;
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, sz, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw main star (bigger, brighter)
        if (progress < 1) {
          const mainSize = 3 + (1 - progress) * 2;
          const glow = ctx.createRadialGradient(curX, curY, 0, curX, curY, mainSize * 6);
          glow.addColorStop(0, `rgba(${col.r},${col.g},${col.b},0.6)`);
          glow.addColorStop(0.5, `rgba(${col.r},${col.g},${col.b},0.15)`);
          glow.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0)`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(curX, curY, mainSize * 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(255,255,255,0.9)`;
          ctx.beginPath();
          ctx.arc(curX, curY, mainSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // Landing burst when done
        if (progress >= 1 && !shootingStar.done) {
          shootingStar.done = true;
          // Add the star to orbit on the right side
          const targetOrbit = ringRadii[4] ?? 200;
          const targetAngle = Math.atan2(shootingStar.endY - cy, shootingStar.endX - cx);
          stars.push({
            orbitR: targetOrbit,
            angle: targetAngle,
            speed: 0.018 * (0.85 + Math.random() * 0.3),
            size: 2.5,
            alpha: 1.0,
            colorIdx: shootingStar.colorIdx,
            twinkleRate: 1.0,
            twinkleOffset: 0,
          });
          // Fire onComplete after a short pause
          setTimeout(() => {
            shootingStar.settled = true;
            onCompleteRef.current();
          }, 400);
        }
      }

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", setup);
    };
  }, []);

  return (
    <div
      className="constellationCanvas"
      aria-hidden="true"
      style={{ transform: `translate(${parallax.x}px, ${parallax.y}px)` }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
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
  const [shootFrom, setShootFrom] = useState<ShootTarget | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
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

  // 마우스 패럴랙스 — 배경 미세 이동 (max ±8px)
  const handleParallax = useCallback(
    (e: React.MouseEvent) => {
      if (isTouch) return;
      const { clientX, clientY } = e;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = ((clientX - cx) / cx) * -8;
      const dy = ((clientY - cy) / cy) * -8;
      setParallax({ x: dx, y: dy });
    },
    [isTouch],
  );

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

    // Get CTA button position for shoot animation
    if (ctaRef.current) {
      const rect = ctaRef.current.getBoundingClientRect();
      setShootFrom({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    } else {
      router.push(loadingUrlRef.current);
    }
  };

  const handleShootComplete = useCallback(() => {
    if (loadingUrlRef.current) {
      router.push(loadingUrlRef.current);
    }
  }, [router]);

  return (
    <div className="page constellationPage" onMouseMove={handleParallax}>
      <ConstellationCanvas shootFrom={shootFrom} onShootComplete={handleShootComplete} parallax={parallax} />

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
                onMouseMove={handleMagneticMove}
                onMouseLeave={handleMagneticLeave}
                style={{ transform: `translate(${magneticOffset.x}px, ${magneticOffset.y}px)` }}
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
