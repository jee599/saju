/** Share utility — build per-platform share URLs and trigger native share */

export type ShareChannel =
  | "kakao"
  | "line"
  | "whatsapp"
  | "zalo"
  | "twitter"
  | "sms"
  | "instagram"
  | "tiktok"
  | "copy";

interface SharePayload {
  url: string;
  text: string;
  /** Used for Kakao Feed title etc. */
  title?: string;
}

/** Build a share URL for each channel. Returns empty string for channels
 *  that don't use URLs (kakao, instagram, tiktok, copy). */
export function buildShareUrl(
  channel: ShareChannel,
  { url, text }: SharePayload,
): string {
  const encoded = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const combined = encodeURIComponent(`${text}\n${url}`);

  switch (channel) {
    case "twitter":
      return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encoded}`;
    case "whatsapp":
      return `https://wa.me/?text=${combined}`;
    case "line":
      return `https://social-plugins.line.me/lineit/share?url=${encoded}&text=${encodedText}`;
    case "zalo":
      return `https://zalo.me/share?url=${encoded}`;
    case "sms":
      // iOS requires sms:&body=, Android uses sms:?body=
      return typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? `sms:&body=${combined}`
        : `sms:?body=${combined}`;
    default:
      return "";
  }
}

/** Copy text to clipboard, returns true on success */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API first
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch { /* fall through to execCommand fallback */ }
  }
  // Fallback for in-app browsers (Kakao, Instagram, etc.) without Clipboard API
  if (typeof document === "undefined") return false;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Open share URL in a popup window */
export function openSharePopup(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
}

/** Get ordered share channels for a locale */
export function getShareChannels(locale: string): ShareChannel[] {
  const map: Record<string, ShareChannel[]> = {
    ko: ["kakao", "sms", "twitter", "instagram", "tiktok", "copy"],
    en: ["sms", "twitter", "instagram", "tiktok", "copy"],
    ja: ["line", "twitter", "instagram", "tiktok", "copy"],
    zh: ["copy", "twitter", "whatsapp"],
    th: ["line", "whatsapp", "tiktok", "instagram", "copy"],
    vi: ["zalo", "whatsapp", "tiktok", "instagram", "copy"],
    id: ["whatsapp", "tiktok", "instagram", "twitter", "copy"],
    hi: ["whatsapp", "tiktok", "instagram", "twitter", "copy"],
  };
  return map[locale] ?? map.en!;
}

/** Channel display metadata */
export function getChannelMeta(channel: ShareChannel): { labelKey: string; color: string } {
  const meta: Record<ShareChannel, { labelKey: string; color: string }> = {
    kakao: { labelKey: "kakao", color: "#FEE500" },
    line: { labelKey: "line", color: "#06C755" },
    whatsapp: { labelKey: "whatsapp", color: "#25D366" },
    zalo: { labelKey: "zalo", color: "#0068FF" },
    twitter: { labelKey: "twitter", color: "#ffffff" },
    sms: { labelKey: "sms", color: "#34C759" },
    instagram: { labelKey: "instagram", color: "#E4405F" },
    tiktok: { labelKey: "tiktok", color: "#ffffff" },
    copy: { labelKey: "copy", color: "#a78bfa" },
  };
  return meta[channel];
}
