"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page">
      <div className="container">
        <section className="glassCard" style={{ textAlign: "center", padding: "48px 24px" }}>
          <h2>문제가 발생했습니다</h2>
          <p className="muted" style={{ marginTop: 12 }}>
            {error.message || "서비스에 일시적인 오류가 발생했습니다."}
          </p>
          <div className="buttonRow" style={{ justifyContent: "center", marginTop: 24 }}>
            <button className="btn btn-primary btn-lg" onClick={reset}>
              다시 시도
            </button>
            <a href="/" className="btn btn-ghost btn-lg">
              홈으로 돌아가기
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
