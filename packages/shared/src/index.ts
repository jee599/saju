export type Gender = "male" | "female" | "other";
export type CalendarType = "solar" | "lunar";

export interface FortuneInput {
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthTime?: string; // HH:mm
  gender: Gender;
  calendarType: CalendarType;
}

export interface FortuneResult {
  summary: string;
  luckyColor: string;
  luckyNumber: number;
  traits: string[];
  caution: string;
}

export interface PreviewSection {
  key: string;
  title: string;
  text: string;
  locked: boolean;
}

export interface ProductCta {
  code: "standard" | "deep";
  label: string;
  priceLabel: string;
  description: string;
}

export interface ReportPreview {
  seed: number;
  tone: "expert_probability";
  free: {
    headline: string;
    summary: string;
    sections: PreviewSection[];
  };
  paid: {
    standard: {
      teaser: string;
      sections: PreviewSection[];
    };
    deep: {
      teaser: string;
      sections: PreviewSection[];
    };
  };
  ctas: ProductCta[];
}

export const isValidFortuneInput = (input: FortuneInput): boolean => {
  if (!input.name.trim()) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) return false;
  if (input.birthTime && !/^\d{2}:\d{2}$/.test(input.birthTime)) return false;
  return true;
};
