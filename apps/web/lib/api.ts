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
} from "./types";

const API_URL = "/api";

export class ApiClientError extends Error {
  code: string;
  details?: ApiErrorPayload["error"]["details"];
  constructor(code: string, message: string, details?: ApiErrorPayload["error"]["details"]) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

/** User-friendly error messages by error code */
const USER_MESSAGES: Record<string, string> = {
  RATE_LIMIT_EXCEEDED: "오늘 무료 요청 횟수를 모두 사용했습니다. 내일 다시 이용해 주세요.",
  INVALID_INPUT: "입력 정보를 다시 확인해 주세요.",
  REPORT_GENERATION_FAILED: "리포트 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  NETWORK_ERROR: "네트워크 연결을 확인해 주세요.",
  TIMEOUT: "서버 응답이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요.",
};

const friendlyMessage = (code: string, fallback: string): string =>
  USER_MESSAGES[code] ?? fallback;

const readError = async (response: Response): Promise<ApiClientError> => {
  // Rate limit
  if (response.status === 429) {
    return new ApiClientError("RATE_LIMIT_EXCEEDED", friendlyMessage("RATE_LIMIT_EXCEEDED", "요청 한도 초과"));
  }
  // Server error
  if (response.status >= 500) {
    return new ApiClientError("SERVER_ERROR", "서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (payload && payload.ok === false) {
      return new ApiClientError(
        payload.error.code,
        friendlyMessage(payload.error.code, payload.error.message),
        payload.error.details
      );
    }
  } catch {}
  return new ApiClientError("HTTP_ERROR", `요청 실패 (${response.status})`);
};

const REQUEST_TIMEOUT = 30_000; // 30s

const request = async <TBody, TData>(path: string, body?: TBody, method: "GET" | "POST" = "POST"): Promise<TData> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiClientError("TIMEOUT", friendlyMessage("TIMEOUT", "요청 시간 초과"));
    }
    throw new ApiClientError("NETWORK_ERROR", friendlyMessage("NETWORK_ERROR", "네트워크 오류"));
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) throw await readError(response);
  const payload = (await response.json()) as ApiResponse<TData>;
  if (payload.ok === false) {
    throw new ApiClientError(
      payload.error.code,
      friendlyMessage(payload.error.code, payload.error.message),
      payload.error.details
    );
  }
  return payload.data;
};

export const webApi = {
  fortuneMock: (input: FortuneInput) => request<FortuneInput, FortuneResult>("/fortune/mock", input),
  reportPreview: (input: FortuneInput) => request<FortuneInput, ReportPreview>("/report/preview", input),
  checkoutCreate: (payload: CheckoutCreateRequest) => request<CheckoutCreateRequest, CheckoutCreateResponse>("/checkout/create", payload),
  checkoutConfirm: (payload: CheckoutConfirmRequest) => request<CheckoutConfirmRequest, CheckoutConfirmResponse>("/checkout/confirm", payload),
  report: (orderId: string) => request<undefined, GetReportResponse>(`/report/${orderId}`, undefined, "GET")
};
