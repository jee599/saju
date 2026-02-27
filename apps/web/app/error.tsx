"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: "linear-gradient(180deg, #1A1535, #09091A)" }}>
      <div className="text-center max-w-md">
        <p className="text-4xl mb-4">🔮</p>
        <h2 className="text-xl font-bold text-[var(--color-t1)] mb-2">
          잠시 문제가 발생했습니다
        </h2>
        <p className="text-[var(--color-t2)] mb-6">
          {error.message === "429"
            ? "서버가 바쁩니다. 잠시 후 다시 시도해주세요."
            : "분석 중 오류가 발생했습니다. 다시 시도해주세요."}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 rounded-xl font-bold text-white"
          style={{ background: "linear-gradient(135deg, var(--color-cta-from), var(--color-cta-to))" }}
        >
          다시 시도
        </button>
        <p className="mt-4">
          <a href="/" className="text-[var(--color-accent)] text-sm hover:underline">
            처음으로 돌아가기
          </a>
        </p>
      </div>
    </div>
  );
}
