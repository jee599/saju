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
  anthropicModel?: string;
  geminiModel?: string;
  openaiModel?: string;
}): Promise<LlmResult> => {
  const { model, system, user, maxTokens, temperature = 0.7, anthropicModel, geminiModel, openaiModel } = params;

  // ── OpenAI (GPT) ──
  if (model === "gpt") {
    const apiKey = requireEnv("OPENAI_API_KEY");
    const startMs = Date.now();
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: openaiModel ?? process.env.OPENAI_MODEL ?? "gpt-5.2",
        temperature,
        max_completion_tokens: maxTokens,
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

  // ── Google Gemini ──
  if (model === "gemini") {
    const apiKey = requireEnv("GOOGLE_API_KEY");
    const modelId = geminiModel ?? process.env.GEMINI_MODEL ?? "gemini-3.1-pro-preview";
    const startMs = Date.now();
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${system}\n\n---\n\n${user}` }] }],
          systemInstruction: { parts: [{ text: system }] },
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            responseMimeType: "text/plain",
          },
        }),
      }
    );
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
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: anthropicModel ?? process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
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

const MODEL_CHAR_TARGETS: Record<string, number> = {
  opus: 30000,
  sonnet: 30000,
  gpt: 30000,
};

const buildPaidReportPrompt = (params: { input: FortuneInput; productCode: ProductCode; targetModel?: string; charTarget?: number }) => {
  const { input, productCode, targetModel } = params;
  const charTarget = params.charTarget ?? MODEL_CHAR_TARGETS[targetModel ?? "sonnet"] ?? 15000;

  const lengthGuide =
    `유료 기준으로 최대한 길고 상세하게 작성하세요. 목표: 약 ${charTarget.toLocaleString()}자(±15%) 수준의 한국어 장문. ` +
    `각 섹션마다 최소 ${Math.round(charTarget / 10 / 100) * 100}자 이상 작성하세요.`;

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
export const estimateCostUsd = (provider: string, model: string, usage: LlmUsage): number => {
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  const cacheWrite = usage.cacheCreationInputTokens ?? 0;
  const cacheRead = usage.cacheReadInputTokens ?? 0;

  if (provider === "anthropic") {
    if (model.includes("opus")) {
      // Opus 4.6 pricing: $15/M input, $75/M output
      return (input * 15 + output * 75) / 1_000_000;
    }
    if (model.includes("haiku")) {
      // Haiku 4.5 pricing: $1/M input, $5/M output
      return (input * 1 + output * 5) / 1_000_000;
    }
    // Sonnet 4.6 pricing: $3/M input, $15/M output, cache write $3.75/M, cache read $0.30/M
    const regularInput = Math.max(0, input - cacheWrite - cacheRead);
    return (regularInput * 3 + cacheWrite * 3.75 + cacheRead * 0.3 + output * 15) / 1_000_000;
  }
  if (provider === "google") {
    if (model.includes("flash")) {
      // Gemini Flash pricing: $0.50/M input, $3/M output
      return (input * 0.5 + output * 3) / 1_000_000;
    }
    // Gemini 3.1 Pro pricing: $2/M input, $12/M output
    return (input * 2 + output * 12) / 1_000_000;
  }
  if (model.includes("5-mini") || model.includes("5.2-mini")) {
    // GPT-5-mini pricing: $0.30/M input, $1.25/M output
    return (input * 0.3 + output * 1.25) / 1_000_000;
  }
  // GPT-5.2 pricing: $1.75/M input, $14/M output
  return (input * 1.75 + output * 14) / 1_000_000;
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

export const hasGeminiKey = (): boolean => {
  return Boolean(process.env.GOOGLE_API_KEY);
};

/** Generate a single-model report based on user's model selection */
export const generateSingleModelReport = async (params: {
  orderId: string;
  input: FortuneInput;
  productCode: ProductCode;
  targetModel: string; // "opus" | "sonnet" | "gpt" | "gemini" | "gemini-flash"
  charTarget?: number;
}): Promise<ModelReportDetail> => {
  const { orderId, input, productCode, targetModel } = params;
  const charTarget = params.charTarget ?? MODEL_CHAR_TARGETS[targetModel] ?? 30000;
  const { system, user } = buildPaidReportPrompt({ input, productCode, targetModel, charTarget });

  const maxTokens = Math.max(8000, Math.round(charTarget / 2.5));

  let llmModel: ReportModel;
  let anthropicModelId: string | undefined;
  let geminiModelId: string | undefined;
  let openaiModelId: string | undefined;

  if (targetModel === "gpt") {
    llmModel = "gpt";
    openaiModelId = process.env.OPENAI_MODEL ?? "gpt-5.2";
  } else if (targetModel === "gemini") {
    llmModel = "gemini";
    geminiModelId = "gemini-3.1-pro-preview";
  } else if (targetModel === "gemini-flash") {
    llmModel = "gemini";
    geminiModelId = "gemini-3-flash-preview";
  } else if (targetModel === "opus") {
    llmModel = "claude";
    anthropicModelId = "claude-opus-4-6";
  } else {
    llmModel = "claude";
    anthropicModelId = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  }

  const res = await callLlm({
    model: llmModel, system, user, maxTokens, temperature: 0.7,
    anthropicModel: anthropicModelId, geminiModel: geminiModelId, openaiModel: openaiModelId,
  });

  const provider = llmModel === "gpt" ? "openai" : llmModel === "gemini" ? "google" : "anthropic";
  const modelName = openaiModelId ?? geminiModelId ?? anthropicModelId ?? "unknown";
  logLlmUsage({ provider, model: modelName, usage: res.usage, durationMs: res.durationMs });

  const json = safeJsonParse(res.text);
  const base = normalizeToReportDetail({ orderId, productCode, json });
  return { ...base, model: llmModel, usage: res.usage };
};

const SECTION_KEYS = [
  { key: "성격", title: "성격" },
  { key: "직업", title: "직업" },
  { key: "연애", title: "연애" },
  { key: "금전", title: "금전" },
  { key: "건강", title: "건강" },
  { key: "가족·배우자", title: "가족·배우자" },
  { key: "과거", title: "과거" },
  { key: "현재", title: "현재" },
  { key: "미래", title: "미래" },
  { key: "대운 타임라인", title: "대운 타임라인" },
] as const;

/** Generate report by calling LLM once per section (chunked: 3000자 × 10) */
export const generateChunkedReport = async (params: {
  orderId: string;
  input: FortuneInput;
  productCode: ProductCode;
  targetModel: string; // "sonnet" | "gemini-flash" | "haiku" | "gpt-mini"
}): Promise<ModelReportDetail & { totalCostUsd: number }> => {
  const { orderId, input, productCode, targetModel } = params;
  const charPerSection = 3000;
  const maxTokensPerSection = Math.max(2000, Math.round(charPerSection / 2.5));

  let llmModel: ReportModel;
  let anthropicModelId: string | undefined;
  let geminiModelId: string | undefined;
  let openaiModelId: string | undefined;

  if (targetModel === "gemini-flash") {
    llmModel = "gemini";
    geminiModelId = "gemini-3-flash-preview";
  } else if (targetModel === "haiku") {
    llmModel = "claude";
    anthropicModelId = "claude-haiku-4-5-20251001";
  } else if (targetModel === "gpt-mini") {
    llmModel = "gpt";
    openaiModelId = "gpt-5-mini";
  } else {
    llmModel = "claude";
    anthropicModelId = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  }

  const system =
    "당신은 한국어로 사주/운세 리포트를 쓰는 전문 에디터입니다.\n" +
    "- 문체: 존댓말, 칼럼형(서사/근거/맥락), 단정 금지(확률/가능성 표현)\n" +
    "- 금지: 의료/법률/투자 단정, 공포 조장, 과도한 확신\n" +
    "- 출력: 요청된 섹션의 본문 텍스트만 출력 (JSON, 마크다운 금지). 순수 텍스트만.";

  const inputJson = JSON.stringify(input);
  const totalUsage: LlmUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let totalDurationMs = 0;

  // 순차 처리: rate limit 방지 (8개 모델 동시 실행 시 총 80개 호출 폭주 방지)
  const results: Array<{ key: string; title: string; text: string }> = [];
  for (const sec of SECTION_KEYS) {
    const userPrompt =
      `사용자: ${inputJson}\n\n` +
      `위 사용자의 사주를 바탕으로 "${sec.title}" 섹션을 약 ${charPerSection}자 분량으로 작성해 주세요.\n` +
      `근거→패턴→리스크→실행 팁 순서로, 구체적 행동 예시 포함.\n` +
      `본문 텍스트만 출력하세요.`;

    const res = await callLlm({
      model: llmModel, system, user: userPrompt,
      maxTokens: maxTokensPerSection, temperature: 0.7,
      anthropicModel: anthropicModelId, geminiModel: geminiModelId, openaiModel: openaiModelId,
    });

    if (res.usage) {
      totalUsage.inputTokens = (totalUsage.inputTokens ?? 0) + (res.usage.inputTokens ?? 0);
      totalUsage.outputTokens = (totalUsage.outputTokens ?? 0) + (res.usage.outputTokens ?? 0);
      totalUsage.totalTokens = (totalUsage.totalTokens ?? 0) + (res.usage.totalTokens ?? 0);
    }
    totalDurationMs += res.durationMs ?? 0;

    results.push({ key: sec.key, title: sec.title, text: res.text.trim() });
  }

  const provider = llmModel === "gpt" ? "openai" : llmModel === "gemini" ? "google" : "anthropic";
  const modelName = openaiModelId ?? geminiModelId ?? anthropicModelId ?? "unknown";
  logLlmUsage({ provider, model: modelName, usage: totalUsage, durationMs: totalDurationMs });

  const costUsd = estimateCostUsd(provider, modelName, totalUsage);

  const fullText = results.map((s) => `${s.title}\n${s.text}`).join("\n");

  return {
    reportId: `rep_${orderId}`,
    orderId,
    productCode,
    generatedAt: new Date().toISOString(),
    headline: `${input.name}님 사주 분석 리포트`,
    summary: "10개 섹션 × 3,000자 청크 생성",
    sections: results,
    recommendations: [],
    disclaimer: "본 서비스는 참고용 해석 정보이며, 의료·법률·투자 판단의 단독 근거로 사용할 수 없습니다.",
    debugLength: buildLengthInfo("paid", fullText),
    model: llmModel,
    usage: totalUsage,
    totalCostUsd: costUsd,
  };
};

export const generateDualModelPaidReports = async (params: {
  orderId: string;
  input: FortuneInput;
  productCode: ProductCode;
}): Promise<{ gpt: ModelReportDetail; claude: ModelReportDetail; preferred: ReportModel }> => {
  const { orderId, input, productCode } = params;
  const { system, user } = buildPaidReportPrompt({ input, productCode, targetModel: "sonnet" });

  const maxTokens = Number(process.env.REPORT_MAX_TOKENS ?? 8000);

  const [gptRes, claudeRes] = await Promise.all([
    callLlm({ model: "gpt", system, user, maxTokens, temperature: 0.7 }),
    callLlm({ model: "claude", system, user, maxTokens, temperature: 0.7 })
  ]);

  const anthropicModel = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  const openaiModel = process.env.OPENAI_MODEL ?? "gpt-5.2";
  logLlmUsage({ provider: "openai", model: openaiModel, usage: gptRes.usage, durationMs: gptRes.durationMs });
  logLlmUsage({ provider: "anthropic", model: anthropicModel, usage: claudeRes.usage, durationMs: claudeRes.durationMs });

  const gptJson = safeJsonParse(gptRes.text);
  const claudeJson = safeJsonParse(claudeRes.text);

  const gptBase = normalizeToReportDetail({ orderId, productCode, json: gptJson });
  const claudeBase = normalizeToReportDetail({ orderId, productCode, json: claudeJson });

  const gpt: ModelReportDetail = { ...gptBase, model: "gpt", usage: gptRes.usage };
  const claude: ModelReportDetail = { ...claudeBase, model: "claude", usage: claudeRes.usage };

  const score = (r: ModelReportDetail) => {
    const empties = r.sections.filter((s) => !s.text || s.text.trim().length < 80).length;
    const chars = countReportChars(r.sections.map((s) => s.text).join("\n"));
    const target = 30000;
    const dist = Math.abs(chars - target);
    return -(empties * 5000 + dist);
  };

  const preferred: ReportModel = score(claude) >= score(gpt) ? "claude" : "gpt";

  return { gpt, claude, preferred };
};
