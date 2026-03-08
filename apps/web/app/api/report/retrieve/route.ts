import { NextResponse } from 'next/server';
import { prisma } from '@saju/api/db';
import { generateViewToken } from '../../../../lib/viewToken';
import { logger } from '../../../../lib/logger';

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * POST /api/report/retrieve
 * Query confirmed orders by email and return view links.
 */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown';

    // Rate limit: 10 requests/day per IP
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const recentCount = await prisma.rateLimitLog.count({
      where: {
        ip,
        endpoint: '/api/report/retrieve',
        createdAt: { gte: windowStart },
      },
    });

    if (recentCount >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
        { status: 429 }
      );
    }

    const body = await req.json();
    const email = body?.email?.trim()?.toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_EMAIL', message: 'Invalid email.' } },
        { status: 400 }
      );
    }

    // Log this request for rate limiting (after validation so invalid requests don't consume quota)
    await prisma.rateLimitLog.create({
      data: {
        ip,
        endpoint: '/api/report/retrieve',
      },
    });

    const orders = await prisma.order.findMany({
      where: {
        email: { equals: email, mode: 'insensitive' },
        status: 'confirmed',
      },
      include: {
        reports: { select: { id: true }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Only return orders that have generated reports
    const ordersWithReports = orders
      .filter((o) => o.reports.length > 0)
      .map((o) => {
        const token = generateViewToken(o.id);
        const locale = o.locale || 'ko';
        const localePath = locale === 'ko' ? '' : `/${locale}`;
        return {
          orderId: o.id,
          productCode: o.productCode,
          createdAt: o.createdAt.toISOString(),
          viewUrl: `${localePath}/report/${o.id}?token=${token}`,
        };
      });

    return NextResponse.json({
      ok: true,
      data: { orders: ordersWithReports },
    });
  } catch (err) {
    logger.error('[report/retrieve]', { error: err });
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Retrieval failed.' } },
      { status: 500 }
    );
  }
}
