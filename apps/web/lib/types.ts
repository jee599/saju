export type Gender = "male" | "female" | "other";
export type CalendarType = "solar" | "lunar";
export type ProductCode = "standard" | "deep";

export interface FortuneInput {
  name: string;
  birthDate: string;
  birthTime?: string;
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
    standard: { teaser: string; sections: PreviewSection[] };
    deep: { teaser: string; sections: PreviewSection[] };
  };
  ctas: ProductCta[];
}

export type OrderStatus = "created" | "confirmed";

export interface OrderSummary {
  orderId: string;
  productCode: ProductCode;
  status: OrderStatus;
  amountKrw: number;
  createdAt: string;
  confirmedAt?: string;
}

export interface CheckoutCreateRequest { productCode: ProductCode; input: FortuneInput; }
export interface CheckoutCreateResponse { order: OrderSummary; }
export interface CheckoutConfirmRequest { orderId: string; }

export interface ReportDetail {
  reportId: string;
  orderId: string;
  productCode: ProductCode;
  generatedAt: string;
  headline: string;
  summary: string;
  sections: Array<{ key: string; title: string; text: string }>;
  recommendations: string[];
  disclaimer: string;
}

export interface CheckoutConfirmResponse { order: OrderSummary; report: ReportDetail; }
export interface GetReportResponse { order: OrderSummary; report: ReportDetail; }

export interface ApiErrorPayload {
  ok: false;
  error: { code: string; message: string; details?: Array<{ field: string; reason: string }> };
}
export interface ApiSuccessPayload<T> { ok: true; data: T; }
export type ApiResponse<T> = ApiSuccessPayload<T> | ApiErrorPayload;
