import { NextResponse } from 'next/server';
import { prisma } from '@saju/api/db';
import type { FortuneInput, OrderSummary, ReportDetail } from '../../../../lib/types';
import { buildReport } from '../../../../lib/mockEngine';

/** Infer the selected model from the order price. */
const priceToModel: Record<number, string> = { 9900: 'opus', 5900: 'sonnet', 3900: 'gpt' };

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

    // 4. Try LLM generation, fall back to deterministic
    const selectedModel = priceToModel[order.amountKrw] ?? 'sonnet';
    let report: ReportDetail;

    try {
      const { generateSingleModelReport, hasLlmKeys } = await import('../../../../lib/llmEngine');
      if (hasLlmKeys()) {
        report = await generateSingleModelReport({
          orderId: order.id,
          input,
          productCode: updatedOrder.productCode as ReportDetail['productCode'],
          targetModel: selectedModel,
        });
      } else {
        report = buildReport(orderSummary, input);
      }
    } catch (e) {
      console.error('[checkout/confirm] LLM generation failed, using fallback:', e);
      report = buildReport(orderSummary, input);
    }

    // 5. Save the report to the Report table
    await prisma.report.create({
      data: {
        orderId: order.id,
        model: selectedModel,
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

    return NextResponse.json({ ok: true, data: { order: orderSummary, report } });
  } catch (err) {
    console.error('[checkout/confirm]', err);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: '결제 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' } },
      { status: 500 }
    );
  }
}
