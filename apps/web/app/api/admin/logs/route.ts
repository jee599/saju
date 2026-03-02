import { NextResponse } from "next/server";
import { prisma } from "@saju/api/db";

function checkAuth(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw || token !== adminPw) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const authErr = checkAuth(request);
  if (authErr) return authErr;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "activity";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

  try {
    if (type === "llm") {
      const [logs, total] = await Promise.all([
        prisma.llmUsage.findMany({
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            request: { select: { name: true, birthDate: true } },
          },
        }),
        prisma.llmUsage.count(),
      ]);

      return NextResponse.json({
        ok: true,
        data: {
          logs: logs.map((l) => ({
            id: l.id,
            provider: l.provider,
            model: l.model,
            inputTokens: l.inputTokens,
            outputTokens: l.outputTokens,
            totalTokens: l.totalTokens,
            durationMs: l.durationMs,
            costUsd: l.estimatedCostUsd,
            userName: l.request?.name ?? null,
            createdAt: l.createdAt.toISOString(),
          })),
          total,
          page,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Activity logs (RateLimitLog)
    const [logs, total] = await Promise.all([
      prisma.rateLimitLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.rateLimitLog.count(),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        logs: logs.map((l) => ({
          id: l.id,
          ip: l.ip,
          fingerprint: l.fingerprint,
          uuid: l.uuid,
          endpoint: l.endpoint,
          createdAt: l.createdAt.toISOString(),
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[admin/logs]", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
