import { NextResponse } from 'next/server';
import { EventName } from '@paddle/paddle-node-sdk';
import { prisma } from '@saju/api/db';
import { getPaddle } from '../../../../../lib/paddle';
import { logger } from '../../../../../lib/logger';

export async function POST(req: Request) {
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error('[paddle/webhook] PADDLE_WEBHOOK_SECRET is not configured');
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
    logger.error('[paddle/webhook] Signature verification failed', { error: err });
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
          logger.info(`[paddle/webhook] Order ${orderId} already confirmed, skipping`);
        } else {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'confirmed',
              confirmedAt: new Date(),
              paymentId: txn.id,
            },
          });
          logger.info(`[paddle/webhook] Order ${orderId} confirmed via Paddle`);
        }
      } catch (err) {
        logger.error(`[paddle/webhook] Failed to confirm order ${orderId}`, { error: err });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
      }
    } else {
      logger.warn('[paddle/webhook] transaction.completed received without orderId in customData');
    }
  }

  return NextResponse.json({ received: true });
}
