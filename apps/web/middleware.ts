import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple in-memory rate limiting (will be replaced with Supabase/KV in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 5; // requests per day
const DAY_MS = 24 * 60 * 60 * 1000;

const RATE_LIMITED_PATHS = [
  "/api/report/preview",
  "/api/checkout/create",
  "/api/fortune/mock",
];

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only rate limit specific API paths
  if (!RATE_LIMITED_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  const key = `${ip}:${pathname}`;
  const now = Date.now();

  let entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + DAY_MS };
    rateLimitMap.set(key, entry);
  }

  entry.count++;

  if (entry.count > RATE_LIMIT) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message: "오늘 무료 분석 횟수를 초과했습니다. 내일 다시 시도해주세요.",
        },
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(RATE_LIMIT),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
          "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT));
  response.headers.set("X-RateLimit-Remaining", String(Math.max(0, RATE_LIMIT - entry.count)));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
