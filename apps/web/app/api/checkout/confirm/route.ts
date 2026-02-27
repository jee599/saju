import { NextResponse } from 'next/server';
import { confirmCheckout } from '../../../../lib/mockEngine';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { orderId?: string };
    if (!body?.orderId) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_REQUEST', message: 'orderId가 필요합니다.' } },
        { status: 400 }
      );
    }

    const data = await confirmCheckout(body.orderId);
    if (!data) {
      return NextResponse.json(
        { ok: false, error: { code: 'ORDER_NOT_FOUND', message: '주문 정보를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error('[checkout/confirm]', err);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: '결제 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' } },
      { status: 500 }
    );
  }
}
