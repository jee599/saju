import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-glass-border bg-bg-top/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-5">
          <Link href="/" className="text-base font-extrabold text-t1">
            FateSaju
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <div className="legal">
          <p className="inline-block rounded-lg bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
            Privacy
          </p>
          <h1 className="mt-3 text-t1">개인정보처리방침</h1>
          <p className="mt-1 text-sm text-t2">시행일: 2026-02-22</p>

          <section className="legalSection">
            <h2>1. 수집 항목</h2>
            <p>이름, 생년월일, 출생시간(선택), 성별, 달력 유형을 리포트 생성 목적 범위에서 처리합니다.</p>
          </section>
          <section className="legalSection">
            <h2>2. 이용 목적</h2>
            <p>맞춤형 리포트 생성, 결제 플로우 시뮬레이션, 오류 분석과 품질 개선을 위해 사용합니다.</p>
          </section>
          <section className="legalSection">
            <h2>3. 보관/파기</h2>
            <p>V1 환경에서는 주문/리포트 데이터가 서버 메모리에 임시 저장되며 서버 재시작 시 초기화됩니다.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
