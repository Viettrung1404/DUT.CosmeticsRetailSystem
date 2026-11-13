import React, { useEffect, useRef, useState } from 'react';
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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../../constants/theme';
import {
  productApi,
  extractProductList,
  extractCategoryTree,
  NormalizedProduct,
} from '../../api/productApi';
import { useCartStore } from '../../store/useCartStore';

const { width: WINDOW_WIDTH } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
  slug?: string;
  imageUrl?: string;
  icon: string;
}

interface Product {
  id: string;
  slug?: string;
  name: string;
  brand?: string;
  brandName?: string;
  basePrice?: number;
  salePrice?: number;
  price?: number;
  original_price?: number;
  imageUrl?: string;
  image_url?: string;
  rating?: number;
  avgRating?: number;
  totalReviews?: number;
  reviews_count?: number;
}

// ─── Hero Banner data ────────────────────────────────────────────────────────
const BANNERS = [
  {
    key: 'glowup-main',
    tag: 'BỘ SƯU TẬP GLOWUP',
    title: 'Sắc Đẹp\nTheo Cách Của Bạn',
    subtitle: 'Khám phá thế giới mỹ phẩm và chăm sóc da.',
    btnLabel: 'Khám phá ngay',
    bg: 'rgba(40,24,17,0.88)',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80',
  },
  {
    key: 'suncare',
    tag: 'BRIGHT & PROTECTED',
    title: 'Chống Nắng\nSPF50+ & Serum C',
    subtitle: 'Bảo vệ làn da khỏi tia UV cả ngày dài.',
    btnLabel: 'Mua ngay',
    bg: 'rgba(180,100,30,0.80)',
    image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80',
  },
  {
    key: 'party-makeup',
    tag: 'GLOWUP MAKEUP',
    title: 'Sắc Son Velvet\nDạ Tiệc Huyền Ảo',
    subtitle: 'Tìm sắc son phù hợp với phong cách của bạn.',
    btnLabel: 'Khám phá',
    bg: 'rgba(71,16,42,0.85)',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
  },
];

// ─── Trust Badges ─────────────────────────────────────────────────────────────
const TRUST_ITEMS = [
  { icon: 'shield-checkmark-outline', title: 'Chính Hãng 100%', sub: 'Cam kết chất lượng' },
  { icon: 'car-outline', title: 'Giao Hàng Nhanh', sub: 'Theo dõi đơn dễ dàng' },
  { icon: 'star-outline', title: 'Tích Điểm Rewards', sub: 'Ưu đãi thành viên VIP' },
];

// ─── Skin Concerns ─────────────────────────────────────────────────────────
const SKIN_CONCERNS = [
  { icon: 'water-outline', title: 'Dưỡng ẩm sâu', tag: 'dưỡng ẩm' },
  { icon: 'sparkles-outline', title: 'Kiềm dầu & Lỗ chân lông', tag: 'kiềm dầu' },
  { icon: 'heart-outline', title: 'Phục hồi nhạy cảm', tag: 'phục hồi' },
  { icon: 'sunny-outline', title: 'Làm sáng & Mờ thâm', tag: 'làm sáng' },
  { icon: 'time-outline', title: 'Chống lão hóa', tag: 'chống lão hóa' },
];

const CAT_ICONS: Record<string, string> = {
  'chăm sóc da': 'water-outline',
  'skincare': 'water-outline',
  'son môi': 'color-palette-outline',
  'makeup': 'brush-outline',
  'trang điểm': 'brush-outline',
  'chống nắng': 'sunny-outline',
  'nước hoa': 'cloud-outline',
  'tóc': 'cut-outline',
  default: 'sparkles-outline',
};

function getCatIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const key of Object.keys(CAT_ICONS)) {
    if (lower.includes(key)) return CAT_ICONS[key];
  }
  return CAT_ICONS.default;
}

function formatPrice(val?: number): string {
  if (!val) return '';
  return val.toLocaleString('vi-VN') + 'đ';
}

