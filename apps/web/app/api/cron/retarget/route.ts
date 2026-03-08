import { NextResponse } from "next/server";
import { prisma } from "@saju/api/db";
import { sendRetargetEmail } from "../../../../lib/sendRetargetEmail";
import { logger } from "../../../../lib/logger";

/**
 * Cron job: Send retargeting emails to abandoned checkouts.
 *
 * Targets orders where:
 * - status = "created" (never completed payment)
 * - createdAt is between 1-24 hours ago
 * - has an email address
 * - no report exists (hasn't converted)
 * - no retarget email already sent (tracked via EventLog)
 *
 * Protected by CRON_SECRET header.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find abandoned orders with email, excluding those that already have reports
    const abandonedOrders = await prisma.order.findMany({
      where: {
        status: "created",
        email: { not: null },
        createdAt: {
          gte: twentyFourHoursAgo,
          lte: oneHourAgo,
        },
        reports: { none: {} },
      },
      include: {
        request: true,
      },
      take: 50, // batch limit to avoid timeout
    });

    if (abandonedOrders.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, skipped: 0, timestamp: now.toISOString() });
    }

    // Check which orders already received a retarget email (via EventLog)
    const orderIds = abandonedOrders.map((o) => o.id);
    const alreadySent = await prisma.eventLog.findMany({
      where: {
        eventName: "retarget_email_sent",
        sessionId: { in: orderIds },
      },
      select: { sessionId: true },
    });
    const alreadySentSet = new Set(alreadySent.map((e) => e.sessionId));

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://fortunelab.store";
    let sent = 0;
    let skipped = 0;

    for (const order of abandonedOrders) {
      if (alreadySentSet.has(order.id)) {
        skipped++;
        continue;
      }

      if (!order.email) continue;

      const locale = (order.locale ?? "ko") as "ko" | "en" | "ja" | "zh" | "th" | "vi" | "id" | "hi";
      const localePrefix = locale === "ko" ? "" : `/${locale}`;

      // Build checkout URL with pre-filled user data
      const params = new URLSearchParams({
        name: order.request.name,
        birthDate: order.request.birthDate,
        gender: order.request.gender,
        calendarType: order.request.calendarType,
      });
      if (order.request.birthTime) {
        params.set("birthTime", order.request.birthTime);
      }
      const checkoutUrl = `${baseUrl}${localePrefix}/paywall?${params.toString()}`;

      const result = await sendRetargetEmail({
        to: order.email,
        userName: order.request.name,
        locale,
        checkoutUrl,
      });

      if (result.success) {
        // Track in EventLog to prevent duplicate sends (using sessionId to store orderId)
        await prisma.eventLog.create({
          data: {
            sessionId: order.id,
            eventType: "system",
            eventName: "retarget_email_sent",
            properties: JSON.stringify({
              email: order.email,
              locale,
              orderId: order.id,
            }),
            locale,
          },
        });
        sent++;
      } else {
        logger.error(`[cron/retarget] Failed for order ${order.id}`, { error: result.error });
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      skipped,
      total: abandonedOrders.length,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    logger.error("[cron/retarget]", { error: err });
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "Retarget cron failed" } },
      { status: 500 }
    );
  }
}
