/**
 * Report retention policy utility.
 *
 * 무료 리포트: 생성일 + 90일 후 자동 삭제 대상
 * 유료 리포트: expiresAt = null → 영구 보관
 *
 * Soft-delete: deletedAt 를 설정하여 복구 가능성 유지.
 * Hard-delete: 크론에서 deletedAt > 30일인 건을 물리 삭제.
 */

import { PrismaClient } from "@prisma/client";

const FREE_RETENTION_DAYS = 90;
const HARD_DELETE_GRACE_DAYS = 30;

/**
 * 무료 리포트 생성 시 expiresAt 계산.
 * 유료 리포트면 null 반환 (영구 보관).
 */
export const calcExpiresAt = (isPaid: boolean, generatedAt: Date = new Date()): Date | null => {
  if (isPaid) return null;
  const d = new Date(generatedAt);
  d.setDate(d.getDate() + FREE_RETENTION_DAYS);
  return d;
};

export type RetentionStats = {
  softDeleted: number;
  hardDeleted: number;
};

/**
 * 만료된 리포트를 soft-delete + grace period 지난 건을 hard-delete.
 * Vercel Cron이나 Supabase pg_cron에서 호출.
 */
export const runRetentionCleanup = async (prisma: PrismaClient): Promise<RetentionStats> => {
  const now = new Date();

  // Step 1: Soft-delete expired reports (expiresAt <= now AND deletedAt IS NULL)
  const softDeleteResult = await prisma.report.updateMany({
    where: {
      expiresAt: { lte: now },
      deletedAt: null,
    },
    data: {
      deletedAt: now,
    },
  });

  // Step 2: Hard-delete reports that have been soft-deleted for > 30 days
  const hardDeleteCutoff = new Date(now);
  hardDeleteCutoff.setDate(hardDeleteCutoff.getDate() - HARD_DELETE_GRACE_DAYS);

  const hardDeleteResult = await prisma.report.deleteMany({
    where: {
      deletedAt: { lte: hardDeleteCutoff },
    },
  });

  return {
    softDeleted: softDeleteResult.count,
    hardDeleted: hardDeleteResult.count,
  };
};

/**
 * 유료 결제 완료 시 expiresAt 를 null로 업그레이드 (영구 보관).
 */
export const upgradeToPermenent = async (
  prisma: PrismaClient,
  reportId: string
): Promise<void> => {
  await prisma.report.update({
    where: { id: reportId },
    data: { expiresAt: null, deletedAt: null },
  });
};

/**
 * 리포트의 보관 상태 정보.
 */
export type RetentionInfo = {
  isPermanent: boolean;
  expiresAt: Date | null;
  daysRemaining: number | null;
  isExpired: boolean;
};

export const getRetentionInfo = (report: { expiresAt: Date | null; deletedAt: Date | null }): RetentionInfo => {
  if (!report.expiresAt) {
    return { isPermanent: true, expiresAt: null, daysRemaining: null, isExpired: false };
  }
  const now = new Date();
  const diff = report.expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  return {
    isPermanent: false,
    expiresAt: report.expiresAt,
    daysRemaining,
    isExpired: diff <= 0 || report.deletedAt !== null,
  };
};

export { FREE_RETENTION_DAYS, HARD_DELETE_GRACE_DAYS };
