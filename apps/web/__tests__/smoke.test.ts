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
import { generateViewToken } from "../lib/viewToken";
import { sanitizeName } from "../lib/llmEngine";

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

describe("generateViewToken", () => {
  it("produces consistent output for the same orderId", () => {
    const token1 = generateViewToken("order_abc123");
    const token2 = generateViewToken("order_abc123");
    expect(token1).toBe(token2);
  });

  it("produces different tokens for different orderIds", () => {
    const token1 = generateViewToken("order_abc123");
    const token2 = generateViewToken("order_xyz789");
    expect(token1).not.toBe(token2);
  });

  it("returns a 32-character hex string", () => {
    const token = generateViewToken("order_test");
    expect(token).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("sanitizeName", () => {
  it("strips dangerous characters like angle brackets and scripts", () => {
    expect(sanitizeName('<script>alert("xss")</script>')).toBe("scriptalertxssscript");
  });

  it("preserves Korean characters", () => {
    expect(sanitizeName("홍길동")).toBe("홍길동");
  });

  it("preserves Latin characters", () => {
    expect(sanitizeName("John Doe")).toBe("John Doe");
  });

  it("strips emoji and special symbols", () => {
    expect(sanitizeName("홍길동🔥✨")).toBe("홍길동");
  });

  it("trims and limits to 50 characters", () => {
    const longName = "A".repeat(100);
    expect(sanitizeName(longName).length).toBe(50);
  });
});
