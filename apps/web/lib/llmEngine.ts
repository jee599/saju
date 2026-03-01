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
  // 1차: 그대로 파싱
  try {
    return JSON.parse(text);
  } catch { /* fall through */ }

  const trimmed = text.trim();

  // 2차: ```json ... ``` 펜스 제거 (전체 매칭)
  const fenceMatchFull = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatchFull?.[1]) {
    try { return JSON.parse(fenceMatchFull[1]); } catch { /* fall through */ }
  }

  // 2.5차: 텍스트 중간에 있는 ```json 펜스 추출 (Haiku 등 펜스 앞뒤에 텍스트 있을 때)
  const fenceMatchMid = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatchMid?.[1]) {
    try { return JSON.parse(fenceMatchMid[1]); } catch {
      // 펜스 내용에서 { ~ } 추출
      const inner = fenceMatchMid[1];
      const fb = inner.indexOf("{");
      const lb = inner.lastIndexOf("}");
      if (fb !== -1 && lb > fb) {
        try { return JSON.parse(inner.slice(fb, lb + 1)); } catch { /* fall through */ }
      }
    }
  }

  // 2.7차: 잘린 ```json 펜스 (닫는 ``` 없이 잘린 경우)
  const fenceOpen = trimmed.match(/```(?:json)?\s*([\s\S]+)/i);
  if (fenceOpen?.[1] && !fenceOpen[1].includes("```")) {
    const inner = fenceOpen[1].trim();
    const fb = inner.indexOf("{");
    const lb = inner.lastIndexOf("}");
    if (fb !== -1 && lb > fb) {
      try { return JSON.parse(inner.slice(fb, lb + 1)); } catch { /* fall through */ }
    }
  }

  // 3차: 텍스트 중간에 있는 JSON 객체 추출 (첫 { ~ 마지막 })
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    try { return JSON.parse(candidate); } catch { /* fall through */ }
  }

  // 4차: 줄바꿈/제어문자 정리 후 재시도
  const cleaned = trimmed
    .replace(/[\x00-\x1f]/g, (ch) => ch === "\n" || ch === "\r" || ch === "\t" ? ch : "")
    .replace(/,\s*([\]}])/g, "$1"); // trailing comma 제거
  try { return JSON.parse(cleaned); } catch { /* fall through */ }

  // 5차: 잘린 JSON 복구 시도 (maxTokens 초과로 잘린 경우)
  const jsonCandidate = (() => {
    const start = cleaned.indexOf("{");
    if (start === -1) return null;
    let s = cleaned.slice(start);
    // 열린 중괄호/대괄호 수를 세서 닫아주기
    let braces = 0, brackets = 0, inStr = false, escape = false;
    for (const ch of s) {
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === "{") braces++;
      if (ch === "}") braces--;
      if (ch === "[") brackets++;
      if (ch === "]") brackets--;
    }
    // 문자열이 열려있으면 닫기
    if (inStr) s += '"';
    // 대괄호/중괄호 닫기
    while (brackets > 0) { s += "]"; brackets--; }
    while (braces > 0) { s += "}"; braces--; }
    return s;
  })();
  if (jsonCandidate) {
    try { return JSON.parse(jsonCandidate); } catch { /* fall through */ }
    // trailing comma 제거 후 재시도
    try { return JSON.parse(jsonCandidate.replace(/,\s*([\]}])/g, "$1")); } catch { /* fall through */ }
  }

  throw new Error("JSON_PARSE_FAILED: " + trimmed.slice(0, 200));
};

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
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 2000): Promise<T> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = err?.message ?? "";
      // 상태코드 추출
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

  // ── OpenAI (GPT) ──
  if (model === "gpt") {
    const apiKey = requireEnv("OPENAI_API_KEY");
    const modelId = openaiModel ?? process.env.OPENAI_MODEL ?? "gpt-5.2";
    // gpt-5-mini는 temperature 1만 지원
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
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body)
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
          contents: [{ role: "user", parts: [{ text: user }] }],
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

