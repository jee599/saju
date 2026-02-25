#!/usr/bin/env npx tsx
/**
 * LLM 멀티모델 비교 러너 (로컬 테스트 전용)
 *
 * Provider별 다중 모델 지원:
 *   OPENAI_MODELS=gpt-5.3,gpt-4.1-mini
 *   ANTHROPIC_MODELS=claude-sonnet-4-6,claude-haiku-4-5-20251001
 *   GEMINI_MODELS=gemini-2.0-flash
 *
 * 실행: pnpm compare:llm
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

// ── Paths ─────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

// ── Minimal .env loader (no deps) ─────────────────────────
const loadEnv = () => {
  try {
    const content = readFileSync(join(ROOT, ".env"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* .env not found – rely on shell env */
  }
};
loadEnv();

// ── Types ─────────────────────────────────────────────────
type Provider = "openai" | "anthropic" | "gemini";
type Usage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};
type Result = {
  text: string;
  usage?: Usage;
  durationMs: number;
  error?: boolean;
};
type ModelEntry = {
  provider: Provider;
  model: string;
  slug: string;
};

// ── Model parsing from env ────────────────────────────────
const DEFAULTS: Record<Provider, string> = {
  openai: "gpt-5.3,gpt-4.1-mini",
  anthropic: "claude-sonnet-4-6,claude-haiku-4-5-20251001",
  gemini: "gemini-2.0-flash",
};

const sanitizeSlug = (s: string): string =>
  s.replace(/[^a-zA-Z0-9.\-]/g, "-");

const parseModels = (): ModelEntry[] => {
  const entries: ModelEntry[] = [];

  const parse = (provider: Provider, envKey: string) => {
    const raw = process.env[envKey] ?? DEFAULTS[provider];
    const models = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const model of models) {
      // OpenAI models (gpt-*) get "openai-" prefix; Claude/Gemini already self-prefixed
      const prefix = provider === "openai" ? "openai-" : "";
      entries.push({
        provider,
        model,
        slug: sanitizeSlug(prefix + model),
      });
    }
  };

  parse("openai", "OPENAI_MODELS");
  parse("anthropic", "ANTHROPIC_MODELS");
  parse("gemini", "GEMINI_MODELS");
  return entries;
};

// ── Known costs (per 1M tokens, USD) ──────────────────────
const KNOWN_COSTS: Record<string, { in: number; out: number }> = {
  // OpenAI
  "gpt-5.3": { in: 2.0, out: 8.0 },
  "gpt-5.3-mini": { in: 0.3, out: 1.2 },
  "gpt-4.1": { in: 2.0, out: 8.0 },
  "gpt-4.1-mini": { in: 0.4, out: 1.6 },
  "gpt-4o": { in: 2.5, out: 10.0 },
  // Anthropic
  "claude-sonnet-4-6": { in: 3.0, out: 15.0 },
  "claude-haiku-4-5-20251001": { in: 0.8, out: 4.0 },
  "claude-opus-4-6": { in: 15.0, out: 75.0 },
  // Gemini
  "gemini-2.0-flash": { in: 0.1, out: 0.4 },
  "gemini-2.5-flash": { in: 0.15, out: 0.6 },
  "gemini-1.5-pro": { in: 1.25, out: 5.0 },
  "gemini-2.0-pro": { in: 1.25, out: 5.0 },
};
const FALLBACK_COST = { in: 1.0, out: 5.0 };

const MAX_TOKENS = 4000;
const CACHE_DIR = join(ROOT, "inbox", "llm-compare", ".cache");

// ── Saju engine integration ─────────────────────────────
import { calculateFourPillars } from "../packages/engine/saju/src/index";
import { SYSTEM_PROMPT_V2, buildUserPromptV2 } from "../packages/api/src/reportPrompt";

// ── Fixed test input ──────────────────────────────────────
const INPUT = {
  name: "테스트",
  birthDate: "1990-05-15",
  birthTime: "14:30",
  gender: "male" as const,
  calendarType: "solar" as const,
};

