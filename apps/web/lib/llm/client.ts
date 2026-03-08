/**
 * LLM API client — fetch calls to Claude, OpenAI, Gemini with retry logic
 */
import type { ReportModel } from "../types";

export type LlmUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
};

export type LlmResult = { text: string; usage?: LlmUsage; durationMs?: number };

const requireEnv = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
};

/** 재시도 가능한 에러인지 체크 (429, 503, 529 등) */
const isRetryableStatus = (status: number): boolean =>
  status === 429 || status === 503 || status === 529 || status === 500 || status === 502;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 지수 백오프 리트라이 래퍼 */
export const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 2000): Promise<T> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = err?.message ?? "";
      const statusMatch = msg.match(/error:\s*(\d{3})/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 0;

      if (attempt < maxRetries && (isRetryableStatus(status) || msg.includes("overloaded") || msg.includes("UNAVAILABLE") || msg.includes("rate"))) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`[llm-retry] attempt ${attempt + 1}/${maxRetries}, waiting ${Math.round(delay)}ms...`);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw new Error("withRetry: unreachable");
};

export { sleep };

const callLlmOnce = async (params: {
  model: ReportModel;
  system: string;
  user: string;
  maxTokens: number;
  temperature?: number;
  anthropicModel?: string;
  geminiModel?: string;
  openaiModel?: string;
}): Promise<LlmResult> => {
  const { model, system, user, maxTokens, temperature = 0.7, anthropicModel, geminiModel, openaiModel } = params;

  const LLM_TIMEOUT_MS = 90_000;

  // ── OpenAI (GPT) ──
  if (model === "gpt") {
    const apiKey = requireEnv("OPENAI_API_KEY");
    const modelId = openaiModel ?? process.env.OPENAI_MODEL ?? "gpt-5-mini";
    const useTemp = modelId.includes("mini") ? undefined : temperature;
    const startMs = Date.now();
    const body: any = {
      model: modelId,
      max_completion_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    };
    if (useTemp !== undefined) body.temperature = useTemp;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
    let resp: Response;
    try {
      resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
    const gptDuration = Date.now() - startMs;
    if (!resp.ok) throw new Error(`OpenAI error: ${resp.status} ${resp.statusText} ${await resp.text().catch(() => "")}`);
    const json = (await resp.json()) as any;
    const text = json?.choices?.[0]?.message?.content;
    if (typeof text !== "string") throw new Error("OpenAI: missing text");
    const usage = json?.usage
      ? {
          inputTokens: json.usage.prompt_tokens,
          outputTokens: json.usage.completion_tokens,
          totalTokens: json.usage.total_tokens
        }
      : undefined;
    return { text, usage, durationMs: gptDuration };
  }

  // ── Google Gemini ──
  if (model === "gemini") {
    const apiKey = requireEnv("GOOGLE_API_KEY");
    const modelId = geminiModel ?? process.env.GEMINI_MODEL ?? "gemini-3.1-pro-preview";
    const startMs = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
    let resp: Response;
    try {
      resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: user }] }],
            systemInstruction: { parts: [{ text: system }] },
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              responseMimeType: "text/plain",
            },
          }),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeoutId);
    }
    const durationMs = Date.now() - startMs;
    if (!resp.ok) throw new Error(`Gemini error: ${resp.status} ${resp.statusText} ${await resp.text().catch(() => "")}`);
    const json = (await resp.json()) as any;
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") throw new Error("Gemini: missing text");
    const usage = json?.usageMetadata
      ? {
          inputTokens: json.usageMetadata.promptTokenCount,
          outputTokens: json.usageMetadata.candidatesTokenCount,
          totalTokens: json.usageMetadata.totalTokenCount,
        }
      : undefined;
    return { text, usage, durationMs };
  }

  // ── Anthropic (Claude) ──
  const apiKey = requireEnv("ANTHROPIC_API_KEY");
  const startMs = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: anthropicModel ?? process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5",
        max_tokens: maxTokens,
        temperature,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: user }]
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  const durationMs = Date.now() - startMs;
  if (!resp.ok) throw new Error(`Anthropic error: ${resp.status} ${resp.statusText} ${await resp.text().catch(() => "")}`);
  const json = (await resp.json()) as any;
  const text = json?.content?.[0]?.text;
  if (typeof text !== "string") throw new Error("Anthropic: missing text");
  const usage = json?.usage
    ? {
        inputTokens: json.usage.input_tokens,
        outputTokens: json.usage.output_tokens,
        totalTokens:
          typeof json.usage.input_tokens === "number" && typeof json.usage.output_tokens === "number"
            ? json.usage.input_tokens + json.usage.output_tokens
            : undefined,
        cacheCreationInputTokens: json.usage.cache_creation_input_tokens,
        cacheReadInputTokens: json.usage.cache_read_input_tokens
      }
    : undefined;
  return { text, usage, durationMs };
};

/** callLlm: 자동 리트라이 포함 (429/503/529 → 최대 3회) */
export const callLlm = async (params: Parameters<typeof callLlmOnce>[0]): Promise<LlmResult> => {
  return withRetry(() => callLlmOnce(params), 3, 2000);
};

/** Estimate USD cost based on model and token counts */
export const estimateCostUsd = (provider: string, model: string, usage: LlmUsage): number => {
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;

  if (provider === "anthropic") {
    if (model.includes("opus")) {
      return (input * 15 + output * 75) / 1_000_000;
    }
    // Haiku 4.5 pricing: $1/M input, $5/M output
    return (input * 1 + output * 5) / 1_000_000;
  }
  if (provider === "google") {
    if (model.includes("flash")) {
      return (input * 0.5 + output * 3) / 1_000_000;
    }
    // Gemini 3.1 Pro pricing: $2/M input, $12/M output
    return (input * 2 + output * 12) / 1_000_000;
  }
  // GPT-5-mini pricing: $0.30/M input, $1.25/M output
  return (input * 0.3 + output * 1.25) / 1_000_000;
};

/** Log LLM usage to database (fire-and-forget) */
export const logLlmUsage = async (params: {
  requestId?: string;
  provider: string;
  model: string;
  usage?: LlmUsage;
  durationMs?: number;
}): Promise<void> => {
  try {
    const { prisma } = await import("@saju/api/db");
    await prisma.llmUsage.create({
      data: {
        requestId: params.requestId ?? null,
        provider: params.provider,
        model: params.model,
        inputTokens: params.usage?.inputTokens ?? null,
        outputTokens: params.usage?.outputTokens ?? null,
        totalTokens: params.usage?.totalTokens ?? null,
        durationMs: params.durationMs ?? null,
        estimatedCostUsd: params.usage ? estimateCostUsd(params.provider, params.model, params.usage) : null,
      },
    });
  } catch (e) {
    console.error("[llm-usage-log] failed:", e);
  }
};

export const hasLlmKeys = (): boolean => {
  return Boolean(process.env.OPENAI_API_KEY && process.env.ANTHROPIC_API_KEY);
};

export const hasGeminiKey = (): boolean => {
  return Boolean(process.env.GOOGLE_API_KEY);
};
