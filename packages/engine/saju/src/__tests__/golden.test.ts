import { describe, it, expect } from "vitest";
import { calculateFourPillars, type SajuInput } from "../index";
import goldenData from "./fixtures/golden-cases.json";

interface GoldenCase {
  id: string;
  description: string;
  input: SajuInput;
  expected: {
    yearPillar: string;
    monthPillar: string;
    dayPillar: string;
    hourPillar: string;
  };
  tags: string[];
  agreement: string;
  note?: string;
}

const cases = goldenData.cases as GoldenCase[];

describe("사주 Four Pillars — Golden Test Suite", () => {
  describe("전체 골든 케이스", () => {
    for (const c of cases) {
      it(`${c.id}: ${c.description}`, () => {
        const result = calculateFourPillars(c.input);
        expect(result.pillars.year.full).toBe(c.expected.yearPillar);
        expect(result.pillars.month.full).toBe(c.expected.monthPillar);
        expect(result.pillars.day.full).toBe(c.expected.dayPillar);
        expect(result.pillars.hour.full).toBe(c.expected.hourPillar);
      });
    }
  });

  describe("입춘 경계 (Year pillar boundary)", () => {
    it("입춘 이전은 이전 년주 유지", () => {
      // 2024-02-04 10:00 — 입춘(17:27) 전, 아직 癸卯년
      const result = calculateFourPillars({ year: 2024, month: 2, day: 4, hour: 10, minute: 0 });
      expect(result.pillars.year.full).toBe("癸卯");
    });

    it("입춘 이후는 새 년주", () => {
      // 2024-02-04 18:00 — 입춘(17:27) 후, 甲辰년
      const result = calculateFourPillars({ year: 2024, month: 2, day: 4, hour: 18, minute: 0 });
      expect(result.pillars.year.full).toBe("甲辰");
    });

    it("2025 입춘(23:10) 직전/직후 년주 전환", () => {
      const before = calculateFourPillars({ year: 2025, month: 2, day: 3, hour: 22, minute: 0 });
      expect(before.pillars.year.full).toBe("甲辰");

      const after = calculateFourPillars({ year: 2025, month: 2, day: 3, hour: 23, minute: 30 });
      expect(after.pillars.year.full).toBe("乙巳");
    });
  });

  describe("야자시 (子時 23:00-01:00)", () => {
    it("23:00은 子時", () => {
      const result = calculateFourPillars({ year: 1990, month: 5, day: 15, hour: 23, minute: 0 });
      expect(result.pillars.hour.branch).toBe("子");
    });

    it("22:59는 亥時", () => {
      const result = calculateFourPillars({ year: 1990, month: 5, day: 15, hour: 22, minute: 59 });
      expect(result.pillars.hour.branch).toBe("亥");
    });

    it("00:30은 子時이며 다음 날 일주", () => {
      const prev = calculateFourPillars({ year: 1990, month: 5, day: 15, hour: 22, minute: 59 });
      const next = calculateFourPillars({ year: 1990, month: 5, day: 16, hour: 0, minute: 30 });
      expect(next.pillars.hour.branch).toBe("子");
      expect(next.pillars.day.full).not.toBe(prev.pillars.day.full);
    });
  });

  describe("12시주 전체 커버 (2000-06-15)", () => {
    const hourBranches = [
      { hour: 0, branch: "子" },
      { hour: 2, branch: "丑" },
      { hour: 4, branch: "寅" },
      { hour: 6, branch: "卯" },
      { hour: 8, branch: "辰" },
      { hour: 10, branch: "巳" },
      { hour: 12, branch: "午" },
      { hour: 14, branch: "未" },
      { hour: 16, branch: "申" },
      { hour: 18, branch: "酉" },
      { hour: 20, branch: "戌" },
      { hour: 22, branch: "亥" },
    ];

    for (const { hour, branch } of hourBranches) {
      it(`${String(hour).padStart(2, "0")}:00 → ${branch}`, () => {
        const result = calculateFourPillars({ year: 2000, month: 6, day: 15, hour, minute: 0 });
        expect(result.pillars.hour.branch).toBe(branch);
      });
    }
  });

  describe("한글 변환", () => {
    it("fullKr 형식 확인", () => {
      const result = calculateFourPillars({ year: 2024, month: 2, day: 4, hour: 18, minute: 0 });
      expect(result.pillars.year.fullKr).toBe("갑진");
      expect(result.pillars.month.fullKr).toBe("병인");
      expect(result.pillars.day.fullKr).toBe("무술");
      expect(result.pillars.hour.fullKr).toBe("신유");
    });
  });

  describe("입력 검증", () => {
    it("잘못된 년도 → RangeError", () => {
      expect(() => calculateFourPillars({ year: 1800, month: 1, day: 1, hour: 0, minute: 0 })).toThrow(RangeError);
    });

    it("잘못된 월 → RangeError", () => {
      expect(() => calculateFourPillars({ year: 2000, month: 13, day: 1, hour: 0, minute: 0 })).toThrow(RangeError);
    });

    it("잘못된 시간 → RangeError", () => {
      expect(() => calculateFourPillars({ year: 2000, month: 1, day: 1, hour: 25, minute: 0 })).toThrow(RangeError);
    });
  });
});
