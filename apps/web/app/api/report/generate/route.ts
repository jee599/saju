import { NextResponse } from 'next/server';
import { prisma } from '@saju/api/db';
import type { FortuneInput, ReportDetail } from '../../../../lib/types';
import { countReportChars } from '../../../../lib/reportLength';
import { sendReportEmail } from '../../../../lib/sendReportEmail';

/**
 * 리포트 생성 API (free / paid 듀얼)
 *
 * 무료: POST { type: "free", input: FortuneInput, locale?: string }
 *   → GPT-mini로 성격 1섹션만 생성, DB 저장 X
 *
 * 유료: POST { type: "paid", orderId: string, personalityText?: string }
 *   → Haiku 4청크(8섹션) + 성격(캐시 또는 GPT-mini 재생성)
 *   → 9섹션 전체 DB 저장 + 이메일 발송
 */

// Vercel serverless: 최대 5분
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const type = body?.type as string | undefined;

    // ── 무료: 성격만 생성 ──
    if (type === 'free') {
      const input = body?.input as FortuneInput | undefined;
      const locale = (body?.locale as string) ?? 'ko';
      if (!input?.name || !input?.birthDate || !input?.gender || !input?.calendarType) {
        return NextResponse.json(
          { ok: false, error: { code: 'INVALID_INPUT', message: '사용자 정보가 부족합니다.' } },
          { status: 400 }
        );
      }

      const { generateFreePersonality } = await import('../../../../lib/llmEngine');
      const result = await generateFreePersonality({ input, locale });

      return NextResponse.json({
        ok: true,
        data: {
          type: 'free',
          section: result.section,
        },
      });
    }

    // ── 유료: 9섹션 전체 생성 ──
    if (type === 'paid') {
      const orderId = body?.orderId as string | undefined;
      const personalityText = body?.personalityText as string | undefined;

      if (!orderId) {
        return NextResponse.json(
          { ok: false, error: { code: 'INVALID_REQUEST', message: 'orderId가 필요합니다.' } },
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
          { ok: false, error: { code: 'ORDER_NOT_FOUND', message: '확인된 주문을 찾을 수 없습니다.' } },
          { status: 404 }
        );
      }

      const locale = order.locale ?? 'ko';

      // 2. 이미 생성된 리포트 → 캐시 반환
      const existing = await prisma.report.findFirst({
        where: { orderId: order.id },
      });

      if (existing) {
        let sections: any[] = [];
        let recommendations: string[] = [];
        try { sections = JSON.parse(existing.sectionsJson); } catch {}
        try { recommendations = JSON.parse(existing.recommendationsJson); } catch {}

        return NextResponse.json({
          ok: true,
          data: {
            type: 'paid',
            report: {
              reportId: existing.id,
              orderId: order.id,
              productCode: existing.productCode,
              generatedAt: existing.generatedAt.toISOString(),
              headline: existing.headline,
              summary: existing.summary,
              sections,
              recommendations,
              disclaimer: existing.disclaimer,
              charCount: countReportChars(sections.map((s: any) => s.text ?? '').join('\n')),
            },
            cached: true,
          },
        });
      }

      // 3. FortuneInput 구성
      const input: FortuneInput = {
        name: order.request.name,
        birthDate: order.request.birthDate,
        birthTime: order.request.birthTime ?? undefined,
        gender: order.request.gender as FortuneInput['gender'],
        calendarType: order.request.calendarType as FortuneInput['calendarType'],
      };

      // 4. 성격 섹션 준비 (캐시 or 재생성)
      const { generateFreePersonality, generateChunkedReport, getPersonalityDef, getReportTexts } = await import('../../../../lib/llmEngine');
      const pDef = getPersonalityDef(locale);

      let personalitySection: { key: string; title: string; text: string };
      if (personalityText && personalityText.length > 100) {
        personalitySection = { key: pDef.key, title: pDef.title, text: personalityText };
      } else {
        const freeResult = await generateFreePersonality({ input, locale });
        personalitySection = freeResult.section;
      }

      // 5. Haiku 4청크 = 8섹션 생성
      const chunkedReport = await generateChunkedReport({
        orderId: order.id,
        input,
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

      // 7. DB 저장
      await prisma.report.create({
        data: {
          orderId: order.id,
          model: 'haiku',
          productCode: order.productCode,
          tier: 'paid',
          headline,
          summary,
          sectionsJson: JSON.stringify(allSections),
          recommendationsJson: JSON.stringify(chunkedReport.recommendations),
          disclaimer,
          generatedAt: new Date(),
        },
      });

      // 8. 이메일 발송 (첫 리포트)
      if (order.email && !order.emailSentAt) {
        const reportUrl = `https://fortunelab.store/report/${order.id}`;
        sendReportEmail({
          to: order.email,
          userName: input.name,
          headline,
          summary,
          sections: allSections,
          recommendations: chunkedReport.recommendations,
          disclaimer,
          reportUrl,
        })
          .then(async (result) => {
            if (result.success) {
              await prisma.order.update({
                where: { id: order.id },
                data: { emailSentAt: new Date() },
              }).catch(() => {});
            }
          })
          .catch((err) => console.error('[report/generate] Email error:', err));
      }

      return NextResponse.json({
        ok: true,
        data: {
          type: 'paid',
          report: {
            reportId: `rep_${order.id}`,
            orderId: order.id,
            productCode: order.productCode,
            generatedAt: new Date().toISOString(),
            headline,
            summary,
            sections: allSections,
            recommendations: chunkedReport.recommendations,
            disclaimer,
            charCount,
          },
          cached: false,
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_TYPE', message: 'type은 "free" 또는 "paid"여야 합니다.' } },
      { status: 400 }
    );
  } catch (err) {
    console.error('[report/generate]', err);
    return NextResponse.json(
      { ok: false, error: { code: 'GENERATION_FAILED', message: err instanceof Error ? err.message : '리포트 생성 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
