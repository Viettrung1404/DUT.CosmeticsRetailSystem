import { TrackingPage } from "@/features/account/account-pages";
export const metadata = { title: "Theo dõi vận chuyển | GlowUp" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TrackingPage id={id} />;
}
