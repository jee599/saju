"use client";

const translations: Record<string, { title: string; fallbackMessage: string; retry: string; home: string }> = {
  ko: {
    title: "문제가 발생했습니다",
    fallbackMessage: "서비스에 일시적인 오류가 발생했습니다.",
    retry: "다시 시도",
    home: "홈으로 돌아가기",
  },
  en: {
    title: "Something went wrong",
    fallbackMessage: "A temporary error has occurred.",
    retry: "Try again",
    home: "Go to home",
  },
  ja: {
    title: "問題が発生しました",
    fallbackMessage: "一時的なエラーが発生しました。",
    retry: "もう一度試す",
    home: "ホームに戻る",
  },
  zh: {
    title: "出现问题",
    fallbackMessage: "服务暂时出现错误。",
    retry: "重试",
    home: "返回首页",
  },
  th: {
    title: "เกิดข้อผิดพลาด",
    fallbackMessage: "เกิดข้อผิดพลาดชั่วคราว",
    retry: "ลองอีกครั้ง",
    home: "กลับหน้าแรก",
  },
  vi: {
    title: "Đã xảy ra lỗi",
    fallbackMessage: "Lỗi tạm thời đã xảy ra.",
    retry: "Thử lại",
    home: "Về trang chủ",
  },
  id: {
    title: "Terjadi kesalahan",
    fallbackMessage: "Terjadi error sementara.",
    retry: "Coba lagi",
    home: "Ke Beranda",
  },
  hi: {
    title: "कुछ गड़बड़ हुई",
    fallbackMessage: "एक अस्थायी त्रुटि हुई।",
    retry: "पुनः प्रयास करें",
    home: "होम पेज पर जाएं",
  },
};

function getLocaleFromPath(): string {
  if (typeof window === "undefined") return "ko";
  const segment = window.location.pathname.split("/")[1] ?? "";
  return translations[segment] ? segment : "ko";
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = getLocaleFromPath();
  const t = translations[locale] ?? translations.ko!;

  return (
    <main className="page">
      <div className="container">
        <section className="glassCard" style={{ textAlign: "center", padding: "48px 24px" }}>
          <h2>{t.title}</h2>
          <p className="muted" style={{ marginTop: 12 }}>
            {error.message || t.fallbackMessage}
          </p>
          <div className="buttonRow" style={{ justifyContent: "center", marginTop: 24 }}>
            <button className="btn btn-primary btn-lg" onClick={reset}>
              {t.retry}
            </button>
            <a href="/" className="btn btn-ghost btn-lg">
              {t.home}
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
