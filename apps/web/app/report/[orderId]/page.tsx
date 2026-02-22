"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { GetReportResponse } from "@saju/shared";
import { webApi } from "../../../lib/api";

type ReportState = "loading" | "success" | "error";

export default function ReportPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = useMemo(() => params.orderId, [params.orderId]);

  const [state, setState] = useState<ReportState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<GetReportResponse | null>(null);

  const loadReport = async () => {
    setState("loading");
    setError(null);

    try {
      const data = await webApi.report(orderId);
      setPayload(data);
      setState("success");
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "리포트 조회 실패");
    }
  };

  useEffect(() => {
    void loadReport();
  }, [orderId]);

  return (
    <main className="shell pageMain">
      {state === "loading" ? (
        <section className="card">
          <p>잠금 해제 리포트를 불러오는 중입니다...</p>
        </section>
      ) : null}

      {state === "error" ? (
        <section className="card">
          <h1>리포트 조회 실패</h1>
          <p className="errorText">{error}</p>
          <div className="inlineActions">
            <button type="button" onClick={() => void loadReport()}>
              재시도
            </button>
            <Link href="/free-fortune">처음부터 다시 시작</Link>
          </div>
        </section>
      ) : null}

      {state === "success" && payload ? (
        <section className="card">
          <h1>{payload.report.headline}</h1>
          <p>{payload.report.summary}</p>
          <p className="muted">
            주문번호 {payload.order.orderId} | 상품 {payload.order.productCode} | 생성 {new Date(payload.report.generatedAt).toLocaleString("ko-KR")}
          </p>

          {payload.report.sections.map((section) => (
            <article key={section.key} className="sectionBlock">
              <h3>{section.title}</h3>
              <p>{section.text}</p>
            </article>
          ))}

          <section className="sectionBlock">
            <h3>실행 제안</h3>
            <ul className="flatList">
              {payload.report.recommendations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <p className="muted">{payload.report.disclaimer}</p>
        </section>
      ) : null}
    </main>
  );
}
