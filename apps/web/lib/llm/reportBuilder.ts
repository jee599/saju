/**
 * Report assembly logic — normalizeToReportDetail, generateFreePersonality, generateChunkedReport
 */
import type { FortuneInput, ModelReportDetail, ProductCode, ReportModel, ReportDetail } from "../types";
import { buildLengthInfo, countReportChars } from "../reportLength";
import { logger } from "../logger";
import { getCountryByLocale } from "@saju/shared";
import type { LlmUsage } from "./client";
import { callLlm, estimateCostUsd, logLlmUsage, sleep } from "./client";
import { safeJsonParse } from "./parser";
import {
  convertLunarInputToSolar,
  sanitizeInputForPrompt,
  getPersonalityDef,
  getReportTexts,
  getSectionChunks,
  getSectionPromptsForLocale,
  getI18nSystemPrompt,
  LANGUAGE_NAMES,
} from "./prompts";

export const normalizeToReportDetail = (params: {
  orderId: string;
  productCode: ProductCode;
  json: any;
}): Omit<ReportDetail, "debugLength"> & { debugLength: ReturnType<typeof buildLengthInfo> } => {
  const { orderId, productCode, json } = params;
  const generatedAt = new Date().toISOString();

  const headline = typeof json?.headline === "string" ? json.headline : "Personalized Full Report";
  const summary = typeof json?.summary === "string" ? json.summary : "";
  const sections = Array.isArray(json?.sections) ? json.sections : [];
  const recommendations = Array.isArray(json?.recommendations) ? json.recommendations : [];
  const disclaimer = typeof json?.disclaimer === "string" ? json.disclaimer : "";

  const normalizedSections = sections
    .filter((s: any) => s && typeof s === "object")
    .map((s: any) => ({
      key: String(s.key ?? "section"),
      title: String(s.title ?? s.key ?? "Section"),
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

/** 무료 성격 1섹션만 GPT-mini로 생성 */
export const generateFreePersonality = async (params: {
  input: FortuneInput;
  locale?: string;
}): Promise<{ section: { key: string; title: string; text: string }; usage?: LlmUsage }> => {
  const { locale = "ko" } = params;
  const input = sanitizeInputForPrompt(convertLunarInputToSolar(params.input));
  const pDef = getPersonalityDef(locale);

  let system: string;
  let userPrompt: string;

  if (locale === "ko") {
    system =
      "당신은 한국 최고의 사주명리학자이자 인생 상담 전문가입니다. 20년 이상의 상담 경험을 바탕으로, 사주팔자를 깊이 분석하여 의뢰인에게 실질적으로 도움이 되는 따뜻하고 통찰력 있는 글을 작성합니다.\n\n" +
      "## 핵심 원칙\n" +
      "1. 사주 전문용어(일간, 천간, 지지, 비견, 식신, 정관 등)를 절대 그대로 쓰지 마세요. 자연물 비유(물, 불, 나무, 땅, 금속)로 풀어 설명하세요.\n" +
      "2. 구체적 상황 예시를 들어 공감을 이끌어내세요.\n" +
      "3. 각 섹션 끝에 실천 가능한 행동 팁 2~3개를 포함하세요.\n" +
      "4. 문체: 존댓말, 따뜻하고 친근한 톤. 이름을 직접 호명하며 1:1 상담처럼 작성.\n" +
      "5. 금지: 의료/법률/투자 단정, 공포 조장, 과도한 확신, 한자 남발\n" +
      "6. 출력: 반드시 JSON 형식으로만 출력하세요.";

    userPrompt =
      `사용자 정보: ${JSON.stringify(input)}\n\n` +
      `위 사용자의 사주를 바탕으로 "성격" 섹션을 작성해 주세요.\n\n` +
      `## 성격\n` +
      `타고난 성격적 특성, 강점과 약점, 대인관계 스타일, 감정 표현 방식, 스트레스 대처 패턴. 주변 사람들이 느끼는 첫인상과 깊이 알게 된 후의 인상 차이.\n\n` +
      `### 작성 규칙\n` +
      `- 최소 2000자 이상 작성하세요.\n` +
      `- 여러 문단으로 나눠서 풍성하게 작성하세요 (최소 4~6문단).\n` +
      `- 사주 전문용어 대신 자연물 비유(물, 불, 나무, 땅, 금속)로 쉽게 설명하세요.\n` +
      `- 구체적인 상황 예시를 들어 '아, 나 그래!' 하고 공감할 수 있게 쓰세요.\n` +
      `- 끝에 실천 가능한 구체적 행동 팁 2~3가지를 포함하세요.\n` +
      `- '~할 수 있어요', '~하는 편이에요' 같은 부드러운 존댓말을 사용하세요.\n\n` +
      `반드시 아래 JSON 형식으로만 출력하세요:\n` +
      `{"sections":[{"key":"성격","title":"성격","text":"본문..."}]}`;
  } else {
    const country = getCountryByLocale(locale);
    system = getI18nSystemPrompt(locale, country);
    const targetLang = LANGUAGE_NAMES[locale] ?? "English";

    userPrompt =
      `User information: ${JSON.stringify(input)}\n\n` +
      `Based on this person's K-Saju (Korean Four Pillars) reading, write a "Personality" section.\n\n` +
      `## Personality\n` +
      `Innate personality traits, strengths and weaknesses, interpersonal style, emotional expression, stress coping patterns. The contrast between first impressions and deeper understanding.\n\n` +
      `### Writing Rules\n` +
      `- Write at least 2000 characters.\n` +
      `- Use multiple paragraphs (at least 4-6).\n` +
      `- Use nature metaphors (water, fire, wood, earth, metal) instead of technical jargon.\n` +
      `- Include specific situational examples that create an "ah, that's so me!" feeling.\n` +
      `- End with 2-3 actionable tips.\n` +
      `- Use warm, friendly, polite language.\n\n` +
      `IMPORTANT: You are writing for a native ${targetLang} reader. Do NOT translate from English — compose original text in ${targetLang} using natural grammar, local idioms, and culturally resonant expressions.\n\n` +
      `Output ONLY this JSON format:\n` +
      `{"sections":[{"key":"personality","title":"Personality","text":"content..."}]}`;
  }

  const res = await callLlm({
    model: "gpt",
    system,
    user: userPrompt,
    maxTokens: 4000,
    temperature: 0.7,
    openaiModel: "gpt-5-mini",
  });

  logLlmUsage({ provider: "openai", model: "gpt-5-mini", usage: res.usage, durationMs: res.durationMs });

  const parsed = safeJsonParse(res.text);
  const section = parsed?.sections?.[0];
  if (!section?.text) throw new Error("FREE_PERSONALITY_PARSE_FAILED");

  return {
    section: { key: pDef.key, title: pDef.title, text: String(section.text) },
    usage: res.usage,
  };
};

export const generateChunkedReport = async (params: {
  orderId: string;
  input: FortuneInput;
  productCode: ProductCode;
  targetModel: string;
  locale?: string;
}): Promise<ModelReportDetail & { totalCostUsd: number }> => {
  const { orderId, productCode, targetModel } = params;
  const input = sanitizeInputForPrompt(convertLunarInputToSolar(params.input));
  const locale = params.locale ?? "ko";
  const charPerChunk = 4000;
  const isClaudeModel = ["haiku", "opus"].includes(targetModel);
  const maxTokensPerChunk = isClaudeModel
    ? Math.max(12000, Math.round(charPerChunk * 3.0))
    : Math.max(8000, Math.round(charPerChunk * 2.0));

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
  } else if (targetModel === "gpt-mini") {
    llmModel = "gpt";
    openaiModelId = "gpt-5-mini";
  } else if (targetModel === "haiku") {
    llmModel = "claude";
    anthropicModelId = "claude-haiku-4-5";
  } else if (targetModel === "opus") {
    llmModel = "claude";
    anthropicModelId = "claude-opus-4-6";
  } else {
    llmModel = "claude";
    anthropicModelId = "claude-haiku-4-5";
  }

  const system = locale === "ko"
    ? (
      "당신은 한국 최고의 사주명리학자이자 인생 상담 전문가입니다. 20년 이상의 상담 경험을 바탕으로, 사주팔자를 깊이 분석하여 의뢰인에게 실질적으로 도움이 되는 따뜻하고 통찰력 있는 글을 작성합니다.\n\n" +
      "## 핵심 원칙\n" +
      "1. 사주 전문용어(일간, 천간, 지지, 비견, 식신, 정관 등)를 절대 그대로 쓰지 마세요. 자연물 비유(물, 불, 나무, 땅, 금속)로 풀어 설명하세요.\n" +
      "2. 구체적 상황 예시를 들어 공감을 이끌어내세요.\n" +
      "3. 각 섹션 끝에 실천 가능한 행동 팁 2~3개를 포함하세요.\n" +
      "4. 문체: 존댓말, 따뜻하고 친근한 톤. 이름을 직접 호명하며 1:1 상담처럼 작성.\n" +
      "5. 금지: 의료/법률/투자 단정, 공포 조장, 과도한 확신, 한자 남발\n" +
      "6. 출력: 반드시 JSON 형식으로만 출력하세요."
    )
    : getI18nSystemPrompt(locale, getCountryByLocale(locale));

  const inputJson = JSON.stringify(input);
  const totalUsage: LlmUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  const sectionPrompts = getSectionPromptsForLocale(locale);
  const sectionChunks = getSectionChunks(locale);

  /** 단일 청크 호출 + 파싱 (1회 시도) */
  const callAndParseChunk = async (
    chunk: Array<{ key: string; title: string }>
  ): Promise<{ sections: Array<{ key: string; title: string; text: string }>; usage?: LlmUsage; durationMs: number }> => {
    const sec1 = chunk[0];
    const sec2 = chunk[1];
    const guide1 = sectionPrompts[sec1.title] ?? "";
    const guide2 = sectionPrompts[sec2.title] ?? "";

    const userPrompt = locale === "ko"
      ? (
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
        `{"sections":[{"key":"${sec1.key}","title":"${sec1.title}","text":"본문..."},{"key":"${sec2.key}","title":"${sec2.title}","text":"본문..."}]}`
      )
      : (() => {
        const tLang = LANGUAGE_NAMES[locale] ?? "English";
        return (
        `User information: ${inputJson}\n\n` +
        `Based on this person's K-Saju (Korean Four Pillars) reading, write the following 2 sections.\n\n` +
        `## Section 1: "${sec1.title}"\n${guide1}\n\n` +
        `## Section 2: "${sec2.title}"\n${guide2}\n\n` +
        `### Writing Rules\n` +
        `- This is a premium paid report. Write each section with at least 2000 characters.\n` +
        `- Use multiple paragraphs (at least 4-6 per section).\n` +
        `- Use nature metaphors (water, fire, wood, earth, metal) instead of technical jargon.\n` +
        `- Include specific situational examples that create an "ah, that's so me!" feeling.\n` +
        `- End each section with 2-3 actionable tips.\n` +
        `- Use warm, friendly, polite language.\n\n` +
        `IMPORTANT: You are writing for a native ${tLang} reader. Do NOT translate from English — compose original text in ${tLang} using natural grammar, local idioms, and culturally resonant expressions.\n\n` +
        `Output ONLY this JSON format:\n` +
        `{"sections":[{"key":"${sec1.key}","title":"${sec1.title}","text":"content..."},{"key":"${sec2.key}","title":"${sec2.title}","text":"content..."}]}`
        );
      })();

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

    throw new Error(`CHUNK_PARSE_FAILED: ${sec1.key}/${sec2.key} — raw: ${res.text.slice(0, 300)}`);
  };

  /** 청크 호출 + 파싱 실패 시 1회 재시도 */
  const callChunkWithRetry = async (
    chunk: Array<{ key: string; title: string }>
  ): Promise<{ sections: Array<{ key: string; title: string; text: string }>; usage?: LlmUsage; durationMs: number }> => {
    try {
      return await callAndParseChunk(chunk);
    } catch (err) {
      logger.warn(`[chunked] first attempt failed for ${chunk.map(c => c.key).join("/")}`, { error: err });
      try {
        await sleep(1000);
        return await callAndParseChunk(chunk);
      } catch (retryErr) {
        logger.error(`[chunked] retry also failed for ${chunk.map(c => c.key).join("/")}`, { error: retryErr });
        return { sections: [], usage: undefined, durationMs: 0 };
      }
    }
  };

  // 2섹션씩 4번 **병렬** 호출 (Promise.all) + 개별 청크 재시도
  const chunkResults = await Promise.all(sectionChunks.map(callChunkWithRetry));

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

  const validSections = results.filter(
    (s) => s.text && !s.text.includes("(생성 실패)") && s.text.trim().length > 30
  );

  if (validSections.length < results.length) {
    console.warn(`[chunked] filtered out ${results.length - validSections.length} failed sections (${results.length} → ${validSections.length})`);
  }

  const fullText = validSections.map((s) => `${s.title}\n${s.text}`).join("\n");
  const texts = getReportTexts(locale, input.name, validSections.length);

  return {
    reportId: `rep_${orderId}`,
    orderId,
    productCode,
    generatedAt: new Date().toISOString(),
    headline: texts.headline,
    summary: texts.summary,
    sections: validSections,
    recommendations: [],
    disclaimer: texts.disclaimer,
    debugLength: buildLengthInfo("paid", fullText),
    model: llmModel,
    usage: totalUsage,
    totalCostUsd: costUsd,
  };
};
