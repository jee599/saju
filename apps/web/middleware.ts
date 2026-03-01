import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n/config";

// ── Rate limiting (API only) ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
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

// ── Intl middleware ──
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localeDetection: true,
  localePrefix: "as-needed",
});

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes: rate limiting only, no locale routing
  if (pathname.startsWith("/api/")) {
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
        { ok: false, error: { code: "RATE_LIMITED", message: "Rate limit exceeded. Please try again tomorrow." } },
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
    response.headers.set("X-Client-IP", ip);
    return response;
  }

  // All other paths: locale routing
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)", "/api/:path*"],
};
