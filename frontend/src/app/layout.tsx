import type { Metadata } from "next";
import { Poppins, Playfair_Display } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins" 
});

const playfair = Playfair_Display({
  subsets: ["vietnamese", "latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GlowUp - Cửa Hàng Mỹ Phẩm Sinh Học Thụy Sĩ",
  description: "Hệ thống bán lẻ mỹ phẩm tế bào & tinh chất dưỡng da sinh học cao cấp",
};

export default function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params?: { locale?: string };
}>) {
  const locale = params?.locale || "vi";

  return (
    <html lang={locale} className="scroll-smooth">
      <body className={`${poppins.variable} ${playfair.variable} font-poppins flex flex-col min-h-screen text-text-primary antialiased relative overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container`}>
        {/* LỚP NỀN GRADIENT ĐA TẦNG PHÁT SÁNG CỐ ĐỊNH (Ambient Luxury Gradient Mesh) */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-[10%] -right-[5%] w-[700px] sm:w-[1000px] h-[700px] sm:h-[1000px] rounded-full bg-gradient-to-br from-[#FFA6C9]/50 via-[#FFB8D2]/40 to-transparent blur-[95px] transform-gpu will-change-transform" />
          <div className="absolute top-[5%] -left-[8%] w-[600px] sm:w-[850px] h-[600px] sm:h-[850px] rounded-full bg-gradient-to-tr from-[#FFD0DE]/45 via-[#FFE8F0]/35 to-transparent blur-[95px] transform-gpu will-change-transform" />
          <div className="absolute top-[42%] right-[5%] w-[650px] sm:w-[950px] h-[650px] sm:h-[950px] rounded-full bg-gradient-to-bl from-[#FFA6C9]/40 via-[#FBE4EB]/30 to-transparent blur-[105px] transform-gpu will-change-transform" />
          <div className="absolute bottom-[2%] -left-[5%] w-[650px] sm:w-[900px] h-[650px] sm:h-[900px] rounded-full bg-gradient-to-tr from-[#FFA6C9]/40 via-[#FFD2E2]/35 to-transparent blur-[95px] transform-gpu will-change-transform" />
        </div>

        {children}
      </body>
    </html>
  );
}