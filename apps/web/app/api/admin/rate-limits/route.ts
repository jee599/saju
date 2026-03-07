import { NextResponse } from "next/server";
import { prisma } from "@saju/api/db";
import { checkAdminAuth } from "../_auth";

export async function GET(request: Request) {
  const authErr = checkAdminAuth(request);
  if (authErr) return authErr;

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") ?? "7d";
  const days = range === "1d" ? 1 : range === "30d" ? 30 : 7;
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const [totalBlocked, logs] = await Promise.all([
      prisma.rateLimitLog.count({ where: { createdAt: { gte: since } } }),
      prisma.rateLimitLog.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { id: true, ip: true, endpoint: true, createdAt: true },
      }),
    ]);

    // Top IPs
    const ipCounts = new Map<string, number>();
    const endpointCounts = new Map<string, number>();
    for (const log of logs) {
      ipCounts.set(log.ip, (ipCounts.get(log.ip) ?? 0) + 1);
      endpointCounts.set(log.endpoint, (endpointCounts.get(log.endpoint) ?? 0) + 1);
    }

    const topIps = [...ipCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    const topEndpoints = [...endpointCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([endpoint, count]) => ({ endpoint, count }));

    return NextResponse.json({
      ok: true,
      data: { totalBlocked, topIps, topEndpoints, recentLogs: logs.slice(0, 20) },
    });
  } catch (err) {
    console.error("[admin/rate-limits]", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
