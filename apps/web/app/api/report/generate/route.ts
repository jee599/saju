import { NextResponse } from 'next/server';
import { prisma } from '@saju/api/db';
import type { FortuneInput, ReportDetail } from '../../../../lib/types';
import { countReportChars } from '../../../../lib/reportLength';
import { sendReportEmail } from '../../../../lib/sendReportEmail';
import { generateViewToken } from '../../../../lib/viewToken';

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

// ── IP-based rate limiter for free reports (in-memory) ──
const FREE_RATE_LIMIT_MAX = 10;      // max requests
const FREE_RATE_LIMIT_WINDOW = 3600_000; // 1 hour in ms
const freeRateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkFreeRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = freeRateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    freeRateLimitMap.set(ip, { count: 1, resetTime: now + FREE_RATE_LIMIT_WINDOW });
  } else if (entry.count >= FREE_RATE_LIMIT_MAX) {
    return false;
  } else {
    entry.count += 1;
  }

  // Prevent unbounded memory growth: purge expired entries when map gets large
  if (freeRateLimitMap.size > 10_000) {
    for (const [key, val] of freeRateLimitMap) {
      if (now > val.resetTime) {
        freeRateLimitMap.delete(key);
      }
    }
  }

  return true;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const type = body?.type as string | undefined;

    // ── 무료: 성격만 생성 ──
    if (type === 'free') {
      // IP-based rate limiting for free reports
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? req.headers.get('x-real-ip')
        ?? 'unknown';
      if (!checkFreeRateLimit(ip)) {
        return NextResponse.json(
          { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again in 1 hour.' } },
          { status: 429 }
        );
      }

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
            viewToken: generateViewToken(order.id),
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
      const { generateFreePersonality, generateChunkedReport, getPersonalityDef, getReportTexts, convertLunarInputToSolar } = await import('../../../../lib/llmEngine');
      const pDef = getPersonalityDef(locale);

      // Convert lunar dates to solar before passing to LLM
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

      // 7. DB 저장 (idempotency guard: handle duplicate orderId)
      // NOTE: Prisma schema should add @@unique([orderId]) to Report model for full protection.
      try {
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
      } catch (dbErr: any) {
        // P2002 = Prisma unique constraint violation (concurrent duplicate request)
        if (dbErr?.code === 'P2002') {
          const existingReport = await prisma.report.findFirst({
            where: { orderId: order.id },
          });
          if (existingReport) {
            let existSections: any[] = [];
            let existRecommendations: string[] = [];
            try { existSections = JSON.parse(existingReport.sectionsJson); } catch {}
            try { existRecommendations = JSON.parse(existingReport.recommendationsJson); } catch {}

            return NextResponse.json({
              ok: true,
              data: {
                type: 'paid',
                report: {
                  reportId: existingReport.id,
                  orderId: order.id,
                  productCode: existingReport.productCode,
                  generatedAt: existingReport.generatedAt.toISOString(),
                  headline: existingReport.headline,
                  summary: existingReport.summary,
                  sections: existSections,
                  recommendations: existRecommendations,
                  disclaimer: existingReport.disclaimer,
                  charCount: countReportChars(existSections.map((s: any) => s.text ?? '').join('\n')),
                },
                viewToken: generateViewToken(order.id),
                cached: true,
              },
            });
          }
        }
        throw dbErr;
      }

      // 8. 이메일 발송 (첫 리포트)
      if (order.email && !order.emailSentAt) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://fortunelab.store";
        const reportUrl = `${baseUrl}/report/${order.id}?token=${generateViewToken(order.id)}`;
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
          viewToken: generateViewToken(order.id),
          cached: false,
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_TYPE', message: 'type must be "free" or "paid".' } },
      { status: 400 }
    );
  } catch (err) {
    console.error('[report/generate]', err);
    return NextResponse.json(
      { ok: false, error: { code: 'GENERATION_FAILED', message: 'Report generation failed.' } },
      { status: 500 }
    );
  }
}
