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
  const status = searchParams.get("status") ?? "all";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (status !== "all") where.status = status;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59Z") } : {}),
    };
  }

  try {
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          request: { select: { name: true, birthDate: true, gender: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        orders: orders.map((o) => ({
          id: o.id,
          name: o.request.name,
          birthDate: o.request.birthDate,
          gender: o.request.gender,
          email: o.email,
          amount: o.amount ?? o.amountKrw,
          currency: o.currency,
          countryCode: o.countryCode,
          locale: o.locale,
          paymentProvider: o.paymentProvider,
          status: o.status,
          createdAt: o.createdAt.toISOString(),
          confirmedAt: o.confirmedAt?.toISOString() ?? null,
          // 24시간 이내 confirmed = 환불 가능
          refundable: o.status === "confirmed" && o.confirmedAt
            ? Date.now() - o.confirmedAt.getTime() < 24 * 60 * 60 * 1000
            : false,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[admin/orders]", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
