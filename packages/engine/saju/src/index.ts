/**
 * @saju/engine-saju — 사주(四柱) 계산 엔진
 *
 * Primary calculation source: lunar-typescript (A2)
 * Ground truth verification: mansae-ryeok website snapshots (A1)
 *
 * Conventions:
 * - Timezone: Asia/Seoul (KST, UTC+9) — fixed
 * - Day boundary: midnight (00:00)
 * - Hour system: standard (23:00~01:00 = 子時, day does NOT advance at 23:00)
 * - Year pillar changes at exact 입춘 time, not Jan 1
 * - Month pillar changes at exact 절기 (solar term) time
 */

import { Solar } from "lunar-typescript";

// ── Types ──────────────────────────────────────────────

/** 천간 Heavenly Stems */
export const STEMS_KR = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
export const STEMS_HANJA = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;

/** 지지 Earthly Branches */
export const BRANCHES_KR = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;
export const BRANCHES_HANJA = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

export type Stem = (typeof STEMS_KR)[number];
export type Branch = (typeof BRANCHES_KR)[number];
export type StemHanja = (typeof STEMS_HANJA)[number];
export type BranchHanja = (typeof BRANCHES_HANJA)[number];

export interface Pillar {
  stem: StemHanja;
  branch: BranchHanja;
  full: string;       // e.g. "甲子"
  stemKr: Stem;
  branchKr: Branch;
  fullKr: string;     // e.g. "갑자"
}

export interface FourPillars {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
}

export interface SajuInput {
  year: number;
  month: number;   // 1-12
  day: number;     // 1-31
  hour: number;    // 0-23
  minute: number;  // 0-59
}

export interface SajuResult {
  input: SajuInput;
  pillars: FourPillars;
}

// ── Helpers ────────────────────────────────────────────

function parsePillar(pillarStr: string): Pillar {
  const stem = pillarStr[0] as StemHanja;
  const branch = pillarStr[1] as BranchHanja;
  const stemIdx = STEMS_HANJA.indexOf(stem);
  const branchIdx = BRANCHES_HANJA.indexOf(branch);

  if (stemIdx === -1 || branchIdx === -1) {
    throw new Error(`Invalid pillar string: "${pillarStr}"`);
  }

  return {
    stem,
    branch,
    full: pillarStr,
    stemKr: STEMS_KR[stemIdx]!,
    branchKr: BRANCHES_KR[branchIdx]!,
    fullKr: `${STEMS_KR[stemIdx]!}${BRANCHES_KR[branchIdx]!}`,
  };
}

// ── Main API ───────────────────────────────────────────

/**
 * Calculate four pillars (사주) from solar calendar input.
 *
 * Uses lunar-typescript internally for exact 입춘/절기 boundary handling.
 * Timezone is fixed to Asia/Seoul.
 */
export function calculateFourPillars(input: SajuInput): SajuResult {
  const { year, month, day, hour, minute } = input;

  // Validate input ranges
  if (year < 1900 || year > 2100) throw new RangeError(`year must be 1900-2100, got ${year}`);
  if (month < 1 || month > 12) throw new RangeError(`month must be 1-12, got ${month}`);
  if (day < 1 || day > 31) throw new RangeError(`day must be 1-31, got ${day}`);
  if (hour < 0 || hour > 23) throw new RangeError(`hour must be 0-23, got ${hour}`);
  if (minute < 0 || minute > 59) throw new RangeError(`minute must be 0-59, got ${minute}`);

  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const bazi = lunar.getEightChar();

  return {
    input,
    pillars: {
      year: parsePillar(bazi.getYear()),
      month: parsePillar(bazi.getMonth()),
      day: parsePillar(bazi.getDay()),
      hour: parsePillar(bazi.getTime()),
    },
  };
}
