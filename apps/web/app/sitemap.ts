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

  return entries;
}