// ── Prompt v2 (saju engine output → LLM) ─────────────────
const buildPrompt = () => {
  // Calculate four pillars from engine
  const sajuResult = calculateFourPillars({
    year: 1990, month: 5, day: 15, hour: 14, minute: 30,
  });

  const system = SYSTEM_PROMPT_V2;
  const user = buildUserPromptV2({
    input: INPUT,
    saju: sajuResult,
    productCode: "standard",
  });

  console.log(`🔮 사주 엔진 결과: ${sajuResult.pillars.year.fullKr} ${sajuResult.pillars.month.fullKr} ${sajuResult.pillars.day.fullKr} ${sajuResult.pillars.hour.fullKr}`);

  return { system, user };
};

// ── Env helpers ───────────────────────────────────────────
const getKey = (
  key: string,
  alt: string | null,
  label: string
): string | null => {
  const val = process.env[key] || (alt ? process.env[alt] : undefined);
  if (!val || val.startsWith("your_")) {
    console.warn(`⚠️  ${label} API 키 미설정 — 해당 모델 건너뜀`);
    return null;
  }
  return val;
};

// ── Cache (slug + prompt hash) ────────────────────────────
const cacheHash = (slug: string, sys: string, usr: string) =>
  createHash("sha256")
    .update(JSON.stringify({ slug, sys, usr }))
    .digest("hex")
    .slice(0, 16);

const readCache = (key: string): Result | null => {
  const p = join(CACHE_DIR, `${key}.json`);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
};

const writeCache = (key: string, r: Result) => {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify(r, null, 2));
};

// ── API callers (model passed as param) ───────────────────

const callOpenAI = async (
  model: string,
  sys: string,
  usr: string,
  max: number
): Promise<Result> => {
  const apiKey = getKey("OPENAI_API_KEY", null, "OpenAI");
  if (!apiKey) throw new Error("OPENAI_API_KEY 미설정");
  const t = Date.now();
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: max,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: usr },
      ],
    }),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => "");
    if (
      r.status === 404 &&
      (err.includes("model") || err.includes("not_found"))
    ) {
      throw new Error(
        `OpenAI: 모델 '${model}' 을 찾을 수 없습니다.\n` +
          `     사용 가능 모델: https://platform.openai.com/docs/models\n` +
          `     .env의 OPENAI_MODELS 값을 확인하세요.`
      );
    }
    throw new Error(`OpenAI ${r.status}: ${err.slice(0, 200)}`);
  }
  const j = (await r.json()) as any;
  const text = j?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("OpenAI: no text in response");
  return {
    text,
    durationMs: Date.now() - t,
    usage: j.usage
      ? {
          inputTokens: j.usage.prompt_tokens,
          outputTokens: j.usage.completion_tokens,
          totalTokens: j.usage.total_tokens,
        }
      : undefined,
  };
};

const callAnthropic = async (
  model: string,
  sys: string,
  usr: string,
  max: number
): Promise<Result> => {
  const apiKey = getKey("ANTHROPIC_API_KEY", null, "Anthropic");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 미설정");
  const t = Date.now();
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: max,
      temperature: 0.7,
      system: sys,
      messages: [{ role: "user", content: usr }],
    }),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => "");
    throw new Error(`Anthropic ${r.status}: ${err.slice(0, 200)}`);
  }
  const j = (await r.json()) as any;
  const text = j?.content?.[0]?.text;
  if (typeof text !== "string")
    throw new Error("Anthropic: no text in response");
  return {
    text,
    durationMs: Date.now() - t,
    usage: j.usage
      ? {
          inputTokens: j.usage.input_tokens,
          outputTokens: j.usage.output_tokens,
          totalTokens:
            (j.usage.input_tokens ?? 0) + (j.usage.output_tokens ?? 0),
        }
      : undefined,
  };
};

