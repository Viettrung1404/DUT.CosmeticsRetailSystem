import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../../constants/theme';
import {
  productApi,
  extractProductList,
  extractCategoryTree,
  NormalizedProduct,
  NormalizedCategory,
} from '../../api/productApi';
import { useCartStore } from '../../store/useCartStore';

const SORTS = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'bestseller', label: 'Bán chạy' },
  { key: 'price_asc', label: 'Giá ↑' },
  { key: 'price_desc', label: 'Giá ↓' },
  { key: 'rating', label: 'Đánh giá ⭐' },
];

const sanitizeCategoryId = (val: any): string | undefined => {
  if (typeof val === 'string' && val !== 'all' && val !== '[object Object]' && val.trim().length > 0) {
    return val.trim();
  }
  return undefined;
};

export default function CatalogScreen({ route, navigation }: any) {
  const { addItem } = useCartStore();

  const [products, setProducts] = useState<NormalizedProduct[]>([]);
  const [rootCategories, setRootCategories] = useState<NormalizedCategory[]>([]);
  const [flatCategories, setFlatCategories] = useState<NormalizedCategory[]>([]);

  const [selectedParentId, setSelectedParentId] = useState<string>('all');
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [subCategories, setSubCategories] = useState<NormalizedCategory[]>([]);

  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initialCatParam = sanitizeCategoryId(route?.params?.categoryId);

  // 1. Tải cây danh mục duy nhất 1 lần khi mount
  useEffect(() => {
    let isMounted = true;
    productApi
      .getCategories()
      .then((catRes) => {
        if (!isMounted) return;
        const { root, flat } = extractCategoryTree(catRes);
        setRootCategories(root);
        setFlatCategories(flat);

        // Nếu màn hình nhận param categoryId từ Home
        if (initialCatParam) {
          handleSelectInitialCategory(initialCatParam, root, flat);
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải danh mục:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Xử lý khi route params thay đổi
  useEffect(() => {
    const validCatId = sanitizeCategoryId(route?.params?.categoryId);
    if (validCatId && flatCategories.length > 0) {
      handleSelectInitialCategory(validCatId, rootCategories, flatCategories);
    }
  }, [route?.params?.categoryId]);

  const handleSelectInitialCategory = (
    catId: string,
    root: NormalizedCategory[],
    flat: NormalizedCategory[]
  ) => {
    // Tìm xem đây là category cha hay con
    const matched = flat.find((c) => c.id === catId);
    if (!matched) {
      setSelectedParentId(catId);
      setSelectedSubId(null);
      setSubCategories([]);
      return;
    }

    const parentInRoot = root.find((r) => r.id === catId);
    if (parentInRoot) {
      setSelectedParentId(parentInRoot.id);
      setSelectedSubId(null);
      setSubCategories(parentInRoot.children || []);
    } else {
      // Là subcategory -> tìm parent
      const parent = root.find((r) => r.children?.some((ch) => ch.id === catId));
      if (parent) {
        setSelectedParentId(parent.id);
        setSelectedSubId(catId);
        setSubCategories(parent.children || []);
      } else {
        setSelectedParentId(catId);
        setSelectedSubId(null);
      }
    }
  };

  // 2. Tải danh sách sản phẩm theo bộ lọc
  const loadProducts = useCallback(
    async (catId?: string | null, sort?: string, query?: string) => {
      try {
        setLoading(true);
        setErrorMessage(null);

        const rawActiveCatId = catId !== undefined ? catId : (selectedSubId || (selectedParentId !== 'all' ? selectedParentId : undefined));
        const activeCatId = sanitizeCategoryId(rawActiveCatId);
        const activeSort = sort !== undefined ? sort : sortBy;
        const activeQuery = query !== undefined ? query : searchQuery;

        const params: any = {
          page: 1,
          limit: 30,
          sortBy: activeSort,
        };

        if (activeCatId) {
          params.categoryId = activeCatId;
        }

        if (activeQuery && activeQuery.trim()) {
          params.search = activeQuery.trim();
        }

        const res = await productApi.getProducts(params);
        const items = extractProductList(res);
        setProducts(items);
      } catch (error: any) {
        setErrorMessage(
          'Không thể kết nối đến máy chủ Backend GlowUp. Vui lòng kiểm tra lại kết nối mạng.'
        );
        setProducts([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedParentId, selectedSubId, sortBy, searchQuery]
  );

  // Trigger load khi thay đổi bộ lọc
  useEffect(() => {
    const activeCatId = selectedSubId || (selectedParentId !== 'all' ? selectedParentId : undefined);
    loadProducts(activeCatId, sortBy, searchQuery);
  }, [selectedParentId, selectedSubId, sortBy]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  // Chọn danh mục cha
  const handleSelectParent = (id: string) => {
    setSelectedParentId(id);
    setSelectedSubId(null);

    if (id === 'all') {
      setSubCategories([]);
    } else {
      const parent = rootCategories.find((c) => c.id === id);
      setSubCategories(parent?.children || []);
    }
  };

  // Chọn danh mục con
  const handleSelectSub = (subId: string | null) => {
    setSelectedSubId(subId);
  };

  // Thêm nhanh vào giỏ hàng
  const handleQuickAddToCart = (product: NormalizedProduct) => {
    const primaryVariant = product.variants?.[0];
    const variantId = primaryVariant?.id || product.id;
    addItem({
      id: variantId,
      productId: product.id,
      variantId,
      productName: product.name,
      variantName: primaryVariant?.option1Value || 'Tiêu chuẩn',
      price: product.price,
      originalPrice: product.originalPrice,
      imageUrl: product.imageUrl,
      stock: primaryVariant?.stockQuantity ?? 99,
    });

    Alert.alert(
      'Đã thêm vào giỏ 🛍️',
      `"${product.name}" đã được đưa vào giỏ hàng của bạn.`,
      [
        { text: 'Mua tiếp', style: 'cancel' },
        { text: 'Xem giỏ', onPress: () => navigation.navigate('MainTabs', { screen: 'Giỏ hàng' }) },
      ]
    );
  };

  const renderProductItem = ({ item }: { item: NormalizedProduct }) => {
    const hasDiscount = item.originalPrice && item.originalPrice > item.price;
    const discountPercent = hasDiscount
      ? Math.round(((item.originalPrice! - item.price) / item.originalPrice!) * 100)
      : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ProductDetail', { slug: item.slug || item.id })}
        activeOpacity={0.88}
      >
        <View style={styles.cardImgWrapper}>
          <Image
            source={{
              uri:
                item.imageUrl ||
                'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
            }}
            style={styles.cardImage}
          />
          {hasDiscount && discountPercent > 0 && (
            <View style={styles.saleBadge}>
              <Text style={styles.saleBadgeText}>-{discountPercent}%</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.brand} numberOfLines={1}>
            {item.brand}
          </Text>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Rating & Sold count */}
          <View style={styles.metaRow}>
            <Ionicons name="star" size={11} color="#FFB800" />
            <Text style={styles.metaText}>{item.rating ? item.rating.toFixed(1) : '5.0'}</Text>
            {typeof item.totalSold === 'number' && item.totalSold > 0 ? (
              <Text style={styles.soldText}>
                • Đã bán {item.totalSold >= 1000 ? `${(item.totalSold / 1000).toFixed(1)}k` : item.totalSold}
              </Text>
            ) : null}
          </View>

          {/* Price & Quick Add Button */}
          <View style={styles.priceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.salePrice}>
                {item.price.toLocaleString('vi-VN')}đ
              </Text>
              {hasDiscount && (
                <Text style={styles.basePrice}>
                  {item.originalPrice!.toLocaleString('vi-VN')}đ
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.quickAddBtn}
              onPress={() => handleQuickAddToCart(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. Thanh Tìm Kiếm Trực Tiếp */}
      <View style={styles.searchHeader}>
        <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm mỹ phẩm, thương hiệu..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => loadProducts()}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              loadProducts(undefined, undefined, '');
            }}
          >
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* 2. Hàng Danh Mục Cấp 1 (Root Categories) */}
      <View style={styles.parentCategoryContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'all', name: 'Tất cả' } as NormalizedCategory, ...rootCategories]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: SPACING.md }}
          renderItem={({ item }) => {
            const isActive = selectedParentId === item.id;
            return (
              <TouchableOpacity
                style={[styles.parentChip, isActive && styles.activeParentChip]}
                onPress={() => handleSelectParent(item.id)}
              >
                <Text style={[styles.parentChipText, isActive && styles.activeParentChipText]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* 3. Hàng Danh Mục Con Cấp 2 (Subcategories) nếu có */}
      {subCategories.length > 0 && (
        <View style={styles.subCategoryContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={subCategories}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: SPACING.md }}
            renderItem={({ item }) => {
              const isSubActive = selectedSubId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.subChip, isSubActive && styles.activeSubChip]}
                  onPress={() => handleSelectSub(isSubActive ? null : item.id)}
                >
                  <Text style={[styles.subChipText, isSubActive && styles.activeSubChipText]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* 4. Thanh Sắp Xếp (Sort Options) */}
      <View style={styles.sortContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SORTS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingHorizontal: SPACING.md }}
          renderItem={({ item }) => {
            const isSortActive = sortBy === item.key;
            return (
              <TouchableOpacity
                style={[styles.sortBtn, isSortActive && styles.activeSortBtn]}
                onPress={() => setSortBy(item.key)}
              >
                <Text style={[styles.sortText, isSortActive && styles.activeSortText]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* 5. Lỗi kết nối */}
      {errorMessage ? (
        <View style={styles.errorBox}>
          <Ionicons name="cloud-offline-outline" size={32} color={COLORS.error} />
          <Text style={styles.errorTitle}>Lỗi kết nối máy chủ</Text>
          <Text style={styles.errorSubtitle}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadProducts()}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* 6. Lưới Danh Sách Sản Phẩm */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 10, color: COLORS.textMuted, fontSize: 13 }}>
            Đang tải danh mục mỹ phẩm...
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id || item.slug}
          renderItem={renderProductItem}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            !errorMessage ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="bag-outline" size={54} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>Chưa có sản phẩm phù hợp</Text>
                <Text style={styles.emptySubtitle}>
                  Thử tìm kiếm từ khóa khác hoặc xóa bộ lọc danh mục.
                </Text>
                <TouchableOpacity
                  style={styles.clearFilterBtn}
                  onPress={() => {
                    setSelectedParentId('all');
                    setSelectedSubId(null);
                    setSearchQuery('');
                    setSortBy('newest');
                  }}
                >
                  <Text style={styles.clearFilterBtnText}>Xem tất cả sản phẩm</Text>
                </TouchableOpacity>
              </View>
            ) : undefined
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 13,
    color: COLORS.textPrimary,
    paddingVertical: 2,
  },
  parentCategoryContainer: {
    paddingVertical: 6,
  },
  parentChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeParentChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  parentChipText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  activeParentChipText: {
    color: '#FFF',
    fontWeight: '700',
  },
  subCategoryContainer: {
    paddingBottom: 6,
  },
  subChip: {
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeSubChip: {
    backgroundColor: '#FFE8EE',
    borderColor: COLORS.primary,
  },
  subChipText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  activeSubChipText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  sortContainer: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.xs,
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
  },
  activeSortBtn: {
    backgroundColor: COLORS.primarySurface,
  },
  sortText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  activeSortText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: SPACING.xs,
    paddingBottom: 40,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    margin: SPACING.xs,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  cardImgWrapper: {
    width: '100%',
    height: 135,
    backgroundColor: COLORS.surfaceContainer,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  saleBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saleBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  cardBody: {
    padding: SPACING.sm,
  },
  brand: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    height: 32,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  metaText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 3,
  },
  soldText: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  salePrice: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  basePrice: {
    fontSize: 10,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  quickAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  errorBox: {
    backgroundColor: '#FFF2F2',
    borderWidth: 1,
    borderColor: '#FFD1D1',
    margin: SPACING.md,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorTitle: { fontSize: 14, fontWeight: '700', color: COLORS.error, marginTop: 8 },
  errorSubtitle: { fontSize: 12, color: COLORS.textDark, textAlign: 'center', marginVertical: 6 },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginTop: 6 },
  retryBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginTop: 12 },
  emptySubtitle: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  clearFilterBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  clearFilterBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
});
