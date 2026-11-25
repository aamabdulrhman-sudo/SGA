import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصة الجمعيات العمومية | نظم حوكمة المساهمين",
  description:
    "منصة متكاملة لإدارة الجمعيات العامة للمساهمين: الحضور والنصاب، التوكيلات، والتصويت المرجّح بالأسهم",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html dir="rtl" lang="ar">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap"
        />
      </head>
      <body className="bg-slate-100 text-navy-800 font-arabic antialiased">
        {children}
      </body>
    </html>
  );
}
