"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "../lib/gtag";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function DateSelects({
  label,
  values,
  onChange,
}: {
  label: string;
  values: { year: string; month: string; day: string };
  onChange: (field: "year" | "month" | "day", value: string) => void;
}) {
  const selectClass =
    "w-full rounded-lg border border-white/6 bg-bg-card px-2 py-2.5 text-t1 text-xs outline-none focus:border-accent/40 transition-all appearance-none";

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-t2">{label}</p>
      <div className="grid grid-cols-3 gap-1.5">
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

export default function MiniCompatForm() {
  const router = useRouter();
  const [myDate, setMyDate] = useState({ year: "", month: "", day: "" });
  const [partnerDate, setPartnerDate] = useState({
    year: "",
    month: "",
    day: "",
  });

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

  const handleSubmit = () => {
    if (
      !myDate.year ||
      !myDate.month ||
      !myDate.day ||
      !partnerDate.year ||
      !partnerDate.month ||
      !partnerDate.day
    )
      return;
    trackEvent.compatibilityStart("report");
    router.push(
      `/compatibility?myYear=${myDate.year}&myMonth=${myDate.month}&myDay=${myDate.day}&partnerYear=${partnerDate.year}&partnerMonth=${partnerDate.month}&partnerDay=${partnerDate.day}`
    );
  };

  const isValid =
    myDate.year &&
    myDate.month &&
    myDate.day &&
    partnerDate.year &&
    partnerDate.month &&
    partnerDate.day;

  return (
    <div className="rounded-2xl border border-glass-border bg-bg-card-glass p-5 backdrop-blur-xl">
      <h3 className="mb-4 text-center text-lg font-bold text-t1">
        궁합도 궁금하신가요? 💕
      </h3>
      <div className="space-y-3">
        <DateSelects label="나의 생일" values={myDate} onChange={handleMyChange} />
        <DateSelects
          label="상대방 생일"
          values={partnerDate}
          onChange={handlePartnerChange}
        />
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className="w-full rounded-xl bg-gradient-to-r from-cta-from to-cta-to py-3 text-sm font-bold text-white shadow-lg shadow-cta-from/25 transition-all hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
        >
          궁합 보기
        </button>
      </div>
    </div>
  );
}
