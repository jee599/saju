import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "../../../i18n/navigation";
import { GlassCard, PageContainer, SectionTitle } from "../components/ui";

export async function generateMetadata() {
  const t = await getTranslations("comingSoon");
  return { title: `${t("title")} | FateSaju` };
}

export default function PalmPage() {
  return <ComingSoonContent />;
}

function ComingSoonContent() {
  const t = useTranslations("comingSoon");
  const nav = useTranslations("nav");
  return (
    <PageContainer>
      <GlassCard>
        <SectionTitle title={nav("palm")} subtitle={t("desc")} />
        <div className="buttonRow">
          <Link className="btn btn-primary" href="/free-fortune">{nav("saju")}</Link>
          <Link className="btn btn-ghost" href="/">{t("back")}</Link>
        </div>
      </GlassCard>
    </PageContainer>
  );
}
