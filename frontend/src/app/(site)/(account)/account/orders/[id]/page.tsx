import { OrderDetail } from "@/features/account/account-pages";
export const metadata = { title: "Chi tiết đơn hàng | GlowUp" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}
