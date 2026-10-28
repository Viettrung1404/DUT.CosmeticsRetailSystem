import { ReturnDetailPage } from "@/features/post-purchase/returns-pages";
export const metadata = { title: "Chi tiết đổi trả | GlowUp" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReturnDetailPage id={id} />;
}
