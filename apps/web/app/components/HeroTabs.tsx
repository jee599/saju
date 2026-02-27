"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "../lib/gtag";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function DateSelects({
  prefix,
  values,
  onChange,
}: {
  prefix: string;
  values: { year: string; month: string; day: string };
  onChange: (field: "year" | "month" | "day", value: string) => void;
}) {
  const selectClass =
    "w-full rounded-xl border border-white/6 bg-bg-card px-3 py-3 text-t1 text-sm outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20 transition-all appearance-none";

  return (
    <div className="grid grid-cols-3 gap-2">
      <div>
        <label className="mb-1 block text-xs font-semibold text-t2">
          {prefix}년
        </label>
        <select
          className={selectClass}
          value={values.year}
          onChange={(e) => onChange("year", e.target.value)}
        >
          <option value="">년</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-t2">월</label>
        <select
          className={selectClass}
          value={values.month}
          onChange={(e) => onChange("month", e.target.value)}
        >
          <option value="">월</option>
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}월
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-t2">일</label>
        <select
          className={selectClass}
          value={values.day}
          onChange={(e) => onChange("day", e.target.value)}
        >
          <option value="">일</option>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d}일
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function HeroTabs() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"saju" | "compat">("saju");
  const inputStartFired = useRef(false);

  // Saju form state
  const [sajuDate, setSajuDate] = useState({ year: "", month: "", day: "" });

  // Compatibility form state
  const [myDate, setMyDate] = useState({ year: "", month: "", day: "" });
  const [partnerDate, setPartnerDate] = useState({
    year: "",
    month: "",
    day: "",
  });

  const handleSajuChange = useCallback(
    (field: "year" | "month" | "day", value: string) => {
      if (!inputStartFired.current) {
        inputStartFired.current = true;
        trackEvent.inputStart();
      }
      setSajuDate((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleMyChange = useCallback(
    (field: "year" | "month" | "day", value: string) => {
      setMyDate((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handlePartnerChange = useCallback(
    (field: "year" | "month" | "day", value: string) => {
      setPartnerDate((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSajuSubmit = () => {
    if (!sajuDate.year || !sajuDate.month || !sajuDate.day) return;
    trackEvent.inputComplete({
      year: Number(sajuDate.year),
      month: Number(sajuDate.month),
      day: Number(sajuDate.day),
    });
    router.push(
      `/analyze?year=${sajuDate.year}&month=${sajuDate.month}&day=${sajuDate.day}`
    );
  };

  const handleCompatSubmit = () => {
    if (
      !myDate.year ||
      !myDate.month ||
      !myDate.day ||
      !partnerDate.year ||
      !partnerDate.month ||
      !partnerDate.day
    )
      return;
    router.push(
      `/compatibility?myYear=${myDate.year}&myMonth=${myDate.month}&myDay=${myDate.day}&partnerYear=${partnerDate.year}&partnerMonth=${partnerDate.month}&partnerDay=${partnerDate.day}`
    );
  };

  const tabClass = (isActive: boolean) =>
    `flex-1 rounded-xl py-3 text-sm font-bold transition-all ${
      isActive
        ? "bg-gradient-to-r from-cta-from to-cta-to text-white shadow-lg shadow-cta-from/25"
        : "text-t2 hover:text-t1"
    }`;

  const isFormValid = (date: { year: string; month: string; day: string }) =>
    date.year && date.month && date.day;

  return (
    <div className="rounded-2xl border border-glass-border bg-bg-card-glass p-5 backdrop-blur-xl md:p-7">
      {/* Tabs */}
      <div className="mb-5 flex gap-2 rounded-xl bg-bg-bottom/60 p-1">
        <button
          className={tabClass(activeTab === "saju")}
          onClick={() => setActiveTab("saju")}
        >
          내 사주 ✦
        </button>
        <button
          className={tabClass(activeTab === "compat")}
          onClick={() => {
            setActiveTab("compat");
            trackEvent.compatibilityStart("hero_tab");
          }}
        >
          궁합 💕
        </button>
      </div>

      {/* Saju Tab Content */}
      {activeTab === "saju" && (
        <div className="space-y-4">
          <p className="text-xs font-medium text-t3">
            양력 생년월일을 선택해 주세요
          </p>
          <DateSelects
            prefix="출생"
            values={sajuDate}
            onChange={handleSajuChange}
          />
          <button
            onClick={handleSajuSubmit}
            disabled={!isFormValid(sajuDate)}
            className="w-full rounded-xl bg-gradient-to-r from-cta-from to-cta-to py-3.5 text-sm font-bold text-white shadow-lg shadow-cta-from/25 transition-all hover:shadow-xl hover:shadow-cta-from/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            무료 분석 시작
          </button>
        </div>
      )}

      {/* Compatibility Tab Content */}
      {activeTab === "compat" && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-accent">나의 생일</p>
            <DateSelects
              prefix="나"
              values={myDate}
              onChange={handleMyChange}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-accent-secondary">
              상대방 생일
            </p>
            <DateSelects
              prefix="상대"
              values={partnerDate}
              onChange={handlePartnerChange}
            />
          </div>
          <button
            onClick={handleCompatSubmit}
            disabled={!isFormValid(myDate) || !isFormValid(partnerDate)}
            className="w-full rounded-xl bg-gradient-to-r from-cta-from to-cta-to py-3.5 text-sm font-bold text-white shadow-lg shadow-cta-from/25 transition-all hover:shadow-xl hover:shadow-cta-from/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            궁합 보기
          </button>
        </div>
      )}
    </div>
  );
}
