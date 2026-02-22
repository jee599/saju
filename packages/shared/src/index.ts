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

export type ProductCode = "standard" | "deep";

export interface ProductCta {
  code: ProductCode;
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

export interface ValidationIssue {
  field: string;
  reason: string;
}

export interface ApiErrorPayload {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: ValidationIssue[];
  };
}

export interface ApiSuccessPayload<T> {
  ok: true;
  data: T;
}

export type ApiResponse<T> = ApiSuccessPayload<T> | ApiErrorPayload;

export type OrderStatus = "created" | "confirmed";

export interface OrderSummary {
  orderId: string;
  productCode: ProductCode;
  status: OrderStatus;
  amountKrw: number;
  createdAt: string;
  confirmedAt?: string;
}

export interface CheckoutCreateRequest {
  productCode: ProductCode;
  input: FortuneInput;
}

export interface CheckoutCreateResponse {
  order: OrderSummary;
}

export interface CheckoutConfirmRequest {
  orderId: string;
}

export interface ReportDetail {
  reportId: string;
  orderId: string;
  productCode: ProductCode;
  generatedAt: string;
  headline: string;
  summary: string;
  sections: Array<{
    key: string;
    title: string;
    text: string;
  }>;
  recommendations: string[];
  disclaimer: string;
}

export interface CheckoutConfirmResponse {
  order: OrderSummary;
  report: ReportDetail;
}

export interface GetReportResponse {
  order: OrderSummary;
  report: ReportDetail;
}

const isDateFormat = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isTimeFormat = (value: string): boolean => /^\d{2}:\d{2}$/.test(value);

export const validateFortuneInput = (input: FortuneInput): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  if (!input.name || input.name.trim().length < 2) {
    issues.push({ field: "name", reason: "이름은 2자 이상 입력해 주세요." });
  }

  if (!isDateFormat(input.birthDate)) {
    issues.push({ field: "birthDate", reason: "생년월일은 YYYY-MM-DD 형식이어야 합니다." });
  }

  if (input.birthTime && !isTimeFormat(input.birthTime)) {
    issues.push({ field: "birthTime", reason: "출생시간은 HH:mm 형식이어야 합니다." });
  }

  if (!["male", "female", "other"].includes(input.gender)) {
    issues.push({ field: "gender", reason: "성별 값이 유효하지 않습니다." });
  }

  if (!["solar", "lunar"].includes(input.calendarType)) {
    issues.push({ field: "calendarType", reason: "달력 유형 값이 유효하지 않습니다." });
  }

  return issues;
};

export const isValidFortuneInput = (input: FortuneInput): boolean => {
  return validateFortuneInput(input).length === 0;
};
