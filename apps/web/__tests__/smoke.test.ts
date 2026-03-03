/**
 * Smoke test — verifies the test setup works for the web app.
 *
 * TODO: Add comprehensive frontend tests:
 *   - Component rendering tests (React Testing Library)
 *   - API route handler tests
 *   - i18n/locale switching tests
 *   - Form validation tests
 */
import { describe, it, expect } from "vitest";
import { isValidFortuneInput } from "../lib/mockEngine";

describe("smoke test", () => {
  it("test setup works", () => {
    expect(true).toBe(true);
  });

  it("isValidFortuneInput rejects empty input", () => {
    const invalid = { name: "", birthDate: "", gender: "male" as const, calendarType: "solar" as const };
    expect(isValidFortuneInput(invalid)).toBe(false);
  });

  it("isValidFortuneInput accepts valid input", () => {
    const valid = {
      name: "홍길동",
      birthDate: "1990-01-15",
      gender: "male" as const,
      calendarType: "solar" as const,
    };
    expect(isValidFortuneInput(valid)).toBe(true);
  });
});
