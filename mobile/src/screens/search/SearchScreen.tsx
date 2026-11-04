import React, { useState } from 'react';
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
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { productApi } from '../../api/productApi';
import { useCartStore } from '../../store/useCartStore';

const { width } = Dimensions.get('window');

// Mock data cho fallback khi offline hoặc search chưa có kết quả backend
const MOCK_SEARCH_PRODUCTS = [
  {
    id: 'prod-s-1',
    name: 'GlowUp Radiance C-Serum 30ml',
    brand: 'GLOWUP LAB',
    price: 485000,
    originalPrice: 650000,
    rating: 4.9,
    reviewsCount: 1250,
    badge: 'Best Seller',
    tag: 'Sáng da & Mờ thâm',
    category: 'Serum',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPXszzaZJ-CKUqKGl1J4deKZphZWEeI5wLZcRF4oEpOzXUO9ILg594tMOGfQ7aDAnD95tHnThxQrBtzkasEPGicqQ1T7NExYkLEEnizjxYjw7DGhSJlCXq1vuTPjO9ypCl0NS-S1IpwTFIxWBzMPYyKUoBL_brngE8FpEkY-UBKyrw1En0aY17KO3r3ggQqtFpdaM8_nf_Fh4rkRtTc8DxrF0NWl13rvId3Y6KNw4IfnB9rLDDho7jaA',
  },
  {
    id: 'prod-s-2',
    name: 'Glass Skin Barrier Cream 50g',
    brand: 'GLOWUP LAB',
    price: 390000,
    originalPrice: 450000,
    rating: 4.8,
    reviewsCount: 860,
    badge: 'Clean 100%',
    tag: 'Phục hồi & Khóa ẩm',
    category: 'Kem dưỡng',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFoJz9_e_s-F6Qp7q_U-y5g3RjK4o0LzYd5z3aX7wV5t3v1L7s_9m4q_WAoKCYLRFBkJ4vw',
  },
  {
    id: 'prod-s-3',
    name: 'Hydrating Petal Toner Mist 150ml',
    brand: 'ANUA',
    price: 295000,
    originalPrice: 350000,
    rating: 4.7,
    reviewsCount: 420,
    badge: 'Thuần chay',
    tag: 'Cấp ẩm sâu',
    category: 'Toner',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPXszzaZJ-CKUqKGl1J4deKZphZWEeI5wLZcRF4oEpOzXUO9ILg594tMOGfQ7aDAnD95tHnThxQrBtzkasEPGicqQ1T7NExYkLEEnizjxYjw7DGhSJlCXq1vuTPjO9ypCl0NS-S1IpwTFIxWBzMPYyKUoBL_brngE8FpEkY-UBKyrw1En0aY17KO3r3ggQqtFpdaM8_nf_Fh4rkRtTc8DxrF0NWl13rvId3Y6KNw4IfnB9rLDDho7jaA',
  },
  {
    id: 'prod-s-4',
    name: 'Velvet Cloud Matte Lipstick #04 Rosewood',
    brand: '3CE',
    price: 340000,
    originalPrice: 390000,
    rating: 4.9,
    reviewsCount: 2100,
    badge: 'Trending',
    tag: 'Lâu trôi',
    category: 'Son môi',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFoJz9_e_s-F6Qp7q_U-y5g3RjK4o0LzYd5z3aX7wV5t3v1L7s_9m4q_WAoKCYLRFBkJ4vw',
  },
  {
    id: 'prod-s-5',
    name: 'Anthelios UV Mune 400 Oil Control 50ml',
    brand: "LA ROCHE-POSAY",
    price: 495000,
    originalPrice: 535000,
    rating: 4.9,
    reviewsCount: 3500,
    badge: 'Bác sĩ khuyên dùng',
    tag: 'Kiềm dầu 12H',
    category: 'Chống nắng',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPXszzaZJ-CKUqKGl1J4deKZphZWEeI5wLZcRF4oEpOzXUO9ILg594tMOGfQ7aDAnD95tHnThxQrBtzkasEPGicqQ1T7NExYkLEEnizjxYjw7DGhSJlCXq1vuTPjO9ypCl0NS-S1IpwTFIxWBzMPYyKUoBL_brngE8FpEkY-UBKyrw1En0aY17KO3r3ggQqtFpdaM8_nf_Fh4rkRtTc8DxrF0NWl13rvId3Y6KNw4IfnB9rLDDho7jaA',
  },
];

