import { NextResponse } from 'next/server';
import { createCheckout, isValidFortuneInput } from '../../../../lib/mockEngine';
import type { CheckoutCreateRequest } from '../../../../lib/types';

export async function POST(req: Request) {
  const body = (await req.json()) as CheckoutCreateRequest;
  if (!body?.input || body?.productCode !== 'full' || !isValidFortuneInput(body.input)) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_INPUT', message: '입력값이 유효하지 않습니다.' } }, { status: 400 });
  }
  return NextResponse.json({ ok: true, data: createCheckout(body) });
}
