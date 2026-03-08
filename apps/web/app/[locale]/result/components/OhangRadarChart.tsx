"use client";

const ELEMENT_CONFIG: Array<{ key: string; label: string; emoji: string; color: string }> = [
  { key: "wood",  label: "木", emoji: "🌳", color: "#7BC4A0" },
  { key: "fire",  label: "火", emoji: "🔥", color: "#E06B75" },
  { key: "earth", label: "土", emoji: "🏔️", color: "#D4A840" },
  { key: "metal", label: "金", emoji: "⚔️", color: "#C8CCD8" },
  { key: "water", label: "水", emoji: "💧", color: "#5B8EC4" },
];

interface OhangRadarChartProps {
  distribution: Record<string, number>;
}

export default function OhangRadarChart({ distribution }: OhangRadarChartProps) {
  const cx = 160, cy = 155, R = 100;
  const n = 5;

  const angle = (i: number) => (Math.PI / 2) + (2 * Math.PI * i) / n;
  const px = (i: number, r: number) => cx + r * Math.cos(-angle(i));
  const py = (i: number, r: number) => cy - r * Math.sin(-angle(i));

  // Find dominant element for fill color
  let dominantIdx = 0;
  let maxVal = 0;
  ELEMENT_CONFIG.forEach((el, i) => {
    const val = distribution[el.key] ?? 0;
    if (val > maxVal) {
      maxVal = val;
      dominantIdx = i;
    }
  });
  const dominantColor = ELEMENT_CONFIG[dominantIdx].color;

  // Ideal balance line (20% each = equal distribution)
  const idealPoints = ELEMENT_CONFIG.map((_, i) =>
    `${px(i, R * 0.6)},${py(i, R * 0.6)}`
  ).join(" ");

  // User's distribution polygon
  const dataPoints = ELEMENT_CONFIG.map((el, i) => {
    const val = Math.min(distribution[el.key] ?? 0, 100);
    const ratio = val / 100;
    return `${px(i, R * ratio)},${py(i, R * ratio)}`;
  }).join(" ");

  return (
    <svg
      viewBox="0 0 320 320"
      style={{ width: "100%", maxWidth: 320, margin: "0 auto", display: "block" }}
      role="img"
      aria-label="Five Elements Radar Chart"
    >
      <defs>
        <radialGradient id="ohangFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={dominantColor} stopOpacity={0.35} />
          <stop offset="100%" stopColor={dominantColor} stopOpacity={0.08} />
        </radialGradient>
        <filter id="ohangGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1.0].map((level) => (
        <polygon
          key={level}
          points={ELEMENT_CONFIG.map((_, i) =>
            `${px(i, R * level)},${py(i, R * level)}`
          ).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={level === 1.0 ? 1.2 : 0.6}
        />
      ))}

      {/* Axis lines */}
      {ELEMENT_CONFIG.map((_, i) => (
        <line
          key={i}
          x1={cx} y1={cy}
          x2={px(i, R)} y2={py(i, R)}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={0.6}
        />
      ))}

      {/* Ideal balance dotted pentagon */}
      <polygon
        points={idealPoints}
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={1}
        strokeDasharray="4 4"
      />

      {/* User distribution polygon */}
      <polygon
        points={dataPoints}
        fill="url(#ohangFill)"
        stroke={dominantColor}
        strokeWidth={2}
        filter="url(#ohangGlow)"
        className="ohangRadarPolygon"
      />

      {/* Data point dots */}
      {ELEMENT_CONFIG.map((el, i) => {
        const val = Math.min(distribution[el.key] ?? 0, 100);
        const ratio = val / 100;
        const dotX = px(i, R * ratio);
        const dotY = py(i, R * ratio);
        return (
          <g key={el.key}>
            <circle cx={dotX} cy={dotY} r={6} fill={el.color} opacity={0.2} />
            <circle cx={dotX} cy={dotY} r={3.5} fill={el.color} />
          </g>
        );
      })}

      {/* Labels at each vertex */}
      {ELEMENT_CONFIG.map((el, i) => {
        const labelR = R + 36;
        const lx = px(i, labelR);
        const ly = py(i, labelR);
        return (
          <g key={el.key}>
            <text
              x={lx} y={ly - 10}
              textAnchor="middle" dominantBaseline="central"
              fontSize={14} fill="rgba(255,255,255,0.7)"
            >
              {el.emoji}
            </text>
            <text
              x={lx} y={ly + 6}
              textAnchor="middle" dominantBaseline="central"
              fontSize={13} fontWeight={700} fill={el.color}
            >
              {el.label}
            </text>
            <text
              x={lx} y={ly + 20}
              textAnchor="middle" dominantBaseline="central"
              fontSize={10} fontWeight={500} fill="rgba(255,255,255,0.4)"
            >
              {distribution[el.key] ?? 0}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}
