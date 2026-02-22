import { NextResponse } from 'next/server';
import { generateFortune, isValidFortuneInput } from '../../../../lib/mockEngine';
import type { FortuneInput } from '../../../../lib/types';

export async function POST(req: Request) {
  const input = (await req.json()) as FortuneInput;
  if (!isValidFortuneInput(input)) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_INPUT', message: '입력값이 유효하지 않습니다.' } }, { status: 400 });
  }
  return NextResponse.json({ ok: true, data: generateFortune(input) });
}
