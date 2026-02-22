import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "사주는 빅데이터 | 확률 기반 명리 리포트",
  description: "전통 명리 프레임을 확률 언어로 재해석한 신뢰형 리포트 서비스"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="siteHeader">
          <div className="headerInner">
            <Link href="/" className="brand">
              사주는 빅데이터
            </Link>
            <nav className="topNav" aria-label="주요 메뉴">
              <Link href="/free-fortune">무료 리포트</Link>
              <Link href="/terms">이용약관</Link>
              <Link href="/privacy">개인정보</Link>
              <Link href="/disclaimer">면책고지</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="siteFooter">
          <div className="footerInner">
            <p className="footerTitle">사주는 빅데이터</p>
            <p className="muted">전통 명리 해석 문법과 확률 기반 문장 엔진을 결합한 참고 서비스입니다.</p>
            <p className="muted">의료·법률·투자 판단은 반드시 자격 있는 전문가 자문과 함께 검토해 주세요.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
