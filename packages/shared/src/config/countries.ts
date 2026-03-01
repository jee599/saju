/** Country config type + per-locale payment/pricing */

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
  /** Formatted price string for display (e.g. "₩5,900", "$4.99") */
  priceLabel: string;
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
    priceLabel: "₩5,900",
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
      saju: { free: 0, premium: 499 },
      compatibility: { premium: 299 },
    },
    priceLabel: "$4.99",
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
  jp: {
    code: "jp",
    locale: "ja",
    currency: "JPY",
    currencySymbol: "¥",
    timezone: "Asia/Tokyo",
    pricing: {
      saju: { free: 0, premium: 690 },
      compatibility: { premium: 490 },
    },
    priceLabel: "¥690",
    paymentProvider: "stripe",
    shareChannels: ["line", "copy", "twitter"],
    enabledServices: ["saju", "compatibility"],
    comingSoonServices: ["name", "palm", "face"],
    heroDecoration: "hanja",
    llmTone: "丁寧で温かい日本語",
    seo: {
      siteName: "FortuneLab",
      defaultTitle: "FortuneLab | AI四柱推命分析",
      defaultDescription: "518,400通りの運命パターンをAIが解読します。",
    },
  },
  cn: {
    code: "cn",
    locale: "zh",
    currency: "CNY",
    currencySymbol: "¥",
    timezone: "Asia/Shanghai",
    pricing: {
      saju: { free: 0, premium: 2990 },
      compatibility: { premium: 1990 },
    },
    priceLabel: "¥29.9",
    paymentProvider: "stripe",
    shareChannels: ["copy", "twitter"],
    enabledServices: ["saju", "compatibility"],
    comingSoonServices: ["name", "palm", "face"],
    heroDecoration: "hanja",
    llmTone: "温暖亲切的中文",
    seo: {
      siteName: "命理实验室",
      defaultTitle: "命理实验室 | AI八字分析",
      defaultDescription: "518,400种命盘组合，AI精准解读您的命运。",
    },
  },
  th: {
    code: "th",
    locale: "th",
    currency: "THB",
    currencySymbol: "฿",
    timezone: "Asia/Bangkok",
    pricing: {
      saju: { free: 0, premium: 14900 },
      compatibility: { premium: 9900 },
    },
    priceLabel: "฿149",
    paymentProvider: "stripe",
    shareChannels: ["line", "copy", "twitter"],
    enabledServices: ["saju", "compatibility"],
    comingSoonServices: ["name", "palm", "face"],
    heroDecoration: "default",
    llmTone: "อบอุ่นและเป็นกันเอง ภาษาไทย",
    seo: {
      siteName: "FortuneLab",
      defaultTitle: "FortuneLab | วิเคราะห์ดวงชะตาด้วย AI",
      defaultDescription: "518,400 รูปแบบดวงชะตา วิเคราะห์ด้วย AI",
    },
  },
  vn: {
    code: "vn",
    locale: "vi",
    currency: "VND",
    currencySymbol: "₫",
    timezone: "Asia/Ho_Chi_Minh",
    pricing: {
      saju: { free: 0, premium: 89000 },
      compatibility: { premium: 59000 },
    },
    priceLabel: "89.000₫",
    paymentProvider: "stripe",
    shareChannels: ["zalo", "copy", "twitter"],
    enabledServices: ["saju", "compatibility"],
    comingSoonServices: ["name", "palm", "face"],
    heroDecoration: "default",
    llmTone: "ấm áp và thân thiện bằng tiếng Việt",
    seo: {
      siteName: "FortuneLab",
      defaultTitle: "FortuneLab | AI Phân Tích Tử Vi",
      defaultDescription: "518.400 tổ hợp vận mệnh được AI phân tích chính xác.",
    },
  },
  id: {
    code: "id",
    locale: "id",
    currency: "IDR",
    currencySymbol: "Rp",
    timezone: "Asia/Jakarta",
    pricing: {
      saju: { free: 0, premium: 49000 },
      compatibility: { premium: 29000 },
    },
    priceLabel: "Rp49.000",
    paymentProvider: "stripe",
    shareChannels: ["whatsapp", "copy", "twitter"],
    enabledServices: ["saju", "compatibility"],
    comingSoonServices: ["name", "palm", "face"],
    heroDecoration: "default",
    llmTone: "hangat dan bersahabat dalam Bahasa Indonesia",
    seo: {
      siteName: "FortuneLab",
      defaultTitle: "FortuneLab | Analisis Shio & Bazi AI",
      defaultDescription: "518.400 kombinasi nasib dianalisis oleh AI.",
    },
  },
  in: {
    code: "in",
    locale: "hi",
    currency: "INR",
    currencySymbol: "₹",
    timezone: "Asia/Kolkata",
    pricing: {
      saju: { free: 0, premium: 19900 },
      compatibility: { premium: 14900 },
    },
    priceLabel: "₹199",
    paymentProvider: "razorpay",
    shareChannels: ["whatsapp", "copy", "twitter"],
    enabledServices: ["saju", "compatibility"],
    comingSoonServices: ["name", "palm", "face"],
    heroDecoration: "mandala",
    llmTone: "warm and insightful English for Indian audience",
    seo: {
      siteName: "FortuneLab",
      defaultTitle: "FortuneLab | AI Kundli Analysis",
      defaultDescription: "Discover your destiny with 518,400 unique readings.",
    },
  },
};

/** Map locale to country code */
const LOCALE_TO_COUNTRY: Record<string, string> = {
  ko: "kr",
  en: "us",
  ja: "jp",
  zh: "cn",
  th: "th",
  vi: "vn",
  id: "id",
  hi: "in",
};

export function getCountryConfig(code: string): CountryConfig {
  return COUNTRY_CONFIGS[code] ?? COUNTRY_CONFIGS.kr!;
}

export function getCountryByLocale(locale: string): CountryConfig {
  const code = LOCALE_TO_COUNTRY[locale] ?? "kr";
  return getCountryConfig(code);
}
