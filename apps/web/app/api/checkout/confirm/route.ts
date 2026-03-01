import { NextResponse } from 'next/server';
import { prisma } from '@saju/api/db';
import type { FortuneInput, OrderSummary } from '../../../../lib/types';

/**
 * 주문 확인만 수행. LLM 생성은 /api/report/generate 에서 개별 호출.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { orderId?: string };
    if (!body?.orderId) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_REQUEST', message: 'orderId가 필요합니다.' } },
        { status: 400 }
      );
    }

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

    // 이미 확인된 주문이면 그냥 성공 반환 (중복 호출 허용)
    if (order.status === 'confirmed') {
      return NextResponse.json({ ok: true, data: { orderId: order.id } });
    }

    // Update order status to "confirmed"
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'confirmed', confirmedAt: new Date() },
    });

    return NextResponse.json({ ok: true, data: { orderId: order.id } });
  } catch (err) {
    console.error('[checkout/confirm]', err);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: '결제 확인 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
