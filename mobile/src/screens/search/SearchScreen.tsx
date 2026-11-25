import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { productApi, extractCategoryTree, NormalizedCategory } from '../../api/productApi';
import { useCartStore } from '../../store/useCartStore';
import * as secureStore from '../../utils/secureStore';

const { width } = Dimensions.get('window');

interface SearchProduct {
  id: string;
  slug?: string;
  variantId?: string;
  variantName?: string;
  stock?: number;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewsCount: number;
  badge: string;
  tag: string;
  category: string;
  image: string;
}

const PRICE_PRESETS = [
  { label: 'Dưới 300k', min: '0', max: '300000' },
  { label: '300k - 600k', min: '300000', max: '600000' },
  { label: 'Trên 600k', min: '600000', max: '5000000' },
];

const SORT_OPTIONS: Array<{
  id: 'relevance' | 'newest' | 'bestseller' | 'price_asc' | 'price_desc' | 'rating';
  label: string;
}> = [
  { id: 'relevance', label: 'Phù hợp nhất' },
  { id: 'newest', label: 'Mới nhất' },
  { id: 'bestseller', label: 'Bán chạy nhất' },
  { id: 'price_asc', label: 'Giá: Thấp đến Cao' },
  { id: 'price_desc', label: 'Giá: Cao đến Thấp' },
  { id: 'rating', label: 'Đánh giá cao nhất' },
];

interface HintResult {
  keywords: string[];
  brands: Array<{ id: string; name: string; slug: string }>;
  products: Array<{ id: string; name: string; slug: string; imageUrl?: string | null; price: number }>;
  history?: string[];
}

