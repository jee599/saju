import { NextResponse } from 'next/server';
import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import { isValidFortuneInput, getCountryByLocale } from '@saju/shared';
import { prisma } from '@saju/api/db';

function getPaddle() {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new Error('PADDLE_API_KEY is not set');
  const isProd = process.env.PADDLE_ENVIRONMENT === 'production';
  return new Paddle(key, { environment: isProd ? Environment.production : Environment.sandbox });
}

interface PaddleCheckoutBody {
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

const PRODUCT_NAMES: Record<string, string> = {
  ko: 'AI 사주 분석 리포트',
  ja: 'AI 四柱推命分析レポート',
  zh: 'AI 八字分析报告',
  th: 'รายงานวิเคราะห์ดวงชะตา AI',
  vi: 'Báo cáo phân tích Tứ Trụ AI',
  id: 'Laporan Analisis Empat Pilar AI',
  hi: 'AI कुंडली विश्लेषण रिपोर्ट',
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PaddleCheckoutBody;
    if (
      !body?.input ||
      body?.productCode !== 'full' ||
      !isValidFortuneInput(body.input as Parameters<typeof isValidFortuneInput>[0])
    ) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'Invalid input.' } },
        { status: 400 }
      );
    }

    const locale = body.locale ?? 'en';
    const country = getCountryByLocale(locale);
    const localePath = `/${locale}`;

    // Locale / IP-country mismatch logging
    const cfCountry = req.headers.get('cf-ipcountry');
    if (cfCountry && cfCountry.toLowerCase() !== country.code.toLowerCase()) {
      console.warn(
        `[paddle/create] locale-country mismatch: locale="${locale}" → country="${country.code}", cf-ipcountry="${cfCountry}"`
      );
    }

    const fortuneRequest = await prisma.fortuneRequest.create({
      data: {
        name: body.input.name.trim(),
        birthDate: body.input.birthDate,
        birthTime: body.input.birthTime ?? null,
        gender: body.input.gender,
        calendarType: body.input.calendarType,
      },
    });

    const order = await prisma.order.create({
      data: {
        requestId: fortuneRequest.id,
        productCode: body.productCode,
        amountKrw: 0,
        amount: country.pricing.saju.premium,
        currency: country.currency,
        countryCode: country.code,
        locale,
        paymentProvider: 'paddle',
        status: 'created',
        email: body.email?.trim() || null,
      },
    });

    const paddle = getPaddle();
    const origin =
      req.headers.get('origin') ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const productName = PRODUCT_NAMES[locale] ?? 'AI BaZi Analysis Report';

    const cancelParams = [
      `name=${encodeURIComponent(body.input.name)}`,
      `birthDate=${body.input.birthDate}`,
      `birthTime=${body.input.birthTime ?? ''}`,
      `gender=${body.input.gender}`,
      `calendarType=${body.input.calendarType}`,
    ].join('&');

    // Paddle amounts use the same smallest-denomination convention as Stripe:
    //   zero-decimal currencies (JPY, KRW, VND, IDR) → integer value
    //   2-decimal currencies (USD, CNY, THB, INR)    → value in cents/paise/etc.
    // country.pricing.saju.premium already stores the amount in this format.
    //
    // SDK type notes:
    //   - CurrencyCode enum values match ISO 4217 strings (e.g. "USD"); cast via any.
    //   - ITransactionCheckout only defines `url` (response field); Paddle REST API also
    //     accepts successUrl/failureUrl on create (SDK converts camelCase → snake_case).
    const transaction = await paddle.transactions.create({
      items: [
        {
          price: {
            description: country.priceLabel,
            name: productName,
            unitPrice: {
              currencyCode: country.currency as never,
              amount: String(country.pricing.saju.premium),
            },
            taxMode: 'exclusive',
            product: {
              name: productName,
              taxCategory: 'digital-goods',
            },
          } as never,
          quantity: 1,
        },
      ],
      customData: {
        orderId: order.id,
        locale,
        countryCode: country.code,
      },
      // ITransactionCheckout only defines `url` (response field); Paddle REST API also
      // accepts successUrl/failureUrl on create — the SDK converts camelCase → snake_case.
      checkout: {
        successUrl: `${origin}${localePath}/loading-analysis?orderId=${order.id}`,
        failureUrl: `${origin}${localePath}/paywall?${cancelParams}`,
      } as never,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentId: transaction.id },
    });

    return NextResponse.json({
      ok: true,
      data: {
        checkoutUrl: transaction.checkout?.url ?? null,
        orderId: order.id,
      },
    });
  } catch (err) {
    console.error('[paddle/create]', err);
    return NextResponse.json(
      { ok: false, error: { code: 'PADDLE_ERROR', message: 'Failed to create Paddle checkout.' } },
      { status: 500 }
    );
  }
}
