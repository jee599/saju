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

// ── Five Elements (오행) ─────────────────────────────────

export const FIVE_ELEMENTS = ["木", "火", "土", "金", "水"] as const;
export const FIVE_ELEMENTS_KR = ["목", "화", "토", "금", "수"] as const;
export const FIVE_ELEMENTS_EN = ["Wood", "Fire", "Earth", "Metal", "Water"] as const;
export const FIVE_ELEMENTS_EMOJI = ["🌿", "🔥", "⛰️", "⚙️", "🌊"] as const;

export type FiveElement = (typeof FIVE_ELEMENTS)[number];
export type FiveElementKr = (typeof FIVE_ELEMENTS_KR)[number];
export type FiveElementEn = (typeof FIVE_ELEMENTS_EN)[number];

/** 천간 → 오행 매핑 */
const STEM_TO_ELEMENT: Record<StemHanja, FiveElement> = {
  "甲": "木", "乙": "木",
  "丙": "火", "丁": "火",
  "戊": "土", "己": "土",
  "庚": "金", "辛": "金",
  "壬": "水", "癸": "水",
};

/** 지지 → 오행 매핑 */
const BRANCH_TO_ELEMENT: Record<BranchHanja, FiveElement> = {
  "子": "水",
  "丑": "土",
  "寅": "木",
  "卯": "木",
  "辰": "土",
  "巳": "火",
  "午": "火",
  "未": "土",
  "申": "金",
  "酉": "金",
  "戌": "土",
  "亥": "水",
};

// ── Five Element Interfaces ──────────────────────────────

