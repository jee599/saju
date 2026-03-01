import { NextResponse } from 'next/server';
import { isValidFortuneInput } from '@saju/shared';
import { prisma } from '@saju/api/db';
import type { CheckoutCreateRequest, OrderSummary } from '../../../../lib/types';

/**
 * 테스트 모드: 단일 ₩5,900 고정 가격. 모델 선택 없음.
 * 나중에 원복 시 modelPrices 및 body.model 로직 복원.
 */
const FIXED_PRICE = 5900;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CheckoutCreateRequest;
    if (!body?.input || body?.productCode !== 'full' || !isValidFortuneInput(body.input)) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: '입력값이 유효하지 않습니다.' } },
        { status: 400 }
      );
    }

    // 1. Create FortuneRequest record
    const fortuneRequest = await prisma.fortuneRequest.create({
      data: {
        name: body.input.name.trim(),
        birthDate: body.input.birthDate,
        birthTime: body.input.birthTime ?? null,
        gender: body.input.gender,
        calendarType: body.input.calendarType,
      },
    });

    // 2. Create Order record linked to the FortuneRequest
    const order = await prisma.order.create({
      data: {
        requestId: fortuneRequest.id,
        productCode: body.productCode,
        amountKrw: FIXED_PRICE,
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
