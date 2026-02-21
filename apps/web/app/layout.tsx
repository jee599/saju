import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "사주 MVP",
  description: "무료 사주 입력과 결과 확인 MVP"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