const callGemini = async (
  model: string,
  sys: string,
  usr: string,
  max: number
): Promise<Result> => {
  const apiKey = getKey("GOOGLE_API_KEY", "GEMINI_API_KEY", "Google Gemini");
  if (!apiKey) throw new Error("GOOGLE_API_KEY / GEMINI_API_KEY 미설정");
  const t = Date.now();
  // API key in URL param (Google AI Studio standard) – never logged in errors
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sys }] },
      contents: [{ role: "user", parts: [{ text: usr }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: max },
    }),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => "");
    if (r.status === 429) {
      throw new Error(
        `Gemini 429 (쿼터 초과): 모델 '${model}'\n` +
          `     → Google AI Studio 결제/쿼터 확인: https://aistudio.google.com/app/apikey\n` +
          `     → 무료 티어 한도 초과 시 Billing 활성화 필요\n` +
          `     다른 모델 결과는 정상 저장됩니다.`
      );
    }
    throw new Error(`Gemini ${r.status}: ${err.slice(0, 200)}`);
  }
  const j = (await r.json()) as any;
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new Error("Gemini: no text in response");
  const m = j?.usageMetadata;
  return {
    text,
    durationMs: Date.now() - t,
    usage: m
      ? {
          inputTokens: m.promptTokenCount,
          outputTokens: m.candidatesTokenCount,
          totalTokens: m.totalTokenCount,
        }
      : undefined,
  };
};

const CALLERS: Record<
  Provider,
  (model: string, sys: string, usr: string, max: number) => Promise<Result>
> = {
  openai: callOpenAI,
  anthropic: callAnthropic,
  gemini: callGemini,
};

// ── Cost estimate ─────────────────────────────────────────
const estCost = (model: string, u?: Usage): string => {
  if (!u?.inputTokens || !u?.outputTokens) return "N/A";
  const c = KNOWN_COSTS[model] ?? FALLBACK_COST;
  return `$${((u.inputTokens * c.in + u.outputTokens * c.out) / 1e6).toFixed(4)}`;
};

