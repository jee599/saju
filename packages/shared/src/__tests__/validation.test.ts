import { describe, it, expect } from "vitest";
import {
  validateFortuneInput,
  isValidFortuneInput,
  type FortuneInput,
} from "../index";

const VALID_INPUT: FortuneInput = {
  name: "테스트",
  birthDate: "1990-05-15",
  birthTime: "14:30",
  gender: "male",
  calendarType: "solar",
};

describe("validateFortuneInput", () => {
  it("passes valid input", () => {
    expect(validateFortuneInput(VALID_INPUT)).toEqual([]);
    expect(isValidFortuneInput(VALID_INPUT)).toBe(true);
  });

  it("rejects short name", () => {
    const issues = validateFortuneInput({ ...VALID_INPUT, name: "김" });
    expect(issues).toHaveLength(1);
    expect(issues[0]!.field).toBe("name");
  });

  it("rejects invalid date format", () => {
    const issues = validateFortuneInput({ ...VALID_INPUT, birthDate: "90-5-15" });
    expect(issues.some((i) => i.field === "birthDate")).toBe(true);
  });

  it("rejects invalid time format", () => {
    const issues = validateFortuneInput({ ...VALID_INPUT, birthTime: "2pm" });
    expect(issues.some((i) => i.field === "birthTime")).toBe(true);
  });

  it("allows missing birthTime", () => {
    const { birthTime: _, ...noTime } = VALID_INPUT;
    expect(validateFortuneInput(noTime as FortuneInput)).toEqual([]);
  });

  it("rejects invalid gender", () => {
    const issues = validateFortuneInput({
      ...VALID_INPUT,
      gender: "unknown" as any,
    });
    expect(issues.some((i) => i.field === "gender")).toBe(true);
  });

  it("rejects invalid calendarType", () => {
    const issues = validateFortuneInput({
      ...VALID_INPUT,
      calendarType: "gregorian" as any,
    });
    expect(issues.some((i) => i.field === "calendarType")).toBe(true);
  });
});
