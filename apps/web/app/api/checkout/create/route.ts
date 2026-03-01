import { NextResponse } from 'next/server';
import { isValidFortuneInput, getCountryByLocale } from '@saju/shared';
import { prisma } from '@saju/api/db';
import type { CheckoutCreateRequest, OrderSummary } from '../../../../lib/types';

/**
 * Generic checkout/create — used for Korean Toss (test mode) and fallback.
 * For Stripe countries, the frontend uses /api/checkout/stripe/create instead.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CheckoutCreateRequest & { locale?: string };
    if (!body?.input || body?.productCode !== 'full' || !isValidFortuneInput(body.input)) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: '입력값이 유효하지 않습니다.' } },
        { status: 400 }
      );
    }

    const locale = body.locale ?? 'ko';
    const country = getCountryByLocale(locale);

    // Create FortuneRequest record
    const fortuneRequest = await prisma.fortuneRequest.create({
      data: {
        name: body.input.name.trim(),
        birthDate: body.input.birthDate,
        birthTime: body.input.birthTime ?? null,
        gender: body.input.gender,
        calendarType: body.input.calendarType,
      },
    });

    // Create Order record
    const order = await prisma.order.create({
      data: {
        requestId: fortuneRequest.id,
        productCode: body.productCode,
        amountKrw: country.currency === 'KRW' ? country.pricing.saju.premium : 0,
        amount: country.pricing.saju.premium,
        currency: country.currency,
        countryCode: country.code,
        locale,
        paymentProvider: country.paymentProvider,
        status: 'created',
        email: body.email?.trim() || null,
      },
    });

    const orderSummary: OrderSummary = {
      orderId: order.id,
      productCode: order.productCode as OrderSummary['productCode'],
      amountKrw: order.amountKrw,
      status: order.status as OrderSummary['status'],
      createdAt: order.createdAt.toISOString(),
    };

    return NextResponse.json({ ok: true, data: { order: orderSummary } });
  } catch (err) {
    console.error('[checkout/create]', err);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: '결제 생성 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
