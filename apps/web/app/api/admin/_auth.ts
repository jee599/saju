import { NextResponse } from "next/server";
import { createHash } from "crypto";

const ADMIN_COOKIE = "oc_admin";

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret === "default") {
      throw new Error("ADMIN_SESSION_SECRET must be set to a non-default value in production");
    }
    return secret;
  }
  // Development fallback only
  return secret || "dev-only-fallback-secret";
}

function sessionToken(adminPw: string) {
  const salt = getSessionSecret();
  return createHash("sha256").update(`${adminPw}:${salt}`).digest("hex");
}

function getCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  const found = cookie
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

export function checkAdminAuth(request: Request) {
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.replace("Bearer ", "");
  if (bearer && bearer === adminPw) return null;

  const cookieToken = getCookie(request, ADMIN_COOKIE);
  if (cookieToken && cookieToken === sessionToken(adminPw)) return null;

  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export function setAdminSessionCookie(response: NextResponse) {
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw) return response;
  const token = sessionToken(adminPw);
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
