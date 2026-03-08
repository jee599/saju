import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://fortunelab.store";
const locales = ["ko", "en", "ja", "zh", "th", "vi", "id", "hi"] as const;

const pages = [
  "", // home
  "/daily",
  "/free-fortune",
  "/compatibility",
  "/dream",
  "/tarot",
  "/palm",
  "/face",
  "/name",
  "/terms",
  "/privacy",
  "/disclaimer",
  "/refund",
];

// SEO landing pages: canonical slug for non-ko, localized slug for ko
const seoSlugs: Array<{ key: string; koSlug: string }> = [
  { key: "free-saju", koSlug: "무료-사주" },
  { key: "zodiac-2026", koSlug: "2026-운세" },
  { key: "birth-chart", koSlug: "사주-분석" },
  { key: "compatibility-test", koSlug: "궁합-테스트" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const page of pages) {
    const languages: Record<string, string> = {};
    for (const locale of locales) {
      const prefix = locale === "ko" ? "" : `/${locale}`;
      languages[locale] = `${BASE_URL}${prefix}${page}`;
    }
    languages["x-default"] = `${BASE_URL}${page}`;

    entries.push({
      url: `${BASE_URL}${page}`,
      lastModified: new Date(),
      changeFrequency: page === "/daily" ? "daily" : "weekly",
      priority: page === "" ? 1.0 : 0.8,
      alternates: { languages },
    });
  }

  // SEO landing pages
  for (const { key, koSlug } of seoSlugs) {
    const languages: Record<string, string> = {};
    for (const locale of locales) {
      if (locale === "ko") {
        languages[locale] = `${BASE_URL}/fortune/${koSlug}`;
      } else {
        languages[locale] = `${BASE_URL}/${locale}/fortune/${key}`;
      }
    }
    languages["x-default"] = `${BASE_URL}/fortune/${key}`;

    entries.push({
      url: `${BASE_URL}/fortune/${koSlug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: { languages },
    });
  }

  return entries;
}
