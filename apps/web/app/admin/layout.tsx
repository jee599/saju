import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | 복연구소",
  robots: "noindex, nofollow",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, fontFamily: "'Pretendard Variable', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
