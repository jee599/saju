import { describe, it, expect } from "vitest";
import { prisma } from "../db";

describe("Prisma client", () => {
  it("connects and queries LlmUsage table (empty)", async () => {
    const count = await prisma.llmUsage.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("creates and reads a FortuneRequest", async () => {
    const created = await prisma.fortuneRequest.create({
      data: {
        name: "테스트",
        birthDate: "1990-05-15",
        birthTime: "14:30",
        gender: "male",
        calendarType: "solar",
      },
    });
    expect(created.id).toBeTruthy();
    expect(created.name).toBe("테스트");

    // Cleanup
    await prisma.fortuneRequest.delete({ where: { id: created.id } });
  });
});
