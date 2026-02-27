import { NextResponse } from "next/server";
import { prisma } from "@saju/api/db";

interface SubscribeBody {
  email: string;
  source: "checkout" | "coming_soon" | "monthly_fortune";
  locale?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SubscribeBody;

    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_EMAIL", message: "유효한 이메일 주소를 입력해주세요." } },
        { status: 400 }
      );
    }

    const validSources = ["checkout", "coming_soon", "monthly_fortune"];
    if (!validSources.includes(body.source)) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_SOURCE", message: "잘못된 소스입니다." } },
        { status: 400 }
      );
    }

    await prisma.emailSubscription.upsert({
      where: { email_source: { email: body.email, source: body.source } },
      update: { optedIn: true },
      create: {
        email: body.email,
        source: body.source,
        locale: body.locale ?? "ko",
        optedIn: true,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[email/subscribe]", err);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "서버에 일시적인 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
