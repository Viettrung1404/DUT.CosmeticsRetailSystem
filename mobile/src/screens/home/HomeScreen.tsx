import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import apiClient from '../../api/apiClient';
import { useAuthStore } from '../../store/useAuthStore';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Tất cả');

  const categories = [
    { id: '1', name: 'Tất cả', icon: 'sparkles-outline' },
    { id: '2', name: 'Chăm sóc da', icon: 'water-outline' },
    { id: '3', name: 'Son môi', icon: 'color-palette-outline' },
    { id: '4', name: 'Chống nắng', icon: 'sunny-outline' },
    { id: '5', name: 'Trang điểm', icon: 'brush-outline' },
  ];

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/products');
      setProducts(res.data.data || res.data || []);
    } catch (error) {
      // Dữ liệu mẫu hiển thị khi Backend chưa bật
      setProducts([
        {
          id: '1',
          name: 'GlowUp Vitamin C Serum 30ml',
          brand: 'GlowUp Beauty',
          price: 350000,
          original_price: 450000,
          rating: 4.9,
          slug: 'glowup-vitamin-c-serum',
          image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
        },
        {
          id: '2',
          name: 'Kem Chống Nắng Hydra Barrier',
          brand: 'La Roche-Posay',
          price: 420000,
          original_price: 490000,
          rating: 4.8,
          slug: 'hydra-barrier-sunscreen',
          image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
        },
        {
          id: '3',
          name: 'Son Dưỡng Rose Velvet Lip Balm',
          brand: 'MAC Cosmetics',
          price: 480000,
          original_price: 550000,
          rating: 5.0,
          slug: 'mac-rose-velvet',
          image_url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400',
        },
        {
          id: '4',
          name: 'Nước Tẩy Trang Micellar Water',
          brand: "L'Oréal Paris",
          price: 180000,
          original_price: 220000,
          rating: 4.7,
          slug: 'loreal-micellar',
          image_url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderProductCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { slug: item.slug })}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image_url }} style={styles.productImage} />
        <TouchableOpacity style={styles.wishlistBtn}>
          <Ionicons name="heart-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.brandText}>{item.brand}</Text>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color="#FFD700" />
          <Text style={styles.ratingText}>{item.rating || '4.9'}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>{item.price?.toLocaleString('vi-VN')}đ</Text>
          {item.original_price && (
            <Text style={styles.oldPriceText}>{item.original_price?.toLocaleString('vi-VN')}đ</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>Xin chào ✨</Text>
          <Text style={styles.userName}>{user?.full_name || 'Khách hàng GlowUp'}</Text>
        </View>
        <TouchableOpacity style={styles.iconBadgeBtn} onPress={() => navigation.navigate('Giỏ hàng')}>
          <Ionicons name="bag-handle-outline" size={24} color={COLORS.textPrimary} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 2. Search Bar */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => navigation.navigate('Search')}
        activeOpacity={0.9}
      >
        <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
        <Text style={styles.searchPlaceholder}>Tìm kiếm serum, son môi, kem chống nắng...</Text>
        <Ionicons name="options-outline" size={18} color={COLORS.primary} />
      </TouchableOpacity>

      {/* 3. Hero Banner Carousel */}
      <View style={styles.heroBanner}>
        <View style={styles.bannerContent}>
          <View style={styles.saleTag}>
            <Text style={styles.saleTagText}>FLASH SALE -40%</Text>
          </View>
          <Text style={styles.bannerTitle}>Bộ Sản Phẩm{'\n'}Rạng Rỡ Đón Hè</Text>
          <TouchableOpacity style={styles.shopNowBtn} onPress={() => navigation.navigate('Danh mục')}>
            <Text style={styles.shopNowText}>Mua ngay</Text>
            <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400' }}
          style={styles.bannerImage}
        />
      </View>

      {/* 4. Category Chips */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Danh mục nổi bật</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContainer}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryChip, activeCategory === cat.name && styles.activeCategoryChip]}
            onPress={() => setActiveCategory(cat.name)}
          >
            <Ionicons
              name={cat.icon as any}
              size={16}
              color={activeCategory === cat.name ? COLORS.surface : COLORS.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.categoryText, activeCategory === cat.name && styles.activeCategoryText]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 5. Featured Products Grid */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Gợi ý cho bạn ✨</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Danh mục')}>
          <Text style={styles.seeAllText}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 30 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProductCard}
          numColumns={2}
          scrollEnabled={false}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.gridContainer}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: SPACING.xl + 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  greetingText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  iconBadgeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    paddingHorizontal: SPACING.md,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  searchPlaceholder: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 13,
    marginLeft: SPACING.sm,
  },
  heroBanner: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    borderRadius: 20,
    padding: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  bannerContent: {
    flex: 1,
  },
  saleTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: SPACING.xs,
  },
  saleTagText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  bannerTitle: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  shopNowBtn: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 20,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopNowText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 4,
  },
  bannerImage: {
    width: 100,
    height: 110,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  seeAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  categoryContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm - 2,
    borderRadius: 20,
    marginRight: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeCategoryChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  activeCategoryText: {
    color: COLORS.surface,
    fontWeight: 'bold',
  },
  gridContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  productCard: {
    width: (width - SPACING.md * 2 - SPACING.md) / 2,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.xs + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 130,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  wishlistBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    paddingTop: SPACING.xs,
  },
  brandText: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginVertical: 2,
    height: 34,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: 6,
  },
  oldPriceText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
});