// ── Main ──────────────────────────────────────────────────
const main = async () => {
  const entries = parseModels();

  console.log(`🔄 LLM 멀티모델 비교 러너 (${entries.length}개 모델)\n`);
  console.log("모델 목록:");
  for (const e of entries)
    console.log(`  [${e.provider}] ${e.model} → ${e.slug}.md`);

  const { system, user } = buildPrompt();
  console.log(`\n입력: ${JSON.stringify(INPUT)}`);
  console.log(
    `프롬프트: system=${system.length}자, user=${user.length}자, max_tokens=${MAX_TOKENS}\n`
  );

  const results: Map<string, Result> = new Map();

  // ── Check which provider keys are available ──
  const keyStatus: Record<Provider, boolean> = {
    openai: Boolean(
      process.env.OPENAI_API_KEY &&
        !process.env.OPENAI_API_KEY.startsWith("your_")
    ),
    anthropic: Boolean(
      process.env.ANTHROPIC_API_KEY &&
        !process.env.ANTHROPIC_API_KEY.startsWith("your_")
    ),
    gemini: Boolean(
      (process.env.GOOGLE_API_KEY &&
        !process.env.GOOGLE_API_KEY.startsWith("your_")) ||
        (process.env.GEMINI_API_KEY &&
          !process.env.GEMINI_API_KEY.startsWith("your_"))
    ),
  };

  // Filter to entries with available keys
  const runnable = entries.filter((e) => {
    if (!keyStatus[e.provider]) {
      console.warn(`⚠️  ${e.slug}: ${e.provider} API 키 미설정 — 건너뜀`);
      return false;
    }
    return true;
  });

  if (runnable.length === 0) {
    console.error(
      "\n❌ 실행 가능한 모델이 없습니다. .env에 최소 1개 API 키를 설정하세요."
    );
    console.error("   참고: .env.example\n");
    process.exit(1);
  }

  // ── Cache check ──
  const uncached: ModelEntry[] = [];
  for (const e of runnable) {
    const key = cacheHash(e.slug, system, user);
    const cached = readCache(key);
    if (cached && !cached.error) {
      console.log(`✅ ${e.slug}: 캐시 히트`);
      results.set(e.slug, cached);
    } else {
      uncached.push(e);
    }
  }

  // ── Parallel API calls (uncached only) ──
  if (uncached.length > 0) {
    console.log(`\n🌐 API 호출 (${uncached.length}개):`);
    await Promise.all(
      uncached.map(async (e) => {
        try {
          console.log(`  ⏳ ${e.slug}...`);
          const r = await CALLERS[e.provider](
            e.model,
            system,
            user,
            MAX_TOKENS
          );
          writeCache(cacheHash(e.slug, system, user), r);
          results.set(e.slug, r);
          console.log(
            `  ✅ ${e.slug} (${r.durationMs}ms, ${r.usage?.totalTokens ?? "?"}tok)`
          );
        } catch (err: any) {
          console.error(`  ❌ ${e.slug}: ${err.message}`);
          results.set(e.slug, {
            text: `[ERROR] ${err.message}`,
            durationMs: 0,
            error: true,
          });
        }
      })
    );
  }

  // ── Save results ──
  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const dir = join(ROOT, "inbox", "llm-compare", ts);
  mkdirSync(dir, { recursive: true });

  writeFileSync(join(dir, "input.json"), JSON.stringify(INPUT, null, 2));
  writeFileSync(
    join(dir, "prompt.txt"),
    `=== SYSTEM ===\n${system}\n\n=== USER ===\n${user}`
  );

  for (const e of runnable) {
    const r = results.get(e.slug);
    if (r) writeFileSync(join(dir, `${e.slug}.md`), r.text);
  }

  // ── Summary JSON ──
  let totalCost = 0;
  const modelResults = runnable.map((e) => {
    const r = results.get(e.slug);
    const cost = estCost(e.model, r?.usage);
    if (cost !== "N/A") totalCost += parseFloat(cost.slice(1));
    return {
      slug: e.slug,
      provider: e.provider,
      model: e.model,
      usage: r?.usage ?? null,
      durationMs: r?.durationMs ?? 0,
      outputChars: r?.text.length ?? 0,
      estimatedCost: cost,
      status: r?.error ? "error" : "success",
    };
  });

  // Also list skipped models
  const skipped = entries
    .filter((e) => !keyStatus[e.provider])
    .map((e) => ({ slug: e.slug, provider: e.provider, model: e.model, reason: "API key missing" }));

  const summary = {
    timestamp: new Date().toISOString(),
    input: INPUT,
    maxTokens: MAX_TOKENS,
    modelCount: runnable.length,
    results: modelResults,
    skipped,
    totalEstimatedCost: `$${totalCost.toFixed(4)}`,
  };
  writeFileSync(join(dir, "summary.json"), JSON.stringify(summary, null, 2));

  // ── Print table ──
  const W = { slug: 32, tok: 9, ms: 8, cost: 10 };
  const lineW = W.slug + W.tok * 3 + W.ms + W.cost + 4;
  console.log("\n" + "=".repeat(lineW));
  console.log("📊 결과 요약");
  console.log("=".repeat(lineW));
  console.log(
    "모델".padEnd(W.slug) +
      "입력tok".padEnd(W.tok) +
      "출력tok".padEnd(W.tok) +
      "총tok".padEnd(W.tok) +
      "ms".padEnd(W.ms) +
      "비용".padEnd(W.cost) +
      "상태"
  );
  console.log("-".repeat(lineW));

  for (const m of modelResults) {
    console.log(
      m.slug.padEnd(W.slug) +
        String(m.usage?.inputTokens ?? "-").padEnd(W.tok) +
        String(m.usage?.outputTokens ?? "-").padEnd(W.tok) +
        String(m.usage?.totalTokens ?? "-").padEnd(W.tok) +
        String(m.durationMs).padEnd(W.ms) +
        m.estimatedCost.padEnd(W.cost) +
        (m.status === "success" ? "✅" : "❌")
    );
  }

  if (skipped.length > 0) {
    for (const s of skipped) {
      console.log(
        s.slug.padEnd(W.slug) +
          "-".padEnd(W.tok) +
          "-".padEnd(W.tok) +
          "-".padEnd(W.tok) +
          "-".padEnd(W.ms) +
          "-".padEnd(W.cost) +
          "⏭️ skip"
      );
    }
  }

  console.log("-".repeat(lineW));
  console.log(`합계 예상 비용: ${summary.totalEstimatedCost}`);

  console.log(`\n📁 결과 저장: ${dir}`);
  const files = runnable.map((e) => `${e.slug}.md`).join(", ");
  console.log(`   input.json, prompt.txt, ${files}, summary.json\n`);
};

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
