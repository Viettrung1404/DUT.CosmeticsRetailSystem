import { proxySitemap } from "@/shared/seo/proxy";
export const dynamic = "force-dynamic";
export const GET = () => proxySitemap("sitemap.xml");
