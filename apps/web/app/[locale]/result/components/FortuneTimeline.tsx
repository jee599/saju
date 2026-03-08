"use client";

import { useEffect, useRef } from "react";

const ELEMENT_COLORS: Record<string, string> = {
  wood: "#7BC4A0",
  fire: "#E06B75",
  earth: "#D4A840",
  metal: "#C8CCD8",
  water: "#5B8EC4",
};

interface Period {
  startAge: number;
  endAge: number;
  element: string;
  keywords: string[];
}

interface FortuneTimelineProps {
  periods: Period[];
  currentAge: number;
}

export default function FortuneTimeline({ periods, currentAge }: FortuneTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentIdx = periods.findIndex(
    (p) => currentAge >= p.startAge && currentAge <= p.endAge
  );

  // Scroll to center the current period on mount
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || currentIdx < 0) return;

    const nodes = container.querySelectorAll<HTMLDivElement>(".ftNode");
    const target = nodes[currentIdx];
    if (!target) return;

    const scrollLeft =
      target.offsetLeft - container.clientWidth / 2 + target.clientWidth / 2;
    container.scrollTo({ left: scrollLeft, behavior: "smooth" });
  }, [currentIdx]);

  return (
    <div className="ftWrapper" ref={scrollRef}>
      <div className="ftTrack">
        {periods.map((period, i) => {
          const isCurrent = i === currentIdx;
          const color = ELEMENT_COLORS[period.element] ?? "var(--t2)";

          return (
            <div key={i} className="ftNodeGroup">
              {/* Connector line (not on first node) */}
              {i > 0 && <div className="ftLine" />}

              <div className={`ftNode ${isCurrent ? "ftNodeCurrent" : ""}`}>
                {/* Glow ring for current */}
                {isCurrent && (
                  <div
                    className="ftGlow"
                    style={{ borderColor: color, boxShadow: `0 0 12px ${color}40` }}
                  />
                )}

                {/* Element dot */}
                <div
                  className="ftDot"
                  style={{ backgroundColor: color }}
                />

                {/* Age range */}
                <span className="ftAge" style={isCurrent ? { color } : undefined}>
                  {period.startAge}–{period.endAge}
                </span>

                {/* Keywords */}
                <div className="ftKeywords">
                  {period.keywords.slice(0, 2).map((kw, j) => (
                    <span
                      key={j}
                      className="ftTag"
                      style={isCurrent ? { borderColor: `${color}50`, color } : undefined}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
