import { NextResponse } from "next/server";
import { checkAdminAuth, clearAdminSessionCookie } from "../_auth";

export async function POST(request: Request) {
  const authErr = checkAdminAuth(request);
  if (authErr) return authErr;

  const res = NextResponse.json({ ok: true });
  return clearAdminSessionCookie(res);
}
