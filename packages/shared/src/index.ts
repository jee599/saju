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
  model?: string; // "opus" | "sonnet" | "gpt"
  email?: string;
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
  /** LLM 호출 소요 시간 (ms) — 테스트 비교용 */
  durationMs?: number;
  /** 추정 USD 비용 — 테스트 비교용 */
  estimatedCostUsd?: number;
  /** 총 한국어 글자수 — 테스트 비교용 */
  charCount?: number;
}

export interface CheckoutConfirmResponse {
  order: OrderSummary;
  report: ReportDetail;
}

export interface GetReportResponse {
  order: OrderSummary;
  report: ReportDetail;
  input?: FortuneInput;
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

// ── Element types (from engine) ─────────────────────────
export type Element = "wood" | "fire" | "earth" | "metal" | "water";
export type Polarity = "yang" | "yin";

export interface ElementBalance {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
}

export interface ElementAnalysis {
  balance: ElementBalance;
  dayMaster: Element;
  dayMasterHanja: string;
  yinYang: { yang: number; yin: number };
  dominant: Element;
  weakest: Element;
}

// ── Compatibility ───────────────────────────────────────
export interface CompatibilityInput {
  myBirthDate: string;    // YYYY-MM-DD
  myBirthTime?: string;   // HH:mm
  partnerBirthDate: string;
  partnerBirthTime?: string;
}

export interface CompatibilityResult {
  score: number;
  myElement: Element;
  partnerElement: Element;
  relationship: string;
  description: string;
}

// ── Price / A/B Test ────────────────────────────────────
export type PriceVariant = "A" | "B" | "C";
export const PRICE_VARIANTS: Record<PriceVariant, number> = {
  A: 3900,
  B: 5900,
  C: 7900,
};
export const DEFAULT_PRICE_KRW = 5900;

// ── Report tier structure ───────────────────────────────
export interface FreeReportSection {
  key: string;
  title: string;
  text: string;
  type: "haiku" | "algorithm";
}

export interface BlurredSection {
  key: string;
  title: string;
  teaser: string; // 오행별 분기 맛보기 text
  elementHint: Element;
  icon: string;
}

export interface ReportPreviewV2 {
  freeSections: FreeReportSection[];
  elementAnalysis: ElementAnalysis;
  blurredSections: BlurredSection[];
  cta: {
    text: string;
    priceLabel: string;
    priceKrw: number;
  };
}

// ── GA4 Events ──────────────────────────────────────────
export type FunnelEvent =
  | "page_view"
  | "input_start"
  | "input_step2"
  | "input_complete"
  | "report_view"
  | "compatibility_start"
  | "compatibility_result"
  | "paywall_view"
  | "checkout_start"
  | "purchase_complete"
  | "share_click";

// ── Email subscription source ───────────────────────────
export type EmailSource = "checkout" | "coming_soon" | "monthly_fortune";

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
