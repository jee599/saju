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

const ELEMENT_EMOJI: Record<string, string> = {
  wood: "🌿", fire: "🔥", earth: "⛰️", metal: "⚙️", water: "🌊",
};

const ELEMENT_HANJA: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};

/** Per-locale element names */
const ELEMENT_NAMES: Record<string, Record<string, string>> = {
  ko: { wood: "나무", fire: "불", earth: "흙", metal: "금", water: "물" },
  en: { wood: "Wood", fire: "Fire", earth: "Earth", metal: "Metal", water: "Water" },
  ja: { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" },
  zh: { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" },
  th: { wood: "ไม้", fire: "ไฟ", earth: "ดิน", metal: "โลหะ", water: "น้ำ" },
  vi: { wood: "Mộc", fire: "Hỏa", earth: "Thổ", metal: "Kim", water: "Thủy" },
  id: { wood: "Kayu", fire: "Api", earth: "Tanah", metal: "Logam", water: "Air" },
  hi: { wood: "काष्ठ", fire: "अग्नि", earth: "पृथ्वी", metal: "धातु", water: "जल" },
};

/** Per-locale title templates */
const TITLES: Record<string, Record<string, (name: string, el: string) => string>> = {
  ko: {
    result: (n, el) => `${n}님은 ${el}의 사람`,
    daily: (n) => `${n}님의 오늘의 운세`,
    compat: (n) => `${n}님의 궁합 분석`,
  },
  en: {
    result: (n, el) => `${n} is a ${el} person`,
    daily: (n) => `${n}'s Daily Fortune`,
    compat: (n) => `${n}'s Compatibility`,
  },
  ja: {
    result: (n, el) => `${n}さんは${el}の人`,
    daily: (n) => `${n}さんの今日の運勢`,
    compat: (n) => `${n}さんの相性分析`,
  },
  zh: {
    result: (n, el) => `${n}是${el}之人`,
    daily: (n) => `${n}的今日运势`,
    compat: (n) => `${n}的配对分析`,
  },
  th: {
    result: (n, el) => `${n} คือคนธาตุ${el}`,
    daily: (n) => `ดวงวันนี้ของ${n}`,
    compat: (n) => `วิเคราะห์ความเข้ากันของ${n}`,
  },
  vi: {
    result: (n, el) => `${n} mang mệnh ${el}`,
    daily: (n) => `Vận mệnh hôm nay của ${n}`,
    compat: (n) => `Phân tích hợp của ${n}`,
  },
  id: {
    result: (n, el) => `${n} berelemen ${el}`,
    daily: (n) => `Ramalan hari ini ${n}`,
    compat: (n) => `Analisis kecocokan ${n}`,
  },
  hi: {
    result: (n, el) => `${n} ${el} तत्व के हैं`,
    daily: (n) => `${n} का आज का राशिफल`,
    compat: (n) => `${n} की अनुकूलता`,
  },
};

const SUBTITLES: Record<string, string> = {
  ko: "AI 사주 분석으로 나를 알아보세요",
  en: "Discover your destiny with AI",
  ja: "AIで運命を読み解く",
  zh: "AI解读你的命运",
  th: "ค้นพบชะตาของคุณด้วย AI",
  vi: "Khám phá vận mệnh với AI",
  id: "Temukan takdirmu dengan AI",
  hi: "AI से अपनी किस्मत जानें",
};

const BRAND: Record<string, string> = {
  ko: "복연구소 FortuneLab",
  en: "FortuneLab",
  ja: "FortuneLab",
  zh: "命理实验室 FortuneLab",
  th: "FortuneLab",
  vi: "FortuneLab",
  id: "FortuneLab",
  hi: "FortuneLab",
};

/** Locale → direct Google Fonts woff2 file URL (full charset, not subset) */
const FONT_URLS: Record<string, string> = {
  ko: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-kr@latest/korean-700-normal.woff2",
  ja: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-700-normal.woff2",
  zh: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-sc@latest/chinese-simplified-700-normal.woff2",
  th: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-thai@latest/thai-700-normal.woff2",
  hi: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-devanagari@latest/devanagari-700-normal.woff2",
  vi: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-ext-700-normal.woff2",
  id: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-ext-700-normal.woff2",
};

async function loadFont(locale: string): Promise<ArrayBuffer | null> {
  const url = FONT_URLS[locale];
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawName = searchParams.get("name") ?? "User";
  const name = rawName.slice(0, 20);
  const rawElement = searchParams.get("element") ?? "wood";
  const element = ELEMENT_COLORS[rawElement] ? rawElement : "wood";
  const rawType = searchParams.get("type") ?? "result";
  const type = ["result", "daily", "compat"].includes(rawType) ? rawType : "result";
  const rawLocale = searchParams.get("locale") ?? "en";
  const locale = ELEMENT_NAMES[rawLocale] ? rawLocale : "en";
  const format = searchParams.get("format") === "story" ? "story" : "og";
  const isStory = format === "story";

  const color = ELEMENT_COLORS[element]!;
  const emoji = ELEMENT_EMOJI[element]!;
  const hanja = ELEMENT_HANJA[element]!;
  const elName = ELEMENT_NAMES[locale]![element]!;

  const titleFn = TITLES[locale]?.[type] ?? TITLES.en!.result!;
  const title = titleFn(name, elName);
  const subtitle = SUBTITLES[locale] ?? SUBTITLES.en;
  const brand = BRAND[locale] ?? "FortuneLab";

  // Load CJK/Indic font if needed
  const fontData = await loadFont(locale);
  const fonts = fontData
    ? [{ name: "NotoSans", data: fontData, style: "normal" as const, weight: 700 as const }]
    : [];
  const fontFamily = fontData ? "NotoSans, sans-serif" : "sans-serif";

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
          fontFamily,
          position: "relative",
        }}
      >
        {/* Decorative circles */}
        <div style={{
          position: "absolute", top: isStory ? -100 : -60, right: isStory ? -100 : -60,
          width: isStory ? 500 : 300, height: isStory ? 500 : 300, borderRadius: "50%",
          background: `radial-gradient(circle, ${color}20, transparent)`,
          display: "flex",
        }} />
        <div style={{
          position: "absolute", bottom: isStory ? -80 : -40, left: isStory ? -80 : -40,
          width: isStory ? 350 : 200, height: isStory ? 350 : 200, borderRadius: "50%",
          background: "radial-gradient(circle, #C48B9F15, transparent)",
          display: "flex",
        }} />

        {/* Hanja watermark */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: 280, fontWeight: 900,
          color: `${color}08`,
          display: "flex",
          lineHeight: 1,
        }}>
          {hanja}
        </div>

        {/* Emoji */}
        <div style={{ fontSize: isStory ? 120 : 80, display: "flex" }}>{emoji}</div>

        {/* Title */}
        <div style={{
          fontSize: isStory ? 52 : 44, fontWeight: 800, color: color,
          marginTop: isStory ? 24 : 16, display: "flex", textAlign: "center",
          maxWidth: isStory ? "85%" : "80%",
        }}>
          {title}
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: isStory ? 26 : 22, color: "#B0A8BC", marginTop: isStory ? 16 : 12,
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
            color: "#D4AF37",
            display: "flex",
          }}>
            {brand}
          </div>
        </div>
      </div>
    ),
    {
      width: isStory ? 1080 : 1200,
      height: isStory ? 1920 : 630,
      fonts: fonts.length > 0 ? fonts : undefined,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
