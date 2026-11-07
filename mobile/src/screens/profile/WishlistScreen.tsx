import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useWishlistStore, WishlistItem } from '../../store/useWishlistStore';
import { useCartStore } from '../../store/useCartStore';

const { width } = Dimensions.get('window');

const CATEGORY_CHIPS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'Skincare', label: 'Dưỡng da' },
  { key: 'Serum', label: 'Serum & Tinh chất' },
  { key: 'Sunscreens', label: 'Chống nắng' },
  { key: 'Lipstick', label: 'Son môi' },
];

export default function WishlistScreen({ navigation }: any) {
  const { items, removeItem, clearWishlist, toggleWishlist } = useWishlistStore();
  const addItemToCart = useCartStore((s) => s.addItem);
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredItems = items.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.category === activeFilter;
  });

  const handleShareWishlist = async () => {
    try {
      await Share.share({
        title: 'Bộ Sưu Tập Mỹ Phẩm Yêu Thích Của Tôi — GlowUp',
        message: `Khám phá ${items.length} món mỹ phẩm cao cấp tôi đang yêu thích tại GlowUp Cosmetics!`,
      });
    } catch {
      // Ignored
    }
  };

  const handleAddToCart = (item: WishlistItem) => {
    addItemToCart({
      id: item.productId,
      variantId: `var-${item.productId}`,
      productId: item.productId,
      productName: item.name,
      variantName: 'Tiêu chuẩn',
      price: item.price,
      originalPrice: item.originalPrice,
      imageUrl: item.imageUrl,
      stock: 50,
    });
    Alert.alert('Thành công ✨', `Đã thêm "${item.name}" vào giỏ hàng của bạn!`, [
      { text: 'Tiếp tục xem' },
      { text: 'Xem giỏ hàng', onPress: () => navigation.navigate('Giỏ hàng') },
    ]);
  };

  const handleAddAllToCart = () => {
    if (items.length === 0) return;

    items.forEach((item) => {
      addItemToCart({
        id: item.productId,
        variantId: `var-${item.productId}`,
        productId: item.productId,
        productName: item.name,
        variantName: 'Tiêu chuẩn',
        price: item.price,
        originalPrice: item.originalPrice,
        imageUrl: item.imageUrl,
        stock: 50,
      });
    });

    Alert.alert(
      'Tuyệt vời! 🛍️',
      `Đã chuyển toàn bộ ${items.length} sản phẩm yêu thích vào giỏ hàng của bạn!`,
      [{ text: 'Đến giỏ hàng ngay', onPress: () => navigation.navigate('Giỏ hàng') }]
    );
  };

  const renderWishlistItem = ({ item }: { item: WishlistItem }) => {
    const isLowStock = item.stockStatus === 'low_stock';
    const isOutOfStock = item.stockStatus === 'out_of_stock';

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardImageContainer}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}
        >
          <Image source={{ uri: item.imageUrl }} style={styles.productImage} />

          {/* Badge trạng thái */}
          {item.badge ? (
            <View
              style={[
                styles.badge,
                isLowStock && { backgroundColor: '#B45309' },
                isOutOfStock && { backgroundColor: theme.colors.error },
              ]}
            >
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          ) : null}

          {/* Nút bỏ yêu thích */}
          <TouchableOpacity
            style={styles.heartBtn}
            activeOpacity={0.8}
            onPress={() => removeItem(item.productId)}
          >
            <Ionicons name="heart" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </TouchableOpacity>

        <View style={styles.cardContent}>
          <View>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.brandText}>{item.brand}</Text>
              {item.addedDate ? <Text style={styles.addedDateText}>{item.addedDate}</Text> : null}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}
            >
              <Text style={styles.productName} numberOfLines={2}>
                {item.name}
              </Text>
            </TouchableOpacity>

            <View style={styles.ratingRow}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.ratingText}>{item.rating}</Text>
              <Text style={styles.reviewsText}>({item.reviewsCount})</Text>
              {item.stockStatus === 'in_stock' ? (
                <View style={styles.inStockBadge}>
                  <View style={styles.inStockDot} />
                  <Text style={styles.inStockText}>Còn hàng</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.priceAndActionRow}>
            <View>
              <Text style={styles.price}>{item.price.toLocaleString('vi-VN')}₫</Text>
              {item.originalPrice ? (
                <Text style={styles.originalPrice}>
                  {item.originalPrice.toLocaleString('vi-VN')}₫
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.addToCartBtn,
                isOutOfStock && { backgroundColor: theme.colors.borderSubtle },
              ]}
              disabled={isOutOfStock}
              activeOpacity={0.88}
              onPress={() => handleAddToCart(item)}
            >
              <Feather
                name="shopping-bag"
                size={14}
                color={isOutOfStock ? theme.colors.textMuted : '#FFF'}
              />
              <Text
                style={[
                  styles.addToCartText,
                  isOutOfStock && { color: theme.colors.textMuted },
                ]}
              >
                {isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Danh sách Yêu thích</Text>
          <Text style={styles.headerSubtitle}>
            {items.length} tuyệt tác làm đẹp đã lưu
          </Text>
        </View>

        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShareWishlist}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="share-2" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Category Chips Bar */}
      <View style={styles.chipsBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORY_CHIPS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.chipsScroll}
          renderItem={({ item }) => {
            const isSelected = activeFilter === item.key;
            return (
              <TouchableOpacity
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setActiveFilter(item.key)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Banner Silk Privilege Gift */}
      {items.length > 0 && (
        <View style={styles.vipBanner}>
          <View style={styles.vipBannerLeft}>
            <View style={styles.vipIconCircle}>
              <Ionicons name="gift" size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vipBannerTitle}>Ưu đãi VIP Silk-Drop</Text>
              <Text style={styles.vipBannerDesc}>
                Nhận ngay Voucher giảm thêm 10% khi hoàn tất đơn từ danh sách yêu thích hôm nay.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Main List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderWishlistItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="heart-dislike-outline" size={48} color={theme.colors.primaryFixedDim} />
            </View>
            <Text style={styles.emptyTitle}>Danh sách yêu thích trống</Text>
            <Text style={styles.emptyDesc}>
              Khám phá bộ sưu tập mỹ phẩm chuẩn thượng lưu và chạm vào icon trái tim để lưu lại nhé!
            </Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => navigation.navigate('Danh mục')}
            >
              <Text style={styles.exploreBtnText}>KHÁM PHÁ CATALOG NGAY</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Sticky Bottom Actions Bar */}
      {items.length > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarInfo}>
            <Text style={styles.bottomBarLabel}>Tổng {items.length} món mỹ phẩm</Text>
            <Text style={styles.bottomBarPrice}>
              {items.reduce((sum, i) => sum + i.price, 0).toLocaleString('vi-VN')}₫
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addAllBtn}
            activeOpacity={0.9}
            onPress={handleAddAllToCart}
          >
            <Ionicons name="bag-check" size={18} color="#FFF" />
            <Text style={styles.addAllBtnText}>THÊM TẤT CẢ VÀO GIỎ</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF8F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3E9EB',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#281811',
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  chipsBar: {
    backgroundColor: '#FFF8F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3E9EB',
  },
  chipsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: '#554244',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  vipBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FAF0F2',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3DCE1',
  },
  vipBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vipIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  vipBannerDesc: {
    fontSize: 11,
    color: '#725950',
    marginTop: 2,
    lineHeight: 15,
  },
  listContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 90,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F3E9EB',
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  cardImageContainer: {
    width: 100,
    height: 110,
    borderRadius: 12,
    backgroundColor: '#F8EFF1',
    position: 'relative',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heartBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  addedDateText: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#281811',
    marginTop: 2,
    lineHeight: 17,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#281811',
  },
  reviewsText: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  inStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 8,
  },
  inStockDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.success,
  },
  inStockText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.success,
  },
  priceAndActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  originalPrice: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  addToCartText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FAF0F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#281811',
  },
  emptyDesc: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  exploreBtn: {
    marginTop: 20,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  exploreBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 248, 246, 0.96)',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3E9EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bottomBarInfo: {
    flex: 1,
  },
  bottomBarLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  bottomBarPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  addAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  addAllBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