export interface ElementAnalysis {
  elements: {
    wood: number;   // 0-100 percentage
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  elementCounts: {
    wood: number;   // raw count out of 8
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  dayMaster: {
    stem: StemHanja;
    element: FiveElement;
    elementKr: FiveElementKr;
    elementEn: FiveElementEn;
    emoji: string;
    isYang: boolean;
  };
  yinYang: {
    yang: number;   // 0-100 percentage
    yin: number;
  };
  excess: FiveElement[];    // elements over 25%
  deficient: FiveElement[]; // elements under 10% (or 0)
}

export interface CompatibilityResult {
  score: number;  // 0-100
  myElement: FiveElement;
  partnerElement: FiveElement;
  relationship: string; // '상생' | '상극' | '비화' | '중립'
  description: string;
}

// ── Five Element Functions ───────────────────────────────

/** Get the five element for a heavenly stem (천간). */
export function getStemElement(stem: StemHanja): FiveElement {
  return STEM_TO_ELEMENT[stem];
}

/** Get the five element for an earthly branch (지지). */
export function getBranchElement(branch: BranchHanja): FiveElement {
  return BRANCH_TO_ELEMENT[branch];
}

/** Check if a heavenly stem is yang (양). Even indices (甲丙戊庚壬) are yang. */
export function isYang(stem: StemHanja): boolean {
  const idx = STEMS_HANJA.indexOf(stem);
  return idx % 2 === 0;
}

/** Analyze five element distribution from four pillars. */
export function analyzeElements(pillars: FourPillars): ElementAnalysis {
  // Collect all 8 characters (4 stems + 4 branches)
  const allStems: StemHanja[] = [
    pillars.year.stem,
    pillars.month.stem,
    pillars.day.stem,
    pillars.hour.stem,
  ];
  const allBranches: BranchHanja[] = [
    pillars.year.branch,
    pillars.month.branch,
    pillars.day.branch,
    pillars.hour.branch,
  ];

  // Count elements
  const counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const elementKeyMap: Record<FiveElement, keyof typeof counts> = {
    "木": "wood",
    "火": "fire",
    "土": "earth",
    "金": "metal",
    "水": "water",
  };

  for (const stem of allStems) {
    const el = STEM_TO_ELEMENT[stem];
    counts[elementKeyMap[el]]++;
  }
  for (const branch of allBranches) {
    const el = BRANCH_TO_ELEMENT[branch];
    counts[elementKeyMap[el]]++;
  }

  // Calculate percentages (count / 8 * 100, rounded)
  const elements = {
    wood: Math.round(counts.wood / 8 * 100),
    fire: Math.round(counts.fire / 8 * 100),
    earth: Math.round(counts.earth / 8 * 100),
    metal: Math.round(counts.metal / 8 * 100),
    water: Math.round(counts.water / 8 * 100),
  };

  // Day master
  const dayMasterStem = pillars.day.stem;
  const dayMasterElement = STEM_TO_ELEMENT[dayMasterStem];
  const elementIdx = FIVE_ELEMENTS.indexOf(dayMasterElement);

  // Yin/Yang analysis
  let yangCount = 0;
  for (const stem of allStems) {
    if (isYang(stem)) yangCount++;
  }
  for (const branch of allBranches) {
    const branchIdx = BRANCHES_HANJA.indexOf(branch);
    if (branchIdx % 2 === 0) yangCount++;
  }
  const yangPct = Math.round(yangCount / 8 * 100);

  // Excess and deficient
  const excess: FiveElement[] = [];
  const deficient: FiveElement[] = [];
  for (const el of FIVE_ELEMENTS) {
    const key = elementKeyMap[el];
    const pct = elements[key];
    if (pct > 25) excess.push(el);
    if (pct < 10 || counts[key] === 0) deficient.push(el);
  }

  return {
    elements,
    elementCounts: { ...counts },
    dayMaster: {
      stem: dayMasterStem,
      element: dayMasterElement,
      elementKr: FIVE_ELEMENTS_KR[elementIdx]!,
      elementEn: FIVE_ELEMENTS_EN[elementIdx]!,
      emoji: FIVE_ELEMENTS_EMOJI[elementIdx]!,
      isYang: isYang(dayMasterStem),
    },
    yinYang: {
      yang: yangPct,
      yin: 100 - yangPct,
    },
    excess,
    deficient,
  };
}

// ── Compatibility ────────────────────────────────────────

/** 상생 cycle: 木→火→土→金→水→木 (generates / supports) */
const GENERATION_CYCLE: Record<FiveElement, FiveElement> = {
  "木": "火",
  "火": "土",
  "土": "金",
  "金": "水",
  "水": "木",
};

/** 상극 cycle: 木→土→水→火→金→木 (overcomes) */
const OVERCOMING_CYCLE: Record<FiveElement, FiveElement> = {
  "木": "土",
  "土": "水",
  "水": "火",
  "火": "金",
  "金": "木",
};

function getRelationship(a: FiveElement, b: FiveElement): string {
  if (a === b) return "비화";
  if (GENERATION_CYCLE[a] === b || GENERATION_CYCLE[b] === a) return "상생";
  if (OVERCOMING_CYCLE[a] === b || OVERCOMING_CYCLE[b] === a) return "상극";
  return "중립";
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return dot / denom;
}

function getDescription(score: number): string {
  if (score >= 90) return "천생연분! 서로의 부족한 기운을 완벽히 채워주는 관계입니다.";
  if (score >= 80) return "좋은 궁합! 서로를 성장시키는 에너지가 있습니다.";
  if (score >= 70) return "무난한 궁합. 서로의 차이를 이해하면 더 좋아집니다.";
  if (score >= 60) return "흥미로운 궁합. 다름에서 배움이 있는 관계입니다.";
  if (score >= 50) return "보통 궁합. 노력하면 좋은 파트너가 됩니다.";
  if (score >= 40) return "성장하는 궁합. 서로에게 자극이 되는 관계입니다.";
  if (score >= 30) return "도전적인 궁합. 하지만 그만큼 배울 것도 많습니다.";
  if (score >= 20) return "독특한 궁합. 서로 다른 세계를 보여주는 관계입니다.";
  if (score >= 10) return "역동적인 궁합. 함께하면 예상치 못한 시너지가 납니다.";
  return "특별한 궁합. 만남 자체가 의미 있는 인연입니다.";
}

/** Calculate compatibility score between two four-pillar charts. */
export function calculateCompatibility(
  myPillars: FourPillars,
  partnerPillars: FourPillars,
): CompatibilityResult {
  const myAnalysis = analyzeElements(myPillars);
  const partnerAnalysis = analyzeElements(partnerPillars);

  const myElement = myAnalysis.dayMaster.element;
  const partnerElement = partnerAnalysis.dayMaster.element;

  // Determine relationship
  const relationship = getRelationship(myElement, partnerElement);

  // Base score
  let score = 50;

  // Relationship bonus/penalty
  switch (relationship) {
    case "상생":
      score += 20;
      break;
    case "상극":
      score -= 10;
      break;
    case "비화":
      score += 5;
      break;
    // 중립: no change
  }

  // Element balance cosine similarity (0-15 points)
  const myVec = [
    myAnalysis.elements.wood,
    myAnalysis.elements.fire,
    myAnalysis.elements.earth,
    myAnalysis.elements.metal,
    myAnalysis.elements.water,
  ];
  const partnerVec = [
    partnerAnalysis.elements.wood,
    partnerAnalysis.elements.fire,
    partnerAnalysis.elements.earth,
    partnerAnalysis.elements.metal,
    partnerAnalysis.elements.water,
  ];
  const similarity = cosineSimilarity(myVec, partnerVec);
  score += Math.round(similarity * 15);

  // Yin-yang harmony: +10 if complementary (different yin/yang)
  if (myAnalysis.dayMaster.isYang !== partnerAnalysis.dayMaster.isYang) {
    score += 10;
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    myElement,
    partnerElement,
    relationship,
    description: getDescription(score),
  };
}
