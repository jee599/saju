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

interface ShareButtonsProps {
  element: string;
  elementKey: string;
  name: string;
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

export default function ShareButtons({ element, elementKey, name }: ShareButtonsProps) {
  const locale = useLocale();
  const t = useTranslations("share");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
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
  const shareText = t("text", { element, name: safeName });

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
      setDownloading(true);
      const ok = await downloadStoryImage(name, elementKey, locale);
      setDownloading(false);
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
              disabled={downloading && (ch === "instagram" || ch === "tiktok")}
              aria-label={t(`channels.${meta.labelKey}`)}
            >
              <span className="shareBtnIcon">{meta.icon}</span>
              <span className="shareBtnLabel">{t(`channels.${meta.labelKey}`)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
