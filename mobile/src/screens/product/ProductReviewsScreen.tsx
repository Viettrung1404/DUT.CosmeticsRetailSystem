import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Modal,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, ROUNDED } from '../../constants/theme';
import { productApi } from '../../api/productApi';

const { width } = Dimensions.get('window');

// Dữ liệu đánh giá mẫu chất lượng cao chuẩn GlowUp / Shopee
const MOCK_REVIEWS = [
  {
    id: 'rev-1',
    reviewerName: 'Thảo My (24t)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    rating: 5,
    createdAt: 'Hôm qua',
    variantName: '50ml (Bán chạy)',
    isVerifiedPurchase: true,
    content:
      'Chất serum mỏng nhẹ thấm nhanh cực kỳ, thoa xong da mát lịm. Mình vừa peel da treatment xong dùng em này êm ru không hề bị châm chích hay đỏ rát gì cả! Mùi hoa hồng nhẹ nhàng thư giãn.',
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
      'https://images.unsplash.com/photo-1608248597359-25e1430931d8?w=400',
    ],
    sellerReply:
      'GlowUp Luxe Lab chân thành cảm ơn Thảo My đã tin yêu Rose Berry B5! Chúc nàng luôn có làn da rạng rỡ, căng bóng như ý nhé 💕',
    likes: 42,
  },
  {
    id: 'rev-2',
    reviewerName: 'lyn@ptw8n',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    rating: 5,
    createdAt: '3 ngày trước',
    variantName: '30ml',
    isVerifiedPurchase: true,
    content:
      'Hài lòng về dịch vụ và chất lượng sản phẩm rất tốt! Đóng gói kỹ cẩn thận, giao hàng rất nhanh. Dùng siêu êm, dưỡng ẩm đa tầng chuẩn Glass Skin, làm mờ thâm và củng cố hàng rào lipid rất tốt.',
    images: [
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
    ],
    sellerReply: 'Cảm ơn nàng nhiều ạ! Mong tiếp tục được đồng hành cùng làn da của nàng nhé!',
    likes: 59,
  },
  {
    id: 'rev-3',
    reviewerName: 'Phương Anh (28t)',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    rating: 5,
    createdAt: '1 tuần trước',
    variantName: '100ml',
    isVerifiedPurchase: true,
    content:
      'Chai to 100ml dùng đã lắm. Cấp ẩm sâu, sáng ngủ dậy da căng bóng mịn màng. Không bị đổ dầu thừa. Đã mua lại lần thứ 2!',
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
    ],
    sellerReply: 'Dạ GlowUp cảm ơn chị Phương Anh đã ủng hộ nhiều lần ạ!',
    likes: 27,
  },
  {
    id: 'rev-4',
    reviewerName: 'Minh Thư',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    rating: 4,
    createdAt: '2 tuần trước',
    variantName: '50ml',
    isVerifiedPurchase: true,
    content:
      'Sản phẩm dùng tốt, làm dịu da nhanh. Mỗi tội vòi hút hơi chặt một xíu nhưng tổng thể rất hài lòng với chất lượng.',
    images: [],
    sellerReply: null,
    likes: 12,
  },
  {
    id: 'rev-5',
    reviewerName: 'Trang Ngô',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150',
    rating: 5,
    createdAt: '1 tháng trước',
    variantName: '50ml',
    isVerifiedPurchase: true,
    content:
      'Mùi hoa hồng tự nhiên thoang thoảng cực kỳ thích. Texture lỏng nhẹ, thấm chỉ sau 30 giây không bết dính. Sẽ tiếp tục ủng hộ shop dài dài.',
    images: [
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400',
    ],
    sellerReply: 'Dạ cảm ơn nàng Trang Ngô ạ, chúc nàng luôn xinh đẹp!',
    likes: 19,
  },
];

