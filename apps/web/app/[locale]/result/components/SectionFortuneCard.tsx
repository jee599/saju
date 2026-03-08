"use client";

type Trend = "rising" | "stable" | "caution";

interface SectionFortuneCardProps {
  icon: string;
  label: string;
  element: string;
  elementEmoji: string;
  trend: Trend;
  keyword: string;
}

const TREND_SYMBOL: Record<Trend, string> = {
  rising: "▲",
  stable: "━",
  caution: "▽",
};

const TREND_COLOR: Record<Trend, string> = {
  rising: "#7BC4A0",
  stable: "#D4A840",
  caution: "#E06B75",
};

const ELEMENT_COLORS: Record<string, string> = {
  "木": "#7BC4A0", "火": "#E06B75", "土": "#D4A840", "金": "#C8CCD8", "水": "#5B8EC4",
  wood: "#7BC4A0", fire: "#E06B75", earth: "#D4A840", metal: "#C8CCD8", water: "#5B8EC4",
};

export default function SectionFortuneCard({
  icon,
  label,
  element,
  elementEmoji,
  trend,
  keyword,
}: SectionFortuneCardProps) {
  const elColor = ELEMENT_COLORS[element] ?? "#B0A8BC";
  const trendColor = TREND_COLOR[trend];

  return (
    <div className="fortuneCard">
      <div className="fortuneCardHeader">
        <span className="fortuneCardIcon">{icon}</span>
        <span className="fortuneCardLabel">{label}</span>
        <span className="fortuneCardElement" style={{ color: elColor }}>
          {elementEmoji}{element}
        </span>
        <span className="fortuneCardTrend" style={{ color: trendColor }}>
          {TREND_SYMBOL[trend]}
        </span>
      </div>
      <p className="fortuneCardKeyword">{keyword}</p>
    </div>
  );
}
