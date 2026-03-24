import type { Metadata } from "next";
import { Inter, Manrope, Playfair_Display } from "next/font/google";

import { AppToaster } from "@/components/ui/toaster";
import "./globals.css";

const displayFont = Inter({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const logoFont = Playfair_Display({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "신월초 학부모 상담 포털",
  description: "학부모 상담 예약과 교사용 학급 일정 관리를 위한 모바일 친화형 상담 포털",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      data-scroll-behavior="smooth"
      className={`${displayFont.variable} ${bodyFont.variable} ${logoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[color:var(--background)] font-body text-[color:var(--foreground)] selection:bg-[#d9e6d8] selection:text-[#49554a]">
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
