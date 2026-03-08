/**
 * Shared helpers for report generation route — existing report lookup, response formatting
 */
import { NextResponse } from 'next/server';
import { prisma } from '@saju/api/db';
import { countReportChars } from '../../../../lib/reportLength';
import { generateViewToken } from '../../../../lib/viewToken';

/** Look up existing report for an order and return parsed data if found */
export async function findExistingReport(orderId: string) {
  const existing = await prisma.report.findFirst({
    where: { orderId },
  });
  if (!existing) return null;

  let sections: any[] = [];
  let recommendations: string[] = [];
  try { sections = JSON.parse(existing.sectionsJson); } catch {}
  try { recommendations = JSON.parse(existing.recommendationsJson); } catch {}

  return { report: existing, sections, recommendations };
}

/** Format a cached/existing report into a NextResponse */
export function formatExistingReportResponse(
  report: any,
  orderId: string,
  sections: any[],
  recommendations: string[],
) {
  return NextResponse.json({
    ok: true,
    data: {
      type: 'paid',
      report: {
        reportId: report.id,
        orderId,
        productCode: report.productCode,
        generatedAt: report.generatedAt.toISOString(),
        headline: report.headline,
        summary: report.summary,
        sections,
        recommendations,
        disclaimer: report.disclaimer,
        charCount: countReportChars(sections.map((s: any) => s.text ?? '').join('\n')),
      },
      viewToken: generateViewToken(orderId),
      cached: true,
    },
  });
}

/** Format a newly generated report into a NextResponse */
export function formatNewReportResponse(params: {
  orderId: string;
  productCode: string;
  headline: string;
  summary: string;
  sections: Array<{ key: string; title: string; text: string }>;
  recommendations: string[];
  disclaimer: string;
  charCount: number;
}) {
  return NextResponse.json({
    ok: true,
    data: {
      type: 'paid',
      report: {
        reportId: `rep_${params.orderId}`,
        orderId: params.orderId,
        productCode: params.productCode,
        generatedAt: new Date().toISOString(),
        headline: params.headline,
        summary: params.summary,
        sections: params.sections,
        recommendations: params.recommendations,
        disclaimer: params.disclaimer,
        charCount: params.charCount,
      },
      viewToken: generateViewToken(params.orderId),
      cached: false,
    },
  });
}
