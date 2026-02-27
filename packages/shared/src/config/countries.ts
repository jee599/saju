/** Phase D: Country config type + Korean default */

export interface CountryConfig {
  code: string;
  locale: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  pricing: {
    saju: { free: number; premium: number };
    compatibility?: { premium: number };
  };
  paymentProvider: "toss" | "stripe" | "razorpay";
  shareChannels: Array<"kakao" | "whatsapp" | "line" | "zalo" | "instagram" | "twitter" | "copy">;
  enabledServices: Array<"saju" | "compatibility" | "name" | "palm" | "face">;
  comingSoonServices: Array<"name" | "palm" | "face">;
  heroDecoration: "hanja" | "constellation" | "mandala" | "default";
  llmTone: string;
  seo: {
    siteName: string;
    defaultTitle: string;
    defaultDescription: string;
  };
}

export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  kr: {
    code: "kr",
    locale: "ko",
    currency: "KRW",
    currencySymbol: "₩",
    timezone: "Asia/Seoul",
    pricing: {
      saju: { free: 0, premium: 5900 },
      compatibility: { premium: 3900 },
    },
    paymentProvider: "toss",
    shareChannels: ["kakao", "copy", "twitter"],
    enabledServices: ["saju", "compatibility"],
    comingSoonServices: ["name", "palm", "face"],
    heroDecoration: "hanja",
    llmTone: "친근하고 따뜻한 한국어",
    seo: {
      siteName: "복연구소",
      defaultTitle: "복연구소 | AI 사주 분석",
      defaultDescription: "518,400가지 사주 조합을 AI가 분석합니다.",
    },
  },
  us: {
    code: "us",
    locale: "en",
    currency: "USD",
    currencySymbol: "$",
    timezone: "America/New_York",
    pricing: {
      saju: { free: 0, premium: 4.99 },
      compatibility: { premium: 2.99 },
    },
    paymentProvider: "stripe",
    shareChannels: ["copy", "twitter", "instagram"],
    enabledServices: ["saju", "compatibility"],
    comingSoonServices: ["name", "palm", "face"],
    heroDecoration: "constellation",
    llmTone: "warm and insightful English",
    seo: {
      siteName: "FortuneLab",
      defaultTitle: "FortuneLab | AI Four Pillars Analysis",
      defaultDescription: "518,400 unique destiny readings powered by AI.",
    },
  },
  in: {
    code: "in",
    locale: "en",
    currency: "INR",
    currencySymbol: "₹",
    timezone: "Asia/Kolkata",
    pricing: {
      saju: { free: 0, premium: 199 },
      compatibility: { premium: 149 },
    },
    paymentProvider: "razorpay",
    shareChannels: ["whatsapp", "copy", "twitter"],
    enabledServices: ["saju", "compatibility"],
    comingSoonServices: ["name", "palm", "face"],
    heroDecoration: "mandala",
    llmTone: "warm and insightful English for Indian audience",
    seo: {
      siteName: "FortuneLab",
      defaultTitle: "FortuneLab | AI Four Pillars Analysis",
      defaultDescription: "Discover your destiny with 518,400 unique readings.",
    },
  },
};

export function getCountryConfig(code: string): CountryConfig {
  return COUNTRY_CONFIGS[code] ?? COUNTRY_CONFIGS.kr!;
}
