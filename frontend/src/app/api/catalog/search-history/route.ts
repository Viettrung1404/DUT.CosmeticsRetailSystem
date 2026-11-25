import { getServerEnv } from "@/shared/config/env";

export const runtime = "nodejs";

export async function GET() {
  const env = getServerEnv();
  try {
    const res = await fetch(`${env.BACKEND_API_BASE_URL.replace(/\/$/, "")}/customer/products/search-history`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ data: { history: [], trending: [] } });
  }
}

export async function POST(request: Request) {
  const env = getServerEnv();
  try {
    const body = await request.json();
    const res = await fetch(`${env.BACKEND_API_BASE_URL.replace(/\/$/, "")}/customer/products/search-history`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ success: true });
  }
}

export async function DELETE(request: Request) {
  const env = getServerEnv();
  const url = new URL(request.url);
  const query = url.searchParams.get("query");
  const targetUrl = query
    ? `${env.BACKEND_API_BASE_URL.replace(/\/$/, "")}/customer/products/search-history?query=${encodeURIComponent(query)}`
    : `${env.BACKEND_API_BASE_URL.replace(/\/$/, "")}/customer/products/search-history`;

  try {
    const res = await fetch(targetUrl, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ success: true });
  }
}
