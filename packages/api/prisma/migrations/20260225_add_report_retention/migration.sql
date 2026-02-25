-- Report retention policy: 무료 90일 보관 + 유료 영구
ALTER TABLE "Report" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "Report" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Index for efficient cleanup queries
CREATE INDEX "Report_expiresAt_deletedAt_idx" ON "Report" ("expiresAt", "deletedAt");
