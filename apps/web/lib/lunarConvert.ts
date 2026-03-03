/**
 * Lunar-to-solar date conversion using dynamic import.
 * lunar-typescript (~425KB) is code-split and only loaded when actually needed
 * (i.e., when a user selects the lunar calendar type).
 */
export async function convertLunarToSolar(
  y: number,
  m: number,
  d: number,
): Promise<{ year: number; month: number; day: number }> {
  const { Lunar } = await import("lunar-typescript");
  const solar = Lunar.fromYmd(y, m, d).getSolar();
  return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() };
}
