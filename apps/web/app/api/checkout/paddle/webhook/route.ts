import { NextResponse } from 'next/server';
import { Paddle, Environment, EventName } from '@paddle/paddle-node-sdk';
import { prisma } from '@saju/api/db';

function getPaddle() {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new Error('PADDLE_API_KEY is not set');
  const isProd = process.env.PADDLE_ENVIRONMENT === 'production';
  return new Paddle(key, { environment: isProd ? Environment.production : Environment.sandbox });
}

export async function POST(req: Request) {
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[paddle/webhook] PADDLE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const body = await req.text();
  // Paddle sends the signature in 'paddle-signature' header: "ts=...;h1=..."
  const signature = req.headers.get('paddle-signature') ?? '';

  const paddle = getPaddle();
  let event: Awaited<ReturnType<typeof paddle.webhooks.unmarshal>>;
  try {
    event = await paddle.webhooks.unmarshal(body, webhookSecret, signature);
  } catch (err) {
    console.error('[paddle/webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // transaction.completed fires when a one-time payment is fully processed and paid.
  if (event.eventType === EventName.TransactionCompleted) {
    // TransactionCompletedEvent.data is a TransactionNotification
    const txn = event.data;
    const customData = txn.customData as Record<string, string> | null;
    const orderId = customData?.orderId;

    if (orderId) {
      try {
        // Idempotency: skip if already confirmed (prevents race with /checkout/confirm)
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (order?.status === 'confirmed') {
          console.log(`[paddle/webhook] Order ${orderId} already confirmed, skipping`);
        } else {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'confirmed',
              confirmedAt: new Date(),
              paymentId: txn.id,
            },
          });
          console.log(`[paddle/webhook] Order ${orderId} confirmed via Paddle`);
        }
      } catch (err) {
        console.error(`[paddle/webhook] Failed to confirm order ${orderId}:`, err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
      }
    } else {
      console.warn('[paddle/webhook] transaction.completed received without orderId in customData');
    }
  }

  return NextResponse.json({ received: true });
}
