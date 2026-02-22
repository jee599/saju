"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProductCode } from "../../lib/types";
import { webApi } from "../../lib/api";
import { getPriceLabel, toInputFromParams, toInputQuery } from "../../lib/fortune";
import { Button, ButtonLink, GlassCard, PageContainer, StatusBox } from "../components/ui";

type CheckoutState = "idle" | "creating" | "confirming" | "failed";

function PaywallInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<CheckoutState>("idle");
  const [error, setError] = useState<string | null>(null);

  const input = useMemo(() => toInputFromParams(new URLSearchParams(searchParams.toString())), [searchParams]);
  const productCode: ProductCode = searchParams.get("productCode") === "deep" ? "deep" : "standard";

  const checkout = async () => {
    if (!input) return setError("입력값이 없어 결제를 시작할 수 없습니다.");
    try {
      setState("creating");
      const created = await webApi.checkoutCreate({ productCode, input });
      setState("confirming");
      const confirmed = await webApi.checkoutConfirm({ orderId: created.order.orderId });
      router.push(`/report/${confirmed.order.orderId}?${toInputQuery(input)}`);
    } catch (e) {
      setState("failed");
      setError(e instanceof Error ? e.message : "결제 시뮬레이션 실패");
    }
  };

  return (
    <PageContainer>
      <GlassCard>
        <h1>리포트 잠금 해제</h1>
        <p className="lead">실제 청구 없는 모의 결제로 전체 리포트를 확인합니다.</p>
        <p>선택 상품: <strong>{productCode === "deep" ? "심화 리포트" : "표준 리포트"}</strong> ({getPriceLabel(productCode)})</p>
        <div className="inlineActions">
          <ButtonLink href={input ? `/result?${toInputQuery(input)}` : "/free-fortune"} variant="ghost">결과로 돌아가기</ButtonLink>
          <Button onClick={() => void checkout()} disabled={state === "creating" || state === "confirming"}>
            {state === "creating" ? "주문 생성 중..." : state === "confirming" ? "결제 확인 중..." : "모의 결제 진행"}
          </Button>
        </div>
        {error ? <StatusBox title="오류" description={error} tone="error" /> : null}
      </GlassCard>
    </PageContainer>
  );
}

export default function PaywallPage() {
  return <Suspense fallback={<PageContainer><GlassCard><p>결제 페이지 로딩중...</p></GlassCard></PageContainer>}><PaywallInner /></Suspense>;
}
