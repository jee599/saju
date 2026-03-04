import { useTranslations } from "next-intl";
import { GlassCard, PageContainer } from "../components/ui";

export default function RefundPage() {
  const t = useTranslations("legal.refund");

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
          <ul>
            {(["0", "1", "2"] as const).map((i) => (
              <li key={i}>{t(`s2.items.${i}`)}</li>
            ))}
          </ul>
        </section>
        <section className="legalSection">
          <h2>{t("s3.title")}</h2>
          <ul>
            {(["0", "1", "2"] as const).map((i) => (
              <li key={i}>{t(`s3.items.${i}`)}</li>
            ))}
          </ul>
        </section>
        <section className="legalSection">
          <h2>{t("s4.title")}</h2>
          <p>{t("s4.body")}</p>
        </section>
        <section className="legalSection">
          <h2>{t("s5.title")}</h2>
          <p>{t("s5.body")}</p>
        </section>
      </GlassCard>
    </PageContainer>
  );
}
