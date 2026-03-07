import { NextResponse } from "next/server";
import { prisma } from "@saju/api/db";

/**
 * Internal-only endpoint for rate limit logging from middleware.
 * Protected: only accepts requests from the same origin (no external callers).
 */
export async function POST(request: Request) {
  // Block external callers: middleware calls this from the same origin,
  // so the host header must match. External requests will have a different origin.
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  if (origin && !origin.includes(host ?? "")) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  // Additional guard: require internal header set by our middleware
  if (request.headers.get("x-internal-caller") !== "middleware") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

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
