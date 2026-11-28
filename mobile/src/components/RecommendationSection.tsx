import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDED, SHADOWS, SPACING } from '../constants/theme';
import {
  MobileRecommendedItem,
  MobileRecommendationResponse,
} from '../api/recommendationApi';
import {
  getMobileBehaviorTracker,
  RecommendationPlacement,
} from '../services/behaviorTracker';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400';

interface RecommendationSectionProps {
  title: string;
  eyebrow?: string;
  placement: RecommendationPlacement;
  fetcher: () => Promise<MobileRecommendationResponse>;
  fetchDeps?: readonly unknown[];
  onSelectProduct: (item: MobileRecommendedItem) => void;
  showReasonBadge?: boolean;
}

export default function RecommendationSection({
  title,
  eyebrow,
  placement,
  fetcher,
  fetchDeps = [],
  onSelectProduct,
  showReasonBadge = false,
}: RecommendationSectionProps) {
  const [data, setData] = useState<MobileRecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const impressionTrackedRef = useRef(false);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 1000,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item?: unknown }> }) => {
      if (impressionTrackedRef.current || viewableItems.length === 0) {
        return;
      }
      impressionTrackedRef.current = true;
      getMobileBehaviorTracker().trackImpression(placement, 1);
    },
  ).current;

  useEffect(() => {
    let active = true;
    impressionTrackedRef.current = false;
    setLoading(true);

    fetcher()
      .then((res) => {
        if (active && res && Array.isArray(res.items)) {
          setData(res);
        }
      })
      .catch(() => {
        if (active) setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, fetchDeps);

  if (!loading && (!data || data.items.length === 0)) {
    return null;
  }

  const attributionSource = data?.attributionSource || 'rec_home';

  const handlePressItem = (item: MobileRecommendedItem) => {
    const tracker = getMobileBehaviorTracker();
    void tracker.recordAttribution(item.id, attributionSource);
    void tracker.trackEvent({
      eventType: 'SEARCH_CLICK',
      productId: item.id,
      brandId: item.brand?.id,
      source: attributionSource,
      metadata: { placement },
    });
    onSelectProduct(item);
  };

  return (
    <View style={styles.container}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>

      {loading ? (
        <ActivityIndicator
          size="small"
          color={COLORS.primary}
          style={{ marginVertical: 16 }}
        />
      ) : (
        <FlatList
          horizontal
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ width: SPACING.sm }} />}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          renderItem={({ item }) => {
            const displayPrice =
              item.displayPrice ?? item.salePrice ?? item.basePrice ?? 0;
            const hasDiscount = item.basePrice > displayPrice;
            const discountPct = hasDiscount
              ? Math.round((1 - displayPrice / item.basePrice) * 100)
              : 0;

            return (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.card}
                onPress={() => handlePressItem(item)}
              >
                <View style={styles.imageWrap}>
                  <Image
                    source={{ uri: item.imageUrl || FALLBACK_IMAGE }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  {hasDiscount && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>-{discountPct}%</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.brandText} numberOfLines={1}>
                    {item.brand?.name || 'GLOWUP'}
                  </Text>
                  <Text style={styles.productName} numberOfLines={2}>
                    {item.name}
                  </Text>

                  {showReasonBadge && item.reason ? (
                    <View style={styles.reasonBadge}>
                      <Ionicons
                        name="sparkles-outline"
                        size={10}
                        color={COLORS.primaryDeep}
                      />
                      <Text style={styles.reasonText} numberOfLines={1}>
                        {item.reason}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={11} color="#F59E0B" />
                    <Text style={styles.ratingText}>
                      {(item.avgRating ?? 4.8).toFixed(1)}
                    </Text>
                    {typeof item.totalSold === 'number' && item.totalSold > 0 && (
                      <Text style={styles.soldText}>
                        · Đã bán {item.totalSold}
                      </Text>
                    )}
                  </View>

                  <View style={styles.priceRow}>
                    <Text style={styles.priceText}>
                      {displayPrice.toLocaleString('vi-VN')}đ
                    </Text>
                    {hasDiscount && (
                      <Text style={styles.originalPriceText}>
                        {item.basePrice.toLocaleString('vi-VN')}đ
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.primaryDeep,
    paddingHorizontal: SPACING.md,
    marginBottom: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  card: {
    width: 156,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: ROUNDED.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  imageWrap: {
    width: '100%',
    height: 150,
    backgroundColor: COLORS.surfaceContainer,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.primaryDeep,
    borderRadius: ROUNDED.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardBody: {
    padding: 10,
  },
  brandText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    minHeight: 34,
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: ROUNDED.full,
    backgroundColor: COLORS.primarySurface,
    borderWidth: 1,
    borderColor: COLORS.primaryFixed,
  },
  reasonText: {
    flex: 1,
    fontSize: 10,
    color: COLORS.primaryDeep,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 5,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  soldText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 6,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDeep,
  },
  originalPriceText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
});
