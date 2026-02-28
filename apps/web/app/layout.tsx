import type { Metadata } from "next";
import Link from "next/link";
import { GtagScript } from "./components/GtagScript";
import "./globals.css";

export const metadata: Metadata = {
  title: "복연구소 | AI 사주 분석",
  description: "518,400가지 사주 조합을 AI가 분석합니다. 무료로 시작하세요.",
  openGraph: {
    title: "복연구소 | AI 사주 분석",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Noto+Serif+KR:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <GtagScript />
      <body>
        <header className="siteHeader">
          <div className="headerInner">
            <Link href="/" className="brand">
              <svg className="brandLogo" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#C48B9F" />
                    <stop offset="100%" stopColor="#D4AF37" />
                  </linearGradient>
                </defs>
                <circle cx="16" cy="16" r="14.5" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.6" />
                <path d="M16 4 A12 12 0 0 1 16 28 A6 6 0 0 0 16 16 A6 6 0 0 1 16 4Z" fill="url(#logoGrad)" opacity="0.85" />
                <circle cx="16" cy="10" r="2" fill="#1A0A2E" />
                <circle cx="16" cy="22" r="2" fill="url(#logoGrad)" />
              </svg>
              <span className="brandText">복연구소</span>
            </Link>
            <nav className="topNav" aria-label="주요 메뉴">
              <Link href="/daily">오늘의 운세</Link>
              <Link href="/#hero">사주</Link>
              <Link href="/palm">손금</Link>
              <Link href="/name">작명</Link>
              <Link href="/face">관상</Link>
              <Link href="/dream">꿈해몽</Link>
              <Link href="/tarot">타로</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="siteFooter">
          <div className="footerInner">
            <p className="footerTitle">복연구소</p>
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
