/**
 * Cron endpoint: 만료 리포트 정리.
 *
 * Vercel Cron (vercel.json) 또는 외부 cron에서 매일 호출.
 * Authorization: Bearer <CRON_SECRET> 으로 보호.
 *
 * GET /api/cron/retention
 */

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HARD_DELETE_GRACE_DAYS = 30;

export async function GET(req: Request) {
  // Verify cron secret (Vercel Cron sets this header automatically)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const prisma = new PrismaClient();
  try {
    const now = new Date();

    // Step 1: Soft-delete expired reports (expiresAt <= now AND deletedAt IS NULL)
    const softDeleteResult = await prisma.report.updateMany({
      where: {
        expiresAt: { lte: now },
        deletedAt: null,
      },
      data: { deletedAt: now },
    });

    // Step 2: Hard-delete reports soft-deleted > 30 days ago
    const hardDeleteCutoff = new Date(now);
    hardDeleteCutoff.setDate(hardDeleteCutoff.getDate() - HARD_DELETE_GRACE_DAYS);

    const hardDeleteResult = await prisma.report.deleteMany({
      where: {
        deletedAt: { lte: hardDeleteCutoff },
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        softDeleted: softDeleteResult.count,
        hardDeleted: hardDeleteResult.count,
        timestamp: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("[cron/retention] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Cleanup failed" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