/** callLlm: 자동 리트라이 포함 (429/503/529 → 최대 3회) */
const callLlm = async (params: Parameters<typeof callLlmOnce>[0]): Promise<LlmResult> => {
  return withRetry(() => callLlmOnce(params), 3, 2000);
};

const MODEL_CHAR_TARGETS: Record<string, number> = {
  opus: 20000,
  sonnet: 20000,
  gpt: 20000,
  gemini: 20000,
};

const buildPaidReportPrompt = (params: { input: FortuneInput; productCode: ProductCode; targetModel?: string; charTarget?: number }) => {
  const { input, productCode, targetModel } = params;
  const charTarget = params.charTarget ?? MODEL_CHAR_TARGETS[targetModel ?? "sonnet"] ?? 20000;

  const lengthGuide =
    `유료 기준으로 최대한 길고 상세하게 작성하세요. 목표: 약 ${charTarget.toLocaleString()}자(±15%) 수준의 한국어 장문. ` +
    `각 섹션마다 최소 ${Math.round(charTarget / 10 / 100) * 100}자 이상 작성하세요.`;

  const system =
    "당신은 한국 최고의 사주명리학자이자 인생 상담 전문가입니다. 20년 이상의 상담 경험을 바탕으로, 사주팔자를 깊이 분석하여 의뢰인에게 실질적으로 도움이 되는 따뜻하고 통찰력 있는 리포트를 작성합니다.\n\n" +
    "## 핵심 작성 원칙\n" +
    "1. **일상 언어 사용**: 사주 전문용어(일간, 천간, 지지, 비견, 식신, 정관, 편인 등)를 절대 그대로 쓰지 마세요.\n" +
    "   - BAD: '일간이 기토이고 월간에 경금이 있어 식신생재의 구조입니다'\n" +
    "   - GOOD: '당신은 타고나길 따뜻하고 포용력 있는 성품을 지녔어요. 마치 비옥한 땅처럼 주변 사람들에게 안정감을 주는 존재랍니다. 여기에 창의적인 재능까지 겸비하고 있어서, 아이디어를 현실로 만들어내는 능력이 뛰어나요.'\n" +
    "2. **구체적 묘사**: 추상적 표현 대신 생생한 비유, 구체적 상황 예시, 실제 행동 팁을 제시하세요.\n" +
    "   - BAD: '대인관계가 좋습니다'\n" +
    "   - GOOD: '처음 만난 사람과도 금방 친해지는 타입이에요. 회식 자리에서 분위기를 띄우는 역할을 자주 맡게 되고, 친구들 사이에서 \"너는 누구랑이든 잘 지내더라\"는 말을 들을 수 있어요.'\n" +
    "3. **개인화된 서술**: 이름을 직접 호명하며, '당신'이라는 표현으로 1:1 상담처럼 작성하세요.\n" +
    "4. **균형 잡힌 시각**: 장점은 구체적으로 칭찬하고, 주의할 점은 긍정적 대안과 함께 제시하세요.\n" +
    "5. **실용적 조언**: 각 섹션마다 \"이렇게 해보세요\"라는 실생활 행동 팁을 2~3가지 포함하세요.\n" +
    "6. **문체**: 존댓말, 따뜻하고 친근한 톤. 친한 언니/오빠가 인생 상담해주듯이.\n" +
    "- 금지: 의료/법률/투자 단정, 공포 조장, 과도한 확신, 한자 남발\n" +
    "- 출력 형식: 반드시 JSON 하나만 출력 (추가 텍스트/마크다운 금지)";

  const user =
    `다음 사용자의 사주를 깊이 분석하여 프리미엄 유료 리포트를 작성해 주세요.\n\n` +
    `사용자 정보: ${JSON.stringify(input)}\n` +
    `상품: ${productCode}\n\n` +
    `${FIXED_JASI_NOTICE_KO}\n\n` +
    `${lengthGuide}\n\n` +
    "반드시 아래 JSON 스키마로만 출력하세요.\n" +
    "{\n" +
    '  "headline": string,  // 이 사람의 사주를 한 문장으로 요약한 매력적인 헤드라인 (예: "따뜻한 대지처럼 사람을 품고, 단단한 책임감으로 빛나는 OO님의 인생 여정")\n' +
    '  "summary": string,  // 전체 리포트의 핵심을 3~4줄로 요약\n' +
    '  "sections": [\n' +
    '    {"key":"성격","title":"성격","text":string},  // 타고난 성격, 장단점, 대인관계 스타일, 스트레스 대처법\n' +
    '    {"key":"직업","title":"직업","text":string},  // 적성, 추천 직종/업종, 직장생활 팁, 사업 적합성\n' +
    '    {"key":"연애","title":"연애","text":string},  // 연애 스타일, 이상형, 연애 시 주의점, 좋은 궁합 특성\n' +
    '    {"key":"금전","title":"금전","text":string},  // 재물운 흐름, 돈 관리 스타일, 투자 성향, 재테크 팁\n' +
    '    {"key":"건강","title":"건강","text":string},  // 체질적 특성, 주의할 건강 영역, 건강 관리 팁, 스트레스 해소법\n' +
    '    {"key":"가족·배우자","title":"가족·배우자","text":string},  // 가족관계 특성, 배우자운, 결혼생활 팁, 부모/자녀 관계\n' +
    '    {"key":"과거","title":"과거","text":string},  // 지나온 시기 해석 (어린 시절~현재까지 시기별 특성)\n' +
    '    {"key":"현재","title":"현재","text":string},  // 현재 운의 흐름, 올해 주요 키워드, 당장 실천할 것\n' +
    '    {"key":"미래","title":"미래","text":string},  // 앞으로 3~5년 전망, 기회의 시기, 준비해야 할 것\n' +
    '    {"key":"대운 타임라인","title":"대운 타임라인","text":string}  // 10년 단위 인생 흐름, 각 시기별 핵심 테마와 조언\n' +
    "  ],\n" +
    '  "recommendations": string[],  // 5~8개의 구체적 실천 체크리스트\n' +
    '  "disclaimer": string\n' +
    "}\n\n" +
    "## 섹션별 작성 가이드\n" +
    "- 각 섹션은 최소 8~15문장 이상, 여러 문단으로 나눠서 작성하세요.\n" +
    "- 첫 문장은 그 섹션의 핵심을 담은 인상적인 문장으로 시작하세요.\n" +
    "- 사주의 기운을 자연물(물, 불, 나무, 땅, 금속)에 비유하여 쉽게 설명하세요.\n" +
    "- 구체적인 상황 예시를 들어 '아, 나 그래!' 하고 공감하게 만드세요.\n" +
    "- 각 섹션 끝에 실천 가능한 구체적 행동 팁 2~3개를 포함하세요.\n" +
    "- '~할 수 있어요', '~하는 편이에요' 같은 부드러운 표현을 사용하세요.\n" +
    "- 중복 문장/상투어를 줄이고, 읽는 사람이 자기 이야기처럼 느끼도록 작성하세요.\n" +
    "- 모든 섹션의 text는 반드시 한국어 " + Math.round(charTarget / 10) + "자 이상이어야 합니다.\n";

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
  const charTarget = params.charTarget ?? MODEL_CHAR_TARGETS[targetModel] ?? 20000;
  const { system, user } = buildPaidReportPrompt({ input, productCode, targetModel, charTarget });

  // 한국어 1자 ≈ 1~1.5 토큰 (JSON 구조 포함), Vercel 300s 타임아웃 고려
  const maxTokens = Math.max(16000, Math.round(charTarget * 1.0));

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

/** 2섹션씩 묶어서 5번 호출 (4000자 × 5 = 총 20000자 목표) */
const SECTION_CHUNKS: Array<Array<{ key: string; title: string }>> = [
  [{ key: "성격", title: "성격" }, { key: "직업", title: "직업" }],
  [{ key: "연애", title: "연애" }, { key: "금전", title: "금전" }],
  [{ key: "건강", title: "건강" }, { key: "가족·배우자", title: "가족·배우자" }],
  [{ key: "과거", title: "과거" }, { key: "현재", title: "현재" }],
  [{ key: "미래", title: "미래" }, { key: "대운 타임라인", title: "대운 타임라인" }],
];

const SECTION_PROMPTS: Record<string, string> = {
  "성격": "타고난 성격적 특성, 강점과 약점, 대인관계 스타일, 감정 표현 방식, 스트레스 대처 패턴. 주변 사람들이 느끼는 첫인상과 깊이 알게 된 후의 인상 차이.",
  "직업": "적합한 직업군, 일하는 스타일, 리더십/팔로워십 특성, 직장에서의 강점과 주의점. 추천 업종/직종 3~5가지와 이유. 사업 적합성.",
  "연애": "연애 스타일, 사랑 표현 방식, 이상형 특성, 연애 패턴(밀당/헌신/질투 등). 좋은 궁합 상대방 특성과 피해야 할 관계 유형.",
  "금전": "재물운 흐름, 돈 대하는 태도, 소비 패턴, 저축/투자 성향. 재물 유입 경로(월급형/사업형/투자형)와 돈 새는 포인트.",
  "건강": "체질적 특성, 주의할 건강 영역, 스트레스가 몸에 나타나는 방식, 계절별 관리 팁. 좋은 운동/음식/생활습관.",
  "가족·배우자": "가족 관계 특성, 부모님 관계 패턴, 배우자운, 결혼생활 특성, 자녀운. 갈등 해소법과 관계 개선 팁.",
  "과거": "지나온 시기 해석: 어린 시절, 학창 시절, 20대 도전과 성장, 큰 전환점들을 시기별로.",
  "현재": "2025~2026년 운의 흐름. 올해 핵심 키워드 3가지, 주의할 시기, 기회 시기, 이번 달부터 실천할 행동 3가지.",
  "미래": "앞으로 3~5년 전망: 커리어/재물/인간관계 변화 흐름, 큰 기회 시기와 준비 사항.",
  "대운 타임라인": "10년 단위 대운 흐름: 10대~80대 각 시기 핵심 테마, 특징, 주의사항, 인생 조언.",
};

export const generateChunkedReport = async (params: {
  orderId: string;
  input: FortuneInput;
  productCode: ProductCode;
  targetModel: string; // "opus" | "gemini-flash" | "haiku" | "gpt-mini"
}): Promise<ModelReportDetail & { totalCostUsd: number }> => {
  const { orderId, input, productCode, targetModel } = params;
  // 2섹션 묶음당 목표: 각 섹션 2000자 × 2 = 4000자
  const charPerChunk = 4000;
  // Claude 토크나이저는 한국어 1자당 ~1.5-2.5 토큰 소비 → 6000으로는 부족
  // GPT/Gemini는 한국어 토크나이제이션이 더 효율적
  const isClaudeModel = ["sonnet", "haiku", "opus"].includes(targetModel);
  const maxTokensPerChunk = isClaudeModel
    ? Math.max(12000, Math.round(charPerChunk * 3.0))  // Claude: 12000 토큰
    : Math.max(8000, Math.round(charPerChunk * 2.0));   // GPT/Gemini: 8000 토큰

  let llmModel: ReportModel;
  let anthropicModelId: string | undefined;
  let geminiModelId: string | undefined;
  let openaiModelId: string | undefined;

  if (targetModel === "gemini") {
    llmModel = "gemini";
    geminiModelId = "gemini-3.1-pro-preview";
  } else if (targetModel === "gemini-flash") {
    llmModel = "gemini";
    geminiModelId = "gemini-3-flash-preview";
  } else if (targetModel === "gpt") {
    llmModel = "gpt";
    openaiModelId = process.env.OPENAI_MODEL ?? "gpt-5.2";
  } else if (targetModel === "gpt-mini") {
    llmModel = "gpt";
    openaiModelId = "gpt-5-mini";
  } else if (targetModel === "haiku") {
    llmModel = "claude";
    anthropicModelId = "claude-haiku-4-5-20251001";
  } else if (targetModel === "opus") {
    llmModel = "claude";
    anthropicModelId = "claude-opus-4-6";
  } else {
    llmModel = "claude";
    anthropicModelId = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  }

  const system =
    "당신은 한국 최고의 사주명리학자이자 인생 상담 전문가입니다. 20년 이상의 상담 경험을 바탕으로, 사주팔자를 깊이 분석하여 의뢰인에게 실질적으로 도움이 되는 따뜻하고 통찰력 있는 글을 작성합니다.\n\n" +
    "## 핵심 원칙\n" +
    "1. 사주 전문용어(일간, 천간, 지지, 비견, 식신, 정관 등)를 절대 그대로 쓰지 마세요. 자연물 비유(물, 불, 나무, 땅, 금속)로 풀어 설명하세요.\n" +
    "2. 구체적 상황 예시를 들어 공감을 이끌어내세요.\n" +
    "3. 각 섹션 끝에 실천 가능한 행동 팁 2~3개를 포함하세요.\n" +
    "4. 문체: 존댓말, 따뜻하고 친근한 톤. 이름을 직접 호명하며 1:1 상담처럼 작성.\n" +
    "5. 금지: 의료/법률/투자 단정, 공포 조장, 과도한 확신, 한자 남발\n" +
    "6. 출력: 반드시 JSON 형식으로만 출력하세요.";

  const inputJson = JSON.stringify(input);
  const totalUsage: LlmUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  /** 단일 청크 호출 + 파싱 (1회 시도) */
  const callAndParseChunk = async (
    chunk: Array<{ key: string; title: string }>
  ): Promise<{ sections: Array<{ key: string; title: string; text: string }>; usage?: LlmUsage; durationMs: number }> => {
    const sec1 = chunk[0];
    const sec2 = chunk[1];
    const guide1 = SECTION_PROMPTS[sec1.title] ?? "";
    const guide2 = SECTION_PROMPTS[sec2.title] ?? "";

    const userPrompt =
      `사용자 정보: ${inputJson}\n\n` +
      `위 사용자의 사주를 바탕으로 아래 2개 섹션을 작성해 주세요.\n\n` +
      `## 섹션 1: "${sec1.title}"\n${guide1}\n\n` +
      `## 섹션 2: "${sec2.title}"\n${guide2}\n\n` +
      `### 작성 규칙\n` +
      `- 이것은 유료 프리미엄 리포트입니다. 각 섹션을 최소 2000자 이상 작성하세요.\n` +
      `- 여러 문단으로 나눠서 풍성하게 작성하세요 (섹션당 최소 4~6문단).\n` +
      `- 사주 전문용어 대신 자연물 비유(물, 불, 나무, 땅, 금속)로 쉽게 설명하세요.\n` +
      `- 구체적인 상황 예시를 들어 '아, 나 그래!' 하고 공감할 수 있게 쓰세요.\n` +
      `- 각 섹션 끝에 실천 가능한 구체적 행동 팁 2~3가지를 포함하세요.\n` +
      `- '~할 수 있어요', '~하는 편이에요' 같은 부드러운 존댓말을 사용하세요.\n\n` +
      `반드시 아래 JSON 형식으로만 출력하세요:\n` +
      `{"sections":[{"key":"${sec1.key}","title":"${sec1.title}","text":"본문..."},{"key":"${sec2.key}","title":"${sec2.title}","text":"본문..."}]}`;

    const res = await callLlm({
      model: llmModel, system, user: userPrompt,
      maxTokens: maxTokensPerChunk, temperature: 0.7,
      anthropicModel: anthropicModelId, geminiModel: geminiModelId, openaiModel: openaiModelId,
    });

    // JSON 파싱 시도
    try {
      const parsed = safeJsonParse(res.text);
      const sections = parsed?.sections ?? [];
      if (sections.length > 0) {
        return {
          sections: sections.map((s: any) => ({
            key: String(s.key ?? ""), title: String(s.title ?? ""), text: String(s.text ?? "")
          })),
          usage: res.usage,
          durationMs: res.durationMs ?? 0,
        };
      }
    } catch { /* fall through */ }

    // Regex fallback: "text" 필드 추출
    const textMatches = [...res.text.matchAll(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/gs)];
    if (textMatches.length >= 2) {
      const t1 = textMatches[0][1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      const t2 = textMatches[1][1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      console.log(`[chunked] regex fallback extracted 2 sections for ${sec1.key}/${sec2.key}`);
      return {
        sections: [
          { key: sec1.key, title: sec1.title, text: t1 },
          { key: sec2.key, title: sec2.title, text: t2 },
        ],
        usage: res.usage,
        durationMs: res.durationMs ?? 0,
      };
    }
    if (textMatches.length === 1) {
      const t1 = textMatches[0][1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      console.log(`[chunked] regex fallback extracted 1 section for ${sec1.key}`);
      return {
        sections: [{ key: sec1.key, title: sec1.title, text: t1 }],
        usage: res.usage,
        durationMs: res.durationMs ?? 0,
      };
    }

    // 파싱 완전 실패 → 에러를 던져서 재시도 유도
    throw new Error(`CHUNK_PARSE_FAILED: ${sec1.key}/${sec2.key} — raw: ${res.text.slice(0, 300)}`);
  };

  /** 청크 호출 + 파싱 실패 시 1회 재시도 */
  const callChunkWithRetry = async (
    chunk: Array<{ key: string; title: string }>
  ): Promise<{ sections: Array<{ key: string; title: string; text: string }>; usage?: LlmUsage; durationMs: number }> => {
    try {
      return await callAndParseChunk(chunk);
    } catch (err) {
      console.warn(`[chunked] first attempt failed for ${chunk.map(c => c.key).join("/")}, retrying...`, err instanceof Error ? err.message : err);
      try {
        await sleep(1000); // 잠시 대기 후 재시도
        return await callAndParseChunk(chunk);
      } catch (retryErr) {
        console.error(`[chunked] retry also failed for ${chunk.map(c => c.key).join("/")}`, retryErr instanceof Error ? retryErr.message : retryErr);
        // 재시도도 실패 → 빈 결과 (섹션 생략)
        return { sections: [], usage: undefined, durationMs: 0 };
      }
    }
  };

  // 2섹션씩 5번 **병렬** 호출 (Promise.all) + 개별 청크 재시도
  const chunkResults = await Promise.all(SECTION_CHUNKS.map(callChunkWithRetry));

  // 결과 취합 (순서 보존)
  const results: Array<{ key: string; title: string; text: string }> = [];
  let totalDurationMs = 0;
  for (const cr of chunkResults) {
    if (cr.usage) {
      totalUsage.inputTokens = (totalUsage.inputTokens ?? 0) + (cr.usage.inputTokens ?? 0);
      totalUsage.outputTokens = (totalUsage.outputTokens ?? 0) + (cr.usage.outputTokens ?? 0);
      totalUsage.totalTokens = (totalUsage.totalTokens ?? 0) + (cr.usage.totalTokens ?? 0);
    }
    totalDurationMs += cr.durationMs;
    results.push(...cr.sections);
  }

  const provider = llmModel === "gpt" ? "openai" : llmModel === "gemini" ? "google" : "anthropic";
  const modelName = openaiModelId ?? geminiModelId ?? anthropicModelId ?? "unknown";
  logLlmUsage({ provider, model: modelName, usage: totalUsage, durationMs: totalDurationMs });

  const costUsd = estimateCostUsd(provider, modelName, totalUsage);

  // 실패/빈 섹션 제거 (서버사이드 필터링)
  const validSections = results.filter(
    (s) => s.text && !s.text.includes("(생성 실패)") && s.text.trim().length > 30
  );

  if (validSections.length < results.length) {
    console.warn(`[chunked] filtered out ${results.length - validSections.length} failed sections (${results.length} → ${validSections.length})`);
  }

  const fullText = validSections.map((s) => `${s.title}\n${s.text}`).join("\n");

  return {
    reportId: `rep_${orderId}`,
    orderId,
    productCode,
    generatedAt: new Date().toISOString(),
    headline: `${input.name}님 사주 분석 리포트`,
    summary: `${validSections.length}개 섹션 분석 완료`,
    sections: validSections,
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
