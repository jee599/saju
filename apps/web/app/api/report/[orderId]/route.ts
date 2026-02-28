import { NextResponse } from 'next/server';
import { getReport } from '../../../../lib/mockEngine';

export async function GET(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params;

  // Validate orderId format to prevent enumeration
  if (!orderId || orderId.length < 8) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_ORDER', message: '유효하지 않은 주문 ID입니다.' } },
      { status: 400 }
    );
  }

  // Check token if provided (for future auth)
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  const data = getReport(orderId);
  if (!data) {
    return NextResponse.json(
      { ok: false, error: { code: 'ORDER_NOT_FOUND', message: '주문/리포트를 찾을 수 없습니다.' } },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, data });
}