// ─── SectionTitle Component ──────────────────────────────────────────────────
function SectionTitle({
  eyebrow,
  title,
  onSeeAll,
}: {
  eyebrow?: string;
  title: string;
  onSeeAll?: () => void;
}) {
  return (
    <View style={sectionStyles.row}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={sectionStyles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={sectionStyles.title}>{title}</Text>
      </View>
      {onSeeAll ? (
        <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={sectionStyles.seeAll}>Xem tất cả →</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  seeAll: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

// ─── HeroBannerCarousel ───────────────────────────────────────────────────────
function HeroBannerCarousel({ onShop }: { onShop: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [layoutWidth, setLayoutWidth] = useState(WINDOW_WIDTH);
  const scrollRef = useRef<any>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (activeIndex + 1) % BANNERS.length;
      setActiveIndex(next);
      scrollRef.current?.scrollTo({ x: next * layoutWidth, animated: true });
    }, 4500);
    return () => clearInterval(timer);
  }, [activeIndex, layoutWidth]);

  return (
    <View
      style={heroStyles.wrapper}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && w !== layoutWidth) setLayoutWidth(w);
      }}
    >
      <ScrollView
        ref={scrollRef as any}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / layoutWidth);
          setActiveIndex(idx);
        }}
      >
        {BANNERS.map((b) => (
          <View key={b.key} style={[heroStyles.slide, { width: layoutWidth }]}>
            <Image source={{ uri: b.image }} style={heroStyles.bgImage} />
            <View style={[heroStyles.overlay, { backgroundColor: b.bg }]} />
            <View style={heroStyles.content}>
              <View style={heroStyles.tag}>
                <Ionicons name="sparkles-outline" size={11} color="#fff" />
                <Text style={heroStyles.tagText}> {b.tag}</Text>
              </View>
              <Text style={heroStyles.title}>{b.title}</Text>
              <Text style={heroStyles.sub}>{b.subtitle}</Text>
              <View style={heroStyles.actions}>
                <TouchableOpacity style={heroStyles.primaryBtn} onPress={onShop} activeOpacity={0.85}>
                  <Text style={heroStyles.primaryBtnText}>{b.btnLabel}</Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={heroStyles.ghostBtn} onPress={onShop} activeOpacity={0.85}>
                  <Text style={heroStyles.ghostBtnText}>Xem ưu đãi</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      {/* Indicator Dots */}
      <View style={heroStyles.dots}>
        {BANNERS.map((_, i) => (
          <TouchableOpacity
            key={i}
            style={[heroStyles.dot, activeIndex === i && heroStyles.dotActive]}
            onPress={() => {
              setActiveIndex(i);
              scrollRef.current?.scrollTo({ x: i * layoutWidth, animated: true });
            }}
          />
        ))}
      </View>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  wrapper: { width: '100%', height: 260, marginBottom: SPACING.md, overflow: 'hidden' },
  slide: { height: 260, position: 'relative' },
  bgImage: { width: '100%', height: '100%', resizeMode: 'cover', position: 'absolute' },
  overlay: { width: '100%', height: '100%', position: 'absolute' },
  content: { flex: 1, justifyContent: 'flex-end', padding: SPACING.md, paddingBottom: 24 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  tagText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 28, marginBottom: 4 },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginBottom: 12 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 10,
  },
  primaryBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 12, marginRight: 4 },
  ghostBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ghostBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  dots: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)', marginHorizontal: 3 },
  dotActive: { backgroundColor: '#fff', width: 18 },
});

// ─── TrustBadges ─────────────────────────────────────────────────────────────
function TrustBadges() {
  return (
    <View style={trustStyles.row}>
      {TRUST_ITEMS.map((it) => (
        <View key={it.icon} style={trustStyles.item}>
          <View style={trustStyles.iconWrap}>
            <Ionicons name={it.icon as any} size={20} color={COLORS.primary} />
          </View>
          <Text style={trustStyles.title}>{it.title}</Text>
          <Text style={trustStyles.sub}>{it.sub}</Text>
        </View>
      ))}
    </View>
  );
}

const trustStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.md,
  },
  item: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    ...SHADOWS.soft,
  },
  title: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 2 },
  sub: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },
});

