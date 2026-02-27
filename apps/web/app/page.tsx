import Link from "next/link";
import HeroTabs from "./components/HeroTabs";
import FAQ from "./components/FAQ";
import RotatingWords from "./components/RotatingWords";

/* ── Static data ───────────────────────────────────────── */

const STATS = [
  { value: "518,400+", label: "사주 조합" },
  { value: "<1초", label: "AI 분석 속도" },
  { value: "42개", label: "검증 케이스" },
] as const;

const FREE_FEATURES = [
  "사주 팔자 카드 (4주 확인)",
  "오행 밸런스 분석 (5행 비율)",
  "음양 비율 확인",
  "일주 원소 파악",
] as const;

const PREMIUM_FEATURES = [
  "타고난 기질 + 오행 밸런스",
  "2026년 올해 총운",
  "직업 / 재물 운세",
  "연애 / 결혼 운세",
  "건강 운세",
  "대인관계 분석",
  "학업 / 자기계발",
  "월별 운세 흐름",
  "총 9파트 전체 상세 분석",
] as const;

/* ── Page Component ───────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* ─── Header (Sticky) ─────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-glass-border bg-bg-top/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-t1">
            FateSaju
          </Link>
          <nav className="flex items-center gap-4">
            <span className="text-xs font-medium text-t3">AI 사주 분석</span>
          </nav>
        </div>
      </header>

      <main>
        {/* ─── Hero Section ──────────────────────────── */}
        <section className="relative overflow-hidden px-5 pb-16 pt-12 md:pb-24 md:pt-20">
          {/* Background decoration */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-cta-from/10 blur-[120px]" />
            <div className="absolute -bottom-20 right-0 h-60 w-60 rounded-full bg-cta-to/8 blur-[100px]" />
          </div>

          <div className="relative mx-auto max-w-5xl">
            <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-14">
              {/* Left: Text */}
              <div>
                <h1 className="text-t1">
                  나의 <RotatingWords />
                  <br />
                  사주로 알아보기
                </h1>

                <p className="mt-4 max-w-md text-base leading-relaxed text-t2">
                  MBTI는 16가지. 당신의 사주는{" "}
                  <span className="font-semibold text-accent">
                    518,400가지
                  </span>
                  .
                </p>

                <p className="mt-2 text-sm text-t3">
                  AI가 만세력 데이터를 분석하여 당신의 사주를 해석합니다.
                </p>
              </div>

              {/* Right: Form Tabs */}
              <HeroTabs />
            </div>
          </div>
        </section>

        {/* ─── Stats Strip ───────────────────────────── */}
        <section className="border-y border-glass-border bg-bg-card/50 px-5 py-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 md:flex-row md:justify-between">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-extrabold tracking-tight text-accent">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-medium text-t3">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Features Section ──────────────────────── */}
        <section className="px-5 py-16 md:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <h2 className="text-t1">무료 vs 프리미엄</h2>
              <p className="mt-2 text-sm text-t2">
                무료로 기본 분석을 확인하고, 더 깊은 분석이 필요하면 업그레이드하세요
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Free Card */}
              <div className="rounded-2xl border border-glass-border bg-bg-card/60 p-6">
                <div className="mb-4 inline-block rounded-lg bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
                  무료
                </div>
                <h3 className="text-xl font-bold text-t1">기본 분석</h3>
                <p className="mt-1 text-2xl font-extrabold text-t1">
                  ₩0
                </p>
                <ul className="mt-5 space-y-2.5">
                  {FREE_FEATURES.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-t2"
                    >
                      <span className="mt-0.5 text-element-wood">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Premium Card */}
              <div className="relative rounded-2xl border border-cta-from/30 bg-gradient-to-b from-bg-card to-bg-card/80 p-6 shadow-lg shadow-cta-from/5">
                <div className="mb-4 inline-block rounded-lg bg-gradient-to-r from-cta-from to-cta-to px-3 py-1 text-xs font-bold text-white">
                  프리미엄
                </div>
                <h3 className="text-xl font-bold text-t1">
                  9파트 전체 분석
                </h3>
                <p className="mt-1 text-2xl font-extrabold text-t1">
                  ₩5,900
                </p>
                <ul className="mt-5 space-y-2.5">
                  {PREMIUM_FEATURES.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-t2"
                    >
                      <span className="mt-0.5 text-cta-from">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FAQ Section ───────────────────────────── */}
        <section className="px-5 py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <h2 className="text-t1">자주 묻는 질문</h2>
              <p className="mt-2 text-sm text-t2">
                사주 분석 서비스에 대해 궁금한 점을 확인해 보세요
              </p>
            </div>
            <FAQ />
          </div>
        </section>
      </main>

      {/* ─── Footer ──────────────────────────────────── */}
      <footer className="border-t border-glass-border bg-bg-bottom/80 px-5 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-bold text-t2">FateSaju</p>
          <p className="mt-2 text-xs leading-relaxed text-t3">
            본 서비스는 전통 명리 해석을 AI로 재구성한 참고 정보 서비스입니다.
            <br />
            의료, 법률, 투자 판단은 반드시 자격 있는 전문가 자문과 함께 검토해
            주세요.
          </p>
          <div className="mt-4 flex gap-4 text-xs text-t3">
            <Link href="/terms" className="hover:text-accent transition-colors">
              이용약관
            </Link>
            <Link
              href="/privacy"
              className="hover:text-accent transition-colors"
            >
              개인정보처리방침
            </Link>
            <Link
              href="/disclaimer"
              className="hover:text-accent transition-colors"
            >
              면책고지
            </Link>
            <Link href="/refund" className="hover:text-accent transition-colors">환불정책</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
