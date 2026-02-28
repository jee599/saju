import { NextResponse } from 'next/server';
import { prisma } from '@saju/api/db';
import type { FortuneInput, OrderSummary, ReportDetail, ModelReportDetail } from '../../../../lib/types';
import { buildReport } from '../../../../lib/mockEngine';
import { countReportChars } from '../../../../lib/reportLength';

/**
 * 테스트 모드: 결제 확인 후 7개 모델 변형을 병렬 생성.
 * - sonnet-single: Sonnet 4.6, 30000자 × 1회
 * - opus: Opus 4.6, 30000자 × 1회
 * - gpt: GPT-5.2, 30000자 × 1회
 * - gpt-mini-chunked: GPT-5-mini, 3000자 × 10섹션
 * - gemini: Gemini 3.1 Pro, 30000자 × 1회
 * - gemini-flash-chunked: Gemini Flash, 3000자 × 10섹션
 * - haiku-chunked: Haiku 4.5, 3000자 × 10섹션
 */
interface TestVariation {
  key: string;           // DB에 저장될 모델 키
  targetModel: string;   // llmEngine에 전달될 모델명
  strategy: 'single' | 'chunked';
  charTarget?: number;   // single일 때 총 글자수 목표
}

const TEST_VARIATIONS: TestVariation[] = [
  { key: 'sonnet-single', targetModel: 'sonnet', strategy: 'single', charTarget: 30000 },
  { key: 'opus', targetModel: 'opus', strategy: 'single', charTarget: 30000 },
  { key: 'gpt', targetModel: 'gpt', strategy: 'single', charTarget: 30000 },
  { key: 'gpt-mini-chunked', targetModel: 'gpt-mini', strategy: 'chunked' },
  { key: 'gemini', targetModel: 'gemini', strategy: 'single', charTarget: 30000 },
  { key: 'gemini-flash-chunked', targetModel: 'gemini-flash', strategy: 'chunked' },
  { key: 'haiku-chunked', targetModel: 'haiku', strategy: 'chunked' },
];

// Vercel serverless function: 최대 5분 (Pro plan 필요)
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { orderId?: string };
    if (!body?.orderId) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_REQUEST', message: 'orderId가 필요합니다.' } },
        { status: 400 }
      );
    }

    // 1. Find the order with its associated FortuneRequest
    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: { request: true },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: { code: 'ORDER_NOT_FOUND', message: '주문 정보를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    if (order.status !== 'created') {
      return NextResponse.json(
        { ok: false, error: { code: 'ORDER_ALREADY_CONFIRMED', message: '이미 확인된 주문입니다.' } },
        { status: 400 }
      );
    }

    // 2. Build FortuneInput from the stored FortuneRequest
    const input: FortuneInput = {
      name: order.request.name,
      birthDate: order.request.birthDate,
      birthTime: order.request.birthTime ?? undefined,
      gender: order.request.gender as FortuneInput['gender'],
      calendarType: order.request.calendarType as FortuneInput['calendarType'],
    };

    // 3. Update order status to "confirmed"
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'confirmed', confirmedAt: new Date() },
    });

    const orderSummary: OrderSummary = {
      orderId: updatedOrder.id,
      productCode: updatedOrder.productCode as OrderSummary['productCode'],
      amountKrw: updatedOrder.amountKrw,
      status: updatedOrder.status as OrderSummary['status'],
      createdAt: updatedOrder.createdAt.toISOString(),
      confirmedAt: updatedOrder.confirmedAt?.toISOString(),
    };

    // 4. 테스트 모드: 8개 모델 변형 병렬 생성
    let reportsByModel: Record<string, ModelReportDetail> = {};
    let primaryReport: ReportDetail;

    try {
      const { generateSingleModelReport, generateChunkedReport, hasLlmKeys, estimateCostUsd } = await import('../../../../lib/llmEngine');
      if (hasLlmKeys()) {
        const results = await Promise.allSettled(
          TEST_VARIATIONS.map(async (variation) => {
            const startMs = Date.now();

            let report: ModelReportDetail;

            if (variation.strategy === 'chunked') {
              // Chunked: 3000자 × 10 섹션
              const chunkedResult = await generateChunkedReport({
                orderId: order.id,
                input,
                productCode: updatedOrder.productCode as ReportDetail['productCode'],
                targetModel: variation.targetModel,
              });
              report = chunkedResult;
            } else {
              // Single: 30000자 × 1회
              report = await generateSingleModelReport({
                orderId: order.id,
                input,
                productCode: updatedOrder.productCode as ReportDetail['productCode'],
                targetModel: variation.targetModel,
                charTarget: variation.charTarget,
              });
            }

            const durationMs = Date.now() - startMs;
            const charCount = countReportChars(report.sections.map(s => s.text).join('\n'));

            // Calculate cost
            let estimatedCostUsd = 0;
            if (report.usage) {
              const provider = report.model === 'gpt' ? 'openai' : report.model === 'gemini' ? 'google' : 'anthropic';
              const modelNameMap: Record<string, string> = {
                'sonnet-single': 'claude-sonnet-4-6',
                'opus': 'claude-opus-4-6',
                'gpt': 'gpt-5.2',
                'gpt-mini-chunked': 'gpt-5-mini',
                'gemini': 'gemini-3.1-pro-preview',
                'gemini-flash-chunked': 'gemini-3-flash-preview',
                'haiku-chunked': 'claude-haiku-4-5-20251001',
              };
              estimatedCostUsd = estimateCostUsd(provider, modelNameMap[variation.key] ?? 'unknown', report.usage);
            }

            return { key: variation.key, report: { ...report, durationMs, estimatedCostUsd, charCount } };
          })
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            reportsByModel[result.value.key] = result.value.report;
          } else {
            console.error(`[checkout/confirm] Model generation failed:`, result.reason);
          }
        }

        // Primary report = sonnet-single (or first successful)
        primaryReport = reportsByModel['sonnet-single'] ?? reportsByModel['sonnet-chunked'] ?? Object.values(reportsByModel)[0] ?? buildReport(orderSummary, input);
      } else {
        primaryReport = buildReport(orderSummary, input);
      }
    } catch (e) {
      console.error('[checkout/confirm] LLM generation failed, using fallback:', e);
      primaryReport = buildReport(orderSummary, input);
    }

    // 5. Save all reports to the Report table
    const reportEntries = Object.keys(reportsByModel).length > 0
      ? Object.entries(reportsByModel)
      : [['fallback', primaryReport] as const];

    for (const [model, report] of reportEntries) {
      await prisma.report.create({
        data: {
          orderId: order.id,
          model,
          productCode: updatedOrder.productCode,
          tier: 'paid',
          headline: report.headline,
          summary: report.summary,
          sectionsJson: JSON.stringify(report.sections),
          recommendationsJson: JSON.stringify(report.recommendations),
          disclaimer: report.disclaimer,
          generatedAt: new Date(report.generatedAt),
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        order: orderSummary,
        report: primaryReport,
        reportsByModel: Object.keys(reportsByModel).length > 0 ? reportsByModel : undefined,
      },
    });
  } catch (err) {
    console.error('[checkout/confirm]', err);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: '결제 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' } },
      { status: 500 }
    );
  }
}
