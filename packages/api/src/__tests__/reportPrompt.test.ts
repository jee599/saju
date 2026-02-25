import { describe, it, expect } from "vitest";
import {
  SYSTEM_PROMPT_V2,
  buildUserPromptV2,
  buildPromptV2,
  REPORT_SECTION_KEYS,
  FORBIDDEN_PATTERNS,
  SCHEMA_COMPACT,
} from "../reportPrompt";
import { calculateFourPillars } from "../../../engine/saju/src/index";
import type { FortuneInput } from "../../../shared/src/index";

const TEST_INPUT: FortuneInput = {
  name: "테스트",
  birthDate: "1990-05-15",
  birthTime: "14:30",
  gender: "male",
  calendarType: "solar",
};

const SAJU = calculateFourPillars({ year: 1990, month: 5, day: 15, hour: 14, minute: 30 });

describe("Prompt v2", () => {
  describe("System prompt", () => {
    it("is under 800 chars (token-efficient)", () => {
      expect(SYSTEM_PROMPT_V2.length).toBeLessThan(800);
    });

    it("contains schema", () => {
      expect(SYSTEM_PROMPT_V2).toContain("headline");
      expect(SYSTEM_PROMPT_V2).toContain("sections");
      expect(SYSTEM_PROMPT_V2).toContain("recommendations");
    });

    it("contains rules about 단정 금지", () => {
      expect(SYSTEM_PROMPT_V2).toContain("단정 금지");
    });

    it("specifies JSON-only output", () => {
      expect(SYSTEM_PROMPT_V2).toContain("JSON만 출력");
    });

    it("instructs not to recalculate saju", () => {
      expect(SYSTEM_PROMPT_V2).toContain("재계산 금지");
    });
  });

  describe("User prompt", () => {
    it("is under 300 chars (compact)", () => {
      const user = buildUserPromptV2({ input: TEST_INPUT, saju: SAJU, productCode: "standard" });
      expect(user.length).toBeLessThan(300);
    });

    it("includes saju pillar data in Korean", () => {
      const user = buildUserPromptV2({ input: TEST_INPUT, saju: SAJU, productCode: "standard" });
      expect(user).toContain("경오");   // year pillar
      expect(user).toContain("신사");   // month pillar
      expect(user).toContain("경진");   // day pillar
      expect(user).toContain("계미");   // hour pillar
    });

    it("includes saju pillar data in Hanja", () => {
      const user = buildUserPromptV2({ input: TEST_INPUT, saju: SAJU, productCode: "standard" });
      expect(user).toContain("庚午");
      expect(user).toContain("辛巳");
    });

    it("includes user name and birth info", () => {
      const user = buildUserPromptV2({ input: TEST_INPUT, saju: SAJU, productCode: "standard" });
      expect(user).toContain("테스트");
      expect(user).toContain("1990-05-15");
    });

    it("includes product code with length hint", () => {
      const standard = buildUserPromptV2({ input: TEST_INPUT, saju: SAJU, productCode: "standard" });
      expect(standard).toContain("표준(8000자");

      const deep = buildUserPromptV2({ input: TEST_INPUT, saju: SAJU, productCode: "deep" });
      expect(deep).toContain("심화(15000자");
    });
  });

  describe("buildPromptV2", () => {
    it("returns system + user pair", () => {
      const { system, user } = buildPromptV2({ input: TEST_INPUT, saju: SAJU, productCode: "standard" });
      expect(system).toBe(SYSTEM_PROMPT_V2);
      expect(user.length).toBeGreaterThan(0);
    });
  });
});

describe("Output schema", () => {
  it("REPORT_SECTION_KEYS has 10 sections", () => {
    expect(REPORT_SECTION_KEYS).toHaveLength(10);
  });

  it("SCHEMA_COMPACT is valid JSON-like structure", () => {
    expect(SCHEMA_COMPACT).toContain("headline");
    expect(SCHEMA_COMPACT).toContain("성격");
    expect(SCHEMA_COMPACT).toContain("대운 타임라인");
    expect(SCHEMA_COMPACT).toContain("recommendations");
    expect(SCHEMA_COMPACT).toContain("disclaimer");
  });

  it("section keys cover all required topics", () => {
    const required = ["성격", "직업", "연애", "금전", "건강", "가족·배우자", "과거", "현재", "미래", "대운 타임라인"];
    for (const key of required) {
      expect(REPORT_SECTION_KEYS).toContain(key);
    }
  });
});

