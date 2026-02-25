"use client";

import { usePathname, useRouter } from "../../../i18n/navigation";
import type { Locale } from "../../../i18n/config";
import { locales } from "../../../i18n/config";

const labels: Record<Locale, string> = {
  ko: "한국어",
  en: "EN",
  ja: "日本語",
  zh: "中文",
  vi: "Tiếng Việt",
  hi: "हिन्दी",
};

export function LanguageSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <select
      className="langSwitcher"
      value={currentLocale}
      onChange={(e) => {
        router.replace(pathname, { locale: e.target.value as Locale });
      }}
      aria-label="Language"
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {labels[loc]}
        </option>
      ))}
    </select>
  );
}
