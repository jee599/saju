import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n/config";
import { getClientIp } from "./lib/ip";

// ── Rate limiting (API only) ──
const RATE_LIMIT = 5;

const RATE_LIMITED_PATHS = [
  "/api/report/preview",
  "/api/report/generate",
  "/api/checkout/create",
  "/api/checkout/confirm",
  "/api/checkout/paddle/create",
  "/api/fortune/mock",
  "/api/events",
  "/api/report/",
  "/api/email/subscribe",
];

// ── Intl middleware ──
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localeDetection: true,
  localePrefix: "as-needed",
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes: rate limiting only, no locale routing
  if (pathname.startsWith("/api/")) {
    if (!RATE_LIMITED_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    const ip = getClientIp(request);
    const origin = request.nextUrl.origin;

    try {
      // Query DB via internal endpoint (Edge middleware cannot use Prisma)
      const res = await fetch(`${origin}/api/internal/check-rate-limit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-caller": "middleware",
        },
        body: JSON.stringify({ ip, endpoint: pathname, limit: RATE_LIMIT }),
      });

      const data = await res.json();

      if (data.ok && !data.allowed) {
        return NextResponse.json(
          { ok: false, error: { code: "RATE_LIMITED", message: "Rate limit exceeded. Please try again tomorrow." } },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": String(RATE_LIMIT),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(data.resetAt),
              "Retry-After": String(Math.max(1, data.resetAt - Math.ceil(Date.now() / 1000))),
            },
          }
        );
      }

      const response = NextResponse.next();
      response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT));
      response.headers.set("X-RateLimit-Remaining", String(Math.max(0, RATE_LIMIT - (data.count ?? 0))));
      response.headers.set("X-RateLimit-Reset", String(data.resetAt ?? 0));
      return response;
    } catch {
      // On failure, allow the request (fail open)
      return NextResponse.next();
    }
  }

  // Admin routes: skip locale routing
  if (pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // All other paths: locale routing
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)", "/api/:path*"],
};