describe("QA validation: forbidden patterns", () => {
  it("detects 단정적 표현", () => {
    const text = "반드시 성공하게 될 것입니다";
    expect(FORBIDDEN_PATTERNS.some(p => p.test(text))).toBe(true);
  });

  it("detects 절대 표현", () => {
    const text = "절대 안 됩니다";
    expect(FORBIDDEN_PATTERNS.some(p => p.test(text))).toBe(true);
  });

  it("detects 의료 단정", () => {
    const text = "암에 걸릴 수 있습니다";
    expect(FORBIDDEN_PATTERNS.some(p => p.test(text))).toBe(true);
  });

  it("detects 과도한 확신", () => {
    const text = "확실히 좋은 해가 됩니다";
    expect(FORBIDDEN_PATTERNS.some(p => p.test(text))).toBe(true);
  });

  it("allows proper probability expressions", () => {
    const text = "좋은 결과를 얻을 수 있는 경향이 있습니다";
    expect(FORBIDDEN_PATTERNS.some(p => p.test(text))).toBe(false);
  });

  it("allows standard fortune text", () => {
    const text = "재물운이 상승하는 시기가 될 수 있습니다. 새로운 기회를 적극적으로 탐색해 보시길 권합니다.";
    expect(FORBIDDEN_PATTERNS.some(p => p.test(text))).toBe(false);
  });
});

describe("LLM output validation helper", () => {
  /** Validates a mock LLM output against our schema */
  function validateReport(json: unknown): string[] {
    const errors: string[] = [];
    if (typeof json !== "object" || json === null) {
      errors.push("Output is not an object");
      return errors;
    }
    const r = json as Record<string, unknown>;

    if (typeof r["headline"] !== "string") errors.push("Missing/invalid headline");
    if (typeof r["summary"] !== "string") errors.push("Missing/invalid summary");
    if (typeof r["disclaimer"] !== "string") errors.push("Missing/invalid disclaimer");
    if (!Array.isArray(r["recommendations"])) errors.push("Missing/invalid recommendations");
    if (!Array.isArray(r["sections"])) {
      errors.push("Missing/invalid sections array");
    } else {
      const sections = r["sections"] as Array<Record<string, unknown>>;
      if (sections.length !== 10) errors.push(`Expected 10 sections, got ${sections.length}`);
      for (const s of sections) {
        if (typeof s["key"] !== "string") errors.push("Section missing key");
        if (typeof s["text"] !== "string") errors.push(`Section ${s["key"]} missing text`);
        else if ((s["text"] as string).length < 50) errors.push(`Section ${s["key"]} text too short (<50 chars)`);
      }
    }

    // Check forbidden patterns in all text
    const allText = JSON.stringify(json);
    for (const p of FORBIDDEN_PATTERNS) {
      if (p.test(allText)) errors.push(`Forbidden pattern found: ${p.source}`);
    }

    // Language check: should be mostly Korean
    const koreanChars = allText.match(/[\uAC00-\uD7A3]/g)?.length ?? 0;
    const totalChars = allText.length;
    if (koreanChars / totalChars < 0.3) errors.push("Report appears to not be in Korean (<30% Korean chars)");

    return errors;
  }

  it("validates a correct report", () => {
    const good = {
      headline: "경오년 경진일생의 운세 분석",
      summary: "경금 일간으로 강한 의지와 결단력을 가진 분입니다.",
      sections: REPORT_SECTION_KEYS.map(key => ({
        key,
        title: key,
        text: "이 섹션에서는 관련된 사주 분석을 상세히 다루어 봅니다. 여러 가지 요소를 고려할 때 긍정적인 흐름이 예상됩니다.",
      })),
      recommendations: ["새로운 도전을 시도해 보세요", "건강 관리에 유의하세요"],
      disclaimer: "본 리포트는 참고용이며, 전문 상담을 대체하지 않습니다.",
    };
    expect(validateReport(good)).toEqual([]);
  });

  it("catches missing sections", () => {
    const bad = { headline: "test", summary: "test", sections: [], recommendations: [], disclaimer: "test" };
    const errors = validateReport(bad);
    expect(errors.some(e => e.includes("Expected 10 sections"))).toBe(true);
  });

  it("catches non-Korean content", () => {
    const bad = {
      headline: "Fortune Analysis",
      summary: "This is an English report about fortune telling.",
      sections: REPORT_SECTION_KEYS.map(key => ({
        key, title: key, text: "This section contains analysis in English with no Korean characters at all in the text body.",
      })),
      recommendations: ["Try new things"],
      disclaimer: "This is for reference only.",
    };
    const errors = validateReport(bad);
    expect(errors.some(e => e.includes("Korean"))).toBe(true);
  });
});
