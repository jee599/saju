export const locales = ["ko", "en", "ja", "zh", "vi", "hi"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ko";
