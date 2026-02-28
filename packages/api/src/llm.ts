import type { ReportModel } from "../../shared/src/index.ts";

export type LlmUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type LlmResult = {
  text: string;
  usage?: LlmUsage;
};

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const callLlm = async (params: {
  model: ReportModel;
  system: string;
  user: string;
  maxTokens: number;
  temperature?: number;
}): Promise<LlmResult> => {
  const { model, system, user, maxTokens, temperature = 0.7 } = params;

  if (model === "gpt") {
    const apiKey = requireEnv("OPENAI_API_KEY");
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        temperature,
        max_completion_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(`OpenAI error: ${resp.status} ${resp.statusText} ${errText}`);
    }

    const json = (await resp.json()) as any;
    const text = json?.choices?.[0]?.message?.content;
    const usage = json?.usage
      ? {
          inputTokens: json.usage.prompt_tokens,
          outputTokens: json.usage.completion_tokens,
          totalTokens: json.usage.total_tokens
        }
      : undefined;

    if (typeof text !== "string") {
      throw new Error("OpenAI: missing response text");
    }

    return { text, usage };
  }

  if (model === "claude") {
    const apiKey = requireEnv("ANTHROPIC_API_KEY");
    const anthropicModel = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022";

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: anthropicModel,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: "user", content: user }]
      })
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(`Anthropic error: ${resp.status} ${resp.statusText} ${errText}`);
    }

    const json = (await resp.json()) as any;
    const text = json?.content?.[0]?.text;
    const usage = json?.usage
      ? {
          inputTokens: json.usage.input_tokens,
          outputTokens: json.usage.output_tokens,
          totalTokens:
            typeof json.usage.input_tokens === "number" && typeof json.usage.output_tokens === "number"
              ? json.usage.input_tokens + json.usage.output_tokens
              : undefined
        }
      : undefined;

    if (typeof text !== "string") {
      throw new Error("Anthropic: missing response text");
    }

    return { text, usage };
  }

  if (model === "gemini") {
    const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing environment variable: GOOGLE_API_KEY (or GEMINI_API_KEY)");
    }
    const geminiModel = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature, maxOutputTokens: maxTokens }
        })
      }
    );

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(`Gemini error: ${resp.status} ${resp.statusText} ${errText}`);
    }

    const json = (await resp.json()) as any;
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    const meta = json?.usageMetadata;
    const usage = meta
      ? {
          inputTokens: meta.promptTokenCount,
          outputTokens: meta.candidatesTokenCount,
          totalTokens: meta.totalTokenCount
        }
      : undefined;

    if (typeof text !== "string") {
      throw new Error("Gemini: missing response text");
    }

    return { text, usage };
  }

  throw new Error(`Unknown model: ${model satisfies never}`);
};
