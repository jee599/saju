import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const ELEMENT_COLORS: Record<string, string> = {
  wood: "#7BC4A0",
  fire: "#E06B75",
  earth: "#D4A840",
  metal: "#C8CCD8",
  water: "#5B8EC4",
};

const ELEMENT_KR: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};

const ELEMENT_EMOJI: Record<string, string> = {
  wood: "🌿", fire: "🔥", earth: "⛰️", metal: "⚙️", water: "🌊",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "사용자";
  const element = searchParams.get("element") ?? "wood";
  const type = searchParams.get("type") ?? "result"; // result | daily | compat

  const color = ELEMENT_COLORS[element] ?? ELEMENT_COLORS.wood;
  const kr = ELEMENT_KR[element] ?? "木";
  const emoji = ELEMENT_EMOJI[element] ?? "🌿";

  const title = type === "daily"
    ? `${name}님의 오늘의 운세`
    : type === "compat"
    ? `${name}님의 궁합 분석`
    : `${name}님은 ${kr}의 사람`;

  const subtitle = type === "daily"
    ? "매일 새로운 운세를 확인하세요"
    : type === "compat"
    ? "AI가 분석한 궁합 결과를 확인하세요"
    : "AI 사주 분석으로 나를 알아보세요";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1A0A2E 0%, #0F0A1A 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Decorative circles */}
        <div style={{
          position: "absolute", top: -60, right: -60,
          width: 300, height: 300, borderRadius: "50%",
          background: `radial-gradient(circle, ${color}20, transparent)`,
          display: "flex",
        }} />
        <div style={{
          position: "absolute", bottom: -40, left: -40,
          width: 200, height: 200, borderRadius: "50%",
          background: "radial-gradient(circle, #C48B9F15, transparent)",
          display: "flex",
        }} />

        {/* Emoji */}
        <div style={{ fontSize: 72, display: "flex" }}>{emoji}</div>

        {/* Title */}
        <div style={{
          fontSize: 48, fontWeight: 800, color: color,
          marginTop: 16, display: "flex", textAlign: "center",
          maxWidth: "80%",
        }}>
          {title}
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 24, color: "#B0A8BC", marginTop: 12,
          display: "flex",
        }}>
          {subtitle}
        </div>

        {/* Brand */}
        <div style={{
          position: "absolute", bottom: 40,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{
            fontSize: 20, fontWeight: 700,
            background: "linear-gradient(135deg, #C48B9F, #D4AF37)",
            backgroundClip: "text",
            color: "transparent",
            display: "flex",
          }}>
            복연구소 FortuneLab
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
