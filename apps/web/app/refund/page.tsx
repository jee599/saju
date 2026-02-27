import Link from "next/link";

export const metadata = { title: "환불정책 | FateSaju" };

export default function RefundPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-glass-border bg-bg-top/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-5">
          <Link href="/" className="text-base font-extrabold text-t1">FateSaju</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <div className="legal">
          <p className="inline-block rounded-lg bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
            Refund
          </p>
          <h1 className="mt-3 text-t1">환불 정책</h1>
          <p className="mt-1 text-sm text-t2">시행일: 2026-02-22</p>

          <section className="legalSection">
            <h2>1. 환불 가능 조건</h2>
            <p>결제 후 프리미엄 리포트를 열람하지 않은 경우, 결제일로부터 7일 이내에 전액 환불이 가능합니다.</p>
          </section>
          <section className="legalSection">
            <h2>2. 환불 불가 조건</h2>
            <p>프리미엄 리포트를 1회 이상 열람한 경우, 디지털 콘텐츠의 특성상 환불이 불가합니다. (전자상거래법 제17조 제2항)</p>
          </section>
          <section className="legalSection">
            <h2>3. 환불 절차</h2>
            <p>환불을 원하시는 경우 고객센터로 연락해 주세요. 환불 처리에는 영업일 기준 3~5일이 소요됩니다.</p>
          </section>
          <section className="legalSection">
            <h2>4. 시스템 장애</h2>
            <p>시스템 장애로 리포트가 정상 생성되지 않은 경우, 전액 환불 또는 재생성을 지원합니다.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
