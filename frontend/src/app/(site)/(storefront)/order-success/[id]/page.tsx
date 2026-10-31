import { OrderResult } from "@/features/checkout/order-result";
export const metadata = { title: "Đơn hàng | GlowUp", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main id="main-content" className="catalog-page site-container">
      <OrderResult id={id} />
    </main>
  );
}
