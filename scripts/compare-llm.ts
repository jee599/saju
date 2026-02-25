#!/usr/bin/env tsx
/**
 * LLM 8-model comparison runner.
 *
 * 8개 모델에 동일한 프롬프트를 보내고 품질/비용/속도를 비교합니다.
 * 최적화: JSON mode, 프롬프트 캐싱 적용.
 *
 * Usage:
 *   pnpm tsx scripts/compare-llm.ts
 *
 * 필요 환경변수: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY
 * (.env 파일에서 자동 로드)
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env — try multiple paths to find the root .env
const scriptDir = import.meta.dirname ?? __dirname;
const candidates = [
  resolve(scriptDir, "../.env"),
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
];
for (const p of candidates) {
  config({ path: p, override: true });
}

// ── Model definitions ─────────────────────────────────────

type Provider = "openai" | "anthropic" | "google";

interface ModelDef {
  id: string;
  provider: Provider;
  modelName: string;
  costPer1kInput: number;  // USD per 1K input tokens
  costPer1kOutput: number; // USD per 1K output tokens
}

const MODELS: ModelDef[] = [
  // OpenAI — GPT-5 + GPT-4.1 (prices per 1K tokens = per 1M / 1000)
  { id: "gpt-5-mini",    provider: "openai",    modelName: "gpt-5-mini",    costPer1kInput: 0.00025,  costPer1kOutput: 0.002 },
  { id: "gpt-5-nano",    provider: "openai",    modelName: "gpt-5-nano",    costPer1kInput: 0.00005,  costPer1kOutput: 0.0004 },
  { id: "gpt-4.1-mini",  provider: "openai",    modelName: "gpt-4.1-mini",  costPer1kInput: 0.0004,   costPer1kOutput: 0.0016 },
  { id: "gpt-4.1-nano",  provider: "openai",    modelName: "gpt-4.1-nano",  costPer1kInput: 0.0001,   costPer1kOutput: 0.0004 },
  // Anthropic — Claude 4.6 / 4.5
  { id: "claude-sonnet-4-6",  provider: "anthropic", modelName: "claude-sonnet-4-6",         costPer1kInput: 0.003,  costPer1kOutput: 0.015 },
  { id: "claude-haiku-4-5",   provider: "anthropic", modelName: "claude-haiku-4-5-20251001",  costPer1kInput: 0.001,  costPer1kOutput: 0.005 },
  // Google — Gemini 2.5 stable (2.0 deprecated Jun 2026)
  { id: "gemini-2.5-flash",      provider: "google", modelName: "gemini-2.5-flash",       costPer1kInput: 0.00015, costPer1kOutput: 0.0006 },
  { id: "gemini-2.5-flash-lite", provider: "google", modelName: "gemini-2.5-flash-lite",  costPer1kInput: 0.0001,  costPer1kOutput: 0.0004 },
];

// ── Provider callers ──────────────────────────────────────

type CallResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  cacheHit?: boolean;
};

async function callOpenAI(modelName: string, system: string, user: string, maxTokens: number): Promise<CallResult> {
  // GPT-5+ uses max_completion_tokens and temperature=1 only
  const isGpt5 = modelName.startsWith("gpt-5");
  const tokenParam = isGpt5
    ? { max_completion_tokens: maxTokens }
    : { max_tokens: maxTokens };

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: modelName, temperature: isGpt5 ? 1 : 0.7, ...tokenParam,
      // JSON mode — forces valid JSON, saves tokens from markdown wrapping
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI ${modelName}: ${resp.status} ${await resp.text()}`);
  const json = await resp.json() as any;
  return {
    text: json.choices[0].message.content,
    inputTokens: json.usage?.prompt_tokens ?? 0,
    outputTokens: json.usage?.completion_tokens ?? 0,
  };
}

async function callAnthropic(modelName: string, system: string, user: string, maxTokens: number): Promise<CallResult> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      // Enable prompt caching — caches system prompt across requests
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: maxTokens,
      temperature: 0.7,
      // Prompt caching: mark system prompt as cacheable
      system: [
        {
          type: "text",
          text: system,
          cache_control: { type: "ephemeral" },
        }
      ],
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!resp.ok) throw new Error(`Anthropic ${modelName}: ${resp.status} ${await resp.text()}`);
  const json = await resp.json() as any;
  const cacheRead = json.usage?.cache_read_input_tokens ?? 0;
  return {
    text: json.content[0].text,
    inputTokens: json.usage?.input_tokens ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
    cacheHit: cacheRead > 0,
  };
}

async function callGoogle(modelName: string, system: string, user: string, maxTokens: number): Promise<CallResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: maxTokens,
          // JSON mode — forces valid JSON output
          responseMimeType: "application/json",
        },
      }),
    }
  );
  if (!resp.ok) throw new Error(`Gemini ${modelName}: ${resp.status} ${await resp.text()}`);
  const json = await resp.json() as any;
  const meta = json.usageMetadata;
  return {
    text: json.candidates[0].content.parts[0].text,
    inputTokens: meta?.promptTokenCount ?? 0,
    outputTokens: meta?.candidatesTokenCount ?? 0,
  };
}

async function callModel(def: ModelDef, system: string, user: string, maxTokens: number): Promise<CallResult> {
  if (def.provider === "openai") return callOpenAI(def.modelName, system, user, maxTokens);
  if (def.provider === "anthropic") return callAnthropic(def.modelName, system, user, maxTokens);
  return callGoogle(def.modelName, system, user, maxTokens);
}

// ── Test prompt (간단한 무료 프리뷰용) ────────────────────

const SYSTEM = `역할: 한국 사주(四柱) 전문 리포트 작성자.
규칙: 존댓말, 확률 표현만 사용, 단정 금지, 공포 금지.
출력: JSON만 출력 (추가 텍스트/마크다운 금지)
{"headline":string,"summary":string,"sections":[{"key":"성격","title":"성격","text":string},{"key":"직업","title":"직업","text":string}],"recommendations":string[],"disclaimer":string}`;

const USER = `사용자: {"name":"김서준","birthDate":"1990-05-15","gender":"male","calendarType":"solar"}
상품: standard
간단한 무료 프리뷰 수준(2개 섹션만)으로 작성해 주세요.`;

// ── Main ──────────────────────────────────────────────────

type CompareResult = {
  model: string;
  provider: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  charCount: number;
  estimatedCostUsd: number;
  jsonValid: boolean;
  cacheHit?: boolean;
  error?: string;
};

async function main() {
  console.log("=== LLM 8-Model Comparison (w/ JSON mode + prompt caching) ===\n");

  const results: CompareResult[] = [];

  for (const def of MODELS) {
    const envKey = def.provider === "openai" ? "OPENAI_API_KEY"
      : def.provider === "anthropic" ? "ANTHROPIC_API_KEY"
      : "GOOGLE_API_KEY";

    if (!process.env[envKey]) {
      console.log(`⏭️  ${def.id} — skipped (no ${envKey})`);
      results.push({
        model: def.id, provider: def.provider,
        durationMs: 0, inputTokens: 0, outputTokens: 0,
        charCount: 0, estimatedCostUsd: 0, jsonValid: false,
        error: `Missing ${envKey}`,
      });
      continue;
    }

    process.stdout.write(`🔄 ${def.id}... `);
    const start = Date.now();

    try {
      const result = await callModel(def, SYSTEM, USER, 2000);
      const durationMs = Date.now() - start;

      let jsonValid = false;
      try {
        const parsed = JSON.parse(result.text);
        jsonValid = !!(parsed.headline && parsed.sections);
      } catch { /* not valid JSON */ }

      const costUsd =
        (result.inputTokens / 1000) * def.costPer1kInput +
        (result.outputTokens / 1000) * def.costPer1kOutput;

      const entry: CompareResult = {
        model: def.id, provider: def.provider,
        durationMs, inputTokens: result.inputTokens, outputTokens: result.outputTokens,
        charCount: result.text.length, estimatedCostUsd: costUsd,
        jsonValid, cacheHit: result.cacheHit,
      };
      results.push(entry);

      const cacheTag = result.cacheHit ? " [CACHE]" : "";
      console.log(
        `✅ ${durationMs}ms | ${result.inputTokens}+${result.outputTokens} tok | ` +
        `${result.text.length}자 | $${costUsd.toFixed(6)} | JSON:${jsonValid ? "OK" : "FAIL"}${cacheTag}`
      );
    } catch (err: any) {
      const durationMs = Date.now() - start;
      console.log(`❌ ${durationMs}ms | ${err.message?.slice(0, 80)}`);
      results.push({
        model: def.id, provider: def.provider,
        durationMs, inputTokens: 0, outputTokens: 0,
        charCount: 0, estimatedCostUsd: 0, jsonValid: false,
        error: err.message?.slice(0, 120),
      });
    }
  }

  // ── Summary ──────────────────────────────────────────────
  console.log("\n=== Summary ===\n");
  console.log(
    "Model".padEnd(30) +
    "Time(ms)".padStart(10) +
    "In-tok".padStart(10) +
    "Out-tok".padStart(10) +
    "Chars".padStart(8) +
    "Cost($)".padStart(12) +
    "JSON".padStart(6)
  );
  console.log("-".repeat(86));

  for (const r of results) {
    if (r.error) {
      console.log(`${r.model.padEnd(30)}${"SKIP/ERR".padStart(10)}  ${r.error}`);
    } else {
      console.log(
        r.model.padEnd(30) +
        String(r.durationMs).padStart(10) +
        String(r.inputTokens).padStart(10) +
        String(r.outputTokens).padStart(10) +
        String(r.charCount).padStart(8) +
        `$${r.estimatedCostUsd.toFixed(6)}`.padStart(12) +
        (r.jsonValid ? "  ✅" : "  ❌").padStart(6)
      );
    }
  }

  // ── Recommendation ───────────────────────────────────────
  const valid = results.filter(r => r.jsonValid && !r.error);
  if (valid.length > 0) {
    const cheapest = valid.reduce((a, b) => a.estimatedCostUsd < b.estimatedCostUsd ? a : b);
    const fastest = valid.reduce((a, b) => a.durationMs < b.durationMs ? a : b);
    const longest = valid.reduce((a, b) => a.charCount > b.charCount ? a : b);

    console.log("\n📊 Recommendation:");
    console.log(`  💰 Cheapest: ${cheapest.model} ($${cheapest.estimatedCostUsd.toFixed(6)}/req)`);
    console.log(`  ⚡ Fastest:  ${fastest.model} (${fastest.durationMs}ms)`);
    console.log(`  📝 Longest:  ${longest.model} (${longest.charCount}자)`);
  }
}

main().catch(console.error);
