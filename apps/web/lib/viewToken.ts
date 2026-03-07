import { createHmac, timingSafeEqual } from "crypto";

function getViewTokenSecret(): string {
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

/** Generate a view token from orderId + server secret for IDOR protection */
export function generateViewToken(orderId: string): string {
  const secret = getViewTokenSecret();
  return createHmac("sha256", secret).update(orderId).digest("hex");
}

/** Constant-time verification of a view token */
export function verifyViewToken(orderId: string, token: string): boolean {
  const expected = generateViewToken(orderId);
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
