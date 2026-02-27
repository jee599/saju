import { describe, it, expect } from "vitest";
import {
  getStemElement,
  getBranchElement,
  isYang,
  analyzeElements,
  calculateCompatibility,
  calculateFourPillars,
  FIVE_ELEMENTS,
  FIVE_ELEMENTS_KR,
  FIVE_ELEMENTS_EN,
  FIVE_ELEMENTS_EMOJI,
  type StemHanja,
  type BranchHanja,
  type FourPillars,
} from "../index";

describe("오행 Five Elements", () => {
  // ── getStemElement ──────────────────────────────────────

  describe("getStemElement — 천간 → 오행 매핑", () => {
    const expected: [StemHanja, string][] = [
      ["甲", "木"],
      ["乙", "木"],
      ["丙", "火"],
      ["丁", "火"],
      ["戊", "土"],
      ["己", "土"],
      ["庚", "金"],
      ["辛", "金"],
      ["壬", "水"],
      ["癸", "水"],
    ];

    for (const [stem, element] of expected) {
      it(`${stem} → ${element}`, () => {
        expect(getStemElement(stem)).toBe(element);
      });
    }
  });

  // ── getBranchElement ───────────────────────────────────

  describe("getBranchElement — 지지 → 오행 매핑", () => {
    const expected: [BranchHanja, string][] = [
      ["子", "水"],
      ["丑", "土"],
      ["寅", "木"],
      ["卯", "木"],
      ["辰", "土"],
      ["巳", "火"],
      ["午", "火"],
      ["未", "土"],
      ["申", "金"],
      ["酉", "金"],
      ["戌", "土"],
      ["亥", "水"],
    ];

    for (const [branch, element] of expected) {
      it(`${branch} → ${element}`, () => {
        expect(getBranchElement(branch)).toBe(element);
      });
    }
  });

  // ── isYang ─────────────────────────────────────────────

  describe("isYang — 양/음 판별", () => {
    const yangStems: StemHanja[] = ["甲", "丙", "戊", "庚", "壬"];
    const yinStems: StemHanja[] = ["乙", "丁", "己", "辛", "癸"];

    for (const stem of yangStems) {
      it(`${stem} is yang`, () => {
        expect(isYang(stem)).toBe(true);
      });
    }

    for (const stem of yinStems) {
      it(`${stem} is yin`, () => {
        expect(isYang(stem)).toBe(false);
      });
    }
  });

  // ── Constants ──────────────────────────────────────────

  describe("오행 상수 배열", () => {
    it("FIVE_ELEMENTS has 5 elements", () => {
      expect(FIVE_ELEMENTS).toHaveLength(5);
      expect(FIVE_ELEMENTS).toEqual(["木", "火", "土", "金", "水"]);
    });

    it("FIVE_ELEMENTS_KR has 5 elements", () => {
      expect(FIVE_ELEMENTS_KR).toHaveLength(5);
      expect(FIVE_ELEMENTS_KR).toEqual(["목", "화", "토", "금", "수"]);
    });

    it("FIVE_ELEMENTS_EN has 5 elements", () => {
      expect(FIVE_ELEMENTS_EN).toHaveLength(5);
      expect(FIVE_ELEMENTS_EN).toEqual(["Wood", "Fire", "Earth", "Metal", "Water"]);
    });

    it("FIVE_ELEMENTS_EMOJI has 5 elements", () => {
      expect(FIVE_ELEMENTS_EMOJI).toHaveLength(5);
    });
  });

  // ── analyzeElements ────────────────────────────────────

  describe("analyzeElements", () => {
    // Use a known birth date to get predictable pillars
    // 2024-02-04 18:00 → 甲辰年 丙寅月 戊戌日 辛酉時
    const result = calculateFourPillars({ year: 2024, month: 2, day: 4, hour: 18, minute: 0 });
    const analysis = analyzeElements(result.pillars);

    it("returns element percentages that sum to approximately 100", () => {
      const { wood, fire, earth, metal, water } = analysis.elements;
      // Due to rounding, sum might be 99, 100, or 101
      const sum = wood + fire + earth + metal + water;
      expect(sum).toBeGreaterThanOrEqual(97);
      expect(sum).toBeLessThanOrEqual(103);
    });

    it("elementCounts sum to 8", () => {
      const { wood, fire, earth, metal, water } = analysis.elementCounts;
      expect(wood + fire + earth + metal + water).toBe(8);
    });

    it("element percentages match raw counts", () => {
      const keys = ["wood", "fire", "earth", "metal", "water"] as const;
      for (const key of keys) {
        expect(analysis.elements[key]).toBe(
          Math.round(analysis.elementCounts[key] / 8 * 100),
        );
      }
    });

    it("dayMaster extracts day pillar stem correctly", () => {
      expect(analysis.dayMaster.stem).toBe(result.pillars.day.stem);
    });

    it("dayMaster element matches stem element", () => {
      expect(analysis.dayMaster.element).toBe(getStemElement(result.pillars.day.stem));
    });

    it("dayMaster has correct Korean element name", () => {
      const idx = FIVE_ELEMENTS.indexOf(analysis.dayMaster.element);
      expect(analysis.dayMaster.elementKr).toBe(FIVE_ELEMENTS_KR[idx]);
    });

    it("dayMaster has correct English element name", () => {
      const idx = FIVE_ELEMENTS.indexOf(analysis.dayMaster.element);
      expect(analysis.dayMaster.elementEn).toBe(FIVE_ELEMENTS_EN[idx]);
    });

    it("dayMaster isYang matches isYang function", () => {
      expect(analysis.dayMaster.isYang).toBe(isYang(result.pillars.day.stem));
    });

    it("yinYang percentages sum to 100", () => {
      expect(analysis.yinYang.yang + analysis.yinYang.yin).toBe(100);
    });

    it("excess contains elements over 25%", () => {
      for (const el of analysis.excess) {
        const key = { "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water" }[el] as keyof typeof analysis.elements;
        expect(analysis.elements[key]).toBeGreaterThan(25);
      }
    });

    it("deficient contains elements under 10% or with count 0", () => {
      for (const el of analysis.deficient) {
        const key = { "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water" }[el] as keyof typeof analysis.elements;
        const meetsCondition = analysis.elements[key] < 10 || analysis.elementCounts[key] === 0;
        expect(meetsCondition).toBe(true);
      }
    });

    // Verify specific known pillars: 甲辰年 丙寅月 戊戌日 辛酉時
    // Stems: 甲(木) 丙(火) 戊(土) 辛(金)
    // Branches: 辰(土) 寅(木) 戌(土) 酉(金)
    // Counts: 木=2, 火=1, 土=3, 金=2, 水=0
    it("correctly counts elements for 甲辰 丙寅 戊戌 辛酉", () => {
      expect(analysis.elementCounts.wood).toBe(2);
      expect(analysis.elementCounts.fire).toBe(1);
      expect(analysis.elementCounts.earth).toBe(3);
      expect(analysis.elementCounts.metal).toBe(2);
      expect(analysis.elementCounts.water).toBe(0);
    });

    it("correctly calculates percentages for known case", () => {
      // 2/8=25, 1/8=13 (rounded), 3/8=38, 2/8=25, 0/8=0
      expect(analysis.elements.wood).toBe(25);
      expect(analysis.elements.fire).toBe(13);
      expect(analysis.elements.earth).toBe(38);
      expect(analysis.elements.metal).toBe(25);
      expect(analysis.elements.water).toBe(0);
    });

    it("identifies 水 as deficient (count 0)", () => {
      expect(analysis.deficient).toContain("水");
    });

    it("identifies 土 as excess (38% > 25%)", () => {
      expect(analysis.excess).toContain("土");
    });
  });

  // ── calculateCompatibility ─────────────────────────────

  describe("calculateCompatibility", () => {
    // Person A: 2024-02-04 18:00 → 甲辰年 丙寅月 戊戌日 辛酉時 (day master 戊=土)
    const personA = calculateFourPillars({ year: 2024, month: 2, day: 4, hour: 18, minute: 0 });
    // Person B: 1990-05-15 10:00 → 庚午年 辛巳月 壬寅日 乙巳時 (day master 壬=水)
    const personB = calculateFourPillars({ year: 1990, month: 5, day: 15, hour: 10, minute: 0 });

    it("returns score in 0-100 range", () => {
      const result = calculateCompatibility(personA.pillars, personB.pillars);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("returns valid FiveElement for both parties", () => {
      const result = calculateCompatibility(personA.pillars, personB.pillars);
      expect(FIVE_ELEMENTS).toContain(result.myElement);
      expect(FIVE_ELEMENTS).toContain(result.partnerElement);
    });

    it("returns a valid relationship type", () => {
      const result = calculateCompatibility(personA.pillars, personB.pillars);
      expect(["상생", "상극", "비화", "중립"]).toContain(result.relationship);
    });

    it("returns a non-empty description", () => {
      const result = calculateCompatibility(personA.pillars, personB.pillars);
      expect(result.description.length).toBeGreaterThan(0);
    });

    it("상생 relationship scores higher than 상극", () => {
      // We need to construct pillar pairs that guarantee 상생 vs 상극
      // 상생: 木→火 (木 generates 火)
      // 상극: 木→土 (木 overcomes 土)

      // Find dates where day master is 木 and 火 (상생 pair)
      // 甲 = 木 yang, 丙 = 火 yang
      // We'll use the same partner for each to isolate the relationship effect

      // Person with 木 day master: use personB from above check its day master
      // Instead, let's create synthetic pillars for a controlled test
      const woodPillars: FourPillars = {
        year:  { stem: "甲", branch: "子", full: "甲子", stemKr: "갑", branchKr: "자", fullKr: "갑자" },
        month: { stem: "甲", branch: "子", full: "甲子", stemKr: "갑", branchKr: "자", fullKr: "갑자" },
        day:   { stem: "甲", branch: "子", full: "甲子", stemKr: "갑", branchKr: "자", fullKr: "갑자" },
        hour:  { stem: "甲", branch: "子", full: "甲子", stemKr: "갑", branchKr: "자", fullKr: "갑자" },
      };

      const firePillars: FourPillars = {
        year:  { stem: "丁", branch: "巳", full: "丁巳", stemKr: "정", branchKr: "사", fullKr: "정사" },
        month: { stem: "丁", branch: "巳", full: "丁巳", stemKr: "정", branchKr: "사", fullKr: "정사" },
        day:   { stem: "丁", branch: "巳", full: "丁巳", stemKr: "정", branchKr: "사", fullKr: "정사" },
        hour:  { stem: "丁", branch: "巳", full: "丁巳", stemKr: "정", branchKr: "사", fullKr: "정사" },
      };

      const earthPillars: FourPillars = {
        year:  { stem: "戊", branch: "丑", full: "戊丑", stemKr: "무", branchKr: "축", fullKr: "무축" },
        month: { stem: "戊", branch: "丑", full: "戊丑", stemKr: "무", branchKr: "축", fullKr: "무축" },
        day:   { stem: "戊", branch: "丑", full: "戊丑", stemKr: "무", branchKr: "축", fullKr: "무축" },
        hour:  { stem: "戊", branch: "丑", full: "戊丑", stemKr: "무", branchKr: "축", fullKr: "무축" },
      };

      // 木→火 = 상생 (wood generates fire)
      const sangsaeng = calculateCompatibility(woodPillars, firePillars);
      expect(sangsaeng.relationship).toBe("상생");

      // 木→土 = 상극 (wood overcomes earth)
      const sanggeuk = calculateCompatibility(woodPillars, earthPillars);
      expect(sanggeuk.relationship).toBe("상극");

      // 상생 should score higher than 상극
      expect(sangsaeng.score).toBeGreaterThan(sanggeuk.score);
    });

    it("same element returns 비화 relationship", () => {
      const result = calculateCompatibility(personA.pillars, personA.pillars);
      expect(result.relationship).toBe("비화");
    });

    it("yin-yang complementary pair gets bonus", () => {
      // Yang day master (甲) vs Yin day master (乙) — same element but different yin/yang
      const yangPillars: FourPillars = {
        year:  { stem: "甲", branch: "寅", full: "甲寅", stemKr: "갑", branchKr: "인", fullKr: "갑인" },
        month: { stem: "甲", branch: "寅", full: "甲寅", stemKr: "갑", branchKr: "인", fullKr: "갑인" },
        day:   { stem: "甲", branch: "寅", full: "甲寅", stemKr: "갑", branchKr: "인", fullKr: "갑인" },
        hour:  { stem: "甲", branch: "寅", full: "甲寅", stemKr: "갑", branchKr: "인", fullKr: "갑인" },
      };

      const yinPillars: FourPillars = {
        year:  { stem: "乙", branch: "卯", full: "乙卯", stemKr: "을", branchKr: "묘", fullKr: "을묘" },
        month: { stem: "乙", branch: "卯", full: "乙卯", stemKr: "을", branchKr: "묘", fullKr: "을묘" },
        day:   { stem: "乙", branch: "卯", full: "乙卯", stemKr: "을", branchKr: "묘", fullKr: "을묘" },
        hour:  { stem: "乙", branch: "卯", full: "乙卯", stemKr: "을", branchKr: "묘", fullKr: "을묘" },
      };

      const complementary = calculateCompatibility(yangPillars, yinPillars);
      const sameYinYang = calculateCompatibility(yangPillars, yangPillars);

      // Complementary yin-yang should score higher (same element 비화, but +10 yin/yang bonus)
      expect(complementary.score).toBeGreaterThan(sameYinYang.score);
    });

    it("description matches score range", () => {
      const result = calculateCompatibility(personA.pillars, personB.pillars);
      const s = result.score;
      if (s >= 90) expect(result.description).toContain("천생연분");
      else if (s >= 80) expect(result.description).toContain("좋은 궁합");
      else if (s >= 70) expect(result.description).toContain("무난한 궁합");
      else if (s >= 60) expect(result.description).toContain("흥미로운 궁합");
      else if (s >= 50) expect(result.description).toContain("보통 궁합");
      else if (s >= 40) expect(result.description).toContain("성장하는 궁합");
      else if (s >= 30) expect(result.description).toContain("도전적인 궁합");
      else if (s >= 20) expect(result.description).toContain("독특한 궁합");
      else if (s >= 10) expect(result.description).toContain("역동적인 궁합");
      else expect(result.description).toContain("특별한 궁합");
    });
  });
});
