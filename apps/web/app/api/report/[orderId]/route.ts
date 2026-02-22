import { NextResponse } from 'next/server';
import { getReport } from '../../../../lib/mockEngine';

export async function GET(_: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params;
  const data = getReport(orderId);
  if (!data) return NextResponse.json({ ok: false, error: { code: 'ORDER_NOT_FOUND', message: '주문/리포트를 찾을 수 없습니다.' } }, { status: 404 });
  return NextResponse.json({ ok: true, data });
}
