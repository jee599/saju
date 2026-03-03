/** Phase D: i18n dictionary scaffolding */

export interface Dictionary {
  hero: {
    title: string;
    rotatingCopies: string[];
    sajuTab: string;
    compatTab: string;
    startButton: string;
    compatButton: string;
  };
  stats: {
    combinations: string;
    speed: string;
    tests: string;
  };
  result: {
    dayMasterTitle: (element: string) => string;
    elementBalance: string;
    yinYangBalance: string;
    ctaText: string;
    ctaPrice: (price: string) => string;
    blurLabel: string;
    compatCta: string;
  };
  loading: {
    steps: string[];
    funTexts: string[];
  };
  common: {
    birthDate: string;
    birthTime: string;
    gender: string;
    calendarType: string;
    free: string;
    premium: string;
  };
}

export const ko: Dictionary = {
  hero: {
    title: "나의",
    rotatingCopies: [
      "MBTI는 16가지. 당신의 사주는 518,400가지.",
      "역술가 5만원, AI 0원. 만세력은 같다.",
      "태어난 시간까지 넣으면 달라진다. 진짜로.",
      "사주 볼 때마다 달랐지? 만세력이 틀려서 그렇다.",
    ],
    sajuTab: "내 사주 ✦",
    compatTab: "궁합 💕",
    startButton: "무료 분석 시작",
    compatButton: "궁합 보기",
  },
  stats: {
    combinations: "사주 조합 수",
    speed: "만세력 계산",
    tests: "골든 테스트 검증",
  },
  result: {
    dayMasterTitle: (el) => `당신은 ${el}의 사람입니다`,
    elementBalance: "오행 밸런스",
    yinYangBalance: "음양 밸런스",
    ctaText: "8개 섹션의 상세 분석이 준비되어 있습니다",
    ctaPrice: (price) => `${price}으로 전체 분석 보기`,
    blurLabel: "프리미엄 분석",
    compatCta: "궁합도 궁금하다면?",
  },
  loading: {
    steps: ["만세력 계산 중...", "오행 분석 중...", "십성 배치 중...", "AI 해석 생성 중..."],
    funTexts: [
      "518,400가지 조합 중 당신의 사주를 찾고 있어요",
      "1,000년 전통의 만세력이 AI와 만났습니다",
      "같은 날 태어나도 시간이 다르면 운명이 다릅니다",
      "3,000년 된 알고리즘 × 2026년 AI",
    ],
  },
  common: {
    birthDate: "생년월일",
    birthTime: "태어난 시간",
    gender: "성별",
    calendarType: "달력",
    free: "무료",
    premium: "프리미엄",
  },
};

export const en: Dictionary = {
  hero: {
    title: "My",
    rotatingCopies: [
      "Your zodiac is 1 of 12. Your Four Pillars is 1 of 518,400.",
      "Think of it as your horoscope in 4K.",
      "Born the same day as your friend? The birth hour changes everything.",
      "3,000 years of Eastern wisdom. Now it has an AI.",
    ],
    sajuTab: "My Saju ✦",
    compatTab: "Compatibility 💕",
    startButton: "Start Free Analysis",
    compatButton: "Check Compatibility",
  },
  stats: {
    combinations: "Combinations",
    speed: "Calculation Speed",
    tests: "Golden Tests",
  },
  result: {
    dayMasterTitle: (el) => `You are a person of ${el}`,
    elementBalance: "Five Elements Balance",
    yinYangBalance: "Yin-Yang Balance",
    ctaText: "8 detailed analysis sections are ready",
    ctaPrice: (price) => `View full analysis for ${price}`,
    blurLabel: "Premium Analysis",
    compatCta: "Curious about compatibility?",
  },
  loading: {
    steps: ["Calculating calendar...", "Analyzing elements...", "Mapping ten gods...", "Generating AI interpretation..."],
    funTexts: [
      "Finding your destiny among 518,400 combinations",
      "1,000 years of tradition meets AI",
      "Same birthday, different birth hour — completely different fate",
      "3,000-year-old algorithm × 2026 AI",
    ],
  },
  common: {
    birthDate: "Birth Date",
    birthTime: "Birth Time",
    gender: "Gender",
    calendarType: "Calendar",
    free: "Free",
    premium: "Premium",
  },
};

export const DICTIONARIES: Record<string, Dictionary> = { ko, en };

export function getDictionary(locale: string): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES["en"] ?? ko;
}
