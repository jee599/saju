"use client";

import { useEffect, useRef, useState } from "react";

interface ElementBarData {
  element: string;
  elementKr: string;
  label: string;
  percentage: number;
  colorClass: string;
  colorVar: string;
  isHighest: boolean;
}

export default function ElementBars({ data }: { data: ElementBarData[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="space-y-3">
      {data.map((item) => (
        <div key={item.element} className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-right text-sm font-medium text-t2">
            {item.element} {item.label}
          </span>
          <div className="relative flex-1 h-6 rounded-full bg-white/4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                item.isHighest ? "h-7 -my-0.5" : ""
              }`}
              style={{
                width: visible ? `${Math.max(item.percentage, 2)}%` : "0%",
                backgroundColor: item.colorVar,
                animation: visible ? "bar-fill 1s ease-out" : "none",
              }}
            />
          </div>
          <span
            className={`w-10 text-right text-sm ${
              item.isHighest ? "font-bold text-t1" : "text-t2"
            }`}
          >
            {item.percentage}%
          </span>
        </div>
      ))}
    </div>
  );
}