export default function SearchScreen({ navigation }: any) {
  const inputRef = useRef<any>(null);

  const [keyword, setKeyword] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [suggestedProducts, setSuggestedProducts] = useState<SearchProduct[]>([]);

  // Sort & Filter Modals
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Sorting State
  const [sortBy, setSortBy] = useState<
    'relevance' | 'newest' | 'bestseller' | 'price_asc' | 'price_desc' | 'rating'
  >('relevance');

  // Filter States
  const [categories, setCategories] = useState<NormalizedCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [availableBrands, setAvailableBrands] = useState<{ id: string; name: string }[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);

  // Real Hints
  const [hints, setHints] = useState<HintResult>({ keywords: [], brands: [], products: [] });

  const addItem = useCartStore((s) => s.addItem);

  const formatPrice = (val: number) => {
    return val.toLocaleString('vi-VN') + '₫';
  };

  // Helper map sản phẩm từ backend API envelope
  const mapProductItems = (items: any[]): SearchProduct[] => {
    return items.map((item: any) => {
      const variant = item.variants?.find(
        (candidate: any) =>
          candidate.id && (candidate.stockQuantity == null || candidate.stockQuantity > 0),
      );
      return {
        id: item.id || `prod-${item.slug}`,
        slug: item.slug || item.id,
        variantId: variant?.id,
        variantName:
          [variant?.option1Value, variant?.option2Value, variant?.option3Value]
            .filter(Boolean)
            .join(' / ') || variant?.sku || 'Tiêu chuẩn',
        stock: variant?.stockQuantity ?? 99,
        name: item.name,
        brand: item.brandName || item.brand?.name || 'GlowUp',
        price: Number(variant?.effectivePrice ?? variant?.price ?? item.basePrice ?? item.price) || 0,
        originalPrice: Number(item.basePrice ?? item.originalPrice ?? item.original_price) || undefined,
        rating: Number(item.avgRating ?? item.rating) || 0,
        reviewsCount: Number(item.totalReviews ?? item.reviewsCount) || 0,
        badge: item.badge || (item.isFeatured ? 'Nổi bật' : 'Mới'),
        tag: item.categoryName || item.category?.name || 'Mỹ phẩm',
        category: item.categoryName || item.category?.name || 'Mỹ phẩm',
        image:
          item.primaryImage ||
          item.thumbnail ||
          item.images?.[0]?.imageUrl ||
          item.images?.[0]?.url ||
          'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
      };
    });
  };

  // Lấy 4 sản phẩm gợi ý từ từ khóa tìm kiếm gần đây nhất
  const fetchSuggestedProducts = async (latestQuery?: string) => {
    try {
      if (latestQuery && latestQuery.trim()) {
        const res = await productApi.searchProducts({ q: latestQuery.trim(), limit: 4 });
        const items = res?.data?.data || res?.data || res?.items || res || [];
        if (Array.isArray(items) && items.length > 0) {
          setSuggestedProducts(mapProductItems(items).slice(0, 4));
          return;
        }
      }

      // Fallback nếu chưa có tìm kiếm hoặc tìm kiếm rỗng
      const fallbackRes = await productApi.getProducts({ limit: 4 });
      const fallbackItems = fallbackRes?.data?.data || fallbackRes?.data || fallbackRes?.items || [];
      if (Array.isArray(fallbackItems) && fallbackItems.length > 0) {
        setSuggestedProducts(mapProductItems(fallbackItems).slice(0, 4));
      }
    } catch {
      // Ignored
    }
  };

  // 1. Tự động focus input khi vào màn hình
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  // 2. Tải dữ liệu ban đầu: Lịch sử tìm kiếm, Categories, Facets, Sản phẩm gợi ý
  useEffect(() => {
    // Đọc lịch sử từ storage cục bộ trước
    secureStore.getItemAsync('glowup_search_history').then((cached) => {
      let localRecent: string[] = [];
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localRecent = parsed;
            setRecentSearches(parsed);
          }
        } catch {}
      }

      // Đọc tiếp từ backend DB
      productApi
        .getSearchHistory()
        .then((res) => {
          const data = res?.data || res;
          let latestSearch: string | undefined = localRecent[0];
          if (Array.isArray(data?.history) && data.history.length > 0) {
            const serverQueries: string[] = data.history.map((h: any) => h.query || h).filter(Boolean);
            const merged = Array.from(new Set([...serverQueries, ...localRecent])).slice(0, 10);
            setRecentSearches(merged);
            secureStore.setItemAsync('glowup_search_history', JSON.stringify(merged)).catch(() => {});
            latestSearch = merged[0];
          }
          fetchSuggestedProducts(latestSearch);
        })
        .catch(() => {
          fetchSuggestedProducts(localRecent[0]);
        });
    });

    // Lấy cây danh mục
    productApi
      .getCategories()
      .then((res) => {
        const { flat } = extractCategoryTree(res);
        if (Array.isArray(flat) && flat.length > 0) {
          setCategories(flat);
        }
      })
      .catch(() => {});

    // Lấy facets (thương hiệu)
    productApi
      .getFacets()
      .then((res) => {
        const data = res?.data || res;
        if (Array.isArray(data?.brands) && data.brands.length > 0) {
          setAvailableBrands(data.brands.map((b: any) => ({ id: b.id, name: b.name })));
        }
      })
      .catch(() => {});
  }, []);

  // 3. Debounce lấy gợi ý tìm kiếm (Hints) khi người dùng gõ
  useEffect(() => {
    const q = keyword.trim();
    if (!q) {
      setHints({ keywords: [], brands: [], products: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await productApi.getSearchHints(q);
        const data = res?.data || res;
        setHints({
          keywords: Array.isArray(data?.keywords) ? data.keywords : [],
          brands: Array.isArray(data?.brands) ? data.brands : [],
          products: Array.isArray(data?.products) ? data.products : [],
          history: Array.isArray(data?.history) ? data.history : [],
        });
      } catch {
        setHints({ keywords: [], brands: [], products: [] });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [keyword]);

  // Lọc lịch sử tìm kiếm khớp với từ khóa
  const matchingHistory = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return recentSearches;
    return recentSearches.filter((item) => item.toLowerCase().includes(q));
  }, [keyword, recentSearches]);

  // Thực hiện tìm kiếm
  const handleSearch = async (queryText?: string, overrideSort?: typeof sortBy) => {
    const q = (queryText !== undefined ? queryText : keyword).trim();
    if (!q) return;

    setKeyword(q);
    setHasSearched(true);
    setIsInputFocused(false);
    setIsLoading(true);
    Keyboard.dismiss();

    const activeSort = overrideSort !== undefined ? overrideSort : sortBy;

    // Cập nhật lịch sử
    const updatedHistory = [q, ...recentSearches.filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, 10);
    setRecentSearches(updatedHistory);
    secureStore.setItemAsync('glowup_search_history', JSON.stringify(updatedHistory)).catch(() => {});
    productApi.recordSearchHistory(q).catch(() => {});

    // Cập nhật lại 4 sản phẩm gợi ý dựa trên từ khóa vừa tìm
    fetchSuggestedProducts(q);

    try {
      const minP = minPriceInput ? Number(minPriceInput) : undefined;
      const maxP = maxPriceInput ? Number(maxPriceInput) : undefined;

      const res = await productApi.searchProducts({
        q,
        categoryId: selectedCategoryId || undefined,
        brandIds: selectedBrands.length > 0 ? selectedBrands : undefined,
        minPrice: !isNaN(minP as number) ? minP : undefined,
        maxPrice: !isNaN(maxP as number) ? maxP : undefined,
        rating: minRating > 0 ? minRating : undefined,
        sortBy: activeSort !== 'relevance' ? activeSort : undefined,
      });

      const apiItems = res?.data?.data || res?.data || res?.items || res || [];
      if (Array.isArray(apiItems)) {
        setResults(mapProductItems(apiItems));
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const removeHistoryItem = (itemToRemove: string) => {
    const updated = recentSearches.filter((item) => item !== itemToRemove);
    setRecentSearches(updated);
    secureStore.setItemAsync('glowup_search_history', JSON.stringify(updated)).catch(() => {});
    productApi.deleteSearchHistory({ query: itemToRemove }).catch(() => {});
  };

  const clearAllHistory = () => {
    setRecentSearches([]);
    secureStore.setItemAsync('glowup_search_history', JSON.stringify([])).catch(() => {});
    productApi.deleteSearchHistory().catch(() => {});
  };

  const toggleBrand = (brandId: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId) ? prev.filter((id) => id !== brandId) : [...prev, brandId],
    );
  };

  const applySort = (newSort: typeof sortBy) => {
    setSortBy(newSort);
    setSortModalVisible(false);
    if (hasSearched || keyword.trim()) {
      handleSearch(keyword, newSort);
    }
  };

  const applyFilters = () => {
    setFilterModalVisible(false);
    handleSearch();
  };

  const resetFilters = () => {
    setSelectedCategoryId(null);
    setMinPriceInput('');
    setMaxPriceInput('');
    setSelectedBrands([]);
    setMinRating(0);
  };

  const handleAddToCart = async (product: SearchProduct) => {
    if (!product.variantId) {
      Alert.alert('Chưa thể thêm sản phẩm', 'Mở chi tiết sản phẩm để chọn một biến thể còn hàng.');
      return;
    }

    try {
      await addItem({
        id: product.variantId,
        variantId: product.variantId,
        productId: product.id,
        productName: product.name,
        variantName: product.variantName || 'Tiêu chuẩn',
        price: product.price,
        originalPrice: product.originalPrice,
        imageUrl: product.image,
        stock: product.stock ?? 99,
      });
      Alert.alert('Thành công', `Đã thêm "${product.name}" vào giỏ hàng.`);
    } catch (error: any) {
      Alert.alert(
        'Không thể thêm vào giỏ',
        error?.response?.data?.message || error?.message || 'Vui lòng thử lại.',
      );
    }
  };

  const renderProductItem = ({ item }: { item: SearchProduct }) => (
    <TouchableOpacity
      style={styles.productCard}
      activeOpacity={0.88}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id, slug: item.slug || item.id })}
    >
      <View style={styles.imageWrapper}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        {item.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        ) : null}
        <TouchableOpacity style={styles.wishlistBtn} activeOpacity={0.8}>
          <Ionicons name="heart-outline" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.brandText}>{item.brand}</Text>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={13} color="#F59E0B" />
          <Text style={styles.ratingText}>{item.rating}</Text>
          <Text style={styles.reviewsText}>({item.reviewsCount})</Text>
        </View>

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.price}>{formatPrice(item.price)}</Text>
            {item.originalPrice ? (
              <Text style={styles.originalPrice}>{formatPrice(item.originalPrice)}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.addCartBtn}
            activeOpacity={0.7}
            onPress={() => handleAddToCart(item)}
          >
            <Feather name="shopping-bag" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const activeFiltersCount =
    (selectedCategoryId ? 1 : 0) +
    (minPriceInput || maxPriceInput ? 1 : 0) +
    selectedBrands.length +
    (minRating > 0 ? 1 : 0);

  const currentSortLabel = SORT_OPTIONS.find((s) => s.id === sortBy)?.label || 'Phù hợp nhất';

  // Điều kiện hiển thị popup gợi ý nổi (AutoComplete overlay)
  const showSuggestionsPopup = isInputFocused && keyword.trim().length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER: Search Bar & Sort Icon */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={[styles.input, { outlineStyle: 'none', outlineWidth: 0 } as any]}
            placeholder="Tìm kiếm serum, son, kem chống nắng..."
            placeholderTextColor={theme.colors.textMuted}
            value={keyword}
            onChangeText={setKeyword}
            onFocus={() => setIsInputFocused(true)}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
            autoFocus={true}
          />
          {keyword.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setKeyword('');
                setHasSearched(false);
                setIsInputFocused(true);
              }}
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Nút Sắp xếp theo chiều nào giống frontend (thay thế nút bộ lọc cũ) */}
        <TouchableOpacity
          style={[styles.sortTriggerBtn, sortBy !== 'relevance' && styles.sortActiveBtn]}
          onPress={() => setSortModalVisible(true)}
          accessibilityLabel="Sắp xếp sản phẩm"
        >
          <Ionicons
            name="swap-vertical"
            size={19}
            color={sortBy !== 'relevance' ? '#FFF' : theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* AUTOCOMPLETE SUGGESTIONS POPUP / OVERLAY */}
      {showSuggestionsPopup && (
        <View style={styles.suggestionsPopupOverlay}>
          <ScrollView
            style={styles.suggestionsPopupScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Lịch sử tìm kiếm phù hợp */}
            {matchingHistory.length > 0 && (
              <View style={styles.suggestionSection}>
                <View style={styles.suggestionSectionHeader}>
                  <Feather name="clock" size={13} color={theme.colors.primary} />
                  <Text style={styles.suggestionSectionTitle}>Lịch sử tìm kiếm</Text>
                </View>
                {matchingHistory.slice(0, 4).map((item, idx) => (
                  <TouchableOpacity
                    key={`hist-${idx}`}
                    style={styles.suggestionRow}
                    onPress={() => handleSearch(item)}
                  >
                    <View style={styles.suggestionIconWrapper}>
                      <Feather name="clock" size={14} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.suggestionText}>
                      <Text style={{ fontWeight: '700', color: theme.colors.primary }}>{item}</Text>
                    </Text>
                    <Ionicons
                      name="arrow-back-outline"
                      size={13}
                      color={theme.colors.textMuted}
                      style={{ transform: [{ rotate: '45deg' }] }}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 2. Từ khóa gợi ý */}
            {hints.keywords.length > 0 && (
              <View style={styles.suggestionSection}>
                <View style={styles.suggestionSectionHeader}>
                  <Ionicons name="sparkles" size={13} color={theme.colors.primary} />
                  <Text style={styles.suggestionSectionTitle}>Từ khóa gợi ý</Text>
                </View>
                {hints.keywords.map((kw, idx) => (
                  <TouchableOpacity
                    key={`kw-${idx}`}
                    style={styles.suggestionRow}
                    onPress={() => handleSearch(kw)}
                  >
                    <View style={styles.suggestionIconWrapper}>
                      <Ionicons name="search-outline" size={14} color={theme.colors.textMuted} />
                    </View>
                    <Text style={styles.suggestionText}>{kw}</Text>
                    <Ionicons name="arrow-forward" size={13} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 3. Thương hiệu liên quan */}
            {hints.brands.length > 0 && (
              <View style={styles.suggestionSection}>
                <View style={styles.suggestionSectionHeader}>
                  <Feather name="award" size={13} color={theme.colors.primary} />
                  <Text style={styles.suggestionSectionTitle}>Thương hiệu</Text>
                </View>
                <View style={styles.chipsContainer}>
                  {hints.brands.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      style={styles.brandHintChip}
                      onPress={() => {
                        setSelectedBrands([b.id]);
                        handleSearch(b.name);
                      }}
                    >
                      <Ionicons name="checkmark-circle-outline" size={13} color={theme.colors.primary} />
                      <Text style={styles.brandHintText}>{b.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* 4. Sản phẩm gợi ý */}
            {hints.products.length > 0 && (
              <View style={styles.suggestionSection}>
                <View style={styles.suggestionSectionHeader}>
                  <Ionicons name="pricetag-outline" size={13} color={theme.colors.primary} />
                  <Text style={styles.suggestionSectionTitle}>Sản phẩm gợi ý</Text>
                </View>
                {hints.products.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.productHintRow}
                    onPress={() => {
                      setIsInputFocused(false);
                      navigation.navigate('ProductDetail', { slug: p.slug });
                    }}
                  >
                    <Image
                      source={{
                        uri:
                          p.imageUrl ||
                          'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200',
                      }}
                      style={styles.productHintThumb}
                    />
                    <View style={styles.productHintInfo}>
                      <Text style={styles.productHintName} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={styles.productHintPrice}>{formatPrice(p.price)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Tìm kiếm trực tiếp chuỗi đang nhập */}
            <TouchableOpacity
              style={styles.directSearchPrompt}
              onPress={() => handleSearch()}
            >
              <Ionicons name="search" size={16} color={theme.colors.primary} />
              <Text style={styles.directSearchPromptText}>
                Tìm kiếm kết quả cho "{keyword}"
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* BODY CONTENT */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Đang tìm kiếm sản phẩm...</Text>
        </View>
      ) : hasSearched ? (
        // RESULT VIEW
        <View style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultCount}>
              Tìm thấy <Text style={{ fontWeight: '700', color: theme.colors.primary }}>{results.length}</Text> sản phẩm
            </Text>

            <View style={styles.actionButtonsRow}>
              {/* Nút hiển thị tiêu chí Sắp xếp hiện tại */}
              <TouchableOpacity
                style={styles.sortChipButton}
                onPress={() => setSortModalVisible(true)}
              >
                <Ionicons name="swap-vertical" size={13} color={theme.colors.primary} />
                <Text style={styles.sortChipText} numberOfLines={1}>
                  {currentSortLabel}
                </Text>
              </TouchableOpacity>

              {/* Nút Bộ lọc */}
              <TouchableOpacity
                style={[
                  styles.filterChipButton,
                  activeFiltersCount > 0 && styles.filterChipButtonActive,
                ]}
                onPress={() => setFilterModalVisible(true)}
              >
                <Ionicons
                  name="filter"
                  size={13}
                  color={activeFiltersCount > 0 ? '#FFF' : theme.colors.primary}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    activeFiltersCount > 0 && styles.filterChipTextActive,
                  ]}
                >
                  Bộ lọc {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderProductItem}
            numColumns={2}
            contentContainerStyle={styles.productList}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.columnWrapper}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={56} color={theme.colors.textMuted} />
                <Text style={styles.emptyTitle}>Không tìm thấy sản phẩm</Text>
                <Text style={styles.emptySub}>
                  Hãy thử tìm kiếm với từ khóa khác hoặc điều chỉnh lại bộ lọc nhé!
                </Text>
              </View>
            }
          />
        </View>
      ) : (
        // DEFAULT DISCOVERY VIEW (Đã bỏ xu hướng và routine banner)
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Lịch sử tìm kiếm gần đây */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.titleWithIcon}>
                  <Feather name="clock" size={16} color={theme.colors.primary} />
                  <Text style={styles.sectionTitle}>Tìm kiếm gần đây</Text>
                </View>
                <TouchableOpacity onPress={clearAllHistory}>
                  <Text style={styles.clearAllText}>Xóa tất cả</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.chipsContainer}>
                {recentSearches.map((item, idx) => (
                  <View key={idx} style={styles.historyChip}>
                    <TouchableOpacity onPress={() => handleSearch(item)}>
                      <Text style={styles.historyChipText}>{item}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeHistoryItem(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.chipRemoveBtn}
                    >
                      <Ionicons name="close" size={13} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Gợi ý cho bạn: Lấy 4 sản phẩm từ tìm kiếm gần đây nhất */}
          <View style={[styles.section, { marginTop: 24, marginBottom: 40 }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.titleWithIcon}>
                <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>
                  {recentSearches.length > 0
                    ? `Sản phẩm gợi ý cho bạn (từ "${recentSearches[0]}")`
                    : 'Sản phẩm gợi ý cho bạn'}
                </Text>
              </View>
            </View>

            <View style={styles.suggestedGrid}>
              {(suggestedProducts.length > 0 ? suggestedProducts : []).slice(0, 4).map((p) => (
                <View key={p.id} style={styles.suggestedCardWrapper}>
                  {renderProductItem({ item: p })}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* SORT BOTTOM SHEET MODAL */}
      <Modal
        visible={sortModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSortModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setSortModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.dragHandle} />
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>Sắp xếp theo</Text>
                <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                  <Ionicons name="close" size={22} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sortListContainer}>
              {SORT_OPTIONS.map((opt) => {
                const isSelected = sortBy === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.sortItemRow, isSelected && styles.sortItemRowActive]}
                    onPress={() => applySort(opt.id)}
                  >
                    <Text style={[styles.sortItemLabel, isSelected && styles.sortItemLabelActive]}>
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* FILTER BOTTOM SHEET MODAL (Danh mục, Khoảng giá tự nhập, Thương hiệu, Đánh giá) */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setFilterModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.dragHandle} />
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>Bộ lọc sản phẩm</Text>
                <TouchableOpacity onPress={resetFilters}>
                  <Text style={styles.resetFilterText}>Thiết lập lại</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.filterScroll} showsVerticalScrollIndicator={false}>
              {/* 1. Lọc theo Danh mục */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Danh mục sản phẩm</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                  <TouchableOpacity
                    style={[
                      styles.filterPill,
                      selectedCategoryId === null && styles.filterPillActive,
                    ]}
                    onPress={() => setSelectedCategoryId(null)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        selectedCategoryId === null && styles.filterPillTextActive,
                      ]}
                    >
                      Tất cả
                    </Text>
                  </TouchableOpacity>
                  {categories.slice(0, 12).map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.filterPill, isSelected && styles.filterPillActive]}
                        onPress={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            isSelected && styles.filterPillTextActive,
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 2. Lọc theo Khoảng giá (Tự nhập min/max) */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Khoảng giá (VNĐ)</Text>
                <View style={styles.priceInputRow}>
                  <View style={styles.priceInputBox}>
                    <Text style={styles.priceInputLabel}>Từ</Text>
                    <TextInput
                      style={[styles.priceInput, { outlineStyle: 'none' } as any]}
                      placeholder="0"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="numeric"
                      value={minPriceInput}
                      onChangeText={setMinPriceInput}
                    />
                    <Text style={styles.priceInputUnit}>đ</Text>
                  </View>

                  <Text style={styles.priceInputDash}>-</Text>

                  <View style={styles.priceInputBox}>
                    <Text style={styles.priceInputLabel}>Đến</Text>
                    <TextInput
                      style={[styles.priceInput, { outlineStyle: 'none' } as any]}
                      placeholder="Tối đa"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="numeric"
                      value={maxPriceInput}
                      onChangeText={setMaxPriceInput}
                    />
                    <Text style={styles.priceInputUnit}>đ</Text>
                  </View>
                </View>

                {/* Quick Presets */}
                <View style={styles.pricePresetsRow}>
                  {PRICE_PRESETS.map((preset, idx) => {
                    const isSelected =
                      minPriceInput === preset.min && maxPriceInput === preset.max;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.pricePresetBtn, isSelected && styles.pricePresetActive]}
                        onPress={() => {
                          if (isSelected) {
                            setMinPriceInput('');
                            setMaxPriceInput('');
                          } else {
                            setMinPriceInput(preset.min);
                            setMaxPriceInput(preset.max);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.pricePresetText,
                            isSelected && styles.pricePresetTextActive,
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 3. Lọc theo Thương hiệu */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Thương hiệu</Text>
                <View style={styles.brandList}>
                  {availableBrands.slice(0, 15).map((b) => {
                    const isSelected = selectedBrands.includes(b.id);
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[styles.brandItem, isSelected && styles.brandItemActive]}
                        onPress={() => toggleBrand(b.id)}
                      >
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={18}
                          color={isSelected ? theme.colors.primary : theme.colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.brandItemText,
                            isSelected && styles.brandItemTextActive,
                          ]}
                        >
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 4. Lọc theo Đánh giá */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Đánh giá chất lượng</Text>
                <View style={styles.ratingRowSelect}>
                  {[
                    { star: 0, label: 'Tất cả' },
                    { star: 4.5, label: 'Từ 4.5★' },
                    { star: 4.0, label: 'Từ 4.0★' },
                    { star: 3.5, label: 'Từ 3.5★' },
                  ].map((item) => {
                    const isSelected = minRating === item.star;
                    return (
                      <TouchableOpacity
                        key={item.star}
                        style={[styles.ratingPill, isSelected && styles.ratingPillActive]}
                        onPress={() => setMinRating(item.star)}
                      >
                        {item.star > 0 && (
                          <Ionicons
                            name="star"
                            size={13}
                            color={isSelected ? '#FFF' : '#F59E0B'}
                          />
                        )}
                        <Text
                          style={[
                            styles.ratingPillText,
                            isSelected && styles.ratingPillTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer CTA */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.applyFilterBtn}
                activeOpacity={0.9}
                onPress={applyFilters}
              >
                <Ionicons name="checkmark" size={18} color="#FFF" />
                <Text style={styles.applyFilterBtnText}>Áp dụng bộ lọc</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#FFF8F6',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#EFE5E7',
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#281811',
    paddingVertical: 0,
    borderWidth: 0,
  },
  clearBtn: {
    padding: 4,
  },
  sortTriggerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#EFE5E7',
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  sortActiveBtn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#281811',
  },
  clearAllText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFE5E7',
    gap: 6,
  },
  historyChipText: {
    fontSize: 13,
    color: '#554244',
  },
  chipRemoveBtn: {
    marginLeft: 2,
  },
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  suggestedCardWrapper: {
    width: (width - 40) / 2,
    marginBottom: 12,
  },

  // AUTOCOMPLETE POPUP OVERLAY
  suggestionsPopupOverlay: {
    position: 'absolute',
    top: 64,
    left: 16,
    right: 16,
    maxHeight: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFE5E7',
    shadowColor: '#281811',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 999,
    overflow: 'hidden',
  },
  suggestionsPopupScroll: {
    padding: 12,
  },

  // RESULTS
  resultContainer: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultCount: {
    fontSize: 13,
    color: '#725950',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortChipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    maxWidth: 110,
  },
  filterChipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  filterChipButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  productList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCard: {
    width: (width - 40) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3E9EB',
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  imageWrapper: {
    width: '100%',
    height: 150,
    backgroundColor: '#F8EFF1',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
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
  wishlistBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    padding: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  brandText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#281811',
    lineHeight: 17,
    marginTop: 2,
    minHeight: 34,
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 8,
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
  addCartBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#281811',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  // MODAL BOTTOM SHEET
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(40, 24, 17, 0.45)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3E9EB',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DBC0C3',
    marginBottom: 10,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#281811',
  },
  resetFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  filterGroup: {
    marginBottom: 20,
  },
  filterGroupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#281811',
    marginBottom: 10,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFAFC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterPillText: {
    fontSize: 13,
    color: '#554244',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Price inputs
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  priceInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFAFC',
    borderWidth: 1,
    borderColor: '#EFE5E7',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 42,
  },
  priceInputLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    fontSize: 13,
    color: '#281811',
    paddingVertical: 0,
    borderWidth: 0,
  },
  priceInputUnit: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  priceInputDash: {
    fontSize: 16,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  pricePresetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pricePresetBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#FEFAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  pricePresetActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pricePresetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#554244',
  },
  pricePresetTextActive: {
    color: '#FFFFFF',
  },
  brandList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: '#FEFAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EFE5E7',
    gap: 6,
  },
  brandItemActive: {
    backgroundColor: '#FDEEEF',
    borderColor: '#F3DCE1',
  },
  brandItemText: {
    fontSize: 12,
    color: '#281811',
  },
  brandItemTextActive: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  ratingRowSelect: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFE5E7',
    gap: 4,
  },
  ratingPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  ratingPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#554244',
  },
  ratingPillTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  applyFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    height: 46,
    borderRadius: 14,
    gap: 6,
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  applyFilterBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // SORT MODAL STYLES
  sortListContainer: {
    paddingVertical: 8,
  },
  sortItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  sortItemRowActive: {
    backgroundColor: '#FDF2F4',
  },
  sortItemLabel: {
    fontSize: 14,
    color: '#281811',
    fontWeight: '500',
  },
  sortItemLabelActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },

  // SUGGESTIONS IN OVERLAY
  suggestionSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  suggestionSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  suggestionIconWrapper: {
    width: 24,
    alignItems: 'center',
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  brandHintChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FDF2F4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCE7EB',
  },
  brandHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  productHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  productHintThumb: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  productHintInfo: {
    flex: 1,
  },
  productHintName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  productHintPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  directSearchPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCE7EB',
    marginTop: 4,
    marginBottom: 10,
  },
  directSearchPromptText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
