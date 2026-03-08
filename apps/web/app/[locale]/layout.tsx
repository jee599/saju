import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "../../i18n/navigation";
import { locales } from "../../i18n/config";
import { getCountryByLocale } from "@saju/shared";
import { GtagScript } from "./components/GtagScript";
import LanguageSelector from "./components/LanguageSelector";
import NavDropdown from "./components/NavDropdown";
import CosmicBackgroundLoader from "./components/CosmicBackgroundLoader";

const AURORA_FONTS_URL = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Sora:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&family=Italiana&display=swap";

function getLocaleFonts(locale: string) {
  switch (locale) {
    case "ko":
      return (
        <>
          <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet" />
          <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700&display=swap" rel="stylesheet" />
          <link href={AURORA_FONTS_URL} rel="stylesheet" />
        </>
      );
    case "ja":
      return (
        <>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=Noto+Serif+JP:wght@400;500;600;700&display=swap" rel="stylesheet" />
          <link href={AURORA_FONTS_URL} rel="stylesheet" />
        </>
      );
    case "zh":
      return (
        <>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;500;600;700&display=swap" rel="stylesheet" />
          <link href={AURORA_FONTS_URL} rel="stylesheet" />
        </>
      );
    case "th":
      return (
        <>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet" />
          <link href={AURORA_FONTS_URL} rel="stylesheet" />
        </>
      );
    case "hi":
      return (
        <>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" rel="stylesheet" />
          <link href={AURORA_FONTS_URL} rel="stylesheet" />
        </>
      );
    default: // en, vi, id
      return (
        <>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&display=swap" rel="stylesheet" />
          <link href={AURORA_FONTS_URL} rel="stylesheet" />
        </>
      );
  }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://fortunelab.store";

  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[l] = l === "ko" ? baseUrl : `${baseUrl}/${l}`;
  }
  languages["x-default"] = baseUrl;

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
    alternates: {
      canonical: locale === "ko" ? baseUrl : `${baseUrl}/${locale}`,
      languages,
    },
    openGraph: {
      title: t("metadata.ogTitle"),
      description: t("metadata.ogDescription"),
      type: "website",
      locale,
      siteName: t("brand"),
      images: [
        {
          url: `${baseUrl}/api/og?type=result`,
          width: 1200,
          height: 630,
          alt: t("metadata.ogTitle"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("metadata.ogTitle"),
      description: t("metadata.ogDescription"),
      images: [`${baseUrl}/api/og?type=result`],
    },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: "common" });
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://fortunelab.store";

  const country = getCountryByLocale(locale);
  // Zero-decimal currencies store whole units; 2-decimal currencies store cents
  const zeroDecimalCurrencies = ["KRW", "JPY", "VND", "IDR"];
  const price = zeroDecimalCurrencies.includes(country.currency)
    ? country.pricing.saju.premium.toString()
    : (country.pricing.saju.premium / 100).toFixed(2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t("brand"),
    description: t("metadata.description"),
    url: locale === "ko" ? baseUrl : `${baseUrl}/${locale}`,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: country.currency,
    },
    creator: {
      "@type": "Organization",
      name: "FortuneLab",
      url: baseUrl,
    },
  };

  return (
    <html lang={locale} data-locale={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {getLocaleFonts(locale)}
      </head>
      <GtagScript />
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a href="#main-content" className="skip-link">{t("skipLink")}</a>
        <NextIntlClientProvider messages={messages}>
          <CosmicBackgroundLoader />
          <header className="siteHeader">
            <div className="headerInner">
              <div className="headerTopRow">
                <Link href="/" className="brand">
                  <svg className="brandLogo" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <defs>
                      <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#a78bfa" />
                        <stop offset="100%" stopColor="#f472b6" />
                      </linearGradient>
                    </defs>
                    <circle cx="16" cy="16" r="14.5" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.6" />
                    <path d="M16 4 A12 12 0 0 1 16 28 A6 6 0 0 0 16 16 A6 6 0 0 1 16 4Z" fill="url(#logoGrad)" opacity="0.85" />
                    <circle cx="16" cy="10" r="2" fill="#08060f" />
                    <circle cx="16" cy="22" r="2" fill="url(#logoGrad)" />
                  </svg>
                  <span className="brandText">{t("brand")}</span>
                </Link>
                <nav className="topNav" aria-label={t("nav.label")}>
                  <Link href="/daily">{t("nav.daily")}</Link>
                  <Link href="/#hero">{t("nav.saju")}</Link>
                </nav>
                <NavDropdown />
                <LanguageSelector />
              </div>
            </div>
          </header>
          <main id="main-content">{children}</main>
          <footer className="siteFooter">
            <div className="footerInner">
              <p className="footerTitle">{t("footer.title")}</p>
              <p className="muted">{t("footer.description")}</p>
              <p className="muted">{t("footer.disclaimer")}</p>
              <nav className="footerLinks" aria-label="Legal">
                <Link href="/terms">{t("footer.terms")}</Link>
                <Link href="/privacy">{t("footer.privacy")}</Link>
                <Link href="/refund">{t("footer.refund")}</Link>
                <Link href="/disclaimer">{t("footer.legal")}</Link>
              </nav>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
