import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "../_auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  return clearAdminSessionCookie(res);
}
