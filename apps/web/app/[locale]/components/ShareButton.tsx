"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function ShareButton({
  url,
  text,
  title,
}: {
  url: string;
  text: string;
  title: string;
}) {
  const t = useTranslations("share");
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // User cancelled or not supported
      }
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  return (
    <button className="btn btn-ghost" onClick={share} type="button">
      {copied ? t("copied") : t("share")}
    </button>
  );
}
