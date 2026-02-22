import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "사주는 빅데이터 | 확률 기반 해석 서비스",
  description: "전통 해석과 데이터 패턴을 결합한 사주 리포트 서비스"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="siteHeader">
          <div className="shell headerInner">
            <Link href="/" className="brand">
              사주는 빅데이터
            </Link>
            <nav className="topNav">
              <Link href="/free-fortune">무료 입력</Link>
              <Link href="/terms">이용약관</Link>
              <Link href="/privacy">개인정보처리방침</Link>
              <Link href="/disclaimer">면책고지</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="siteFooter">
          <div className="shell footerInner">
            <p>사주는 빅데이터 | 확률 기반 참고 서비스</p>
            <p className="muted">의료·법률·투자 판단은 전문 자문과 함께 검토해 주세요.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
