export type ReportTier = "free" | "paid";

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
  free: { min: 150, max: 620, target: 280 },
  paid: { min: 4800, max: 11000, target: 7200 }
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
