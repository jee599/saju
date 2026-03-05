import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import { prisma } from '@saju/api/db';
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}


function getPaddle() {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new Error('PADDLE_API_KEY is not set');
  const isProd = process.env.PADDLE_ENVIRONMENT === 'production';
  return new Paddle(key, { environment: isProd ? Environment.production : Environment.sandbox });
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
        { ok: false, error: { code: 'INVALID_REQUEST', message: 'orderId is required.' } },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: { request: true },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } },
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
          { ok: false, error: { code: 'PAYMENT_PENDING', message: 'Payment confirmation pending.' } },
          { status: 409 }
        );
      }

      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(order.paymentId);
      if (session.payment_status !== 'paid') {
        return NextResponse.json(
          { ok: false, error: { code: 'PAYMENT_NOT_PAID', message: 'Payment not completed.' } },
          { status: 402 }
        );
      }
    } else if (order.paymentProvider === 'paddle') {
      if (!order.paymentId) {
        return NextResponse.json(
          { ok: false, error: { code: 'PAYMENT_PENDING', message: 'Payment confirmation pending.' } },
          { status: 409 }
        );
      }

      const paddle = getPaddle();
      const transaction = await paddle.transactions.get(order.paymentId);
      if (!['paid', 'completed'].includes(transaction.status)) {
        return NextResponse.json(
          { ok: false, error: { code: 'PAYMENT_NOT_PAID', message: 'Payment not completed.' } },
          { status: 402 }
        );
      }
    } else {
      // Only allow unverified confirm in non-production environments. The env-var override is
      // intentionally removed to prevent payment bypass in production.
      const allowUnverified = process.env.NODE_ENV !== 'production';
      if (!allowUnverified) {
        return NextResponse.json(
          { ok: false, error: { code: 'PAYMENT_VERIFICATION_REQUIRED', message: 'Payment verification required.' } },
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
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Checkout confirmation failed.' } },
      { status: 500 }
    );
  }
}
