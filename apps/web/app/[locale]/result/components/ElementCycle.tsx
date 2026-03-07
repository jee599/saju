"use client";

import type { Element } from "@saju/engine-saju";

export default function ElementCycle({ dominant, weakest, balance, t }: { dominant: Element; weakest: Element; balance: Record<Element, number>; t: (key: string) => string }) {
  const elements: Element[] = ["wood", "fire", "earth", "metal", "water"];
  const labels = ["木", "火", "土", "金", "水"];
  const cx = 110, cy = 110, R = 65;

  const angle = (i: number) => (Math.PI / 2) + (2 * Math.PI * i) / 5;
  const px = (i: number) => cx + R * Math.cos(-angle(i));
  const py = (i: number) => cy - R * Math.sin(-angle(i));

  const maxBal = Math.max(...elements.map(e => balance[e]), 1);
  const nodeRadius = (el: Element) => {
    const ratio = balance[el] / maxBal;
    return 14 + ratio * 14;
  };

  return (
    <svg viewBox="0 0 220 220" style={{ width: "100%", maxWidth: 260, margin: "0 auto", display: "block" }} role="img" aria-label={t("cycle.aria")}>
      <title>{t("cycle.aria")}</title>
      <desc>{t("cycle.desc")}</desc>
      <defs>
        <marker id="arrowCycle" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={4} markerHeight={4} orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(196,139,159,0.5)" />
        </marker>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={30} />
      {elements.map((_, i) => {
        const next = (i + 1) % 5;
        const x1 = px(i), y1 = py(i), x2 = px(next), y2 = py(next);
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const offset = 24;
        return (
          <line key={`gen-${i}`}
            x1={x1 + dx / len * offset} y1={y1 + dy / len * offset}
            x2={x2 - dx / len * offset} y2={y2 - dy / len * offset}
            stroke="rgba(196,139,159,0.3)" strokeWidth={1.5} markerEnd="url(#arrowCycle)"
          />
        );
      })}
      {elements.map((el, i) => {
        const isDominant = el === dominant;
        const isWeakest = el === weakest;
        const nodeR = nodeRadius(el);
        return (
          <g key={el}>
            {isDominant && (
              <circle cx={px(i)} cy={py(i)} r={nodeR + 4} fill="none"
                stroke={`var(--element-${el})`} strokeWidth={1} opacity={0.3}>
                <animate attributeName="r" values={`${nodeR + 2};${nodeR + 6};${nodeR + 2}`} dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={px(i)} cy={py(i)} r={nodeR}
              fill={`var(--element-${el})`}
              opacity={isDominant ? 0.85 : isWeakest ? 0.3 : 0.55}
              stroke={isDominant ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.08)"}
              strokeWidth={isDominant ? 1.5 : 0.5}
            />
            <text x={px(i)} y={py(i)} textAnchor="middle" dominantBaseline="central"
              fontSize={Math.max(10, nodeR * 0.5)} fontWeight={700} fill="#fff">
              {labels[i]}
            </text>
            {isDominant && (
              <text x={px(i)} y={py(i) + nodeR + 12} textAnchor="middle" fontSize={8} fontWeight={600}
                fill={`var(--element-${el})`}>{t("cycle.strong")}</text>
            )}
            {isWeakest && (
              <text x={px(i)} y={py(i) + nodeR + 10} textAnchor="middle" fontSize={8} fontWeight={600}
                fill="rgba(255,255,255,0.3)">{t("cycle.weak")}</text>
            )}
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={12} fill="rgba(30,21,51,0.8)" stroke="rgba(220,207,243,0.1)" strokeWidth={0.5} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={600}
        fill="rgba(255,255,255,0.3)">{t("cycle.center")}</text>
    </svg>
  );
}
