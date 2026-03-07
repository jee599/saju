import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "misc.freeFortune" });
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://fortunelab.store";
  const path = "/free-fortune";

  return {
    title: t("title"),
    description: t("desc"),
    openGraph: {
      images: [{ url: `${baseUrl}/api/og?type=result`, width: 1200, height: 630 }],
    },
    alternates: {
      canonical:
        locale === "ko" ? `${baseUrl}${path}` : `${baseUrl}/${locale}${path}`,
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
