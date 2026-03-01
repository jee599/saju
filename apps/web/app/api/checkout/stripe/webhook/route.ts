import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@saju/api/db';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;

    if (orderId && session.payment_status === 'paid') {
      try {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'confirmed',
            confirmedAt: new Date(),
            paymentId: session.id,
          },
        });
        console.log(`[stripe/webhook] Order ${orderId} confirmed via Stripe`);
      } catch (err) {
        console.error(`[stripe/webhook] Failed to confirm order ${orderId}:`, err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
