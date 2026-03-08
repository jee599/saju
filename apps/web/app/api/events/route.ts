import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@saju/api/db";
import { logger } from "../../../lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, userId, locale, device, userAgent, events } = body;

    if (!sessionId || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const batch = events.slice(0, 50).map((e: Record<string, unknown>) => ({
      sessionId: String(sessionId),
      userId: userId ? String(userId) : null,
      eventType: String(e.eventType ?? "unknown"),
      eventName: String(e.eventName ?? "unknown"),
      properties: JSON.stringify(e.properties ?? {}),
      page: e.page ? String(e.page) : null,
      referrer: e.referrer ? String(e.referrer) : null,
      locale: locale ? String(locale) : null,
      device: device ? String(device) : null,
      userAgent: userAgent ? String(userAgent).slice(0, 500) : null,
    }));

    await prisma.eventLog.createMany({ data: batch });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("[events]", { error: err });
    // Always return 200 to prevent client retries
    return NextResponse.json({ ok: true });
  }
}
