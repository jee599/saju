/**
 * Extract client IP from request headers.
 * Works in both Edge (middleware) and Node.js (API routes) runtimes.
 */
export function getClientIp(request: { headers: { get(name: string): string | null } }): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}
