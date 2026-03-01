"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "../../../i18n/navigation";

const LOCALE_OPTIONS = [
  { code: "ko", flag: "\u{1F1F0}\u{1F1F7}", label: "\uD55C\uAD6D\uC5B4" },
  { code: "en", flag: "\u{1F1FA}\u{1F1F8}", label: "English" },
  { code: "ja", flag: "\u{1F1EF}\u{1F1F5}", label: "\u65E5\u672C\u8A9E" },
  { code: "zh", flag: "\u{1F1E8}\u{1F1F3}", label: "\u4E2D\u6587" },
  { code: "th", flag: "\u{1F1F9}\u{1F1ED}", label: "\u0E44\u0E17\u0E22" },
  { code: "vi", flag: "\u{1F1FB}\u{1F1F3}", label: "Ti\u1EBFng Vi\u1EC7t" },
  { code: "id", flag: "\u{1F1EE}\u{1F1E9}", label: "Indonesia" },
  { code: "hi", flag: "\u{1F1EE}\u{1F1F3}", label: "\u0939\u093F\u0928\u094D\u0926\u0940" },
] as const;

export default function LanguageSelector() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = LOCALE_OPTIONS.find((o) => o.code === locale) ?? LOCALE_OPTIONS[0];

  function handleSelect(code: string) {
    setOpen(false);
    router.replace(pathname, { locale: code });
  }

  return (
    <div className="languageSelector" ref={ref}>
      <button
        className="languageSelectorBtn"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="languageDropdown" role="listbox">
          {LOCALE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              className="languageOption"
              role="option"
              aria-selected={opt.code === locale}
              data-active={opt.code === locale}
              onClick={() => handleSelect(opt.code)}
            >
              <span className="languageOptionFlag">{opt.flag}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
