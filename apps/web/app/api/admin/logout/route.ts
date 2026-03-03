import { NextResponse } from "next/server";
import { checkAdminAuth, clearAdminSessionCookie } from "../_auth";

export async function POST(request: Request) {
  // Verify the caller is actually authenticated before logout.
  // Even if not authenticated, we still clear the cookie (no-op for safety).
  checkAdminAuth(request);

  const res = NextResponse.json({ ok: true });
  return clearAdminSessionCookie(res);
}
