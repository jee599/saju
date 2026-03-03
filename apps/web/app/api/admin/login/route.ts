import { NextResponse } from "next/server";
import { setAdminSessionCookie } from "../_auth";

const tries = new Map<string, { count: number; until: number }>();

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const now = Date.now();
  const t = tries.get(ip);
  if (t && t.until > now && t.count >= 5) {
    return NextResponse.json({ ok: false, error: "Too many attempts" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw || body.password !== adminPw) {
    const next = t && t.until > now ? { count: t.count + 1, until: t.until } : { count: 1, until: now + 10 * 60 * 1000 };
    tries.set(ip, next);
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  tries.delete(ip);
  const res = NextResponse.json({ ok: true });
  return setAdminSessionCookie(res);
}
