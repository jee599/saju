import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "daily" });
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://fortunelab.store";
  const path = "/daily";

  return {
    title: `${t("title")} | FortuneLab`,
    description: t("subtitle", { date: "" }).trim(),
    alternates: {
      canonical:
        locale === "ko" ? `${baseUrl}${path}` : `${baseUrl}/${locale}${path}`,
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
