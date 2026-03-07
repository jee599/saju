"use client";

import type { Element } from "@saju/engine-saju";

export default function ElementRadar({ balance, t }: { balance: Record<Element, number>; t: (key: string, values?: Record<string, string>) => string }) {
  const elements: Element[] = ["wood", "fire", "earth", "metal", "water"];
  const labels = ["木", "火", "土", "金", "水"];
  const cx = 110, cy = 105, R = 68;

  const angle = (i: number) => (Math.PI / 2) + (2 * Math.PI * i) / 5;
  const px = (i: number, r: number) => cx + r * Math.cos(-angle(i));
  const py = (i: number, r: number) => cy - r * Math.sin(-angle(i));

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const maxVal = Math.max(...elements.map(e => balance[e]), 1);

  const dataPoints = elements.map((el, i) => {
    const ratio = Math.min(balance[el] / maxVal, 1);
    return `${px(i, R * ratio)},${py(i, R * ratio)}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 220 230" style={{ width: "100%", maxWidth: 280, margin: "0 auto", display: "block" }} role="img" aria-label={t("radar.aria")}>
      <title>{t("radar.aria")}</title>
      <desc>{t("radar.desc")}</desc>
      <defs>
        <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C48B9F" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.1} />
        </linearGradient>
        <linearGradient id="radarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C48B9F" />
          <stop offset="100%" stopColor="#D4AF37" />
        </linearGradient>
      </defs>
      {gridLevels.map(level => (
        <polygon
          key={level}
          points={elements.map((_, i) => `${px(i, R * level)},${py(i, R * level)}`).join(" ")}
          fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={level === 1.0 ? 1.5 : 0.8}
          strokeDasharray={level < 1 ? "3 4" : "none"}
        />
      ))}
      {elements.map((_, i) => (
        <line key={i} x1={cx} y1={cy} x2={px(i, R)} y2={py(i, R)}
          stroke="rgba(255,255,255,0.1)" strokeWidth={0.8} />
      ))}
      <polygon points={dataPoints} fill="url(#radarFill)" stroke="url(#radarStroke)" strokeWidth={1.5} />
      {elements.map((el, i) => {
        const ratio = Math.min(balance[el] / maxVal, 1);
        const dotX = px(i, R * ratio);
        const dotY = py(i, R * ratio);
        return (
          <g key={el}>
            <circle cx={dotX} cy={dotY} r={5} fill={`var(--element-${el})`} opacity={0.2} />
            <circle cx={dotX} cy={dotY} r={3} fill={`var(--element-${el})`} />
          </g>
        );
      })}
      {elements.map((el, i) => {
        const labelR = R + 28;
        const lx = px(i, labelR);
        const ly = py(i, labelR);
        return (
          <g key={el}>
            <text x={lx} y={ly - 6} textAnchor="middle" dominantBaseline="central"
              fontSize={12} fontWeight={700} fill={`var(--element-${el})`}>
              {labels[i]}
            </text>
            <text x={lx} y={ly + 8} textAnchor="middle" dominantBaseline="central"
              fontSize={9} fontWeight={500} fill="rgba(255,255,255,0.5)">
              {balance[el]}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}
