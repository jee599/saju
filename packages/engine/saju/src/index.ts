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
import { calculateSaju as calculateSajuKasi } from "@fullstackfamily/manseryeok";

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

// ── 오행 (Five Elements) ─────────────────────────────────

export type Element = "wood" | "fire" | "earth" | "metal" | "water";

export const ELEMENT_KR: Record<Element, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
export const ELEMENT_KR_NATIVE: Record<Element, string> = { wood: "나무", fire: "불", earth: "흙", metal: "쇠", water: "물" };
export const ELEMENT_EMOJI: Record<Element, string> = { wood: "🌿", fire: "🔥", earth: "⛰️", metal: "⚙️", water: "🌊" };

/** Stem → element mapping (천간 → 오행) */
const STEM_ELEMENT: Record<string, Element> = {
  "甲": "wood", "乙": "wood",
  "丙": "fire", "丁": "fire",
  "戊": "earth", "己": "earth",
  "庚": "metal", "辛": "metal",
  "壬": "water", "癸": "water",
};

/** Branch → element mapping (지지 → 오행) */
const BRANCH_ELEMENT: Record<string, Element> = {
  "寅": "wood", "卯": "wood",
  "巳": "fire", "午": "fire",
  "辰": "earth", "未": "earth", "戌": "earth", "丑": "earth",
  "申": "metal", "酉": "metal",
  "亥": "water", "子": "water",
};

/** Stem yin/yang (양간: 甲丙戊庚壬, 음간: 乙丁己辛癸) */
const STEM_POLARITY: Record<string, "yang" | "yin"> = {
  "甲": "yang", "乙": "yin",
  "丙": "yang", "丁": "yin",
  "戊": "yang", "己": "yin",
  "庚": "yang", "辛": "yin",
  "壬": "yang", "癸": "yin",
};

// ── Element Analysis ─────────────────────────────────────

export interface ElementBalance {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
}

export interface ElementAnalysis {
  /** Each element percentage (0-100, sum = 100) */
  balance: ElementBalance;
  /** Day master element */
  dayMaster: Element;
  /** Day master Korean hanja */
  dayMasterHanja: string;
  /** Yin/yang ratio */
  yinYang: { yang: number; yin: number }; // percentages
  /** Dominant element */
  dominant: Element;
  /** Weakest element */
  weakest: Element;
}

/**
 * Analyze five-element (오행) balance from four pillars.
 * Counts elements from all 8 characters (4 stems + 4 branches).
 */
export function analyzeElements(pillars: FourPillars): ElementAnalysis {
  const counts: ElementBalance = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  let yangCount = 0;
  let yinCount = 0;

  const allStems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem];
  const allBranches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch];

  for (const stem of allStems) {
    counts[STEM_ELEMENT[stem]!]++;
    if (STEM_POLARITY[stem] === "yang") yangCount++; else yinCount++;
  }
  for (const branch of allBranches) {
    counts[BRANCH_ELEMENT[branch]!]++;
  }

  const total = 8;
  const balance: ElementBalance = {
    wood: Math.round((counts.wood / total) * 100),
    fire: Math.round((counts.fire / total) * 100),
    earth: Math.round((counts.earth / total) * 100),
    metal: Math.round((counts.metal / total) * 100),
    water: Math.round((counts.water / total) * 100),
  };

  // Ensure percentages sum to 100
  const sum = balance.wood + balance.fire + balance.earth + balance.metal + balance.water;
  if (sum !== 100) {
    const entries = Object.entries(balance) as [Element, number][];
    entries.sort((a, b) => b[1] - a[1]);
    balance[entries[0]![0]] += (100 - sum);
  }

  const dayMaster = STEM_ELEMENT[pillars.day.stem]!;
  const entries = Object.entries(counts) as [Element, number][];
  entries.sort((a, b) => b[1] - a[1]);

  return {
    balance,
    dayMaster,
    dayMasterHanja: ELEMENT_KR[dayMaster],
    yinYang: {
      yang: Math.round((yangCount / 4) * 100),
      yin: Math.round((yinCount / 4) * 100),
    },
    dominant: entries[0]![0],
    weakest: entries[entries.length - 1]![0],
  };
}

// ── Compatibility ────────────────────────────────────────

export interface CompatibilityResult {
  score: number; // 0-100
  myElement: Element;
  partnerElement: Element;
  relationship: string; // Korean description
  description: string;
}

/**
 * Calculate compatibility (궁합) between two people based on their four pillars.
 *
 * Scoring considers:
 * - 상생 (generating cycle) bonus
 * - 상극 (overcoming cycle) penalty
 * - Same element bonus
 * - Cosine similarity of element balance vectors
 * - Yin-yang complementarity bonus
 */
