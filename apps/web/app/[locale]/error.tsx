"use client";

import { useEffect } from "react";
import { GlassCard, PageContainer, Button } from "./components/ui";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorBoundary]", error);
    }
  }, [error]);

  return (
    <PageContainer>
      <div style={{ paddingTop: 80, paddingBottom: 80, textAlign: "center" }}>
        <GlassCard>
          <p style={{ fontSize: "2.5rem", marginBottom: 8 }}>⚠️</p>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: 12, color: "var(--t1)" }}>
            문제가 발생했습니다
          </h1>
          <p style={{ color: "var(--t2)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: 28 }}>
            일시적인 오류가 발생했습니다.<br />
            잠시 후 다시 시도해 주세요.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Button variant="primary" size="md" onClick={() => reset()}>
              다시 시도
            </Button>
            <Button variant="ghost" size="md" onClick={() => (window.location.href = "/")}>
              홈으로
            </Button>
          </div>
        </GlassCard>
      </div>
    </PageContainer>
  );
}
