"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../../../i18n/navigation";

const NAV_ITEMS = [
  { href: "/daily", key: "nav.daily" },
  { href: "/#hero", key: "nav.saju" },
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
        aria-label="Menu"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
          <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 5A.75.75 0 012.75 9h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 9.75zm0 5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
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
