// ── Primitives ────────────────────────────────────────────
export type Gender = "male" | "female" | "other";
export type CalendarType = "solar" | "lunar";
export type ProductCode = "standard" | "deep" | "full";
export type OrderStatus = "created" | "confirmed";
export type ReportModel = "gpt" | "claude" | "gemini";
export type ReportTier = "free" | "paid";

// ── Report length (QA / debug) ────────────────────────────
export interface ReportLengthRule {
  min: number;
  max: number;
  target: number;
}

export interface ReportLengthInfo extends ReportLengthRule {
  tier: ReportTier;
  count: number;
  inRange: boolean;
}

// ── Fortune input / result ────────────────────────────────
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

// ── Preview ───────────────────────────────────────────────
export interface PreviewSection {
  key: string;
  title: string;
  text: string;
  locked: boolean;
}

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
    teaser: string;
    sections: PreviewSection[];
  };
  cta: ProductCta;
  debugLengths?: Record<ReportTier, ReportLengthInfo>;
}

// ── Validation ────────────────────────────────────────────
export interface ValidationIssue {
  field: string;
  reason: string;
}

// ── API envelope ──────────────────────────────────────────
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

// ── Order ─────────────────────────────────────────────────
export interface OrderSummary {
  orderId: string;
  productCode: ProductCode;
  status: OrderStatus;
  amountKrw: number;
  createdAt: string;
  confirmedAt?: string;
}

// ── Checkout ──────────────────────────────────────────────
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

// ── Report ────────────────────────────────────────────────
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
  debugLength?: ReportLengthInfo;
}

export interface ModelReportDetail extends ReportDetail {
  model: ReportModel;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface CheckoutConfirmResponse {
  order: OrderSummary;
  report: ReportDetail;
  reportsByModel?: { gpt: ModelReportDetail; claude: ModelReportDetail };
}

export interface GetReportResponse {
  order: OrderSummary;
  report: ReportDetail;
  reportsByModel?: { gpt: ModelReportDetail; claude: ModelReportDetail };
}

// ── LLM compare (API server) ─────────────────────────────
export interface GeneratePaidReportRequest {
  input: FortuneInput;
  productCode: ProductCode;
}

export interface ComparePaidReportResponse {
  productCode: ProductCode;
  gpt: ModelReportDetail;
  claude: ModelReportDetail;
  notes: {
    costWarning: string;
    fixedJasiNotice: string;
  };
}

// ── Validation helpers ────────────────────────────────────
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
