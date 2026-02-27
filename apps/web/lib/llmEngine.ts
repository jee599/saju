import type { FortuneInput, ModelReportDetail, ProductCode, ReportModel, ReportDetail } from "./types";
import { buildLengthInfo, countReportChars } from "./reportLength";

export const FIXED_JASI_NOTICE_KO =
  "※ 자시(23:00~01:00) 해석은 lunar-javascript 기본 규칙(초자시 기준)을 따릅니다. 전통/학파에 따라 초·후자시 기준이 다를 수 있으며, 본 리포트는 참고용입니다.";

type LlmUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
};

type LlmResult = { text: string; usage?: LlmUsage; durationMs?: number };

const safeJsonParse = (text: string): any => {
  try {
    return JSON.parse(text);
  } catch {
    const trimmed = text.trim();
    const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenceMatch?.[1]) return JSON.parse(fenceMatch[1]);
    throw new Error("JSON_PARSE_FAILED");
  }
};

const requireEnv = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
};

const callLlm = async (params: {
  model: ReportModel;
  system: string;
  user: string;
  maxTokens: number;
  temperature?: number;
}): Promise<LlmResult> => {
  const { model, system, user, maxTokens, temperature = 0.7 } = params;

  if (model === "gpt") {
    const apiKey = requireEnv("OPENAI_API_KEY");
    const startMs = Date.now();
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });
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

  const apiKey = requireEnv("ANTHROPIC_API_KEY");
  const startMs = Date.now();
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: maxTokens,
      temperature,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }]
    })
  });
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

const buildPaidReportPrompt = (params: { input: FortuneInput; productCode: ProductCode }) => {
  const { input, productCode } = params;

  const lengthGuide =
    productCode === "full"
      ? "유료 기준으로 충분히 길게 작성하세요. 목표: 약 15,000자(±25%) 수준의 한국어 장문."
      : "유료 기준으로 장문으로 작성하세요.";

  const system =
    "당신은 한국어로 사주/운세 리포트를 쓰는 전문 에디터입니다.\n" +
    "- 문체: 존댓말, 칼럼형(서사/근거/맥락), 단정 금지(확률/가능성 표현)\n" +
    "- 목표: 읽는 사람이 ‘그래서 지금 뭘 하면 되지?’가 남도록 구체적 행동 제안 포함\n" +
    "- 금지: 의료/법률/투자 단정, 공포 조장, 과도한 확신\n" +
    "- 출력 형식: 반드시 JSON 하나만 출력 (추가 텍스트/마크다운 금지)";

  const user =
    `다음 사용자 입력을 바탕으로 유료 리포트를 작성해 주세요.\n\n` +
    `사용자: ${JSON.stringify(input)}\n` +
    `상품: ${productCode}\n\n` +
    `${FIXED_JASI_NOTICE_KO}\n\n` +
    `${lengthGuide}\n\n` +
    "반드시 아래 JSON 스키마로만 출력하세요.\n" +
    "{\n" +
    '  "headline": string,\n' +
    '  "summary": string,\n' +
    '  "sections": [\n' +
    '    {"key":"성격","title":"성격","text":string},\n' +
    '    {"key":"직업","title":"직업","text":string},\n' +
    '    {"key":"연애","title":"연애","text":string},\n' +
    '    {"key":"금전","title":"금전","text":string},\n' +
    '    {"key":"건강","title":"건강","text":string},\n' +
    '    {"key":"가족·배우자","title":"가족·배우자","text":string},\n' +
    '    {"key":"과거","title":"과거","text":string},\n' +
    '    {"key":"현재","title":"현재","text":string},\n' +
    '    {"key":"미래","title":"미래","text":string},\n' +
    '    {"key":"대운 타임라인","title":"대운 타임라인","text":string}\n' +
    "  ],\n" +
    '  "recommendations": string[],\n' +
    '  "disclaimer": string\n' +
    "}\n\n" +
    "작성 규칙:\n" +
    "- 각 섹션은 최소 6~10문장 이상으로, 근거→패턴→리스크→실행 팁 순서를 유지해 주세요.\n" +
    "- 중복 문장/상투어를 줄이고, 구체적인 행동 예시(문장 템플릿 포함)를 최소 1개 이상 포함하세요.\n";

  return { system, user };
};

