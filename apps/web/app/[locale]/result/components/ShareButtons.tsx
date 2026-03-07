"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  type ShareChannel,
  getShareChannels,
  getChannelMeta,
  buildShareUrl,
  openSharePopup,
  copyToClipboard,
} from "../../../../lib/share";
import { encodeShareId } from "../../../../lib/shareId";
import { track } from "../../../../lib/analytics";

/** Inline SVG icons for each share channel */
function ChannelIcon({ channel, color }: { channel: ShareChannel; color: string }) {
  const s = { width: 24, height: 24, fill: color };
  switch (channel) {
    case "kakao":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.8 5.22 4.52 6.6-.2.72-.72 2.62-.82 3.02-.13.5.18.49.38.36.16-.1 2.5-1.7 3.52-2.39.46.06.92.1 1.4.1 5.52 0 10-3.58 10-7.9S17.52 3 12 3z" />
        </svg>
      );
    case "line":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M12 2C6.48 2 2 5.83 2 10.5c0 4.18 3.7 7.68 8.7 8.35.34.07.8.22.92.51.1.26.07.67.03.93l-.15.88c-.04.26-.2 1.01.88.55s5.89-3.47 8.03-5.93C22.58 13.38 22 11.97 22 10.5 22 5.83 17.52 2 12 2zm-3.5 11h-2a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 1 0V12h1.5a.5.5 0 0 1 0 1zm2 0a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 1 0v4zm4.5 0a.5.5 0 0 1-.42-.23L12.5 10V12.5a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 .92-.27L14.5 11V8.5a.5.5 0 0 1 1 0v4a.5.5 0 0 1-.5.5zm3.5-.5a.5.5 0 0 1 0 1H16a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 .5-.5h2.5a.5.5 0 0 1 0 1H17v1h1.5a.5.5 0 0 1 0 1H17v1h1.5z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.82 14c-.25.7-1.48 1.35-2.04 1.39-.56.04-1.08.2-3.63-.76-3.07-1.15-5.03-4.3-5.18-4.5-.15-.2-1.22-1.62-1.22-3.1 0-1.47.77-2.2 1.04-2.5.27-.3.6-.38.8-.38.2 0 .4 0 .57.01.18.01.43-.07.67.51.25.6.84 2.06.92 2.21.07.15.12.33.02.53-.1.2-.15.33-.3.5-.15.18-.31.4-.45.53-.15.15-.3.3-.13.6.17.3.78 1.28 1.67 2.07 1.14 1.02 2.1 1.33 2.4 1.48.3.15.48.13.65-.08.18-.2.75-.88.95-1.18.2-.3.4-.25.67-.15.28.1 1.75.82 2.05.97.3.15.5.23.57.35.08.13.08.73-.17 1.43z" />
        </svg>
      );
    case "zalo":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 13.19c-.17.5-.98.93-1.37.99-.38.06-.73.09-2.46-.53-2.07-.73-3.4-2.9-3.5-3.04-.1-.13-.83-1.1-.83-2.1s.52-1.49.71-1.69c.19-.2.41-.25.55-.25.14 0 .27 0 .39.01.12 0 .29-.05.46.35.17.4.57 1.4.62 1.5.05.1.08.22.02.36-.07.13-.1.22-.2.34-.1.12-.21.27-.3.36-.1.1-.21.21-.09.41.12.2.53.87 1.13 1.41.78.69 1.43.91 1.63 1.01.2.1.32.09.44-.05.12-.14.51-.6.65-.8.13-.2.27-.17.46-.1.19.07 1.19.56 1.39.66.2.1.34.15.39.24.05.09.05.5-.12 1z" />
        </svg>
      );
    case "twitter":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "sms":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78c.27 0 .54.04.8.1V9.01a6.27 6.27 0 0 0-.8-.05 6.34 6.34 0 0 0 0 12.68 6.34 6.34 0 0 0 6.33-6.34V8.93a8.19 8.19 0 0 0 3.77 1.05V6.69z" />
        </svg>
      );
    case "copy":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4a5 5 0 0 0 0-10z" />
        </svg>
      );
  }
}

interface ShareButtonsProps {
  element: string;
  elementKey: string;
  name: string;
  traits: string;
}

