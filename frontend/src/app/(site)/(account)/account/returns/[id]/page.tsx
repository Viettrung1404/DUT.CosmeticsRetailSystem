import { ReturnDetailPage } from "@/features/post-purchase/returns-pages";
export const metadata = { title: "Chi tiết yêu cầu đổi trả" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReturnDetailPage id={id} />;
}
