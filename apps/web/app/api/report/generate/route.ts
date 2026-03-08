import { NextResponse } from 'next/server';
import { prisma } from '@saju/api/db';
import type { FortuneInput, ReportDetail } from '../../../../lib/types';
import { countReportChars } from '../../../../lib/reportLength';
import { sendReportEmail } from '../../../../lib/sendReportEmail';
import { generateViewToken } from '../../../../lib/viewToken';
import { logger } from '../../../../lib/logger';
import {
  findExistingReport,
  formatExistingReportResponse,
  formatNewReportResponse,
} from './helpers';

/**
 * 리포트 생성 API (free / paid 듀얼)
 *
 * 무료: POST { type: "free", input: FortuneInput, locale?: string }
 * 유료: POST { type: "paid", orderId: string, personalityText?: string }
 */

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const type = body?.type as string | undefined;

    if (type === 'free') return handleFreeReport(body);
    if (type === 'paid') return handlePaidReport(body);

    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_TYPE', message: 'type must be "free" or "paid".' } },
      { status: 400 }
    );
  } catch (err) {
    logger.error('[report/generate]', { error: err });
    return NextResponse.json(
      { ok: false, error: { code: 'GENERATION_FAILED', message: 'Report generation failed.' } },
      { status: 500 }
    );
  }
}

// ── 무료: 성격만 생성 ──
async function handleFreeReport(body: any) {
  const input = body?.input as FortuneInput | undefined;
  const locale = (body?.locale as string) ?? 'ko';
  if (!input?.name || !input?.birthDate || !input?.gender || !input?.calendarType) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_INPUT', message: 'Insufficient user information.' } },
      { status: 400 }
    );
  }

  const { generateFreePersonality } = await import('../../../../lib/llmEngine');
  const result = await generateFreePersonality({ input, locale });

  return NextResponse.json({ ok: true, data: { type: 'free', section: result.section } });
}

// ── 유료: 9섹션 전체 생성 ──
async function handlePaidReport(body: any) {
  const orderId = body?.orderId as string | undefined;
  const personalityText = body?.personalityText as string | undefined;

  if (!orderId) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_REQUEST', message: 'orderId is required.' } },
      { status: 400 }
    );
  }

  // 1. 주문 확인
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { request: true },
  });

  if (!order || order.status !== 'confirmed') {
    return NextResponse.json(
      { ok: false, error: { code: 'ORDER_NOT_FOUND', message: 'Confirmed order not found.' } },
      { status: 404 }
    );
  }

  const locale = order.locale ?? 'ko';

  // 2. 이미 생성된 리포트 → 캐시 반환
  const cached = await findExistingReport(order.id);
  if (cached) {
    return formatExistingReportResponse(cached.report, order.id, cached.sections, cached.recommendations);
  }

  // 3. FortuneInput 구성
  const input: FortuneInput = {
    name: order.request.name,
    birthDate: order.request.birthDate,
    birthTime: order.request.birthTime ?? undefined,
    gender: order.request.gender as FortuneInput['gender'],
    calendarType: order.request.calendarType as FortuneInput['calendarType'],
  };

  // 4. LLM 함수 임포트 + 성격 섹션 준비
  const { generateFreePersonality, generateChunkedReport, getPersonalityDef, getReportTexts, convertLunarInputToSolar } = await import('../../../../lib/llmEngine');
  const pDef = getPersonalityDef(locale);
  const llmInput = convertLunarInputToSolar(input);

  let personalitySection: { key: string; title: string; text: string };
  if (personalityText && personalityText.length > 100) {
    personalitySection = { key: pDef.key, title: pDef.title, text: personalityText };
  } else {
    const freeResult = await generateFreePersonality({ input: llmInput, locale });
    personalitySection = freeResult.section;
  }

  // 5. Haiku 4청크 = 8섹션 생성
  const chunkedReport = await generateChunkedReport({
    orderId: order.id,
    input: llmInput,
    productCode: order.productCode as ReportDetail['productCode'],
    targetModel: 'haiku',
    locale,
  });

  // 6. 성격 + 8섹션 합치기 (총 9섹션)
  const allSections = [personalitySection, ...chunkedReport.sections];
  const charCount = countReportChars(allSections.map(s => s.text).join('\n'));
  const texts = getReportTexts(locale, input.name, allSections.length);
  const headline = chunkedReport.headline || texts.headline;
  const summary = texts.summary;
  const disclaimer = chunkedReport.disclaimer || texts.disclaimer;

  // 7. DB 저장 (idempotency guard)
  try {
    await prisma.report.create({
      data: {
        orderId: order.id, model: 'haiku', productCode: order.productCode,
        tier: 'paid', headline, summary,
        sectionsJson: JSON.stringify(allSections),
        recommendationsJson: JSON.stringify(chunkedReport.recommendations),
        disclaimer, generatedAt: new Date(),
      },
    });
  } catch (dbErr: any) {
    if (dbErr?.code === 'P2002') {
      const dup = await findExistingReport(order.id);
      if (dup) {
        return formatExistingReportResponse(dup.report, order.id, dup.sections, dup.recommendations);
      }
    }
    throw dbErr;
  }

  // 8. 이메일 발송 (첫 리포트)
  if (order.email && !order.emailSentAt) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://fortunelab.store";
    const reportUrl = `${baseUrl}/report/${order.id}?token=${generateViewToken(order.id)}`;
    sendReportEmail({
      to: order.email, userName: input.name, headline, summary,
      sections: allSections, recommendations: chunkedReport.recommendations,
      disclaimer, reportUrl,
    })
      .then(async (result) => {
        if (result.success) {
          await prisma.order.update({ where: { id: order.id }, data: { emailSentAt: new Date() } }).catch(() => {});
        }
      })
      .catch((err) => logger.error('[report/generate] Email error', { error: err }));
  }

  return formatNewReportResponse({
    orderId: order.id, productCode: order.productCode,
    headline, summary, sections: allSections,
    recommendations: chunkedReport.recommendations, disclaimer, charCount,
  });
}
