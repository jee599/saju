import { useTranslations } from "next-intl";
import { GlassCard, PageContainer } from "../components/ui";

export const revalidate = 3600;

export default function YouthPolicyPage() {
  const t = useTranslations("legal.youthPolicy");

  return (
    <PageContainer>
      <GlassCard className="legal">
        <p className="heroEyebrow">{t("eyebrow")}</p>
        <h1>{t("title")}</h1>

        <section className="legalSection">
          <h2>{t("s1.title")}</h2>
          <p>{t("s1.body")}</p>
        </section>
        <section className="legalSection">
          <h2>{t("s2.title")}</h2>
          <p>{t("s2.body")}</p>
        </section>
        <section className="legalSection">
          <h2>{t("s3.title")}</h2>
          <p>{t("s3.body")}</p>
        </section>
      </GlassCard>
    </PageContainer>
  );
}