/** Download the story-format OG image for Instagram/TikTok */
async function downloadStoryImage(name: string, element: string, locale: string): Promise<boolean> {
  try {
    const url = `/api/og?name=${encodeURIComponent(name.slice(0, 20))}&element=${element}&locale=${locale}&type=result&format=story`;
    const res = await fetch(url);
    if (!res.ok) return false;
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fortunelab-${element}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    const blobUrl = a.href;
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    return true;
  } catch {
    return false;
  }
}

/** Initialize and share via Kakao SDK */
async function shareKakao(shareUrl: string, title: string, description: string, imageUrl: string): Promise<boolean> {
  try {
    const w = window as unknown as { Kakao?: { isInitialized: () => boolean; init: (key: string) => void; Share: { sendDefault: (params: unknown) => void } } };
    if (!w.Kakao) return false;
    if (!w.Kakao.isInitialized()) {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (!key) return false;
      w.Kakao.init(key);
    }
    w.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title,
        description,
        imageUrl,
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        { title: "나도 해보기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

export default function ShareButtons({ element, elementKey, name, traits }: ShareButtonsProps) {
  const locale = useLocale();
  const t = useTranslations("share");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [downloadingChannel, setDownloadingChannel] = useState<ShareChannel | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mountedRef = useRef(true);

  useEffect(() => {
    const id = encodeShareId({ element: elementKey, name });
    setShareUrl(`${window.location.origin}/${locale}/s/${id}`);

    // Load Kakao SDK if Korean locale
    if (locale === "ko" && !document.getElementById("kakao-sdk")) {
      const script = document.createElement("script");
      script.id = "kakao-sdk";
      script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
      script.async = true;
      document.head.appendChild(script);
    }

    return () => {
      mountedRef.current = false;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [elementKey, name, locale]);

  const channels = getShareChannels(locale);
  const safeName = name || "?";
  const shareText = t("text", { element, name: safeName, traits });

  function showToast(msg: string) {
    if (!mountedRef.current) return;
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      if (mountedRef.current) setToastMsg(null);
    }, 2500);
  }

  async function handleShare(channel: ShareChannel) {
    if (!shareUrl) return;
    track("share_click", { channel, element: elementKey, locale });

    if (channel === "copy") {
      const ok = await copyToClipboard(shareUrl);
      showToast(t(ok ? "copied" : "copyFailed"));
      return;
    }

    if (channel === "instagram" || channel === "tiktok") {
      setDownloadingChannel(channel);
      const ok = await downloadStoryImage(name, elementKey, locale);
      setDownloadingChannel(null);
      if (ok) {
        showToast(t("copiedForApp", { app: t(`channels.${channel}`) }));
        await copyToClipboard(shareUrl);
      } else {
        showToast(t("copyFailed"));
      }
      return;
    }

    if (channel === "kakao") {
      const baseUrl = window.location.origin;
      const ogImageUrl = `${baseUrl}/api/og?name=${encodeURIComponent(name.slice(0, 20))}&element=${elementKey}&locale=${locale}&type=result`;
      const ok = await shareKakao(shareUrl, shareText, t("desc"), ogImageUrl);
      if (!ok) {
        // Kakao SDK not available — fallback to copy link
        const copied = await copyToClipboard(shareUrl);
        showToast(t(copied ? "copied" : "copyFailed"));
      }
      return;
    }

    const url = buildShareUrl(channel, { url: shareUrl, text: shareText });
    if (url) openSharePopup(url);
  }

  return (
    <section className="shareButtonsWrap" aria-label={t("title")}>
      {toastMsg && (
        <div className="toast" role="status" aria-live="polite">
          {toastMsg}
        </div>
      )}
      <h3 className="shareTitle">{t("title")}</h3>
      <p className="shareDesc">{t("desc")}</p>
      <div className="shareButtons">
        {channels.map((ch) => {
          const meta = getChannelMeta(ch);
          return (
            <button
              key={ch}
              className="shareBtn"
              onClick={() => handleShare(ch)}
              disabled={downloadingChannel === ch}
              aria-label={t(`channels.${meta.labelKey}`)}
            >
              <span className="shareBtnIcon">
                <ChannelIcon channel={ch} color={meta.color} />
              </span>
              <span className="shareBtnLabel">{t(`channels.${meta.labelKey}`)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
