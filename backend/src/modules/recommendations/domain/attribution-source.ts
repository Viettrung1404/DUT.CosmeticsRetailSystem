import { RecommendationPlacement } from '@prisma/client';

export const ATTRIBUTION_SOURCE_TO_PLACEMENT: Record<
  string,
  RecommendationPlacement
> = {
  rec_home: RecommendationPlacement.HOME,
  rec_similar: RecommendationPlacement.PRODUCT_SIMILAR,
  rec_bought_together: RecommendationPlacement.PRODUCT_BOUGHT_TOGETHER,
  rec_cart: RecommendationPlacement.CART_ROUTINE,
};
