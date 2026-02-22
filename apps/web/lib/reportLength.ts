export type ReportTier = "free" | "standard" | "deep";

export interface ReportLengthRule {
  min: number;
  max: number;
  target: number;
}

export interface ReportLengthInfo extends ReportLengthRule {
  tier: ReportTier;
  count: number;
  inRange: boolean;
}

export const REPORT_LENGTH_RULES: Record<ReportTier, ReportLengthRule> = {
  free: { min: 600, max: 1200, target: 860 },
  standard: { min: 3000, max: 6000, target: 4200 },
  deep: { min: 8000, max: 15000, target: 9800 }
};

export const countReportChars = (text: string): number => text.replace(/\s+/g, "").length;

export const buildLengthInfo = (tier: ReportTier, text: string): ReportLengthInfo => {
  const rule = REPORT_LENGTH_RULES[tier];
  const count = countReportChars(text);
  return {
    tier,
    count,
    min: rule.min,
    max: rule.max,
    target: rule.target,
    inRange: count >= rule.min && count <= rule.max
  };
};

export const formatLengthDebug = (info: ReportLengthInfo): string =>
  `${info.tier} ${info.count}자 (기준 ${info.min}~${info.max})`;
