import type { Metadata } from "next";
import Link from "next/link";
import { GtagScript } from "./components/GtagScript";
import "./globals.css";

export const metadata: Metadata = {
  title: "FateSaju | AI 사주 분석",
  description: "518,400가지 사주 조합을 AI가 분석합니다. 무료로 시작하세요.",
  openGraph: {
    title: "FateSaju | AI 사주 분석",
    description: "518,400가지 사주 조합을 AI가 분석합니다.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          rel="stylesheet"
        />
      </head>
      <GtagScript />
      <body>
        <header className="siteHeader">
          <div className="headerInner">
            <Link href="/" className="brand">
              FateSaju
            </Link>
            <nav className="topNav" aria-label="주요 메뉴">
              <Link href="/#hero">사주</Link>
              <Link href="/palm">손금</Link>
              <Link href="/name">작명</Link>
              <Link href="/face">관상</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="siteFooter">
          <div className="footerInner">
            <p className="footerTitle">FateSaju</p>
            <p className="muted">전통 사주명리학을 AI로 재해석한 운세 분석 서비스입니다.</p>
            <p className="muted">의료·법률·투자 판단의 근거로 사용하지 마세요.</p>
            <div className="footerLinks">
              <Link href="/terms">이용약관</Link>
              <Link href="/privacy">개인정보처리방침</Link>
              <Link href="/refund">환불정책</Link>
              <Link href="/disclaimer">면책조항</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
