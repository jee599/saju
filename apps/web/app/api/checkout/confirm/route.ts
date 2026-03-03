import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@saju/api/db';
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

/**
 * 주문 확인: Stripe는 결제 상태를 서버에서 검증 후 confirmed 처리.
 * 비-Stripe 결제수단은 운영환경에서 수동 확정을 차단한다.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { orderId?: string };
    if (!body?.orderId) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_REQUEST', message: 'orderId가 필요합니다.' } },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: { request: true },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: { code: 'ORDER_NOT_FOUND', message: '주문 정보를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    // 이미 확인된 주문이면 그냥 성공 반환 (중복 호출 허용)
    if (order.status === 'confirmed') {
      return NextResponse.json({ ok: true, data: { orderId: order.id } });
    }


    if (order.paymentProvider === 'stripe') {
      if (!order.paymentId) {
        return NextResponse.json(
          { ok: false, error: { code: 'PAYMENT_PENDING', message: '결제 확인 대기 중입니다.' } },
          { status: 409 }
        );
      }

      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(order.paymentId);
      if (session.payment_status !== 'paid') {
        return NextResponse.json(
          { ok: false, error: { code: 'PAYMENT_NOT_PAID', message: '결제가 완료되지 않았습니다.' } },
          { status: 402 }
        );
      }
    } else {
      // Only allow unverified confirm in non-production environments. The env-var override is
      // intentionally removed to prevent payment bypass in production.
      const allowUnverified = process.env.NODE_ENV !== 'production';
      if (!allowUnverified) {
        return NextResponse.json(
          { ok: false, error: { code: 'PAYMENT_VERIFICATION_REQUIRED', message: '결제 검증이 필요합니다.' } },
          { status: 403 }
        );
      }
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'confirmed', confirmedAt: new Date() },
    });

    return NextResponse.json({ ok: true, data: { orderId: order.id } });

  } catch (err) {
    console.error('[checkout/confirm]', err);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: '결제 확인 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
