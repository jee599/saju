import { NextResponse } from "next/server";
import { prisma } from "@saju/api/db";
import { logger } from "../../../../lib/logger";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Internal endpoint: check rate limit and log the request in one call.
 * Called by Edge middleware (which cannot use Prisma directly).
 *
 * POST { ip, endpoint, limit }
 * Returns { allowed, count, limit, resetAt }
 */
export async function POST(request: Request) {
  // Block external callers
  if (request.headers.get("x-internal-caller") !== "middleware") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  try {
    const { ip, endpoint, limit = 5 } = await request.json();
    if (!ip || !endpoint) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const windowStart = new Date(Date.now() - DAY_MS);

    // Count requests in the last 24 hours for this IP + endpoint
    const count = await prisma.rateLimitLog.count({
      where: {
        ip,
        endpoint,
        createdAt: { gte: windowStart },
      },
    });

    const allowed = count < limit;

    // Log this request (regardless of allowed/blocked, for monitoring)
    await prisma.rateLimitLog.create({
      data: { ip, endpoint },
    });

    return NextResponse.json({
      ok: true,
      allowed,
      count: count + 1, // include current request
      limit,
      resetAt: Math.ceil((Date.now() + DAY_MS) / 1000),
    });
  } catch (e) {
    logger.error("[check-rate-limit]", { error: e });
    // On DB failure, allow the request (fail open)
    return NextResponse.json({
      ok: true,
      allowed: true,
      count: 0,
      limit: 5,
      resetAt: Math.ceil((Date.now() + DAY_MS) / 1000),
    });
  }
}
