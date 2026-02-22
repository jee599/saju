"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProductCode } from "@saju/shared";
import { webApi } from "../../lib/api";
import { trackEvent } from "../../lib/analytics";
import { getPriceLabel, toInputFromParams, toInputQuery } from "../../lib/fortune";

type CheckoutState = "idle" | "creating" | "confirming" | "failed";

export default function PaywallPage() {
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

  return (
    <main className="shell pageMain">
      <section className="card">
        <h1>리포트 결제 시뮬레이션</h1>
        <p>
          선택 상품: <strong>{productCode === "deep" ? "심화 리포트" : "표준 리포트"}</strong>
        </p>
        <p>
          결제 금액: <strong>{getPriceLabel(productCode)}</strong>
        </p>
        <p className="muted">V1은 모의결제로 동작하며 실제 카드 청구는 발생하지 않습니다.</p>

        <div className="inlineActions">
          <Link href={input ? `/result?${toInputQuery(input)}` : "/free-fortune"}>결과로 돌아가기</Link>
          <button type="button" onClick={() => void checkout()} disabled={state === "creating" || state === "confirming"}>
            {state === "creating" ? "주문 생성 중..." : state === "confirming" ? "결제 확인 중..." : "모의 결제 진행"}
          </button>
        </div>

        {state === "failed" && error ? <p className="errorText">{error}</p> : null}
      </section>
    </main>
  );
}
