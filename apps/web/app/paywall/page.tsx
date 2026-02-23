"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

  const checkout = async () => {
    if (!input) return setError("입력값이 없어 결제를 시작할 수 없습니다.");
    try {
      setState("creating");
      const created = await webApi.checkoutCreate({ productCode: "full", input });
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
        <p className="heroEyebrow">리포트 잠금 해제</p>
        <h1>단일 장문 리포트</h1>
        <p className="lead">실제 청구 없는 모의 결제로 전체 리포트를 즉시 확인할 수 있습니다.</p>

        <article className="pricingCard mt-sm">
          <h3>상품 구성</h3>
          <p className="price">{getPriceLabel("full")}</p>
          <ul className="flatList compactList">
            <li>대화형 한국어 장문 리포트</li>
            <li>성격·직업·연애·금전·건강·가족·배우자 분석</li>
            <li>각 도메인 과거→현재→미래 + 대운 타임라인</li>
          </ul>
        </article>

        <div className="buttonRow mt-md">
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
  return (
    <Suspense fallback={<PageContainer><GlassCard><p>결제 페이지 로딩중...</p></GlassCard></PageContainer>}>
      <PaywallInner />
    </Suspense>
  );
}
