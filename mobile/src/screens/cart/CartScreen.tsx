import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useCartStore, CartItem } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';

export default function CartScreen({ navigation }: any) {
  const {
    items,
    fetchCart,
    updateQuantity,
    removeItem,
    toggleSelect,
    toggleSelectAll,
    getTotalPrice,
    getSelectedCount,
  } = useCartStore();

  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    fetchCart().catch(() => {});
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCart().catch(() => {});
    setRefreshing(false);
  };

  const runCartAction = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (error: any) {
      Alert.alert(
        'Không thể cập nhật giỏ hàng',
        error?.response?.data?.message || error?.message || 'Vui lòng thử lại.',
      );
    }
  };

  const isAllSelected = items.length > 0 && items.every((i) => i.selected);
  const totalPrice = getTotalPrice();
  const selectedCount = getSelectedCount();

  // Ngưỡng Freeship theo Stitch Design (Mục tiêu 1.000.000đ)
  // Ngưỡng Freeship bậc thang: 129k -> giảm 15k, 359k -> giảm 25k, 459k -> Freeship toàn quốc
  const getFreeshipProgress = (amount: number) => {
    if (amount >= 459000) {
      return {
        target: 459000,
        remaining: 0,
        percent: 100,
        label: 'Freeship toàn quốc',
        nextTier: 'Đã đạt Freeship toàn quốc',
      };
    }
    if (amount >= 359000) {
      return {
        target: 459000,
        remaining: 459000 - amount,
        percent: Math.min(Math.round((amount / 459000) * 100), 100),
        label: 'Freeship 25k (Đạt)',
        nextTier: 'Freeship toàn quốc',
      };
    }
    if (amount >= 129000) {
      return {
        target: 359000,
        remaining: 359000 - amount,
        percent: Math.min(Math.round((amount / 359000) * 100), 100),
        label: 'Freeship 15k (Đạt)',
        nextTier: 'Freeship 25k',
      };
    }
    return {
      target: 129000,
      remaining: 129000 - amount,
      percent: Math.min(Math.round((amount / 129000) * 100), 100),
      label: 'Phí chuẩn 30k',
      nextTier: 'Freeship 15k',
    };
  };

  const freeshipInfo = getFreeshipProgress(totalPrice);
  const FREESHIP_TARGET = freeshipInfo.target;
  const progressPercent = Math.min(Math.round((totalPrice / FREESHIP_TARGET) * 100), 100);
  const remainingForFreeship = freeshipInfo.remaining;

  const handleConfirmDelete = (id: string, name: string) => {
    Alert.alert(
      'Xóa sản phẩm',
      `Bạn có chắc muốn xóa "${name}" khỏi giỏ hàng?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => runCartAction(() => removeItem(id)) },
      ]
    );
  };

  const handleClearSelected = () => {
    if (selectedCount === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 1 sản phẩm để xóa.');
      return;
    }
    Alert.alert(
      'Xóa đã chọn',
      `Bạn có chắc muốn xóa ${selectedCount} sản phẩm đã chọn khỏi giỏ hàng?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () =>
            runCartAction(async () => {
              await Promise.all(items.filter((i) => i.selected).map((i) => removeItem(i.id)));
            }),
        },
      ]
    );
  };

  const handleSaveForLater = (name: string) => {
    Alert.alert('Đã lưu', `Đã chuyển "${name}" vào danh sách Mua sau.`);
  };

  const handleProceedCheckout = () => {
    if (selectedCount === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một sản phẩm để tiến hành thanh toán.');
      return;
    }
    const token = useAuthStore.getState().token;
    if (!token) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Vui lòng đăng nhập tài khoản để tiến hành đặt hàng và tích lũy điểm GlowPoint.',
        [
          { text: 'Để sau', style: 'cancel' },
          {
            text: 'Đăng nhập ngay',
            onPress: () => navigation.navigate('AuthStack', { screen: 'Login' }),
          },
        ]
      );
      return;
    }
    navigation.navigate('Checkout');
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartCard}>
      {/* Checkbox chọn sản phẩm */}
      <TouchableOpacity
        onPress={() => runCartAction(() => toggleSelect(item.id))}
        style={styles.checkboxContainer}
      >
        <Ionicons
          name={item.selected ? 'checkbox' : 'square-outline'}
          size={22}
          color={item.selected ? theme.colors.primary : theme.colors.textMuted}
        />
      </TouchableOpacity>

      {/* Ảnh sản phẩm kèm badge */}
      <View style={styles.imageWrapper}>
        <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
        <View style={styles.itemBadge}>
          <Text style={styles.itemBadgeText}>Bán chạy</Text>
        </View>
      </View>

      {/* Thông tin chi tiết */}
      <View style={styles.itemInfo}>
        <View style={styles.itemHeaderRow}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.productName}
          </Text>
          <TouchableOpacity
            onPress={() => handleConfirmDelete(item.id, item.productName)}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.variantName}>{item.variantName}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceText}>
            {item.price.toLocaleString('vi-VN')} đ
          </Text>
          {item.originalPrice && (
            <Text style={styles.originalPriceText}>
              {item.originalPrice.toLocaleString('vi-VN')} đ
            </Text>
          )}
          {item.originalPrice && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                -{Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}%
              </Text>
            </View>
          )}
        </View>

        {/* Action Row: Lưu mua sau & Stepper */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => handleSaveForLater(item.productName)}
            style={styles.saveForLaterBtn}
          >
            <Ionicons name="bookmark-outline" size={13} color={theme.colors.textMuted} />
            <Text style={styles.saveForLaterText}>Lưu mua sau</Text>
          </TouchableOpacity>

          <View style={styles.stepperContainer}>
            <TouchableOpacity
              onPress={() => runCartAction(() => updateQuantity(item.id, -1))}
              style={styles.stepperBtn}
            >
              <Ionicons name="remove" size={14} color={theme.colors.textDark} />
            </TouchableOpacity>

            <Text style={styles.quantityText}>{item.quantity}</Text>

            <TouchableOpacity
              onPress={() => runCartAction(() => updateQuantity(item.id, 1))}
              style={styles.stepperBtn}
            >
              <Ionicons name="add" size={14} color={theme.colors.textDark} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* 1. Header Giỏ Hàng theo chuẩn Stitch */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={{
              uri: 'https://lh3.googleusercontent.com/aida/AEtjO1V_EdYGFWGwIUg8ikIOvg6kwDD7S9TUC48vlh9MNjkdWvqUY_6ike1Fiq25KeoJiAgx7F3xuqhNJa5DFvTwaYjyY6lvVv6EztD4Zevbg6VNQtcbJ1RKswD0_wVSnSLfyEGE3YTd0-U0JDqwzSdITN_FBzAUKAsABkBo6RbAvVtOcTtl5xL2I959nXeMxsLJBURM90gaoke5QVaUpJZ2nWLMIl9J77-Yne_L63BXqwTeqz7dFfnKs9JSkQs',
            }}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View>
            <View style={styles.rowAlign}>
              <Text style={styles.headerTitle}>Giỏ Hàng</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>({items.length} món)</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>ROSE BERRY ELEGANCE</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editModeBtn}
          onPress={() => runCartAction(toggleSelectAll)}
        >
          <Text style={styles.editModeBtnText}>
            {isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderCartItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.listHeaderWrapper}>
              {/* 2. Thanh Tiến Trình Quà Tặng & Freeship Silk-Drop (Stitch Feature) */}
              <View style={styles.freeshipCard}>
                <View style={styles.freeshipHeader}>
                  <View style={styles.rowAlign}>
                    <Ionicons name="gift-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.freeshipText}>
                      {remainingForFreeship > 0 ? (
                        <>
                          Mua thêm{' '}
                          <Text style={{ fontWeight: '700', color: theme.colors.primary }}>
                            {remainingForFreeship.toLocaleString('vi-VN')} đ
                          </Text>{' '}
                          để nhận{' '}
                          <Text style={{ fontWeight: '700', color: theme.colors.primary }}>
                            {freeshipInfo.nextTier}
                          </Text>{' '}
                          & Túi quà Minisize
                        </>
                      ) : (
                        <Text style={{ fontWeight: '700', color: theme.colors.success }}>
                          🎉 Chúc mừng! Bạn đã đạt Freeship toàn quốc & Quà tặng Minisize
                        </Text>
                      )}
                    </Text>
                  </View>
                  <Text style={styles.percentText}>{progressPercent}%</Text>
                </View>

                {/* Thanh Progress Bar */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
                  />
                </View>

                <View style={styles.progressLabelsRow}>
                  <Text style={styles.progressSubLabel}>
                    Đơn hiện tại: {totalPrice.toLocaleString('vi-VN')} đ
                  </Text>
                  <Text style={[styles.progressSubLabel, { color: theme.colors.primary }]}>
                    Mục tiêu: 1.000.000 đ
                  </Text>
                </View>
              </View>

              {/* Hàng chọn tất cả & xóa đã chọn */}
              <View style={styles.selectAllHeaderRow}>
                <TouchableOpacity
                  onPress={toggleSelectAll}
                  style={styles.selectAllBtn}
                >
                  <Ionicons
                    name={isAllSelected ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={isAllSelected ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <Text style={styles.selectAllText}>
                    Chọn tất cả ({items.length} món)
                  </Text>
                </TouchableOpacity>

                {selectedCount > 0 && (
                  <TouchableOpacity
                    onPress={handleClearSelected}
                    style={styles.deleteSelectedBtn}
                  >
                    <Ionicons name="trash-outline" size={14} color={theme.colors.textMuted} />
                    <Text style={styles.deleteSelectedText}>Xóa đã chọn ({selectedCount})</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : undefined
        }
        ListFooterComponent={
          items.length > 0 ? (
            /* Thẻ Quà Tặng Kèm 0đ (Chuẩn Stitch) */
            <View style={styles.giftCard}>
              <Image
                source={{
                  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNBPAkRSsQnnjpt3mvib6e28iR24XmNd0K7KXjlXzPOvHc-HvY-3dM0ZRCd7fHBseSs3BSHC6ELDXWczXLX1RjWsFOVpE-OeCy0BhWMa0e86MvWXowjCjxLgmXhATBhpTmxiUnGKY3r7fqPJVnreV4aazR31gZELFJDuy3ZjqQkeCxQvRDD13EOaNDOJqhvOF39zWrsYB-M2-ILxepkWKy6k3EtV9o8EkbWf6O2qh5TOLOjFWdi-ZdNQ',
                }}
                style={styles.giftImage}
              />
              <View style={styles.giftContent}>
                <View style={styles.giftTag}>
                  <Text style={styles.giftTagText}>QUÀ TẶNG 0Đ</Text>
                </View>
                <Text style={styles.giftName} numberOfLines={1}>
                  Mặt nạ sinh học Collagen GlowUp Mask x1
                </Text>
                <Text style={styles.giftSub}>Tặng kèm cho đơn hàng từ 500k</Text>
                <View style={styles.giftPriceRow}>
                  <Text style={styles.giftFreePrice}>0 đ</Text>
                  <Text style={styles.giftOriginalPrice}>65.000 đ</Text>
                </View>
              </View>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bag-handle-outline" size={64} color={theme.colors.primaryFixedDim} />
            <Text style={styles.emptyTitle}>Giỏ hàng của bạn đang trống</Text>
            <Text style={styles.emptySubtitle}>
              Khám phá hàng ngàn mỹ phẩm chính hãng và thêm vào giỏ nhé!
            </Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => navigation.navigate('Trang chủ')}
            >
              <Text style={styles.exploreBtnText}>Khám phá ngay</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* 3. Footer Thanh Toán Dính Cố Định Phía Dưới */}
      {items.length > 0 && (
        <View style={styles.checkoutFooter}>
          <View style={styles.footerSummary}>
            <View style={styles.totalRow}>
              <Text style={styles.footerLabel}>Tổng thanh toán:</Text>
              <Text style={styles.footerTotalPrice}>
                {totalPrice.toLocaleString('vi-VN')} đ
              </Text>
            </View>
            <Text style={styles.vatNote}>Đã bao gồm thuế VAT & Ưu đãi áp dụng</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.checkoutBtn,
              selectedCount === 0 && styles.checkoutBtnDisabled,
            ]}
            onPress={handleProceedCheckout}
            disabled={selectedCount === 0}
          >
            <Text style={styles.checkoutBtnText}>
              Tiến hành Đặt hàng ({selectedCount})
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.backgroundCanvas,
  },
  header: {
    height: 64,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 248, 246, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: theme.colors.primaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryDeep,
  },
  editModeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.primaryFixedDim,
  },
  editModeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  listHeaderWrapper: {
    marginBottom: 12,
  },

  /* Freeship Progress Card */
  freeshipCard: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.card,
    marginBottom: 12,
  },
  freeshipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  freeshipText: {
    fontSize: 12,
    color: theme.colors.textDark,
    flex: 1,
    marginLeft: 6,
    lineHeight: 18,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginLeft: 8,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressSubLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  /* Select All Row */
  selectAllHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textDark,
  },
  deleteSelectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteSelectedText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  /* Cart Card */
  cartCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.card,
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    paddingTop: 24,
    paddingRight: 8,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  productImage: {
    width: 76,
    height: 76,
    borderRadius: theme.rounded.lg,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  itemBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  itemBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  itemInfo: {
    flex: 1,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textDark,
    flex: 1,
  },
  deleteBtn: {
    padding: 2,
    marginLeft: 6,
  },
  variantName: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  originalPriceText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: theme.colors.errorContainer,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.error,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  saveForLaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  saveForLaterText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textDecorationLine: 'underline',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: theme.rounded.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: 2,
  },
  stepperBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.sm,
  },
  quantityText: {
    width: 28,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textDark,
  },

  /* Free Gift Card */
  giftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primaryFixed,
    marginTop: 8,
    marginBottom: 16,
  },
  giftImage: {
    width: 54,
    height: 54,
    borderRadius: theme.rounded.md,
    backgroundColor: theme.colors.surfaceCard,
    marginRight: 10,
  },
  giftContent: {
    flex: 1,
  },
  giftTag: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  giftTagText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  giftName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textDark,
  },
  giftSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  giftPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  giftFreePrice: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  giftOriginalPrice: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textDark,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  exploreBtn: {
    marginTop: 20,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.rounded.lg,
  },
  exploreBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Footer Thanh toán */
  checkoutFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surfaceCard,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    ...theme.shadows.elevated,
  },
  footerSummary: {
    marginBottom: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 13,
    color: theme.colors.textDark,
  },
  footerTotalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  vatNote: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.rounded.lg,
  },
  checkoutBtnDisabled: {
    backgroundColor: theme.colors.borderSubtle,
  },
  checkoutBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});