"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProductCode } from "@saju/shared";
import { webApi } from "../../lib/api";
import { trackEvent } from "../../lib/analytics";
import { getPriceLabel, toInputFromParams, toInputQuery } from "../../lib/fortune";
import { Button, ButtonLink, GlassCard, PageContainer, StatusBox } from "../components/ui";

type CheckoutState = "idle" | "creating" | "confirming" | "failed";

function PaywallInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<CheckoutState>("idle");
  const [error, setError] = useState<string | null>(null);

  const input = useMemo(() => toInputFromParams(new URLSearchParams(searchParams.toString())), [searchParams]);
  const productRaw = searchParams.get("productCode");
  const productCode: ProductCode = productRaw === "deep" ? "deep" : "standard";

  const checkout = async () => {
    if (!input) {
      setError("입력값이 없어 결제를 시작할 수 없습니다.");
      setState("failed");
      return;
    }

    setError(null);
    setState("creating");

    try {
      const created = await webApi.checkoutCreate({ productCode, input });
      trackEvent("checkout_created", { orderId: created.order.orderId, productCode });

      setState("confirming");
      const confirmed = await webApi.checkoutConfirm({ orderId: created.order.orderId });
      trackEvent("checkout_confirmed", { orderId: confirmed.order.orderId, productCode });

      router.push(`/report/${confirmed.order.orderId}?${toInputQuery(input)}`);
    } catch (e) {
      setState("failed");
      setError(e instanceof Error ? e.message : "결제 시뮬레이션에 실패했습니다.");
      trackEvent("checkout_failed", { productCode });
    }
  };

  const isProcessing = state === "creating" || state === "confirming";

  return (
    <PageContainer>
      <GlassCard>
        <p className="heroEyebrow">결제 시뮬레이션</p>
        <h1>리포트 잠금 해제</h1>
        <p className="lead">실제 카드 청구는 발생하지 않으며, 모의 결제 승인 후 전체 리포트를 확인할 수 있습니다.</p>

        <div className="sectionBlock">
          <div className="metaRow">
            <span className="badge badge-neutral">선택 상품</span>
            <strong>{productCode === "deep" ? "심화 리포트" : "표준 리포트"}</strong>
          </div>
          <div className="metaRow">
            <span className="badge badge-soft">결제 금액</span>
            <strong>{getPriceLabel(productCode)}</strong>
          </div>
        </div>

        <div className="inlineActions">
          <ButtonLink href={input ? `/result?${toInputQuery(input)}` : "/free-fortune"} variant="ghost">
            결과로 돌아가기
          </ButtonLink>
          <Button type="button" onClick={() => void checkout()} disabled={isProcessing} size="lg">
            {state === "creating" ? "주문 생성 중..." : state === "confirming" ? "결제 확인 중..." : "모의 결제 진행"}
          </Button>
        </div>

        {isProcessing ? (
          <div className="loadingRow mt-sm">
            <span className="spinner" />
            안전한 결제 시뮬레이션 처리 중
          </div>
        ) : null}

        {state === "failed" && error ? (
          <div className="mt-md">
            <StatusBox title="결제를 완료하지 못했습니다" description={error} tone="error" />
          </div>
        ) : null}
      </GlassCard>
    </PageContainer>
  );
}

export default function PaywallPage() {
  return (
    <Suspense fallback={<PageContainer><GlassCard><p>결제 페이지를 불러오는 중...</p></GlassCard></PageContainer>}>
      <PaywallInner />
    </Suspense>
  );
}