export function calculateCompatibility(
  myPillars: FourPillars,
  partnerPillars: FourPillars
): CompatibilityResult {
  const myAnalysis = analyzeElements(myPillars);
  const partnerAnalysis = analyzeElements(partnerPillars);
  const myEl = myAnalysis.dayMaster;
  const partnerEl = partnerAnalysis.dayMaster;

  let score = 50; // base

  // 상생 (generating cycle): wood→fire→earth→metal→water→wood (+20)
  const generating: Record<Element, Element> = {
    wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood"
  };
  if (generating[myEl] === partnerEl || generating[partnerEl] === myEl) score += 20;

  // 상극 (overcoming cycle): wood→earth→water→fire→metal→wood (-10)
  const overcoming: Record<Element, Element> = {
    wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood"
  };
  if (overcoming[myEl] === partnerEl || overcoming[partnerEl] === myEl) score -= 10;

  // Same element (+10)
  if (myEl === partnerEl) score += 10;

  // Cosine similarity of element balance (0-20 points)
  const myVec = [myAnalysis.balance.wood, myAnalysis.balance.fire, myAnalysis.balance.earth, myAnalysis.balance.metal, myAnalysis.balance.water];
  const pVec = [partnerAnalysis.balance.wood, partnerAnalysis.balance.fire, partnerAnalysis.balance.earth, partnerAnalysis.balance.metal, partnerAnalysis.balance.water];
  const dot = myVec.reduce((s, v, i) => s + v * pVec[i]!, 0);
  const magA = Math.sqrt(myVec.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(pVec.reduce((s, v) => s + v * v, 0));
  const cosine = magA && magB ? dot / (magA * magB) : 0;
  score += Math.round(cosine * 20);

  // Yin-yang harmony (+10 if complementary)
  const myDayStem = myPillars.day.stem;
  const partnerDayStem = partnerPillars.day.stem;
  if (STEM_POLARITY[myDayStem] !== STEM_POLARITY[partnerDayStem]) score += 10;

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  // Score-based descriptions
  const descriptions: [number, string][] = [
    [90, "천생연분! 서로의 부족한 기운을 완벽히 채워주는 관계입니다."],
    [80, "좋은 궁합! 서로를 성장시키는 에너지가 있습니다."],
    [70, "무난한 궁합. 서로의 차이를 이해하면 더 좋아집니다."],
    [60, "흥미로운 궁합. 다름에서 배움이 있는 관계입니다."],
    [50, "보통 궁합. 노력하면 좋은 파트너가 됩니다."],
    [40, "성장하는 궁합. 서로에게 자극이 되는 관계입니다."],
    [30, "도전적인 궁합. 하지만 그만큼 배울 것도 많습니다."],
    [20, "독특한 궁합. 서로 다른 세계를 보여주는 관계입니다."],
    [10, "역동적인 궁합. 함께하면 예상치 못한 시너지가 납니다."],
    [0, "특별한 궁합. 만남 자체가 의미 있는 인연입니다."],
  ];

  // Element relationship names
  const relNames: Record<string, string> = {
    "wood-fire": "木과 火의 만남 — 서로를 밝혀주는 관계",
    "wood-earth": "木과 土의 만남 — 뿌리 내리는 관계",
    "wood-metal": "木과 金의 만남 — 단련하고 성장하는 관계",
    "wood-water": "木과 水의 만남 — 서로를 성장시키는 관계",
    "fire-earth": "火와 土의 만남 — 따뜻하게 품는 관계",
    "fire-metal": "火와 金의 만남 — 서로를 정제하는 관계",
    "fire-water": "火와 水의 만남 — 균형을 찾는 관계",
    "earth-metal": "土와 金의 만남 — 단단하게 뿌리내리는 관계",
    "earth-water": "土와 水의 만남 — 흐름을 조절하는 관계",
    "metal-water": "金과 水의 만남 — 깊은 지혜를 나누는 관계",
  };

  const key = [myEl, partnerEl].sort().join("-");
  const sameElNames: Record<Element, string> = {
    wood: "木과 木 — 함께 숲을 이루는 관계",
    fire: "火와 火 — 서로를 더 밝히는 관계",
    earth: "土와 土 — 견고한 대지를 이루는 관계",
    metal: "金과 金 — 강인한 의지를 나누는 관계",
    water: "水와 水 — 깊은 이해로 흐르는 관계",
  };

  const relationship = myEl === partnerEl ? sameElNames[myEl] : (relNames[key] ?? `${ELEMENT_KR[myEl]}과 ${ELEMENT_KR[partnerEl]}의 만남`);
  const description = descriptions.find(([min]) => score >= min)?.[1] ?? descriptions[descriptions.length - 1]![1];

  return { score, myElement: myEl, partnerElement: partnerEl, relationship, description };
}

// ── Result type ──────────────────────────────────────────

export interface SajuResult {
  input: SajuInput;
  pillars: FourPillars;
  /** Five-element (오행) analysis derived from pillars */
  elements: ElementAnalysis;
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

  // Prefer KASI-based 만세력 calculation with true-solar-time correction for Korean users.
  // Fallback to lunar-typescript outside manseryeok supported range.
  let pillars: FourPillars;

  if (year >= 1900 && year <= 2050) {
    const saju = calculateSajuKasi(year, month, day, hour, minute, {
      applyTimeCorrection: true,
      longitude: 127, // Seoul baseline
    });

    pillars = {
      year: parsePillar(saju.yearPillarHanja),
      month: parsePillar(saju.monthPillarHanja),
      day: parsePillar(saju.dayPillarHanja),
      hour: parsePillar(saju.hourPillarHanja),
    };
  } else {
    const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
    const lunar = solar.getLunar();
    const bazi = lunar.getEightChar();

    pillars = {
      year: parsePillar(bazi.getYear()),
      month: parsePillar(bazi.getMonth()),
      day: parsePillar(bazi.getDay()),
      hour: parsePillar(bazi.getTime()),
    };
  }

  return {
    input,
    pillars,
    elements: analyzeElements(pillars),
  };
}
