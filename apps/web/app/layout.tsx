import type { Metadata } from "next";
import { GtagScript } from "./components/GtagScript";
import "./globals.css";

export const metadata: Metadata = {
  title: "FateSaju | AI 사주 분석",
  description:
    "518,400가지 사주 조합에서 당신만의 운명을 AI가 분석합니다. 무료 사주 팔자, 오행 밸런스, 궁합까지.",
  openGraph: {
    title: "FateSaju | AI 사주 분석",
    description:
      "518,400가지 사주 조합에서 당신만의 운명을 AI가 분석합니다.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <GtagScript />
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
