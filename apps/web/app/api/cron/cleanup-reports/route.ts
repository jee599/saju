import { NextResponse } from "next/server";
import { prisma } from "@saju/api/db";

/**
 * Cron job: Delete free-tier reports older than 90 days.
 * Trigger via Vercel Cron or external scheduler.
 * Protected by CRON_SECRET header.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In production, require CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Delete reports where expiresAt is in the past (free reports have 90-day expiry)
    const deleted = await prisma.report.deleteMany({
      where: {
        expiresAt: { not: null, lt: now },
      },
    });

    return NextResponse.json({
      ok: true,
      deletedCount: deleted.count,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error("[cron/cleanup-reports]", err);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "Cleanup failed" } },
      { status: 500 }
    );
  }
}
