import { NextResponse } from 'next/server';
import { prisma } from '@saju/api/db';
import type { FortuneInput, GetReportResponse, OrderSummary, ReportDetail } from '../../../../lib/types';

export async function GET(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params;

  // Validate orderId format to prevent enumeration
  if (!orderId || orderId.length < 8) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_ORDER', message: '유효하지 않은 주문 ID입니다.' } },
      { status: 400 }
    );
  }

  try {
    // Find order with its report and fortune request
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        request: true,
        reports: { orderBy: { generatedAt: 'desc' }, take: 1 },
      },
    });

    if (!order || order.status !== 'confirmed') {
      return NextResponse.json(
        { ok: false, error: { code: 'ORDER_NOT_FOUND', message: '주문/리포트를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    const dbReport = order.reports[0];
    if (!dbReport) {
      return NextResponse.json(
        { ok: false, error: { code: 'REPORT_NOT_FOUND', message: '리포트가 아직 생성되지 않았습니다.' } },
        { status: 404 }
      );
    }

    // Build OrderSummary
    const orderSummary: OrderSummary = {
      orderId: order.id,
      productCode: order.productCode as OrderSummary['productCode'],
      amountKrw: order.amountKrw,
      status: order.status as OrderSummary['status'],
      createdAt: order.createdAt.toISOString(),
      confirmedAt: order.confirmedAt?.toISOString(),
    };

    // Parse JSON fields back to arrays
    let sections: ReportDetail['sections'] = [];
    let recommendations: string[] = [];
    try {
      sections = JSON.parse(dbReport.sectionsJson);
    } catch {
      sections = [];
    }
    try {
      recommendations = JSON.parse(dbReport.recommendationsJson);
    } catch {
      recommendations = [];
    }

    // Build ReportDetail
    const report: ReportDetail = {
      reportId: dbReport.id,
      orderId: order.id,
      productCode: dbReport.productCode as ReportDetail['productCode'],
      generatedAt: dbReport.generatedAt.toISOString(),
      headline: dbReport.headline,
      summary: dbReport.summary,
      sections,
      recommendations,
      disclaimer: dbReport.disclaimer,
    };

    // Build FortuneInput from the stored request
    const input: FortuneInput = {
      name: order.request.name,
      birthDate: order.request.birthDate,
      birthTime: order.request.birthTime ?? undefined,
      gender: order.request.gender as FortuneInput['gender'],
      calendarType: order.request.calendarType as FortuneInput['calendarType'],
    };

    const data: GetReportResponse = { order: orderSummary, report, input };
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error('[report/get]', err);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: '리포트 조회 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
