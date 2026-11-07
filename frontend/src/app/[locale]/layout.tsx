import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, Locale } from "@/i18n/routing";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LivePurchaseTicker from "@/components/LivePurchaseTicker";
import AuthInitializer from "@/components/AuthInitializer";
import { Toaster } from "react-hot-toast";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Ensure that the incoming locale is valid
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Provide all translation messages to the client
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthInitializer />
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
      <LivePurchaseTicker />
      <Toaster position="bottom-right" />
    </NextIntlClientProvider>
  );
}
