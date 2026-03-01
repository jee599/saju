export const locales = ["ko", "en", "ja", "zh", "th", "vi", "id", "hi"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ko";
