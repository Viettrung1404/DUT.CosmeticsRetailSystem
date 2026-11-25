import { forwardRecommendationGet } from "../_proxy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  return forwardRecommendationGet(`/recommendations/home${search}`, true);
}
