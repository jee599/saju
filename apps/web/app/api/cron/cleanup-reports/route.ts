import { NextResponse } from "next/server";
import { prisma } from "@saju/api/db";
import { logger } from "../../../../lib/logger";

/**
 * Cron job: Delete free-tier reports older than 90 days.
 * Trigger via Vercel Cron or external scheduler.
 * Protected by CRON_SECRET header.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Require CRON_SECRET — if not configured, deny all requests
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // 1. Delete reports where expiresAt is in the past (free reports have 90-day expiry)
    const deletedReports = await prisma.report.deleteMany({
      where: {
        expiresAt: { not: null, lt: now },
      },
    });

    // 2. Clean up stale orders stuck in 'created' status for over 24 hours
    const staleOrderCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const deletedOrders = await prisma.order.deleteMany({
      where: {
        status: "created",
        createdAt: { lt: staleOrderCutoff },
      },
    });

    // 3. Clean up orphaned FortuneRequest entries (no associated orders)
    const orphanedRequests = await prisma.fortuneRequest.deleteMany({
      where: {
        orders: { none: {} },
        createdAt: { lt: staleOrderCutoff },
      },
    });

    return NextResponse.json({
      ok: true,
      deletedReports: deletedReports.count,
      deletedStaleOrders: deletedOrders.count,
      deletedOrphanedRequests: orphanedRequests.count,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    logger.error("[cron/cleanup-reports]", { error: err });
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "Cleanup failed" } },
      { status: 500 }
    );
  }
}
