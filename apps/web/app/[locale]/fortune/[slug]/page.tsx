import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "../../../../i18n/navigation";
import { locales } from "../../../../i18n/config";
import { GlassCard, PageContainer } from "../../components/ui";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://fortunelab.store";

// Canonical slug keys — used as i18n lookup keys and for non-ko URLs
const SLUG_KEYS = ["free-saju", "zodiac-2026", "birth-chart", "compatibility-test"] as const;
type SlugKey = (typeof SLUG_KEYS)[number];

// Map of localized slug -> canonical key (only needed for locales with non-English slugs)
const LOCALIZED_SLUGS: Record<string, SlugKey> = {
  "무료-사주": "free-saju",
  "2026-운세": "zodiac-2026",
  "사주-분석": "birth-chart",
  "궁합-테스트": "compatibility-test",
};

function resolveSlugKey(slug: string): SlugKey | null {
  if (SLUG_KEYS.includes(slug as SlugKey)) return slug as SlugKey;
  return LOCALIZED_SLUGS[slug] ?? null;
}

// CTA targets per slug
const CTA_HREF: Record<SlugKey, string> = {
  "free-saju": "/",
  "zodiac-2026": "/daily",
  "birth-chart": "/",
  "compatibility-test": "/compatibility",
};

export async function generateStaticParams() {
  const params: Array<{ locale: string; slug: string }> = [];
  for (const locale of locales) {
    for (const key of SLUG_KEYS) {
      // Use localized slug for ko, canonical key for others
      if (locale === "ko") {
        const t = await getTranslations({ locale, namespace: "seo" });
        const localizedSlug = t(`pages.${key}.slug`);
        params.push({ locale, slug: localizedSlug });
      } else {
        params.push({ locale, slug: key });
      }
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const key = resolveSlugKey(slug);
  if (!key) return {};

  const t = await getTranslations({ locale, namespace: "seo" });

  const canonical =
    locale === "ko"
      ? `${BASE_URL}/fortune/${t(`pages.${key}.slug`)}`
      : `${BASE_URL}/${locale}/fortune/${key}`;

  const languages: Record<string, string> = {};
  for (const l of locales) {
    if (l === "ko") {
      // need to get ko slug
      const tKo = await getTranslations({ locale: "ko", namespace: "seo" });
      languages[l] = `${BASE_URL}/fortune/${tKo(`pages.${key}.slug`)}`;
    } else {
      languages[l] = `${BASE_URL}/${l}/fortune/${key}`;
    }
  }
  languages["x-default"] = `${BASE_URL}/fortune/${key}`;

  return {
    title: t(`pages.${key}.title`),
    description: t(`pages.${key}.description`),
    alternates: { canonical, languages },
    openGraph: {
      title: t(`pages.${key}.title`),
      description: t(`pages.${key}.description`),
      type: "website",
      locale,
      siteName: "FortuneLab",
      url: canonical,
    },
  };
}

export const revalidate = 86400; // 24h ISR

export default async function SeoLandingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const key = resolveSlugKey(slug);
  if (!key) notFound();

  const t = await getTranslations({ locale, namespace: "seo" });

  const faqItems: Array<{ q: string; a: string }> = [];
  // Read FAQ items — seo.json stores them as array; stop when key returns raw path
  for (let i = 0; i < 10; i++) {
    const qKey = `pages.${key}.faq.${i}.q`;
    const q = t(qKey);
    // next-intl returns the raw key path when not found
    if (q === qKey || q.startsWith("seo.")) break;
    const a = t(`pages.${key}.faq.${i}.a`);
    faqItems.push({ q, a });
  }

  // FAQPage schema.org JSON-LD
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <PageContainer>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }}
      />

      <GlassCard>
        <h1 className="seoH1">{t(`pages.${key}.h1`)}</h1>
        <p className="seoIntro">{t(`pages.${key}.intro`)}</p>
      </GlassCard>

      <GlassCard className="seoFaq">
        <h2 className="seoFaqTitle">FAQ</h2>
        <dl className="seoFaqList">
          {faqItems.map(({ q, a }, i) => (
            <div key={i} className="seoFaqItem">
              <dt>{q}</dt>
              <dd>{a}</dd>
            </div>
          ))}
        </dl>
      </GlassCard>

      <div className="seoCta">
        <Link href={CTA_HREF[key]} className="btn btn-primary btn-lg">
          {t(`pages.${key}.ctaText`)}
        </Link>
      </div>
    </PageContainer>
  );
}
