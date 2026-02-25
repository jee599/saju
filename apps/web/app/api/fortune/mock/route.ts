import { NextResponse } from 'next/server';
import { generateFortune, isValidFortuneInput } from '../../../../lib/mockEngine';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '../../../../lib/rateLimit';
import type { FortuneInput } from '../../../../lib/types';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`fortune:${ip}`, { limit: 10, windowMs: 24 * 60 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: '일일 요청 한도를 초과했습니다. 내일 다시 시도해 주세요.' } },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  const input = (await req.json()) as FortuneInput;
  if (!isValidFortuneInput(input)) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_INPUT', message: '입력값이 유효하지 않습니다.' } }, { status: 400 });
  }
  return NextResponse.json({ ok: true, data: generateFortune(input) }, { headers: rateLimitHeaders(rl) });
}