export default function ProductReviewsScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { productId, slug, productName, avgRating: initialRating, totalReviews: initialTotal } = route.params || {};

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [stats, setStats] = useState({
    avgRating: initialRating || 4.9,
    totalReviews: initialTotal || 1428,
    histogram: {
      5: 1320,
      4: 88,
      3: 15,
      2: 3,
      1: 2,
    } as Record<number, number>,
  });

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      if (productId) {
        const res = await productApi.getProductReviews(productId, { limit: 50 });
        const data = res?.data || res;
        const items = data?.items || [];
        if (items.length > 0) {
          setReviews(
            items.map((it: any) => ({
              id: it.id,
              reviewerName: it.reviewerName || 'Khách hàng ẩn danh',
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              rating: it.rating || 5,
              createdAt: it.createdAt ? new Date(it.createdAt).toLocaleDateString('vi-VN') : 'Gần đây',
              variantName: it.variantName || 'Tiêu chuẩn',
              isVerifiedPurchase: it.isVerifiedPurchase ?? true,
              content: it.content || it.title || 'Sản phẩm rất tốt!',
              images: it.images || [],
              sellerReply: it.adminReply,
              likes: 15,
            }))
          );
          if (data.avgRating) {
            setStats({
              avgRating: data.avgRating,
              totalReviews: data.totalReviews || items.length,
              histogram: data.histogram || stats.histogram,
            });
          }
          return;
        }
      }
      // Dữ liệu mẫu phong phú
      setReviews(MOCK_REVIEWS);
    } catch {
      setReviews(MOCK_REVIEWS);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = (id: string) => {
    setLikedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredReviews = reviews.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'with_images') return item.images && item.images.length > 0;
    if (activeFilter.startsWith('star_')) {
      const star = parseInt(activeFilter.replace('star_', ''), 10);
      return item.rating === star;
    }
    return true;
  });

  const filterChips = [
    { key: 'all', label: `Tất cả (${stats.totalReviews})` },
    { key: 'star_5', label: `5 Sao (${stats.histogram[5] || 0})` },
    { key: 'star_4', label: `4 Sao (${stats.histogram[4] || 0})` },
    { key: 'star_3', label: `3 Sao (${stats.histogram[3] || 0})` },
    { key: 'star_2', label: `2 Sao (${stats.histogram[2] || 0})` },
    { key: 'star_1', label: `1 Sao (${stats.histogram[1] || 0})` },
    { key: 'with_images', label: 'Có hình ảnh/video (856)' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityLabel="Quay lại"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá sản phẩm</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Rating Overview Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.scoreText}>{Number(stats.avgRating).toFixed(1)}</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  name="star"
                  size={16}
                  color={s <= Math.round(stats.avgRating) ? '#FFB800' : '#E0D0D4'}
                  style={{ marginRight: 2 }}
                />
              ))}
            </View>
            <Text style={styles.totalText}>{stats.totalReviews} đánh giá</Text>
          </View>

          <View style={styles.summaryDivider} />

          {/* Breakdown bars */}
          <View style={styles.summaryRight}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.histogram[star] || 0;
              const pct = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              return (
                <View key={star} style={styles.barRow}>
                  <Text style={styles.starNum}>{star}★</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%` }]} />
                  </View>
                  <Text style={styles.starCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Shopee-style Filter Chips */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {filterChips.map((chip) => {
              const active = activeFilter === chip.key;
              return (
                <TouchableOpacity
                  key={chip.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setActiveFilter(chip.key)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Review List */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang tải đánh giá...</Text>
          </View>
        ) : filteredReviews.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Chưa có đánh giá nào</Text>
            <Text style={styles.emptySubtitle}>Không tìm thấy đánh giá phù hợp với bộ lọc đã chọn.</Text>
          </View>
        ) : (
          <View style={styles.reviewsList}>
            {filteredReviews.map((item) => {
              const isLiked = !!likedMap[item.id];
              const likeCount = item.likes + (isLiked ? 1 : 0);

              return (
                <View key={item.id} style={styles.reviewCard}>
                  {/* Reviewer Header */}
                  <View style={styles.reviewHeader}>
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                    <View style={styles.reviewerInfo}>
                      <Text style={styles.reviewerName}>{item.reviewerName}</Text>
                      <View style={styles.starLine}>
                        <View style={styles.starRow}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Ionicons
                              key={s}
                              name="star"
                              size={12}
                              color={s <= item.rating ? '#FFB800' : '#E0D0D4'}
                              style={{ marginRight: 1 }}
                            />
                          ))}
                        </View>
                        <Text style={styles.reviewMeta}>
                          {item.createdAt} | Phân loại: {item.variantName}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Review Content */}
                  <Text style={styles.reviewContent}>{item.content}</Text>

                  {/* Attached Images */}
                  {item.images && item.images.length > 0 && (
                    <View style={styles.imagesGrid}>
                      {item.images.map((img: string, idx: number) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.imageThumbWrap}
                          onPress={() => setSelectedImage(img)}
                        >
                          <Image source={{ uri: img }} style={styles.imageThumb} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Seller Reply */}
                  {item.sellerReply && (
                    <View style={styles.sellerReplyCard}>
                      <Text style={styles.sellerReplyTitle}>Phản Hồi Của Người Bán (GlowUp Mall):</Text>
                      <Text style={styles.sellerReplyContent}>{item.sellerReply}</Text>
                    </View>
                  )}

                  {/* Like / Helpful Row */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.likeBtn}
                      onPress={() => handleToggleLike(item.id)}
                    >
                      <Ionicons
                        name={isLiked ? 'thumbs-up' : 'thumbs-up-outline'}
                        size={15}
                        color={isLiked ? COLORS.primary : COLORS.textMuted}
                      />
                      <Text style={[styles.likeText, isLiked && { color: COLORS.primary }]}>
                        Hữu ích ({likeCount})
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.modalBg}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.modalImg}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9ECEE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    height: 52,
    backgroundColor: COLORS.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryCard: {
    backgroundColor: COLORS.surfaceCard,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryLeft: {
    alignItems: 'center',
    paddingRight: SPACING.md,
    minWidth: 100,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#9D394F',
    lineHeight: 38,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  totalText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#EFE5E7',
  },
  summaryRight: {
    flex: 1,
    paddingLeft: SPACING.md,
    justifyContent: 'center',
    gap: 3,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starNum: {
    fontSize: 11,
    color: COLORS.textPrimary,
    fontWeight: '600',
    width: 22,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F5E6E8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#9D394F',
    borderRadius: 3,
  },
  starCount: {
    fontSize: 10,
    color: COLORS.textMuted,
    width: 28,
    textAlign: 'right',
  },
  filterSection: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  filterScroll: {
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  filterChipActive: {
    backgroundColor: '#9D394F',
    borderColor: '#9D394F',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  reviewsList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 40,
    marginTop: SPACING.xs,
    gap: 12,
  },
  reviewCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 14,
    padding: SPACING.md,
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5E6E8',
  },
  reviewerInfo: {
    marginLeft: 10,
    flex: 1,
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  starLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  reviewMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  reviewContent: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 19,
    marginBottom: 8,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  imageThumbWrap: {
    width: 68,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5ECEF',
  },
  imageThumb: {
    width: '100%',
    height: '100%',
  },
  sellerReplyCard: {
    backgroundColor: '#FEFAFC',
    borderLeftWidth: 3,
    borderLeftColor: '#9D394F',
    padding: 10,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  sellerReplyTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9D394F',
    marginBottom: 2,
  },
  sellerReplyContent: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 17,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F5ECEF',
    paddingTop: 8,
    marginTop: 2,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 8,
    zIndex: 10,
  },
  modalImg: {
    width: width,
    height: width,
  },
});
