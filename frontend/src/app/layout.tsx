import type { Metadata } from "next";
import { Be_Vietnam_Pro, Montserrat } from "next/font/google";
import { getServerEnv } from "@/shared/config/env";
import { Providers } from "./providers";
import "./globals.css";

const bodyFont = Be_Vietnam_Pro({ subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });
const headingFont = Montserrat({ subsets: ["latin", "vietnamese"], variable: "--font-montserrat", display: "swap" });

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(getServerEnv().SITE_URL),
    title: { default: "GlowUp", template: "%s | GlowUp" },
    description: "GlowUp — Chăm sóc vẻ đẹp của bạn.",
    robots: { index: false, follow: false },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" className={`${bodyFont.variable} ${headingFont.variable}`}>
    <body><Providers>{children}</Providers></body>
  </html>;
}
