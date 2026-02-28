import { NextResponse } from 'next/server';
import { prisma } from '@saju/api/db';
import type { FortuneInput, OrderSummary, ReportDetail, ModelReportDetail } from '../../../../lib/types';
import { buildReport } from '../../../../lib/mockEngine';
import { countReportChars } from '../../../../lib/reportLength';

/**
 * 테스트 모드: 결제 확인 후 모든 모델(gpt, sonnet, opus)을 병렬 생성.
 * 각 모델별 소요시간, 비용, 글자수를 비교할 수 있도록 반환.
 * 나중에 원복 시 단일 모델로 변경.
 */
const TEST_MODELS = ['gpt', 'sonnet', 'opus'] as const;

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

    // 4. 테스트 모드: 모든 모델 병렬 생성
    let reportsByModel: Record<string, ModelReportDetail> = {};
    let primaryReport: ReportDetail;

    try {
      const { generateSingleModelReport, hasLlmKeys, estimateCostUsd } = await import('../../../../lib/llmEngine');
      if (hasLlmKeys()) {
        const results = await Promise.allSettled(
          TEST_MODELS.map(async (model) => {
            const startMs = Date.now();
            const report = await generateSingleModelReport({
              orderId: order.id,
              input,
              productCode: updatedOrder.productCode as ReportDetail['productCode'],
              targetModel: model,
            });
            const durationMs = Date.now() - startMs;
            const charCount = countReportChars(report.sections.map(s => s.text).join('\n'));

            // Calculate cost
            let estimatedCostUsd = 0;
            if (report.usage) {
              const provider = model === 'gpt' ? 'openai' : 'anthropic';
              const modelName = model === 'gpt' ? (process.env.OPENAI_MODEL ?? 'gpt-5.2')
                : model === 'opus' ? 'claude-opus-4-6'
                : (process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6');
              estimatedCostUsd = estimateCostUsd(provider, modelName, report.usage);
            }

            return { model, report: { ...report, durationMs, estimatedCostUsd, charCount } };
          })
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            reportsByModel[result.value.model] = result.value.report;
          } else {
            console.error(`[checkout/confirm] Model generation failed:`, result.reason);
          }
        }

        // Primary report = sonnet (or first successful)
        primaryReport = reportsByModel['sonnet'] ?? Object.values(reportsByModel)[0] ?? buildReport(orderSummary, input);
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
