"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/daily", key: "nav.daily" },
  { href: "/#hero", key: "nav.saju" },
  { href: "/palm", key: "nav.palm" },
  { href: "/name", key: "nav.naming" },
  { href: "/face", key: "nav.face" },
  { href: "/dream", key: "nav.dream" },
  { href: "/tarot", key: "nav.tarot" },
] as const;

export default function NavDropdown() {
  const t = useTranslations("common");
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

  return (
    <div className="navDropdown" ref={ref}>
      <button
        className="navDropdownBtn"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
          <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 5A.75.75 0 012.75 9h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 9.75zm0 5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
        </svg>
        <span>{t("nav.daily")}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12" className="navDropdownChevron">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <nav className="navDropdownMenu" role="menu" aria-label={t("nav.label")}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="navDropdownItem"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
