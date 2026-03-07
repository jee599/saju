import { NextResponse } from "next/server";
import { prisma } from "@saju/api/db";

export async function POST(request: Request) {
  try {
    const { ip, endpoint } = await request.json();
    if (!ip || !endpoint) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await prisma.rateLimitLog.create({
      data: { ip, endpoint },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
