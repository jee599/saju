import { NextResponse } from 'next/server';
import { confirmCheckout } from '../../../../lib/mockEngine';

export async function POST(req: Request) {
  const body = (await req.json()) as { orderId?: string };
  if (!body?.orderId) return NextResponse.json({ ok: false, error: { code: 'INVALID_REQUEST', message: 'orderId가 필요합니다.' } }, { status: 400 });
  const data = confirmCheckout(body.orderId);
  if (!data) return NextResponse.json({ ok: false, error: { code: 'ORDER_NOT_FOUND', message: '주문 정보를 찾을 수 없습니다.' } }, { status: 404 });
  return NextResponse.json({ ok: true, data });
}