// ─── CategoryCards ────────────────────────────────────────────────────────────
function CategoryCards({ categories, onPress }: { categories: Category[]; onPress: (c: Category) => void }) {
  const display = categories.slice(0, 6);
  return (
    <View style={catCardStyles.grid}>
      {display.map((cat) => (
        <TouchableOpacity key={cat.id} style={catCardStyles.card} onPress={() => onPress(cat)} activeOpacity={0.85}>
          <View style={catCardStyles.iconBox}>
            <Ionicons name={cat.icon as any} size={26} color={COLORS.primary} />
          </View>
          <Text style={catCardStyles.name} numberOfLines={2}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const catCardStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  card: {
    width: '31.5%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    ...SHADOWS.soft,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: { fontSize: 11, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center', lineHeight: 14 },
});

// ─── FlashDealBanner ─────────────────────────────────────────────────────────
function FlashDealBanner({ onPress }: { onPress: () => void }) {
  const [secs, setSecs] = useState(3600 * 4 + 23 * 60 + 15);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');

  return (
    <TouchableOpacity style={flashStyles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={{ flex: 1, paddingRight: 6 }}>
        <Text style={flashStyles.kicker}>ƯU ĐÃI DÀNH CHO BẠN</Text>
        <Text style={flashStyles.heading}>DEAL ĐẸP CÓ HẠN ⚡</Text>
      </View>
      <View style={flashStyles.timerRow}>
        {[h, m, s].map((unit, i) => (
          <React.Fragment key={i}>
            <View style={flashStyles.timeBox}>
              <Text style={flashStyles.timeNum}>{unit}</Text>
            </View>
            {i < 2 && <Text style={flashStyles.colon}>:</Text>}
          </React.Fragment>
        ))}
      </View>
      <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );
}

const flashStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    borderRadius: 16,
    padding: SPACING.sm + 4,
    marginBottom: SPACING.md,
  },
  kicker: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heading: { fontSize: 14, fontWeight: '900', color: '#fff' },
  timerRow: { flexDirection: 'row', alignItems: 'center' },
  timeBox: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 6,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeNum: { color: '#fff', fontWeight: '800', fontSize: 12 },
  colon: { color: '#fff', fontWeight: '900', fontSize: 14, marginHorizontal: 2 },
});

// ─── ProductCard ─────────────────────────────────────────────────────────────
function ProductCard({ item, onPress }: { item: Product; onPress: () => void }) {
  const image =
    item.imageUrl ||
    item.image_url ||
    'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400';
  const brand = item.brandName || item.brand || 'GlowUp';
  const price = item.salePrice ?? item.basePrice ?? item.price ?? 0;
  const originalPrice = item.basePrice ?? item.original_price;
  const rating = item.avgRating ?? item.rating ?? 5.0;
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <TouchableOpacity style={prodCardStyles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={prodCardStyles.imgWrapper}>
        <Image source={{ uri: image }} style={prodCardStyles.img} />
        {hasDiscount && discountPercent > 0 ? (
          <View style={prodCardStyles.saleBadge}>
            <Text style={prodCardStyles.saleBadgeText}>-{discountPercent}%</Text>
          </View>
        ) : null}
      </View>
      <View style={prodCardStyles.info}>
        <Text style={prodCardStyles.brand}>{brand.toUpperCase()}</Text>
        <Text style={prodCardStyles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={prodCardStyles.ratingRow}>
          <Ionicons name="star" size={11} color="#FFD700" />
          <Text style={prodCardStyles.ratingTxt}>{rating.toFixed(1)}</Text>
        </View>
        <View style={prodCardStyles.priceRow}>
          <Text style={prodCardStyles.price}>{formatPrice(price)}</Text>
          {originalPrice && originalPrice > price ? (
            <Text style={prodCardStyles.oldPrice}>{formatPrice(originalPrice)}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const PROD_CARD_W = 145;

const prodCardStyles = StyleSheet.create({
  card: {
    width: PROD_CARD_W,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  imgWrapper: {
    width: '100%',
    height: 125,
    backgroundColor: COLORS.surfaceContainer,
    position: 'relative',
  },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  saleBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  saleBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  info: { padding: SPACING.xs + 3 },
  brand: { fontSize: 8, color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: 2 },
  name: { fontSize: 11, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 15, marginBottom: 3, height: 30 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  ratingTxt: { fontSize: 10, color: COLORS.textMuted, marginLeft: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  price: { fontSize: 13, fontWeight: '800', color: COLORS.primary, marginRight: 4 },
  oldPrice: { fontSize: 10, color: COLORS.textMuted, textDecorationLine: 'line-through' },
});

// ─── EditorialCards ───────────────────────────────────────────────────────────
function EditorialCards({ onPress }: { onPress: () => void }) {
  const cards = [
    {
      tag: 'CHĂM SÓC DA',
      title: 'Bắt Đầu Từ\nLàn Da Khỏe',
      sub: 'Lắng nghe làn da mỗi ngày',
      bg: 'rgba(34,29,35,0.65)',
      image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=600',
    },
    {
      tag: 'GLOWUP MAKEUP',
      title: 'Bộ Sưu Tập\nSắc Son Thời Thượng',
      sub: 'Tự tin khẳng định phong cách',
      bg: 'rgba(50,20,37,0.65)',
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600',
    },
  ];
  return (
    <View style={editStyles.row}>
      {cards.map((c) => (
        <TouchableOpacity key={c.tag} style={editStyles.card} onPress={onPress} activeOpacity={0.88}>
          <Image source={{ uri: c.image }} style={editStyles.bg} />
          <View style={[editStyles.overlay, { backgroundColor: c.bg }]} />
          <View style={editStyles.content}>
            <Text style={editStyles.tag}>{c.tag}</Text>
            <Text style={editStyles.title}>{c.title}</Text>
            <Text style={editStyles.sub}>{c.sub}</Text>
            <Text style={editStyles.link}>Khám phá →</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const editStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  card: { width: '48.5%', height: 170, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  bg: { width: '100%', height: '100%', resizeMode: 'cover', position: 'absolute' },
  overlay: { width: '100%', height: '100%', position: 'absolute' },
  content: { flex: 1, justifyContent: 'flex-end', padding: SPACING.sm + 2 },
  tag: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.8, marginBottom: 2 },
  title: { fontSize: 12, fontWeight: '800', color: '#fff', marginBottom: 2, lineHeight: 15 },
  sub: { fontSize: 9, color: 'rgba(255,255,255,0.75)', marginBottom: 5 },
  link: { fontSize: 10, color: '#fff', fontWeight: '700' },
});

// ─── SkinConcerns ─────────────────────────────────────────────────────────────
function SkinConcerns({ onPress }: { onPress: () => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={concernStyles.list}>
      {SKIN_CONCERNS.map((it) => (
        <TouchableOpacity key={it.tag} style={concernStyles.chip} onPress={onPress} activeOpacity={0.85}>
          <View style={concernStyles.iconBox}>
            <Ionicons name={it.icon as any} size={18} color={COLORS.primary} />
          </View>
          <Text style={concernStyles.label}>{it.title}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const concernStyles = StyleSheet.create({
  list: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  chip: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: SPACING.sm - 2,
    paddingHorizontal: SPACING.sm + 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 100,
    marginRight: SPACING.sm,
    ...SHADOWS.soft,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: { fontSize: 10, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center', lineHeight: 13 },
});

// ─── MAIN HomeScreen ──────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const { getTotalItemsCount, fetchCart } = useCartStore();
  const cartCount = getTotalItemsCount();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHomeData();
    fetchCart().catch(() => {});
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);

      const [prodRes, catRes] = await Promise.allSettled([
        productApi.getProducts({ page: 1, limit: 10 }),
        productApi.getCategories(),
      ]);

      if (prodRes.status === 'fulfilled') {
        const items = extractProductList(prodRes.value);
        if (items.length > 0) {
          setProducts(items);
        }
      }

      if (catRes.status === 'fulfilled') {
        const { flat } = extractCategoryTree(catRes.value);
        if (flat.length > 0) {
          const mappedCats: Category[] = flat.slice(0, 6).map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            imageUrl: c.imageUrl,
            icon: getCatIcon(c.name),
          }));
          setCategories(mappedCats);
        }
      }
    } catch {
      // Khi có lỗi kết nối
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeData();
  };

  const goToCatalog = (categoryId?: string) =>
    navigation.navigate('Danh mục', categoryId ? { categoryId } : undefined);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── 1. Top Header: Logo, Search Bar, Store Icon, Cart Icon ── */}
      <View style={styles.header}>
        {/* Logo */}
        <TouchableOpacity style={styles.logoBtn} onPress={() => loadHomeData()} activeOpacity={0.8}>
          <Text style={styles.logoText}>GlowUp</Text>
        </TouchableOpacity>

        {/* Search Bar Input Button */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.85}
        >
          <Ionicons name="search-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            Tìm mỹ phẩm...
          </Text>
        </TouchableOpacity>

        {/* Action Buttons: Store Locator + Cart (Chống co cụm bằng flexShrink 0) */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('StoreLocator')}
            activeOpacity={0.7}
          >
            <Ionicons name="storefront-outline" size={19} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Giỏ hàng' })}
            activeOpacity={0.7}
          >
            <Ionicons name="bag-handle-outline" size={19} color={COLORS.textPrimary} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeTxt}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 2. Scrollable Body ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ width: '100%', overflow: 'hidden' }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Hero Banner Carousel */}
        <HeroBannerCarousel onShop={goToCatalog} />

        {/* Trust Badges */}
        <TrustBadges />

        {/* Khám Phá Theo Danh Mục */}
        <View style={styles.section}>
          <SectionTitle eyebrow="DANH MỤC TUYỂN CHỌN" title="Khám Phá Theo Danh Mục" onSeeAll={goToCatalog} />
          <CategoryCards categories={categories} onPress={(c) => goToCatalog(c.id)} />
        </View>

        {/* Flash Deal Banner (DEAL ĐẸP CÓ HẠN) */}
        <View style={styles.section}>
          <FlashDealBanner onPress={goToCatalog} />
        </View>

        {/* Bán Chạy Nhất (Bestsellers) */}
        <View style={styles.section}>
          <SectionTitle eyebrow="ĐƯỢC TIN DÙNG" title="Bán Chạy Nhất" onSeeAll={goToCatalog} />
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 24 }} />
          ) : (
            <FlatList
              data={products}
              keyExtractor={(it) => it.id}
              renderItem={({ item }) => (
                <ProductCard
                  item={item}
                  onPress={() => navigation.navigate('ProductDetail', { slug: item.slug || item.id })}
                />
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productRow}
              ItemSeparatorComponent={() => <View style={{ width: SPACING.sm }} />}
            />
          )}
        </View>

        {/* Cảm Hứng Làm Đẹp (Editorial Cards) */}
        <View style={styles.section}>
          <SectionTitle eyebrow="CẢM HỨNG LÀM ĐẸP" title="Bộ Sưu Tập Nổi Bật" />
          <EditorialCards onPress={goToCatalog} />
        </View>

        {/* Cá Nhân Hóa Chu Trình (Skin Concerns) */}
        <View style={styles.section}>
          <SectionTitle eyebrow="CÁ NHÂN HÓA CHU TRÌNH" title="Khám Phá Theo Nhu Cầu Da" />
          <SkinConcerns onPress={goToCatalog} />
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
    width: '100%',
    overflow: 'hidden',
  },

  // Header Bar
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    width: '100%',
    ...SHADOWS.soft,
  },
  logoBtn: { marginRight: 6 },
  logoText: { fontSize: 17, fontWeight: '900', color: COLORS.primary, letterSpacing: -0.5 },
  searchBar: {
    flex: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    paddingHorizontal: 8,
    height: 32,
    marginRight: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchPlaceholder: {
    marginLeft: 4,
    fontSize: 11,
    color: COLORS.textMuted,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginLeft: 2,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  cartBadgeTxt: { color: '#fff', fontSize: 7, fontWeight: '800' },

  // Sections
  section: { marginBottom: SPACING.sm },
  productRow: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
});
