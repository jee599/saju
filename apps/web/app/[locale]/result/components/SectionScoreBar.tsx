"use client";

import { useEffect, useState } from "react";

interface SectionScoreBarProps {
  icon: string;
  label: string;
  score: number;
  maxScore?: number;
}

function getScoreColor(score: number, max: number): string {
  const ratio = score / max;
  if (ratio <= 0.33) return "#E06B75"; // red
  if (ratio <= 0.66) return "#D4A840"; // yellow
  return "#7BC4A0"; // green
}

export default function SectionScoreBar({
  icon,
  label,
  score,
  maxScore = 5,
}: SectionScoreBarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const pct = Math.min((score / maxScore) * 100, 100);
  const color = getScoreColor(score, maxScore);

  return (
    <div className="scoreBarRow">
      <span className="scoreBarIcon">{icon}</span>
      <span className="scoreBarLabel">{label}</span>
      <div className="scoreBarTrack">
        <div
          className="scoreBarFill"
          style={{
            width: mounted ? `${pct}%` : "0%",
            backgroundColor: color,
          }}
        />
      </div>
      <span className="scoreBarValue" style={{ color }}>
        {score}/{maxScore}
      </span>
    </div>
  );
}
