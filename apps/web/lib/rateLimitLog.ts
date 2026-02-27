/**
 * Async rate limit DB logger (fire-and-forget).
 * Called from API routes after middleware passes.
 */
export async function logRateLimit(params: {
  ip: string;
  endpoint: string;
  fingerprint?: string;
  uuid?: string;
}): Promise<void> {
  try {
    const { prisma } = await import("@saju/api/db");
    await prisma.rateLimitLog.create({
      data: {
        ip: params.ip,
        fingerprint: params.fingerprint ?? null,
        uuid: params.uuid ?? null,
        endpoint: params.endpoint,
      },
    });
  } catch (e) {
    console.error("[rate-limit-log] failed:", e);
  }
}
