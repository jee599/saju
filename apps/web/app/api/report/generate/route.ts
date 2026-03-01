import { NextResponse } from 'next/server';
import { prisma } from '@saju/api/db';
import type { FortuneInput, ReportDetail, ModelReportDetail } from '../../../../lib/types';
import { countReportChars } from '../../../../lib/reportLength';
import { sendReportEmail } from '../../../../lib/sendReportEmail';

/**
 * 단일 모델 리포트 생성 API.
 * POST { orderId, modelKey }
 *
 * 모델 키:
 * - sonnet-single: Sonnet 4.6, 30000자 × 1회
 * - opus: Opus 4.6, 30000자 × 1회
 * - gpt: GPT-5.2, 30000자 × 1회
 * - gpt-mini-chunked: GPT-5-mini, 3000자 × 10섹션
 * - gemini: Gemini 3.1 Pro, 30000자 × 1회
 * - gemini-flash-chunked: Gemini Flash, 3000자 × 10섹션
 * - haiku-chunked: Haiku 4.5, 3000자 × 10섹션
 */

interface ModelConfig {
  targetModel: string;
  strategy: 'single' | 'chunked';
  charTarget?: number;
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'sonnet-single': { targetModel: 'sonnet', strategy: 'single', charTarget: 30000 },
  'opus': { targetModel: 'opus', strategy: 'single', charTarget: 30000 },
  'gpt': { targetModel: 'gpt', strategy: 'single', charTarget: 30000 },
  'gpt-mini-chunked': { targetModel: 'gpt-mini', strategy: 'chunked' },
  'gemini': { targetModel: 'gemini', strategy: 'single', charTarget: 30000 },
  'gemini-flash-chunked': { targetModel: 'gemini-flash', strategy: 'chunked' },
  'haiku-chunked': { targetModel: 'haiku', strategy: 'chunked' },
};

const MODEL_NAME_MAP: Record<string, string> = {
  'sonnet-single': 'claude-sonnet-4-6',
  'opus': 'claude-opus-4-6',
  'gpt': 'gpt-5.2',
  'gpt-mini-chunked': 'gpt-5-mini',
  'gemini': 'gemini-3.1-pro-preview',
  'gemini-flash-chunked': 'gemini-3-flash-preview',
  'haiku-chunked': 'claude-haiku-4-5-20251001',
};

// Vercel serverless: 최대 5분
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { orderId?: string; modelKey?: string };

    if (!body?.orderId || !body?.modelKey) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_REQUEST', message: 'orderId와 modelKey가 필요합니다.' } },
        { status: 400 }
      );
    }

    const config = MODEL_CONFIGS[body.modelKey];
    if (!config) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_MODEL', message: `지원하지 않는 모델: ${body.modelKey}` } },
        { status: 400 }
      );
    }

    // 1. Find order
    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: { request: true },
    });

    if (!order || order.status !== 'confirmed') {
      return NextResponse.json(
        { ok: false, error: { code: 'ORDER_NOT_FOUND', message: '확인된 주문을 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    // 2. 이미 생성된 리포트가 있으면 그대로 반환
    const existing = await prisma.report.findFirst({
      where: { orderId: order.id, model: body.modelKey },
    });

    if (existing) {
      let sections: any[] = [];
      let recommendations: string[] = [];
      try { sections = JSON.parse(existing.sectionsJson); } catch {}
      try { recommendations = JSON.parse(existing.recommendationsJson); } catch {}

      return NextResponse.json({
        ok: true,
        data: {
          modelKey: body.modelKey,
          report: {
            reportId: existing.id,
            orderId: order.id,
            productCode: existing.productCode,
            generatedAt: existing.generatedAt.toISOString(),
            headline: existing.headline,
            summary: existing.summary,
            sections,
            recommendations,
            disclaimer: existing.disclaimer,
            model: existing.model,
            charCount: countReportChars(sections.map((s: any) => s.text ?? '').join('\n')),
          },
          cached: true,
        },
      });
    }

    // 3. Build FortuneInput
    const input: FortuneInput = {
      name: order.request.name,
      birthDate: order.request.birthDate,
      birthTime: order.request.birthTime ?? undefined,
      gender: order.request.gender as FortuneInput['gender'],
      calendarType: order.request.calendarType as FortuneInput['calendarType'],
    };

    // 4. Generate report
    const { generateSingleModelReport, generateChunkedReport, estimateCostUsd } = await import('../../../../lib/llmEngine');

    const startMs = Date.now();
    let report: ModelReportDetail;

    if (config.strategy === 'chunked') {
      report = await generateChunkedReport({
        orderId: order.id,
        input,
        productCode: order.productCode as ReportDetail['productCode'],
        targetModel: config.targetModel,
      });
    } else {
      report = await generateSingleModelReport({
        orderId: order.id,
        input,
        productCode: order.productCode as ReportDetail['productCode'],
        targetModel: config.targetModel,
        charTarget: config.charTarget,
      });
    }

    const durationMs = Date.now() - startMs;
    const charCount = countReportChars(report.sections.map(s => s.text).join('\n'));

    // Calculate cost
    let estimatedCostUsd = 0;
    if (report.usage) {
      const provider = report.model === 'gpt' ? 'openai' : report.model === 'gemini' ? 'google' : 'anthropic';
      estimatedCostUsd = estimateCostUsd(provider, MODEL_NAME_MAP[body.modelKey] ?? 'unknown', report.usage);
    }

    // 5. Save to DB
    await prisma.report.create({
      data: {
        orderId: order.id,
        model: body.modelKey,
        productCode: order.productCode,
        tier: 'paid',
        headline: report.headline,
        summary: report.summary,
        sectionsJson: JSON.stringify(report.sections),
        recommendationsJson: JSON.stringify(report.recommendations),
        disclaimer: report.disclaimer,
        generatedAt: new Date(report.generatedAt),
      },
    });

    // 6. 이메일 발송 (첫 리포트 생성 시에만)
    if (order.email && !order.emailSentAt) {
      const reportUrl = `https://fortunelab.store/report/${order.id}`;
      sendReportEmail({
        to: order.email,
        userName: input.name,
        headline: report.headline,
        summary: report.summary,
        sections: report.sections,
        recommendations: report.recommendations,
        disclaimer: report.disclaimer,
        reportUrl,
      })
        .then(async (result) => {
          if (result.success) {
            await prisma.order.update({
              where: { id: order.id },
              data: { emailSentAt: new Date() },
            }).catch(() => {});
          }
        })
        .catch((err) => console.error("[report/generate] Email error:", err));
    }

    return NextResponse.json({
      ok: true,
      data: {
        modelKey: body.modelKey,
        report: {
          ...report,
          durationMs,
          estimatedCostUsd,
          charCount,
        },
        cached: false,
      },
    });
  } catch (err) {
    console.error('[report/generate]', err);
    return NextResponse.json(
      { ok: false, error: { code: 'GENERATION_FAILED', message: err instanceof Error ? err.message : '리포트 생성 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
