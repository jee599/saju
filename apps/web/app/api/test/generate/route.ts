import { NextResponse } from "next/server";
import { generateSingleModelReport, generateChunkedReport, estimateCostUsd, hasLlmKeys, hasGeminiKey } from "../../../../lib/llmEngine";
import type { FortuneInput, ProductCode } from "../../../../lib/types";

/**
 * POST /api/test/generate
 * Test-only endpoint: generates a report using one of 6 strategies.
 *
 * Body: {
 *   strategy: 1-6,
 *   input: FortuneInput
 * }
 *
 * Strategies:
 *   1: Sonnet 4.6   — 3,000자 × 10 requests (chunked)
 *   2: Sonnet 4.6   — 30,000자 one shot
 *   3: Opus 4.6     — 30,000자 one shot
 *   4: GPT (env)    — 30,000자 one shot
 *   5: Gemini 3.1 Pro — 30,000자 one shot
 *   6: Gemini Flash  — 3,000자 × 10 requests (chunked)
 */

const STRATEGY_META: Record<number, { label: string; model: string; mode: "oneshot" | "chunked" }> = {
  1: { label: "Sonnet 4.6 · 3,000자×10 청크", model: "sonnet", mode: "chunked" },
  2: { label: "Sonnet 4.6 · 30,000자 원샷", model: "sonnet", mode: "oneshot" },
  3: { label: "Opus 4.6 · 30,000자 원샷", model: "opus", mode: "oneshot" },
  4: { label: "GPT 5.2 · 30,000자 원샷", model: "gpt", mode: "oneshot" },
  5: { label: "Gemini 3.1 Pro · 30,000자 원샷", model: "gemini", mode: "oneshot" },
  6: { label: "Gemini Flash · 3,000자×10 청크", model: "gemini-flash", mode: "chunked" },
  7: { label: "Haiku 4.5 · 3,000자×10 청크", model: "haiku", mode: "chunked" },
};

export async function POST(req: Request) {
  try {
    // Block in production
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_AVAILABLE", message: "이 엔드포인트는 개발 환경에서만 사용할 수 있습니다." } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const strategy = Number(body.strategy);
    const input = body.input as FortuneInput;

    if (!strategy || strategy < 1 || strategy > 7) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_STRATEGY", message: "strategy는 1~7 사이 값이어야 합니다." } },
        { status: 400 }
      );
    }

    if (!input?.name || !input?.birthDate) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_INPUT", message: "name, birthDate 필수" } },
        { status: 400 }
      );
    }

    const meta = STRATEGY_META[strategy]!;

    // Check API keys
    if ((strategy <= 3 || strategy === 7) && !hasLlmKeys()) {
      return NextResponse.json(
        { ok: false, error: { code: "NO_KEYS", message: "ANTHROPIC_API_KEY 없음" } },
        { status: 500 }
      );
    }
    if (strategy === 4 && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: { code: "NO_KEYS", message: "OPENAI_API_KEY 없음" } },
        { status: 500 }
      );
    }
    if ((strategy === 5 || strategy === 6) && !hasGeminiKey()) {
      return NextResponse.json(
        { ok: false, error: { code: "NO_KEYS", message: "GOOGLE_API_KEY 없음" } },
        { status: 500 }
      );
    }

    const orderId = `test_${Date.now().toString(36)}`;
    const productCode: ProductCode = "full";
    const startMs = Date.now();

    let report;
    if (meta.mode === "chunked") {
      report = await generateChunkedReport({ orderId, input, productCode, targetModel: meta.model });
    } else {
      report = await generateSingleModelReport({ orderId, input, productCode, targetModel: meta.model, charTarget: 30000 });
    }

    const durationMs = Date.now() - startMs;
    const totalChars = report.sections.map((s) => s.text).join("").length;

    // Calculate cost
    const provider = meta.model === "gpt" ? "openai" : meta.model.startsWith("gemini") ? "google" : "anthropic";
    const modelName =
      meta.model === "gpt" ? (process.env.OPENAI_MODEL ?? "gpt-5.2") :
      meta.model === "gemini" ? "gemini-3.1-pro-preview" :
      meta.model === "gemini-flash" ? "gemini-3-flash-preview" :
      meta.model === "opus" ? "claude-opus-4-6" :
      meta.model === "haiku" ? "claude-haiku-4-5-20251001" :
      (process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6");

    const costUsd = report.usage ? estimateCostUsd(provider, modelName, report.usage) : 0;

    return NextResponse.json({
      ok: true,
      data: {
        strategy,
        label: meta.label,
        modelName,
        mode: meta.mode,
        totalChars,
        durationMs,
        costUsd: Math.round(costUsd * 10000) / 10000,
        usage: report.usage,
        report,
      },
    });
  } catch (err) {
    console.error("[test/generate]", err);
    return NextResponse.json(
      { ok: false, error: { code: "GENERATION_FAILED", message: err instanceof Error ? err.message : "생성 실패" } },
      { status: 500 }
    );
  }
}
