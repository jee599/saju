"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "../../../i18n/navigation";
import { webApi } from "../../../lib/api";
import { getPriceLabel, toInputFromParams, toInputQuery } from "../../../lib/fortune";
import { Button, ButtonLink, GlassCard, PageContainer, StatusBox } from "../components/ui";

type CheckoutState = "idle" | "creating" | "confirming" | "failed";

function PaywallInner() {
  const t = useTranslations("paywall");
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<CheckoutState>("idle");
  const [error, setError] = useState<string | null>(null);

  const input = useMemo(() => toInputFromParams(new URLSearchParams(searchParams.toString())), [searchParams]);

  const checkout = async () => {
    if (!input) return setError(t("inputError"));
    try {
      setState("creating");
      const created = await webApi.checkoutCreate({ productCode: "full", input });
      setState("confirming");
      const confirmed = await webApi.checkoutConfirm({ orderId: created.order.orderId });
      router.push(`/report/${confirmed.order.orderId}?${toInputQuery(input)}`);
    } catch (e) {
      setState("failed");
      setError(e instanceof Error ? e.message : t("failError"));
    }
  };

  const features = t.raw("features") as string[];

  return (
    <PageContainer>
      <GlassCard>
        <p className="heroEyebrow">{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
        <p className="lead">{t("lead")}</p>

        <article className="pricingCard mt-sm">
          <h3>{t("productTitle")}</h3>
          <p className="price">{getPriceLabel("full")}</p>
          <ul className="flatList compactList">
            {features.map((item: string) => <li key={item}>{item}</li>)}
          </ul>
        </article>

        <div className="buttonRow mt-md">
          <ButtonLink href={input ? `/result?${toInputQuery(input)}` : "/free-fortune"} variant="ghost">{t("back")}</ButtonLink>
          <Button onClick={() => void checkout()} disabled={state === "creating" || state === "confirming"}>
            {state === "creating" ? t("creating") : state === "confirming" ? t("confirming") : t("submit")}
          </Button>
        </div>

        {error ? <StatusBox title={t("errorTitle")} description={error} tone="error" /> : null}
      </GlassCard>
    </PageContainer>
  );
}

export default function PaywallPage() {
  const t = useTranslations("paywall");
  return (
    <Suspense fallback={<PageContainer><GlassCard><p>{t("loading")}</p></GlassCard></PageContainer>}>
      <PaywallInner />
    </Suspense>
  );
}
