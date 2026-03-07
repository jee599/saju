import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { decodeShareId } from "../../../../lib/shareId";
import ShareLanding from "./ShareLanding";

const ELEMENT_EMOJI: Record<string, string> = {
  wood: "🌿", fire: "🔥", earth: "⛰️", metal: "⚙️", water: "🌊",
};

const VALID_ELEMENTS = ["wood", "fire", "earth", "metal", "water"];

interface Props {
  params: Promise<{ locale: string; shareId: string }>;
}

async function getElementName(locale: string, elementKey: string): Promise<string> {
  const t = await getTranslations({ locale, namespace: "result" });
  return t(`elementsNative.${elementKey}`);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, shareId } = await params;
  const data = decodeShareId(shareId);
  if (!data || !VALID_ELEMENTS.includes(data.element)) {
    return { title: "FortuneLab" };
  }

  const t = await getTranslations({ locale, namespace: "share" });
  const elementName = await getElementName(locale, data.element);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://fortunelab.store";
  const ogUrl = `${baseUrl}/api/og?name=${encodeURIComponent(data.name.slice(0, 20))}&element=${data.element}&locale=${locale}&type=result`;
  const metaText = t("landing.meta", { name: data.name, element: elementName });
  const title = t("landing.heading", { name: data.name, element: elementName });

  return {
    title,
    description: metaText,
    openGraph: {
      title,
      description: metaText,
      type: "website",
      locale,
      siteName: "FortuneLab",
      images: [{ url: ogUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: metaText,
      images: [ogUrl],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { locale, shareId } = await params;
  const data = decodeShareId(shareId);

  if (!data || !VALID_ELEMENTS.includes(data.element)) {
    redirect(`/${locale}`);
  }

  const t = await getTranslations({ locale, namespace: "share" });
  const elementName = await getElementName(locale, data.element);
  const emoji = ELEMENT_EMOJI[data.element] ?? "🌿";

  return (
    <ShareLanding
      element={data.element}
      name={data.name}
      emoji={emoji}
      locale={locale}
      heading={t("landing.heading", { name: data.name, element: elementName })}
      sub={t("landing.sub")}
      cta={t("landing.cta")}
    />
  );
}