const normalizeToReportDetail = (params: {
  orderId: string;
  productCode: ProductCode;
  json: any;
}): Omit<ReportDetail, "debugLength"> & { debugLength: ReturnType<typeof buildLengthInfo> } => {
  const { orderId, productCode, json } = params;
  const generatedAt = new Date().toISOString();

  const headline = typeof json?.headline === "string" ? json.headline : "맞춤 장문 리포트";
  const summary = typeof json?.summary === "string" ? json.summary : "";
  const sections = Array.isArray(json?.sections) ? json.sections : [];
  const recommendations = Array.isArray(json?.recommendations) ? json.recommendations : [];
  const disclaimer = typeof json?.disclaimer === "string" ? json.disclaimer : "";

  const normalizedSections = sections
    .filter((s: any) => s && typeof s === "object")
    .map((s: any) => ({
      key: String(s.key ?? "section"),
      title: String(s.title ?? s.key ?? "섹션"),
      text: String(s.text ?? "")
    }));

  const fullText = normalizedSections.map((s: any) => `${s.title}\n${s.text}`).join("\n");
  const debugLength = buildLengthInfo("paid", fullText);

  return {
    reportId: `rep_${orderId}`,
    orderId,
    productCode,
    generatedAt,
    headline,
    summary,
    sections: normalizedSections,
    recommendations: recommendations.map((r: any) => String(r)),
    disclaimer,
    debugLength
  };
};

/** Estimate USD cost based on model and token counts */
const estimateCostUsd = (provider: string, model: string, usage: LlmUsage): number => {
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  const cacheWrite = usage.cacheCreationInputTokens ?? 0;
  const cacheRead = usage.cacheReadInputTokens ?? 0;

  if (provider === "anthropic") {
    // Sonnet 4.6 pricing: $3/M input, $15/M output, cache write $3.75/M, cache read $0.30/M
    const regularInput = Math.max(0, input - cacheWrite - cacheRead);
    return (regularInput * 3 + cacheWrite * 3.75 + cacheRead * 0.3 + output * 15) / 1_000_000;
  }
  // GPT-4.1-mini pricing: $0.40/M input, $1.60/M output
  return (input * 0.4 + output * 1.6) / 1_000_000;
};

/** Log LLM usage to database (fire-and-forget) */
const logLlmUsage = async (params: {
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

export const generateDualModelPaidReports = async (params: {
  orderId: string;
  input: FortuneInput;
  productCode: ProductCode;
}): Promise<{ gpt: ModelReportDetail; claude: ModelReportDetail; preferred: ReportModel }> => {
  const { orderId, input, productCode } = params;
  const { system, user } = buildPaidReportPrompt({ input, productCode });

  // Costs: keep output bounded. (15k chars ~= a few thousand tokens; adjust as needed.)
  const maxTokens = Number(process.env.REPORT_MAX_TOKENS ?? 6000);

  const [gptRes, claudeRes] = await Promise.all([
    callLlm({ model: "gpt", system, user, maxTokens, temperature: 0.7 }),
    callLlm({ model: "claude", system, user, maxTokens, temperature: 0.7 })
  ]);

  // Fire-and-forget LLM usage logging
  const anthropicModel = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  const openaiModel = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  logLlmUsage({ provider: "openai", model: openaiModel, usage: gptRes.usage, durationMs: gptRes.durationMs });
  logLlmUsage({ provider: "anthropic", model: anthropicModel, usage: claudeRes.usage, durationMs: claudeRes.durationMs });

  const gptJson = safeJsonParse(gptRes.text);
  const claudeJson = safeJsonParse(claudeRes.text);

  const gptBase = normalizeToReportDetail({ orderId, productCode, json: gptJson });
  const claudeBase = normalizeToReportDetail({ orderId, productCode, json: claudeJson });

  const gpt: ModelReportDetail = { ...gptBase, model: "gpt", usage: gptRes.usage };
  const claude: ModelReportDetail = { ...claudeBase, model: "claude", usage: claudeRes.usage };

  // Heuristic preference: fewer empty sections + closer to 15k target.
  const score = (r: ModelReportDetail) => {
    const empties = r.sections.filter((s) => !s.text || s.text.trim().length < 80).length;
    const chars = countReportChars(r.sections.map((s) => s.text).join("\n"));
    const target = 15000;
    const dist = Math.abs(chars - target);
    return -(empties * 5000 + dist);
  };

  const preferred: ReportModel = score(claude) >= score(gpt) ? "claude" : "gpt";

  return { gpt, claude, preferred };
};
