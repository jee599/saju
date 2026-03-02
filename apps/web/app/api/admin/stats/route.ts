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
  const range = searchParams.get("range") ?? "30d";

  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    // KPI 집계
    const [totalRequests, totalOrders, confirmedOrders, revenueData] = await Promise.all([
      prisma.fortuneRequest.count({ where: { createdAt: { gte: since } } }),
      prisma.order.count({ where: { createdAt: { gte: since } } }),
      prisma.order.count({ where: { status: "confirmed", createdAt: { gte: since } } }),
      prisma.order.findMany({
        where: { status: "confirmed", createdAt: { gte: since } },
        select: { amountKrw: true, currency: true },
      }),
    ]);

    let llmCost = { _sum: { estimatedCostUsd: 0, totalTokens: 0 } } as { _sum: { estimatedCostUsd: number | null; totalTokens: number | null } };
    try {
      llmCost = await prisma.llmUsage.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { estimatedCostUsd: true, totalTokens: true },
      });
    } catch {
      // Keep admin dashboard available even if llm_usage table is unavailable.
    }

    // 통화별 매출 합산
    const revenue: Record<string, number> = {};
    for (const o of revenueData) {
      const cur = o.currency ?? "KRW";
      revenue[cur] = (revenue[cur] ?? 0) + (o.amountKrw ?? 0);
    }

    // 일별 데이터
    const dailyRequests = await prisma.$queryRawUnsafe<{ date: string; count: bigint }[]>(
      `SELECT DATE(created_at AT TIME ZONE 'Asia/Seoul') as date, COUNT(*) as count
       FROM "FortuneRequest" WHERE created_at >= $1 GROUP BY date ORDER BY date`,
      since
    );
    const dailyOrders = await prisma.$queryRawUnsafe<{ date: string; count: bigint; confirmed: bigint; revenue: bigint }[]>(
      `SELECT DATE(created_at AT TIME ZONE 'Asia/Seoul') as date,
              COUNT(*) as count,
              COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
              COALESCE(SUM(amount_krw) FILTER (WHERE status = 'confirmed'), 0) as revenue
       FROM "Order" WHERE created_at >= $1 GROUP BY date ORDER BY date`,
      since
    );

    // 일별 맵 생성
    const reqMap = new Map(dailyRequests.map(r => [r.date.toString().slice(0, 10), Number(r.count)]));
    const ordMap = new Map(dailyOrders.map(r => [r.date.toString().slice(0, 10), {
      orders: Number(r.count),
      confirmed: Number(r.confirmed),
      revenue: Number(r.revenue),
    }]));

    const daily: { date: string; requests: number; orders: number; confirmed: number; revenue: number }[] = [];
    for (let d = new Date(since); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const ord = ordMap.get(key);
      daily.push({
        date: key,
        requests: reqMap.get(key) ?? 0,
        orders: ord?.orders ?? 0,
        confirmed: ord?.confirmed ?? 0,
        revenue: ord?.revenue ?? 0,
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        kpi: {
          totalRequests,
          totalOrders,
          confirmedOrders,
          revenue,
          llmCostUsd: llmCost._sum.estimatedCostUsd ?? 0,
          llmTokens: llmCost._sum.totalTokens ?? 0,
        },
        daily,
      },
    });
  } catch (err) {
    console.error("[admin/stats]", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
