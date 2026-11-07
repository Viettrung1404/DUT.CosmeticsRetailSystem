import { mapApiProductToFrontend } from "@/utils/mapProduct";
import ShopClient from "./ShopClient";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export default async function ShopPage({
  searchParams,
}: {
  searchParams?: {
    search?: string;
    q?: string;
    categoryId?: string;
    brandId?: string;
    minPrice?: string;
    maxPrice?: string;
    sortBy?: string;
    tag?: string;
  };
}) {
  let backendProducts: any[] = [];
  const searchQuery = searchParams?.search || searchParams?.q || "";

  try {
    let fetchUrl = "";
    if (searchQuery.trim()) {
      fetchUrl = `${BASE_URL}/customer/products/search?q=${encodeURIComponent(searchQuery.trim())}&limit=20`;
    } else {
      const params = new URLSearchParams();
      params.append("limit", "20");
      if (searchParams?.categoryId) params.append("categoryId", searchParams.categoryId);
      if (searchParams?.brandId) params.append("brandId", searchParams.brandId);
      if (searchParams?.minPrice) params.append("minPrice", searchParams.minPrice);
      if (searchParams?.maxPrice) params.append("maxPrice", searchParams.maxPrice);
      if (searchParams?.sortBy) params.append("sortBy", searchParams.sortBy);
      if (searchParams?.tag) params.append("tag", searchParams.tag);
      fetchUrl = `${BASE_URL}/customer/products?${params.toString()}`;
    }

    const res = await fetch(fetchUrl, {
      cache: "no-store",
    });

    if (res.ok) {
      const result = await res.json();
      if (result && result.data && Array.isArray(result.data.data)) {
        backendProducts = result.data.data.map(mapApiProductToFrontend);
      }
    }
  } catch (error) {
    console.error("Failed to fetch products from backend:", error);
  }

  return <ShopClient initialBackendProducts={backendProducts} initialSearch={searchQuery} />;
}

