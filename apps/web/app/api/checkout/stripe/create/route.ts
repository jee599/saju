import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { isValidFortuneInput, getCountryByLocale } from '@saju/shared';
import { prisma } from '@saju/api/db';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

interface StripeCheckoutBody {
  productCode: string;
  input: {
    name: string;
    birthDate: string;
    birthTime?: string;
    gender: string;
    calendarType: string;
  };
  email?: string;
  locale?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as StripeCheckoutBody;
    if (!body?.input || body?.productCode !== 'full' || !isValidFortuneInput(body.input as any)) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid input.' } },
        { status: 400 }
      );
    }

    const locale = body.locale ?? 'en';
    const country = getCountryByLocale(locale);

    // Create FortuneRequest
    const fortuneRequest = await prisma.fortuneRequest.create({
      data: {
        name: body.input.name.trim(),
        birthDate: body.input.birthDate,
        birthTime: body.input.birthTime ?? null,
        gender: body.input.gender,
        calendarType: body.input.calendarType,
      },
    });

    // Create Order
    const order = await prisma.order.create({
      data: {
        requestId: fortuneRequest.id,
        productCode: body.productCode,
        amountKrw: 0, // Not KRW
        amount: country.pricing.saju.premium,
        currency: country.currency,
        countryCode: country.code,
        locale,
        paymentProvider: 'stripe',
        status: 'created',
        email: body.email?.trim() || null,
      },
    });

    // Map locale → Stripe locale
    const stripeLocaleMap: Record<string, string> = {
      ko: 'ko', en: 'en', ja: 'ja', zh: 'zh', th: 'th', vi: 'vi', id: 'id', hi: 'en',
    };

    // Determine amount for Stripe (in smallest currency unit)
    // For zero-decimal currencies (KRW, JPY, VND, IDR), amount is as-is
    // For 2-decimal currencies (USD, THB, CNY, INR), amount is already in smallest unit
    const stripeAmount = country.pricing.saju.premium;

    // Create Stripe Checkout Session
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      locale: (stripeLocaleMap[locale] ?? 'auto') as Stripe.Checkout.SessionCreateParams.Locale,
      line_items: [
        {
          price_data: {
            currency: country.currency.toLowerCase(),
            unit_amount: stripeAmount,
            product_data: {
              name: locale === 'ko' ? 'AI 사주 분석 리포트' : 'AI BaZi Analysis Report',
              description: country.priceLabel,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: body.email || undefined,
      metadata: {
        orderId: order.id,
        locale,
        countryCode: country.code,
      },
      success_url: `${origin}/loading-analysis?orderId=${order.id}`,
      cancel_url: `${origin}/paywall?name=${encodeURIComponent(body.input.name)}&birthDate=${body.input.birthDate}&birthTime=${body.input.birthTime ?? ''}&gender=${body.input.gender}&calendarType=${body.input.calendarType}`,
    });

    // Store Stripe session ID
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentId: session.id },
    });

    return NextResponse.json({
      ok: true,
      data: {
        checkoutUrl: session.url,
        orderId: order.id,
      },
    });
  } catch (err) {
    console.error('[stripe/create]', err);
    return NextResponse.json(
      { ok: false, error: { code: 'STRIPE_ERROR', message: 'Failed to create checkout session.' } },
      { status: 500 }
    );
  }
}
