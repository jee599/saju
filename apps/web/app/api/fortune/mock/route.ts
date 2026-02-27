import { NextResponse } from 'next/server';
import { generateFortune, isValidFortuneInput } from '../../../../lib/mockEngine';
import { logRateLimit } from '../../../../lib/rateLimitLog';
import type { FortuneInput } from '../../../../lib/types';

export async function POST(req: Request) {
  try {
    const input = (await req.json()) as FortuneInput;
    if (!isValidFortuneInput(input)) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: '입력값이 유효하지 않습니다.' } },
        { status: 400 }
      );
    }

    // Fire-and-forget rate limit DB logging
    const ip = req.headers.get("x-client-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    logRateLimit({ ip, endpoint: "/api/fortune/mock" });

    return NextResponse.json({ ok: true, data: generateFortune(input) });
  } catch (err) {
    console.error('[fortune/mock]', err);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: '서버에 일시적인 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
