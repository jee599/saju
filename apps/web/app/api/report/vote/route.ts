import { NextResponse } from 'next/server';
import { prisma } from '@saju/api/db';

/**
 * 모델 투표 API
 * POST { orderId, modelKey, voterId } — 투표 토글 (있으면 삭제, 없으면 생성)
 * GET ?orderId=xxx — 해당 주문의 모든 투표 집계
 */

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      orderId?: string;
      modelKey?: string;
      voterId?: string;
    };

    if (!body?.orderId || !body?.modelKey || !body?.voterId) {
      return NextResponse.json(
        { ok: false, error: 'orderId, modelKey, voterId 필요' },
        { status: 400 }
      );
    }

    // 토글: 이미 있으면 삭제 (투표 취소), 없으면 생성
    const existing = await prisma.modelVote.findUnique({
      where: {
        orderId_modelKey_voterId: {
          orderId: body.orderId,
          modelKey: body.modelKey,
          voterId: body.voterId,
        },
      },
    });

    if (existing) {
      await prisma.modelVote.delete({ where: { id: existing.id } });
    } else {
      await prisma.modelVote.create({
        data: {
          orderId: body.orderId,
          modelKey: body.modelKey,
          voterId: body.voterId,
        },
      });
    }

    // 현재 투표 집계 반환
    const votes = await prisma.modelVote.groupBy({
      by: ['modelKey'],
      where: { orderId: body.orderId },
      _count: { modelKey: true },
    });

    const myVotes = await prisma.modelVote.findMany({
      where: { orderId: body.orderId, voterId: body.voterId },
      select: { modelKey: true },
    });

    return NextResponse.json({
      ok: true,
      data: {
        counts: Object.fromEntries(votes.map((v) => [v.modelKey, v._count.modelKey])),
        myVotes: myVotes.map((v) => v.modelKey),
        toggled: !existing, // true = 투표 추가됨, false = 투표 취소됨
      },
    });
  } catch (err) {
    console.error('[report/vote] POST', err);
    return NextResponse.json(
      { ok: false, error: '투표 처리 실패' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const voterId = searchParams.get('voterId');

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: 'orderId 필요' },
        { status: 400 }
      );
    }

    const votes = await prisma.modelVote.groupBy({
      by: ['modelKey'],
      where: { orderId },
      _count: { modelKey: true },
    });

    const myVotes = voterId
      ? await prisma.modelVote.findMany({
          where: { orderId, voterId },
          select: { modelKey: true },
        })
      : [];

    return NextResponse.json({
      ok: true,
      data: {
        counts: Object.fromEntries(votes.map((v) => [v.modelKey, v._count.modelKey])),
        myVotes: myVotes.map((v) => v.modelKey),
      },
    });
  } catch (err) {
    console.error('[report/vote] GET', err);
    return NextResponse.json(
      { ok: false, error: '투표 조회 실패' },
      { status: 500 }
    );
  }
}
