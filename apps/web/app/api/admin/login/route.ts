import { NextResponse } from "next/server";
import { prisma } from "@saju/api/db";
import { setAdminSessionCookie } from "../_auth";

// NOTE: In-memory rate limiting is unreliable on serverless (each cold start resets the map).
// It is kept as a first line of defence but supplemented with a DB-based check via RateLimitLog.
// A proper solution would use Redis or a dedicated rate-limit service.
const tries = new Map<string, { count: number; until: number }>();

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const now = Date.now();

  // In-memory rate limit check
  const t = tries.get(ip);
  if (t && t.until > now && t.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });
  }

  // DB-based rate limit check (survives serverless cold starts)
  try {
    const windowStart = new Date(now - LOCKOUT_MS);
    const recentAttempts = await prisma.rateLimitLog.count({
      where: { ip, endpoint: "admin/login", createdAt: { gte: windowStart } },
    });
    if (recentAttempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });
    }
  } catch (dbErr) {
    // If DB check fails, fall through to in-memory only (best-effort)
    console.error("[admin/login] DB rate limit check failed:", dbErr);
  }

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw || body.password !== adminPw) {
    const next = t && t.until > now ? { count: t.count + 1, until: t.until } : { count: 1, until: now + LOCKOUT_MS };
    tries.set(ip, next);

    // Log failed attempt to DB (fire-and-forget)
    prisma.rateLimitLog.create({
      data: { ip, endpoint: "admin/login" },
    }).catch((e: unknown) => console.error("[admin/login] Failed to log rate limit:", e));

    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  tries.delete(ip);
  const res = NextResponse.json({ ok: true });
  return setAdminSessionCookie(res);
}
