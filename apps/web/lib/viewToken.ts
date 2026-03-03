import { createHash } from "crypto";

/** Generate a view token from orderId + server secret for IDOR protection */
export function generateViewToken(orderId: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET || "dev-only-fallback-secret";
  return createHash("sha256").update(orderId + secret).digest("hex").slice(0, 16);
}
