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
  /** Cultural context for LLM prompt localization */
  culturalContext: {
    framework: string;
    terminology: string;
    culturalTips: string;
    sensitivities: string;
    writingStyle: string;
  };
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
    culturalContext: {
      framework: "한국 전통 사주명리학 (四柱八字)",
      terminology: "사주 전문용어를 자연물 비유(물, 불, 나무, 땅, 금속)로 풀어서 설명",
      culturalTips: "한국 문화에 맞는 실용적 조언, 계절감, 가족 관계, 직장 생활",
      sensitivities: "의료/법률/투자 단정 금지, 공포 조장 금지, 한자 남발 금지",
      writingStyle: "존댓말, 따뜻하고 친근한 톤, 이름을 직접 호명하며 1:1 상담처럼 작성",
    },
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
    culturalContext: {
      framework: "K-Saju (Korean Four Pillars) — an ancient Korean destiny reading system rooted in East Asian cosmology, now powered by AI",
      terminology: "Use Five Elements (Water, Fire, Wood, Earth, Metal) as nature metaphors. Lightly reference Western astrology concepts (zodiac, birth chart) to bridge familiarity, but emphasize this is a distinct Korean tradition.",
      culturalTips: "Frame advice in a self-improvement / life-coaching tone. Include actionable wellness tips, career pivots, relationship communication strategies. Reference therapy-positive language.",
      sensitivities: "Avoid religious assertions or absolute destiny claims. Maintain a scientific-curiosity framing. No fear-mongering.",
      writingStyle: "Conversational American English. Short punchy sentences, active voice, relatable pop-culture metaphors. Think: a wise friend who happens to know ancient Korean astrology.",
    },
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
    culturalContext: {
      framework: "K-四柱推命（韓国式サジュ）— 韓国伝統の四柱推命をAIが現代的に解読するサービスです",
      terminology: "四柱推命の専門用語は自然の比喩（水・火・木・土・金）で分かりやすく説明。命式や通変星などの用語は使わず、季節や自然現象に例えてください。",
      culturalTips: "季節感を大切にした助言、和の精神、具体的な数値・プランの提示。職場の人間関係・上下関係への配慮、ワークライフバランス、健康管理の具体策を重視。",
      sensitivities: "直接的な否定表現を避け、謙遜の美学を守る。断定的な表現より「〜かもしれません」「〜の傾向があります」を使用。",
      writingStyle: "です/ます調の丁寧語。日本語特有の婉曲表現・季語・自然の比喩を活用。翻訳調ではなく、日本人カウンセラーが書いたような自然な日本語で。",
    },
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
    culturalContext: {
      framework: "K-四柱（韩国四柱推命）— 源自韩国传统命理学，结合AI大数据的现代命理分析",
      terminology: "用五行（木火土金水）的自然比喻来解释命理概念。可适当融合八字命理和紫微斗数的通俗说法，但避免晦涩的专业术语。",
      culturalTips: "风水建议、吉凶方位、幸运数字与颜色、五行养生。注重财运分析、事业发展、家庭和睦等中国读者关心的话题。",
      sensitivities: "避免政治敏感表达，不做封建迷信式的绝对断言，保持科学与传统文化结合的态度。",
      writingStyle: "现代中国大陆普通话口语风格，适当使用成语和俗语增加亲切感。不要用翻译腔，要像一位经验丰富的中国命理师在面对面聊天。",
    },
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
    culturalContext: {
      framework: "K-ซาจู (เกาหลีโบราณ) — ศาสตร์การดูดวงจากวันเกิดแบบเกาหลี ผสมผสาน AI วิเคราะห์",
      terminology: "ใช้ธาตุทั้ง 5 (ไม้ ไฟ ดิน โลหะ น้ำ) เปรียบเทียบกับธรรมชาติ อ้างอิงปีนักษัตร(띠)และโหราศาสตร์จีนที่คนไทยคุ้นเคย",
      culturalTips: "แนะนำเรื่องสีมงคลประจำวัน การไหว้พระ วันดี-วันเสีย เครื่องรางของขลัง ฮวงจุ้ยบ้าน/ร้านค้า ตัวเลขมงคล",
      sensitivities: "ห้ามพาดพิงสถาบันพระมหากษัตริย์ เคารพพุทธศาสนาและความเชื่อท้องถิ่น ไม่ทำนายแบบชี้ขาด",
      writingStyle: "ภาษาไทยสุภาพ ใช้คำราชาศัพท์เมื่อเหมาะสม ใช้สำนวนไทยและคำเปรียบเทียบที่คนไทยเข้าใจง่าย เขียนเหมือนหมอดูไทยที่อบอุ่นใจดีกำลังทำนายให้ ไม่ใช่แปลจากภาษาอังกฤษ",
    },
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
    culturalContext: {
      framework: "K-Saju (Tứ Trụ Hàn Quốc) — hệ thống xem vận mệnh cổ truyền Hàn Quốc, nay được AI phân tích hiện đại",
      terminology: "Dùng Ngũ Hành (Mộc, Hỏa, Thổ, Kim, Thủy) để ví von với thiên nhiên. Kết hợp khái niệm Tử Vi và con giáp mà người Việt quen thuộc.",
      culturalTips: "Tư vấn phong thủy nhà cửa/công việc, số may mắn, màu sắc hợp mệnh, hướng tốt. Đề cập đến việc thờ cúng tổ tiên, ngày tốt-xấu khi phù hợp.",
      sensitivities: "Tránh đề cập chính trị và chiến tranh. Tôn trọng đa dạng tín ngưỡng (Phật giáo, đạo Mẫu, Công giáo).",
      writingStyle: "Tiếng Việt tự nhiên, dùng xưng hô thân mật (bạn/anh/chị). Viết như một nhà tử vi Việt Nam đang tư vấn trực tiếp, không phải dịch từ tiếng Anh. Dùng thành ngữ và cách nói dân gian Việt Nam.",
    },
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
    culturalContext: {
      framework: "K-Saju (Empat Pilar Korea) — sistem ramalan nasib tradisional Korea yang kini dianalisis dengan AI modern. Gabungkan dengan konsep Shio dan Primbon Jawa yang akrab bagi orang Indonesia.",
      terminology: "Gunakan Lima Elemen (Kayu, Api, Tanah, Logam, Air) sebagai metafora alam. Referensikan Shio (zodiak Tionghoa) yang populer di Indonesia.",
      culturalTips: "Nasihat tentang keluarga dan komunitas, keberuntungan bisnis/usaha, Feng Shui rumah/kantor, angka hoki, warna keberuntungan. Sertakan ungkapan syukur yang universal.",
      sensitivities: "Hormati keberagaman agama (Islam, Hindu, Buddha, Kristen, Konghucu). Hindari klaim absolut yang bertentangan dengan keyakinan agama manapun.",
      writingStyle: "Bahasa Indonesia baku yang hangat. Seimbang antara formal dan akrab. Tulis seperti seorang konsultan spiritual Indonesia yang berpengalaman, bukan terjemahan dari bahasa Inggris. Gunakan peribahasa dan ungkapan Indonesia yang tepat.",
    },
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
    culturalContext: {
      framework: "K-Saju (Korean Four Pillars) meets Vedic wisdom — an ancient Korean destiny system, now fused with AI. Draw parallels with Kundli/Jyotish concepts that Indian readers know and love.",
      terminology: "Use Five Elements (Water, Fire, Wood, Earth, Metal) as nature metaphors. Lightly reference familiar Vedic terms (Rashi, Nakshatra, Graha) to bridge understanding, but clarify this is a Korean tradition.",
      culturalTips: "Recommend lucky gemstones, auspicious colours, Vastu directions, and mantras where relevant. Emphasize family harmony, career stability, marriage compatibility, and spiritual growth.",
      sensitivities: "Never imply caste or socioeconomic hierarchy. Respect religious diversity (Hindu, Muslim, Sikh, Christian, Buddhist). Avoid absolute destiny claims.",
      writingStyle: "Indian English with natural Hindi/Sanskrit sprinkles (e.g., 'karma', 'dharma', 'shubh'). Write like a wise Indian astrologer who also studied Korean Saju — warm, slightly philosophical, family-oriented. Not British-formal, not American-casual.",
    },
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
