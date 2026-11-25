import { forwardRecommendationGet } from "../../../_proxy";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { search } = new URL(request.url);
  return forwardRecommendationGet(
    `/recommendations/products/${encodeURIComponent(id)}/bought-together${search}`,
    false,
  );
}
