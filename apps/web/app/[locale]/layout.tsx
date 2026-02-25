import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Script from "next/script";
import { Link } from "../../i18n/navigation";
import { routing } from "../../i18n/routing";
import type { Locale } from "../../i18n/config";
import { LanguageSwitcher } from "./components/LanguageSwitcher";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const messages = await getMessages({ locale });
  const meta = (messages as any).meta;
  return {
    title: meta?.title ?? "FateSaju",
    description: meta?.description ?? "",
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  const t = (messages as any);

  return (
    <html lang={locale}>
      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
        </>
      )}
      <body>
        <NextIntlClientProvider messages={messages}>
          <header className="siteHeader">
            <div className="headerInner">
              <Link href="/" className="brand">
                {t.nav?.brand ?? "FateSaju"}
              </Link>
              <nav className="topNav" aria-label="main menu">
                <Link href="/free-fortune">{t.nav?.saju ?? "Saju"}</Link>
                <Link href="/palm">{t.nav?.palm ?? "Palm"}</Link>
                <Link href="/name">{t.nav?.name ?? "Name"}</Link>
                <Link href="/face">{t.nav?.face ?? "Face"}</Link>
              </nav>
              <LanguageSwitcher currentLocale={locale as Locale} />
            </div>
          </header>
          {children}
          <footer className="siteFooter">
            <div className="footerInner">
              <p className="footerTitle">{t.footer?.brand ?? "FateSaju"}</p>
              <p className="muted">{t.footer?.desc}</p>
              <p className="muted">{t.footer?.warning}</p>
              <div className="footerLinks">
                <Link href="/terms">{t.footer?.terms ?? "Terms"}</Link>
                <Link href="/privacy">{t.footer?.privacy ?? "Privacy"}</Link>
                <Link href="/disclaimer">{t.footer?.disclaimer ?? "Disclaimer"}</Link>
              </div>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
