import type {
  ApiErrorPayload,
  ApiResponse,
  CheckoutConfirmRequest,
  CheckoutConfirmResponse,
  CheckoutCreateRequest,
  CheckoutCreateResponse,
  FortuneInput,
  FortuneResult,
  GetReportResponse,
  ReportPreview
} from "@saju/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiClientError extends Error {
  code: string;
  details?: ApiErrorPayload["error"]["details"];

  constructor(code: string, message: string, details?: ApiErrorPayload["error"]["details"]) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

const readError = async (response: Response): Promise<ApiClientError> => {
  let payload: ApiErrorPayload | null = null;

  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    return new ApiClientError("HTTP_ERROR", `요청 실패 (${response.status})`);
  }

  if (payload && payload.ok === false) {
    return new ApiClientError(payload.error.code, payload.error.message, payload.error.details);
  }

  return new ApiClientError("HTTP_ERROR", `요청 실패 (${response.status})`);
};

const request = async <TBody, TData>(path: string, body?: TBody, method: "GET" | "POST" = "POST"): Promise<TData> => {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });

  if (!response.ok) {
    throw await readError(response);
  }

  const payload = (await response.json()) as ApiResponse<TData>;
  if (payload.ok === false) {
    throw new ApiClientError(payload.error.code, payload.error.message, payload.error.details);
  }

  return payload.data;
};

export const webApi = {
  fortuneMock: (input: FortuneInput) => request<FortuneInput, FortuneResult>("/fortune/mock", input),
  reportPreview: (input: FortuneInput) => request<FortuneInput, ReportPreview>("/report/preview", input),
  checkoutCreate: (payload: CheckoutCreateRequest) =>
    request<CheckoutCreateRequest, CheckoutCreateResponse>("/checkout/create", payload),
  checkoutConfirm: (payload: CheckoutConfirmRequest) =>
    request<CheckoutConfirmRequest, CheckoutConfirmResponse>("/checkout/confirm", payload),
  report: (orderId: string) => request<undefined, GetReportResponse>(`/report/${orderId}`, undefined, "GET")
};