const TRENDING_KEYWORDS = [
  'Serum B5 phục hồi',
  'Kem chống nắng nâng tone',
  'Son bóng Jelly',
  'Retinol cho da nhạy cảm',
  'Toner Pad diếp cá',
];

const SKIN_CONCERNS = [
  { id: 'acne', label: 'Mụn & Thâm' },
  { id: 'bright', label: 'Làm sáng & Đều màu' },
  { id: 'barrier', label: 'Phục hồi hàng rào' },
  { id: 'antiaging', label: 'Chống lão hóa' },
  { id: 'dry', label: 'Cấp ẩm sâu' },
];

const PRICE_PRESETS = [
  { label: 'Dưới 300k', min: 0, max: 300000 },
  { label: '300k - 600k', min: 300000, max: 600000 },
  { label: 'Trên 600k', min: 600000, max: 5000000 },
];

const BRANDS = ['GlowUp Lab', "La Roche-Posay", 'Anua', '3CE', 'Innisfree', 'Paula’s Choice'];

export default function SearchScreen({ navigation }: any) {
  const [keyword, setKeyword] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Serum Vitamin C',
    'Kem chống nắng kiềm dầu',
    'Son dưỡng thuần chay',
  ]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(MOCK_SEARCH_PRODUCTS);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Filter States
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [selectedPricePreset, setSelectedPricePreset] = useState<number | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);

  const addItem = useCartStore((s) => s.addItem);

  const formatPrice = (val: number) => {
    return val.toLocaleString('vi-VN') + '₫';
  };

  const handleSearch = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : keyword).trim();
    if (!q) return;

    setKeyword(q);
    setHasSearched(true);
    setIsLoading(true);

    // Lưu vào lịch sử tìm kiếm (không trùng lặp, tối đa 8 mục)
    setRecentSearches((prev) => [q, ...prev.filter((item) => item !== q)].slice(0, 8));

    try {
      const res = await productApi.searchProducts(q);
      const apiItems = res?.data || res || [];
      if (Array.isArray(apiItems) && apiItems.length > 0) {
        setResults(
          apiItems.map((item: any) => ({
            id: item.id || `prod-${item.slug}`,
            name: item.name,
            brand: item.brand?.name || 'GlowUp',
            price: Number(item.price) || 350000,
            originalPrice: Number(item.original_price) || Number(item.price) * 1.2,
            rating: 4.8,
            reviewsCount: 120,
            badge: item.badge || 'Mới',
            tag: item.category?.name || 'Skincare',
            category: item.category?.name || 'Mỹ phẩm',
            image: item.thumbnail || item.images?.[0]?.url || MOCK_SEARCH_PRODUCTS[0].image,
          }))
        );
      } else {
        // Fallback filter trên mock data
        const filtered = MOCK_SEARCH_PRODUCTS.filter(
          (p) =>
            p.name.toLowerCase().includes(q.toLowerCase()) ||
            p.brand.toLowerCase().includes(q.toLowerCase()) ||
            p.tag.toLowerCase().includes(q.toLowerCase())
        );
        setResults(filtered.length > 0 ? filtered : MOCK_SEARCH_PRODUCTS);
      }
    } catch {
      // Offline fallback
      const filtered = MOCK_SEARCH_PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.brand.toLowerCase().includes(q.toLowerCase()) ||
          p.tag.toLowerCase().includes(q.toLowerCase())
      );
      setResults(filtered.length > 0 ? filtered : MOCK_SEARCH_PRODUCTS);
    } finally {
      setIsLoading(false);
    }
  };

  const removeHistoryItem = (itemToRemove: string) => {
    setRecentSearches((prev) => prev.filter((item) => item !== itemToRemove));
  };

  const clearAllHistory = () => {
    setRecentSearches([]);
  };

  const toggleConcern = (id: string) => {
    setSelectedConcerns((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleBrand = (brandName: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandName) ? prev.filter((b) => b !== brandName) : [...prev, brandName]
    );
  };

  const applyFilters = () => {
    setFilterModalVisible(false);
    setIsLoading(true);
    setTimeout(() => {
      let filtered = [...MOCK_SEARCH_PRODUCTS];

      if (selectedBrands.length > 0) {
        filtered = filtered.filter((p) =>
          selectedBrands.some((b) => p.brand.toLowerCase() === b.toLowerCase())
        );
      }

      if (selectedPricePreset !== null) {
        const preset = PRICE_PRESETS[selectedPricePreset];
        filtered = filtered.filter((p) => p.price >= preset.min && p.price <= preset.max);
      }

      if (minRating > 0) {
        filtered = filtered.filter((p) => p.rating >= minRating);
      }

      setResults(filtered);
      setIsLoading(false);
      setHasSearched(true);
    }, 300);
  };

  const resetFilters = () => {
    setSelectedConcerns([]);
    setSelectedPricePreset(null);
    setSelectedBrands([]);
    setMinRating(0);
  };

  const handleAddToCart = (product: any) => {
    addItem({
      id: product.id,
      variantId: `var-${product.id}`,
      productId: product.id,
      productName: product.name,
      variantName: 'Tiêu chuẩn',
      price: product.price,
      originalPrice: product.originalPrice,
      imageUrl: product.image,
      stock: 50,
    });
  };

  const renderProductItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.productCard}
      activeOpacity={0.88}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id, slug: item.id })}
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER: Search Bar & Actions */}
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
            style={styles.input}
            placeholder="Tìm kiếm serum, son, kem chống nắng..."
            placeholderTextColor={theme.colors.textMuted}
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
            autoFocus={false}
          />
          {keyword.length > 0 && (
            <TouchableOpacity onPress={() => setKeyword('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.filterTriggerBtn,
            (selectedBrands.length > 0 || selectedPricePreset !== null || selectedConcerns.length > 0) &&
              styles.filterActiveBtn,
          ]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Feather
            name="sliders"
            size={18}
            color={
              selectedBrands.length > 0 || selectedPricePreset !== null || selectedConcerns.length > 0
                ? '#FFF'
                : theme.colors.primary
            }
          />
        </TouchableOpacity>
      </View>

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
            <TouchableOpacity
              style={styles.filterChipButton}
              onPress={() => setFilterModalVisible(true)}
            >
              <Text style={styles.filterChipText}>Bộ lọc</Text>
              <Ionicons name="filter" size={12} color={theme.colors.primary} />
            </TouchableOpacity>
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
        // DEFAULT DISCOVERY VIEW
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

          {/* Xu hướng tìm kiếm */}
          <View style={styles.section}>
            <View style={styles.titleWithIcon}>
              <Feather name="trending-up" size={16} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Xu hướng làm đẹp thịnh hành</Text>
            </View>

            <View style={styles.chipsContainer}>
              {TRENDING_KEYWORDS.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.trendingChip}
                  onPress={() => handleSearch(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.trendingRank}>0{idx + 1}</Text>
                  <Text style={styles.trendingChipText}>{item}</Text>
                  <Ionicons name="arrow-forward" size={12} color={theme.colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Banner Routine Skincare */}
          <View style={styles.editorialBanner}>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>ROSE BERRY EDITORIAL</Text>
            </View>
            <Text style={styles.bannerTitle}>Glass Skin 4-Step Routine</Text>
            <Text style={styles.bannerDesc}>
              Khám phá quy trình phục hồi và tái sinh làn da căng bóng mịn chuẩn Hàn Quốc cùng chuyên gia.
            </Text>
            <TouchableOpacity
              style={styles.bannerBtn}
              onPress={() => handleSearch('Glass Skin')}
            >
              <Text style={styles.bannerBtnText}>Xem bộ sưu tập</Text>
              <Ionicons name="chevron-forward" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Gợi ý cho bạn */}
          <View style={[styles.section, { marginBottom: 40 }]}>
            <Text style={styles.sectionTitle}>Sản phẩm gợi ý cho bạn</Text>
            <View style={styles.suggestedGrid}>
              {MOCK_SEARCH_PRODUCTS.slice(0, 4).map((p) => (
                <View key={p.id} style={styles.suggestedCardWrapper}>
                  {renderProductItem({ item: p })}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* FILTER BOTTOM SHEET MODAL */}
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
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.dragHandle} />
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>Bộ lọc nâng cao</Text>
                <TouchableOpacity onPress={resetFilters}>
                  <Text style={styles.resetFilterText}>Thiết lập lại</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.filterScroll} showsVerticalScrollIndicator={false}>
              {/* Vấn đề da & Nhu cầu */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Nhu cầu làn da</Text>
                <View style={styles.chipsContainer}>
                  {SKIN_CONCERNS.map((c) => {
                    const isSelected = selectedConcerns.includes(c.id);
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.filterPill, isSelected && styles.filterPillActive]}
                        onPress={() => toggleConcern(c.id)}
                      >
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'add'}
                          size={15}
                          color={isSelected ? '#FFF' : theme.colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.filterPillText,
                            isSelected && styles.filterPillTextActive,
                          ]}
                        >
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Khoảng giá */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Khoảng giá phù hợp</Text>
                <View style={styles.pricePresetsRow}>
                  {PRICE_PRESETS.map((preset, idx) => {
                    const isSelected = selectedPricePreset === idx;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.pricePresetBtn, isSelected && styles.pricePresetActive]}
                        onPress={() => setSelectedPricePreset(isSelected ? null : idx)}
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

              {/* Thương hiệu */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Thương hiệu tuyển chọn</Text>
                <View style={styles.brandList}>
                  {BRANDS.map((b) => {
                    const isSelected = selectedBrands.includes(b);
                    return (
                      <TouchableOpacity
                        key={b}
                        style={[styles.brandItem, isSelected && styles.brandItemActive]}
                        onPress={() => toggleBrand(b)}
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
                          {b}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Đánh giá sao */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Đánh giá chất lượng</Text>
                <View style={styles.ratingRowSelect}>
                  {[4.5, 4.0, 3.5].map((star) => {
                    const isSelected = minRating === star;
                    return (
                      <TouchableOpacity
                        key={star}
                        style={[styles.ratingPill, isSelected && styles.ratingPillActive]}
                        onPress={() => setMinRating(isSelected ? 0 : star)}
                      >
                        <Ionicons
                          name="star"
                          size={14}
                          color={isSelected ? '#FFF' : '#F59E0B'}
                        />
                        <Text
                          style={[
                            styles.ratingPillText,
                            isSelected && styles.ratingPillTextActive,
                          ]}
                        >
                          Từ {star}★
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
  },
  clearBtn: {
    padding: 4,
  },
  filterTriggerBtn: {
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
  filterActiveBtn: {
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
    marginBottom: 10,
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
  trendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFE5E7',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 4,
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  trendingRank: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    width: 24,
  },
  trendingChipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#281811',
  },
  editorialBanner: {
    marginTop: 20,
    backgroundColor: '#FAF0F2',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3DCE1',
  },
  bannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  bannerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#281811',
    marginBottom: 4,
  },
  bannerDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: '#725950',
    marginBottom: 12,
  },
  bannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  bannerBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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
  filterChipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
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
    maxHeight: '82%',
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
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFE5E7',
    gap: 4,
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
  pricePresetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pricePresetBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#FEFAFC',
    borderRadius: 12,
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
    gap: 8,
  },
  brandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FEFAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EFE5E7',
    gap: 8,
  },
  brandItemActive: {
    backgroundColor: '#FDEEEF',
    borderColor: '#F3DCE1',
  },
  brandItemText: {
    fontSize: 13,
    color: '#281811',
  },
  brandItemTextActive: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  ratingRowSelect: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFAFC',
    paddingHorizontal: 14,
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
});
