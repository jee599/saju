import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@saju/engine-saju", "@saju/shared"],
  async headers() {
    const scriptSrc = [
      "'self'",
      "'unsafe-inline'",
      "https://js.stripe.com",
      "https://www.googletagmanager.com",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ].join(" ");

    const connectSrc = [
      "'self'",
      "https://api.stripe.com",
      "https://*.googleapis.com",
      "https://www.google-analytics.com",
      "https://*.google-analytics.com",
      ...(isDev ? ["ws://localhost:3000 ws://127.0.0.1:3000"] : []),
    ].join(" ");

    const sharedSecurityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          `script-src ${scriptSrc}`,
          "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
          "img-src 'self' data: https:",
          "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com",
          `connect-src ${connectSrc}`,
          "frame-src 'self' https://js.stripe.com",
        ].join("; "),
      },
    ];
    return [
      {
        source: "/:path*",
        headers: sharedSecurityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
