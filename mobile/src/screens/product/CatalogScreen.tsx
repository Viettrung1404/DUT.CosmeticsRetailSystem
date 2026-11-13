import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import {
  productApi,
  extractProductList,
  extractCategoryTree,
  NormalizedProduct,
} from '../../api/productApi';

interface CategoryFilter {
  id: string;
  name: string;
}

export default function CatalogScreen({ route, navigation }: any) {
  const [products, setProducts] = useState<NormalizedProduct[]>([]);
  const [categories, setCategories] = useState<CategoryFilter[]>([
    { id: 'all', name: 'Tất cả' },
  ]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    route?.params?.categoryId || 'all'
  );

  useEffect(() => {
    if (route?.params?.categoryId) {
      setSelectedCategoryId(route.params.categoryId);
    }
  }, [route?.params?.categoryId]);

  useEffect(() => {
    loadCatalog(selectedCategoryId);
  }, [selectedCategoryId]);

  const loadCatalog = async (catId: string) => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const params: any = { page: 1, limit: 30 };
      if (catId && catId !== 'all') {
        params.categoryId = catId;
      }

      const [prodRes, catRes] = await Promise.allSettled([
        productApi.getProducts(params),
        productApi.getCategories(),
      ]);

      if (prodRes.status === 'fulfilled') {
        const items = extractProductList(prodRes.value);
        setProducts(items);
      } else {
        throw (prodRes as any).reason;
      }

      if (catRes.status === 'fulfilled') {
        const { flat } = extractCategoryTree(catRes.value);
        if (flat.length > 0) {
          const list: CategoryFilter[] = [{ id: 'all', name: 'Tất cả' }];
          const seen = new Set<string>();
          flat.forEach((c) => {
            if (!seen.has(c.id)) {
              seen.add(c.id);
              list.push({ id: c.id, name: c.name });
            }
          });
          setCategories(list);
        }
      }
    } catch (error: any) {
      setErrorMessage(
        'Không thể kết nối đến máy chủ Backend GlowUp. Vui lòng kiểm tra lại kết nối mạng.'
      );
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCatalog(selectedCategoryId);
  };

  const renderProductItem = ({ item }: { item: NormalizedProduct }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ProductDetail', { slug: item.slug || item.id })}
      activeOpacity={0.8}
    >
      <Image
        source={{
          uri:
            item.imageUrl ||
            'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
        }}
        style={styles.cardImage}
      />
      <Text style={styles.brand}>{item.brand}</Text>
      <Text style={styles.productName} numberOfLines={2}>
        {item.name}
      </Text>
      <View style={styles.priceContainer}>
        <Text style={styles.salePrice}>
          {item.price.toLocaleString('vi-VN')}đ
        </Text>
        {item.originalPrice && item.originalPrice > item.price ? (
          <Text style={styles.basePrice}>
            {item.originalPrice.toLocaleString('vi-VN')}đ
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <TouchableOpacity
        style={styles.searchHeader}
        onPress={() => navigation.navigate('Search')}
      >
        <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
        <Text style={styles.searchText}>Tìm kiếm mỹ phẩm, thương hiệu...</Text>
      </TouchableOpacity>

      {/* Category Pills */}
      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, selectedCategoryId === item.id && styles.activeChip]}
              onPress={() => setSelectedCategoryId(item.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedCategoryId === item.id && styles.activeChipText,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Lỗi mạng nếu backend chưa mở */}
      {errorMessage ? (
        <View style={styles.errorBox}>
          <Ionicons name="cloud-offline-outline" size={32} color={COLORS.error} />
          <Text style={styles.errorTitle}>Lỗi kết nối máy chủ</Text>
          <Text style={styles.errorSubtitle}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadCatalog(selectedCategoryId)}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Product Grid */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
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
                <Ionicons name="bag-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Chưa có sản phẩm nào trong danh mục này</Text>
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
  searchHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, margin: SPACING.md, padding: SPACING.md, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  searchText: { color: COLORS.textMuted, marginLeft: SPACING.sm },
  categoryContainer: { paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  chip: { backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 20, marginRight: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  activeChip: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textPrimary, fontSize: 13 },
  activeChipText: { color: COLORS.surface, fontWeight: 'bold' },
  listContainer: { paddingHorizontal: SPACING.xs, paddingBottom: 30 },
  card: { flex: 1, backgroundColor: COLORS.surface, margin: SPACING.xs, padding: SPACING.sm, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  cardImage: { width: '100%', height: 130, borderRadius: 8, marginBottom: SPACING.xs },
  brand: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase' },
  productName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, height: 36 },
  priceContainer: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs },
  salePrice: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary, marginRight: SPACING.xs },
  basePrice: { fontSize: 11, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
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
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, marginTop: 10 },
});