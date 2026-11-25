import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  Share,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, ROUNDED } from '../../constants/theme';
import { productApi } from '../../api/productApi';
import { useCartStore } from '../../store/useCartStore';
import { useWishlistStore } from '../../store/useWishlistStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Đếm ngược Flash Sale
function formatTimeRemaining(diffMs: number) {
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}

// Bộ phân tích HTML mô tả sản phẩm sang các khối trực quan, đẹp mắt
function parseHtmlToBlocks(html: string) {
  if (!html) return [];
  const clean = html
    .replace(/&nbsp;/g, ' ')
    .replace(/<strong>/gi, '')
    .replace(/<\/strong>/gi, '')
    .replace(/<b>/gi, '')
    .replace(/<\/b>/gi, '');

  // Tách theo các thẻ tiêu đề hoặc đoạn văn
  const parts = clean.split(/(<h[234][^>]*>.*?<\/h[234]>)/gi);
  const blocks: Array<{ type: 'heading' | 'content'; title?: string; items: string[] }> = [];

  let currentBlock: { type: 'heading' | 'content'; title?: string; items: string[] } = {
    type: 'content',
    items: [],
  };

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const headingMatch = trimmed.match(/<h([234])[^>]*>(.*?)<\/h\1>/i);
    if (headingMatch) {
      if (currentBlock.items.length > 0 || currentBlock.title) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        type: 'heading',
        title: headingMatch[2].replace(/<[^>]*>?/gm, '').trim(),
        items: [],
      };
    } else {
      // Phân tích nội dung đoạn văn, danh sách hoặc dòng
      const subParts = trimmed
        .replace(/<li[^>]*>/gi, '\n• ')
        .replace(/<\/li>/gi, '')
        .replace(/<ul[^>]*>/gi, '')
        .replace(/<\/ul>/gi, '')
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]*>?/gm, '')
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      currentBlock.items.push(...subParts);
    }
  }

  if (currentBlock.items.length > 0 || currentBlock.title) {
    blocks.push(currentBlock);
  }

  return blocks;
}

export default function ProductDetailScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { slug, productId } = route.params || {};
  const productIdentifier = slug || productId;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carousel & Image state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [customSelectedImage, setCustomSelectedImage] = useState<string | null>(null);
  const carouselRef = useRef<any>(null);

  // Video embed state
  const [isVideoMode, setIsVideoMode] = useState(false);

  // Flash sale countdown timer state
  const [timeLeft, setTimeLeft] = useState<{ hours: string; minutes: string; seconds: string }>({
    hours: '02',
    minutes: '37',
    seconds: '38',
  });

  // Variant selection: KHÔNG CHỌN SẴN MẶC ĐỊNH
  const [selectedOpt1, setSelectedOpt1] = useState<string | null>(null);
  const [selectedOpt2, setSelectedOpt2] = useState<string | null>(null);
  const [selectedFlatVariantId, setSelectedFlatVariantId] = useState<string | null>(null);

  // Quantity selector
  const [quantity, setQuantity] = useState(1);

  // Shopee-style Variant Selection Popup (Modal)
  const [isVariantModalVisible, setIsVariantModalVisible] = useState(false);
  const [modalAction, setModalAction] = useState<'cart' | 'buy'>('cart');

  // Accordion (collapsible) state - MẶC ĐỊNH LÀ ĐÓNG
  const [isIngredientsOpen, setIsIngredientsOpen] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);

  // Toast notification state
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastFadeAnim = useRef(new Animated.Value(0)).current;

  // Stores
  const { addItem, getTotalItemsCount } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const cartCount = getTotalItemsCount ? getTotalItemsCount() : 0;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(2200),
      Animated.timing(toastFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMsg(null));
  };

  useEffect(() => {
    fetchDetail();
  }, [productIdentifier]);

  // Flash sale live countdown
  useEffect(() => {
    const target = Date.now() + (2 * 3600 + 37 * 60 + 38) * 1000;
    const interval = setInterval(() => {
      const diff = target - Date.now();
      if (diff <= 0) {
        clearInterval(interval);
      } else {
        setTimeLeft(formatTimeRemaining(diff));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await productApi.getProductDetail(productIdentifier);
      const productData = result?.data ?? result;
      setProduct(productData);

      // Reset selection: KHÔNG chọn sẵn biến thể khi vào màn hình
      setSelectedOpt1(null);
      setSelectedOpt2(null);
      setSelectedFlatVariantId(null);
      setCustomSelectedImage(null);
      setActiveImageIndex(0);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể tải thông tin sản phẩm. Vui lòng kiểm tra lại kết nối mạng.'
      );
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  // Danh sách ảnh từ sản phẩm
  const allImages: string[] = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      const imgs = product.images
        .map((img: any) => (typeof img === 'string' ? img : img?.imageUrl))
        .filter(Boolean);
      if (imgs.length > 0) return imgs;
    }
    const single =
      product.primaryImage ||
      product.image_url ||
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600';
    return [single];
  }, [product]);

  // Biến thể và tùy chọn
  const variants: any[] = product?.variants || [];
  const option1Name = product?.option1Name || 'Màu sắc';
  const option2Name = product?.option2Name || 'Hạn sử dụng';

  const option1Values = useMemo(() => {
    return Array.from(new Set(variants.map((v: any) => v.option1Value).filter(Boolean))) as string[];
  }, [variants]);

  const option2Values = useMemo(() => {
    return Array.from(new Set(variants.map((v: any) => v.option2Value).filter(Boolean))) as string[];
  }, [variants]);

  const hasTwoOptions = option1Values.length > 0 && option2Values.length > 0;
  const hasSingleOption =
    (option1Values.length > 0 && option2Values.length === 0) ||
    (option1Values.length === 0 && option2Values.length > 0);
  const hasFlatVariants = !hasTwoOptions && !hasSingleOption && variants.length > 1;

  // Tìm ảnh ứng với Option 1
  const getVariantImage = (val: string): string | null => {
    const matchVar =
      variants.find(
        (v: any) => v.option1Value === val && (!selectedOpt2 || v.option2Value === selectedOpt2)
      ) || variants.find((v: any) => v.option1Value === val);

    if (!matchVar) return null;
    const matchImg = product?.images?.find(
      (img: any) => img.productVariantId === matchVar.id
    )?.imageUrl;
    return matchImg || matchVar.imageUrl || null;
  };

  // Biến thể khớp hoàn toàn khi đã chọn đủ
  const matchedVariant: any = useMemo(() => {
    if (!variants.length) return null;
    if (hasTwoOptions) {
      if (!selectedOpt1 || !selectedOpt2) return null;
      return (
        variants.find(
          (v: any) =>
            v.option1Value === selectedOpt1 &&
            v.option2Value === selectedOpt2 &&
            v.isActive !== false
        ) ||
        variants.find(
          (v: any) => v.option1Value === selectedOpt1 && v.option2Value === selectedOpt2
        )
      );
    }
    if (hasSingleOption) {
      const activeVal = option1Values.length > 0 ? selectedOpt1 : selectedOpt2;
      if (!activeVal) return null;
      return (
        variants.find(
          (v: any) =>
            (v.option1Value === activeVal || v.option2Value === activeVal) &&
            v.isActive !== false
        ) ||
        variants.find((v: any) => v.option1Value === activeVal || v.option2Value === activeVal)
      );
    }
    if (hasFlatVariants) {
      if (!selectedFlatVariantId) return null;
      return variants.find((v: any) => v.id === selectedFlatVariantId);
    }
    return variants[0];
  }, [variants, hasTwoOptions, hasSingleOption, hasFlatVariants, selectedOpt1, selectedOpt2, selectedFlatVariantId]);

  // Kiểm tra xem có option nào còn trống không
  const isOptionMissing =
    (hasTwoOptions && (!selectedOpt1 || !selectedOpt2)) ||
    (hasSingleOption && !selectedOpt1 && !selectedOpt2) ||
    (hasFlatVariants && !selectedFlatVariantId);

  // Tính toán khoảng giá khi chưa chọn đủ phân loại
  const variantPrices = useMemo(() => {
    return variants
      .map((v) => v.effectivePrice ?? v.price)
      .filter((p): p is number => typeof p === 'number' && p > 0);
  }, [variants]);

  const minPrice = variantPrices.length
    ? Math.min(...variantPrices)
    : product?.salePrice ?? product?.effectivePrice ?? product?.basePrice ?? 209000;
  const maxPrice = variantPrices.length
    ? Math.max(...variantPrices)
    : product?.basePrice ?? 319000;
  const isPriceRange = !matchedVariant && minPrice !== maxPrice;

  const currentPrice = matchedVariant
    ? matchedVariant.effectivePrice ?? matchedVariant.price ?? minPrice
    : minPrice;

  const originalPrice = matchedVariant
    ? matchedVariant.price && matchedVariant.effectivePrice && matchedVariant.price > matchedVariant.effectivePrice
      ? matchedVariant.price
      : product?.basePrice ?? maxPrice
    : maxPrice;

  const discountPercent =
    originalPrice && originalPrice > currentPrice
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : 30;

  // Lấy ảnh chính đang hiển thị
  const currentMainImage = customSelectedImage || allImages[activeImageIndex] || allImages[0];

  // Xử lý chọn/bỏ chọn Option 1 (Đồng thời đổi ảnh chính 100%)
  const handleSelectOption1 = (val: string) => {
    if (selectedOpt1 === val) {
      // Bỏ chọn (toggle off)
      setSelectedOpt1(null);
      setCustomSelectedImage(null);
      setActiveImageIndex(0);
      carouselRef.current?.scrollTo({ x: 0, animated: true });
      return;
    }

    setSelectedOpt1(val);
    const targetImg = getVariantImage(val);
    if (targetImg) {
      setCustomSelectedImage(targetImg);
      const foundIdx = allImages.findIndex((url) => url === targetImg);
      if (foundIdx >= 0) {
        setActiveImageIndex(foundIdx);
        carouselRef.current?.scrollTo({ x: foundIdx * SCREEN_WIDTH, animated: true });
      }
    }
    setIsVideoMode(false);
  };

  // Xử lý chọn/bỏ chọn Option 2
  const handleSelectOption2 = (val: string) => {
    if (selectedOpt2 === val) {
      setSelectedOpt2(null);
      return;
    }
    setSelectedOpt2(val);
  };

  // Trạng thái yêu thích
  const isFav = product ? isInWishlist(product.id || slug || 'prod-vc') : false;

  const handleToggleHeart = async () => {
    if (!product) return;
    const targetId = product.id || slug || 'prod-vc';
    try {
      const added = await toggleWishlist({
        productId: targetId,
        slug: product.slug || slug,
        name: product.name,
        brand: product.brandName || product.brand?.name || 'GlowUp Luxe Lab',
        price: currentPrice,
        originalPrice: originalPrice,
        imageUrl: allImages[0],
        category: product.categoryName || product.category?.name || 'Mỹ phẩm',
        rating: product.avgRating || 4.9,
        reviewsCount: product.totalReviews || 107,
        stockStatus: 'in_stock',
      });
      showToast(added ? 'Đã lưu vào danh sách yêu thích 💕' : 'Đã bỏ khỏi danh sách yêu thích');
    } catch {
      showToast('Đã lưu vào danh sách yêu thích 💕');
    }
  };

  // Nhấn Thêm Vào Giỏ
  const handlePressAddToCart = () => {
    if (isOptionMissing) {
      setModalAction('cart');
      setIsVariantModalVisible(true);
      return;
    }
    executeAddToCart();
  };

  // Nhấn Mua Ngay
  const handlePressBuyNow = () => {
    if (isOptionMissing) {
      setModalAction('buy');
      setIsVariantModalVisible(true);
      return;
    }
    executeBuyNow();
  };

  // Thực hiện thêm vào giỏ khi đã chọn đủ
  const executeAddToCart = () => {
    if (!product) return;
    const variantId = matchedVariant?.id || product.id;
    const variantLabel =
      [selectedOpt1, selectedOpt2].filter(Boolean).join(' - ') ||
      matchedVariant?.sku ||
      'Tiêu chuẩn';

    addItem(
      {
        id: variantId,
        variantId: variantId,
        productId: product.id,
        productName: product.name,
        variantName: variantLabel,
        price: currentPrice,
        originalPrice: originalPrice,
        imageUrl: currentMainImage,
        stock: matchedVariant?.stockQuantity ?? 99,
      },
      quantity
    )
      .then(() => {
        setIsVariantModalVisible(false);
        showToast('Đã thêm vào giỏ hàng thành công!');
      })
      .catch((err: any) => {
        Alert.alert('Lỗi', err?.message || 'Không thể thêm vào giỏ hàng');
      });
  };

  // Thực hiện mua ngay khi đã chọn đủ
  const executeBuyNow = () => {
    if (!product) return;
    const variantId = matchedVariant?.id || product.id;
    const variantLabel =
      [selectedOpt1, selectedOpt2].filter(Boolean).join(' - ') ||
      matchedVariant?.sku ||
      'Tiêu chuẩn';

    addItem(
      {
        id: variantId,
        variantId: variantId,
        productId: product.id,
        productName: product.name,
        variantName: variantLabel,
        price: currentPrice,
        originalPrice: originalPrice,
        imageUrl: currentMainImage,
        stock: matchedVariant?.stockQuantity ?? 99,
      },
      quantity
    )
      .then(() => {
        setIsVariantModalVisible(false);
        navigation.navigate('Checkout');
      })
      .catch(() => {
        setIsVariantModalVisible(false);
        navigation.navigate('Checkout');
      });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: product?.name || 'GlowUp Cosmetics',
        message: `Khám phá ngay: ${product?.name} tại GlowUp Cosmetics!`,
      });
    } catch {
      // Ignore
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#9D394F" />
        <Text style={styles.loadingText}>Đang tải chi tiết sản phẩm...</Text>
      </View>
    );
  }

  if (!product || error) {
    return (
      <View style={[styles.centerContainer, { padding: SPACING.xl }]}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.textMuted} />
        <Text style={styles.errorTitle}>{error || 'Không tìm thấy thông tin sản phẩm'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchDetail}>
          <Text style={styles.retryBtnText}>Thử lại</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: SPACING.md }} onPress={() => navigation.goBack()}>
          <Text style={{ color: COLORS.textMuted }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Phân tích mô tả sản phẩm
  const descriptionBlocks = parseHtmlToBlocks(product.description || product.shortDescription || '');
  const specs = product.specifications || {};

  return (
    <View style={styles.screen}>
      {/* 1. Header Bar Nổi (Back, Share, Cart with badge, More) */}
      <View style={[styles.floatingHeader, { top: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.headerCircleBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Quay lại"
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={handleShare}
            accessibilityLabel="Chia sẻ"
          >
            <Ionicons name="share-social-outline" size={19} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Giỏ hàng' })}
            accessibilityLabel="Giỏ hàng"
          >
            <Ionicons name="cart-outline" size={19} color="#FFFFFF" />
            {cartCount > 0 && (
              <View style={styles.headerCartBadge}>
                <Text style={styles.headerCartBadgeText}>
                  {cartCount > 99 ? '99+' : cartCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={() => {
              Alert.alert('GlowUp Cosmetics', 'Sản phẩm chính hãng được phân phối độc quyền.');
            }}
            accessibilityLabel="Tùy chọn khác"
          >
            <Ionicons name="ellipsis-vertical" size={19} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Media Container: Carousel 1:1 hoặc Video Player nhúng chuẩn */}
        <View style={styles.carouselContainer}>
          {isVideoMode && product.videoUrl ? (
            <View style={styles.videoPlayerContainer}>
              {Platform.OS === 'web' ? (
                // Nhúng iframe YouTube mượt mà trên Web
                <iframe
                  src={`${product.videoUrl.split('?')[0]}?autoplay=1&mute=0&controls=1&modestbranding=1&rel=0`}
                  title={`Video ${product.name}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    backgroundColor: '#000000',
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <View style={styles.nativeVideoPlaceholder}>
                  <Ionicons name="play-circle" size={54} color="#9D394F" />
                  <Text style={{ color: '#FFFFFF', marginTop: 8 }}>Đang phát video sản phẩm...</Text>
                </View>
              )}

              {/* Nút đóng video quay lại xem ảnh */}
              <TouchableOpacity
                style={styles.closeVideoBtn}
                onPress={() => setIsVideoMode(false)}
              >
                <Ionicons name="images-outline" size={14} color="#FFFFFF" />
                <Text style={styles.closeVideoBtnText}>Xem ảnh ({allImages.length})</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}>
              {/* Hiển thị trực tiếp ảnh hiện tại để bảo đảm bấm Option 1 đổi ảnh 100% */}
              <ScrollView
                ref={carouselRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const offsetX = e.nativeEvent.contentOffset.x;
                  const idx = Math.round(offsetX / SCREEN_WIDTH);
                  setActiveImageIndex(idx);
                  setCustomSelectedImage(null);
                }}
              >
                {allImages.map((imgUrl, index) => (
                  <View key={`img-${index}`} style={styles.carouselSlide}>
                    <Image
                      source={{ uri: customSelectedImage && index === 0 ? customSelectedImage : imgUrl }}
                      style={styles.carouselImage}
                      resizeMode="contain"
                    />
                  </View>
                ))}
              </ScrollView>

              {/* Nút Xem Video Nổi Bật (Nếu sản phẩm có video) */}
              {product.videoUrl && (
                <TouchableOpacity
                  style={styles.playVideoFloatingBtn}
                  onPress={() => setIsVideoMode(true)}
                  activeOpacity={0.85}
                >
                  <View style={styles.playIconCircle}>
                    <Ionicons name="play" size={12} color="#FFFFFF" style={{ marginLeft: 2 }} />
                  </View>
                  <Text style={styles.playVideoFloatingText}>Xem Video</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Mall Stamp Badge */}
          <View style={styles.mallBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
            <Text style={styles.mallBadgeText}>GLOWUP MALL</Text>
          </View>

          {/* Page Indicator Pill (1/19) */}
          {!isVideoMode && (
            <View style={styles.pageIndicatorPill}>
              <Text style={styles.pageIndicatorText}>
                {customSelectedImage
                  ? `${allImages.findIndex((u) => u === customSelectedImage) + 1 || 1}/${allImages.length}`
                  : `${activeImageIndex + 1}/${allImages.length}`}
              </Text>
            </View>
          )}
        </View>

        {/* 3. Flash Sale / Giờ Vàng Ribbon */}
        <View style={styles.flashSaleRibbon}>
          <View style={styles.flashSaleLeft}>
            <Ionicons name="flash" size={20} color="#FDE047" style={{ marginRight: 6 }} />
            <View>
              <Text style={styles.flashSaleTitle}>FLASH SALE GIỜ VÀNG</Text>
              <Text style={styles.flashSaleSubtitle}>Đang bán chạy • Chỉ còn 24 hộp</Text>
            </View>
          </View>
          <View style={styles.flashSaleRight}>
            <Text style={styles.countdownLabel}>KẾT THÚC TRONG</Text>
            <View style={styles.timerRow}>
              <View style={styles.timerBox}>
                <Text style={styles.timerNum}>{timeLeft.hours}</Text>
              </View>
              <Text style={styles.timerColon}>:</Text>
              <View style={styles.timerBox}>
                <Text style={styles.timerNum}>{timeLeft.minutes}</Text>
              </View>
              <Text style={styles.timerColon}>:</Text>
              <View style={styles.timerBox}>
                <Text style={styles.timerNum}>{timeLeft.seconds}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. Giá & Tiêu Đề & Đánh Giá */}
        <View style={styles.priceTitleCard}>
          <View style={styles.priceRow}>
            <Text style={styles.currencySymbol}>₫</Text>
            <Text style={styles.mainPriceText}>
              {isPriceRange
                ? `${minPrice.toLocaleString('vi-VN')} - ${maxPrice.toLocaleString('vi-VN')}`
                : currentPrice.toLocaleString('vi-VN')}
            </Text>
            {originalPrice > currentPrice && (
              <Text style={styles.oldPriceText}>₫{originalPrice.toLocaleString('vi-VN')}</Text>
            )}
            {discountPercent > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>-{discountPercent}%</Text>
              </View>
            )}
          </View>

          <View style={styles.titleRow}>
            <View style={styles.titleTagMall}>
              <Text style={styles.titleTagMallText}>Mall</Text>
            </View>
            <Text style={styles.productTitleText} numberOfLines={3}>
              {product.name}
            </Text>
          </View>

          {/* Rating, Lượt bán, Nút Tim Wishlist */}
          <View style={styles.socialProofRow}>
            <View style={styles.socialProofLeft}>
              <View style={styles.starScoreWrap}>
                <Ionicons name="star" size={13} color="#FFB800" />
                <Text style={styles.starScoreText}>
                  {Number(product.avgRating || 4.9).toFixed(1)}
                </Text>
                <Text style={styles.starCountText}>({product.totalReviews || '107'})</Text>
              </View>
              <View style={styles.socialDivider} />
              <Text style={styles.soldText}>
                Đã bán{' '}
                <Text style={styles.soldTextHighlight}>
                  {product.totalSold ? `${product.totalSold}` : '1008'}
                </Text>
              </Text>
            </View>

            {/* Nút tim Wishlist */}
            <TouchableOpacity
              style={styles.wishlistBtn}
              onPress={handleToggleHeart}
              accessibilityLabel="Yêu thích"
            >
              <Ionicons
                name={isFav ? 'heart' : 'heart-outline'}
                size={20}
                color="#9D394F"
              />
              <Text style={styles.wishlistCountText}>1.8k</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Phân Loại Sản Phẩm (Option 1 có ảnh + Option 2) */}
        {variants.length > 0 && (
          <View style={styles.sectionCard}>
            {/* Option 1: Có thumbnail ảnh, bấm vào đổi ảnh chính, bấm lại bỏ chọn */}
            {option1Values.length > 0 && (
              <View style={{ marginBottom: option2Values.length > 0 ? SPACING.md : 0 }}>
                <View style={styles.variantHeaderRow}>
                  <Text style={styles.variantSectionLabel}>Chọn {option1Name}:</Text>
                  <Text style={styles.variantSelectedValue}>
                    {selectedOpt1 ? `${selectedOpt1} (Nhấp lại để bỏ)` : 'Chưa chọn'}
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.variantPillList}
                >
                  {option1Values.map((val) => {
                    const isSelected = selectedOpt1 === val;
                    const pillImg = getVariantImage(val) || allImages[0];

                    return (
                      <TouchableOpacity
                        key={val}
                        style={[styles.option1Pill, isSelected && styles.option1PillSelected]}
                        onPress={() => handleSelectOption1(val)}
                      >
                        {pillImg ? (
                          <Image source={{ uri: pillImg }} style={styles.option1Thumb} />
                        ) : null}
                        <Text style={[styles.option1Text, isSelected && styles.option1TextSelected]}>
                          {val}
                        </Text>
                        {isSelected && (
                          <View style={styles.checkIconBadge}>
                            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Option 2: Quy cách / Hạn sử dụng */}
            {option2Values.length > 0 && (
              <View>
                <View style={styles.variantHeaderRow}>
                  <Text style={styles.variantSectionLabel}>Chọn {option2Name}:</Text>
                  <Text style={styles.variantSelectedValue}>
                    {selectedOpt2 ? `${selectedOpt2} (Nhấp lại để bỏ)` : 'Chưa chọn'}
                  </Text>
                </View>
                <View style={styles.option2Row}>
                  {option2Values.map((val) => {
                    const isSelected = selectedOpt2 === val;
                    return (
                      <TouchableOpacity
                        key={val}
                        style={[styles.option2Pill, isSelected && styles.option2PillSelected]}
                        onPress={() => handleSelectOption2(val)}
                      >
                        <Text style={[styles.option2Text, isSelected && styles.option2TextSelected]}>
                          {val}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* 6. Thẻ Thương Hiệu Sản Phẩm */}
        <View style={styles.sectionCard}>
          <View style={styles.brandCardTop}>
            <View style={styles.brandAvatarWrap}>
              <View style={styles.brandAvatar}>
                <Ionicons name="sparkles" size={22} color="#9D394F" />
              </View>
              <View style={styles.brandMallTag}>
                <Text style={styles.brandMallTagText}>Mall</Text>
              </View>
            </View>

            <View style={styles.brandInfoWrap}>
              <View style={styles.brandNameLine}>
                <Text style={styles.brandNameText}>
                  {product.brandName || product.brand?.name || '3CE Official'}
                </Text>
                <Ionicons name="checkmark-circle" size={15} color="#9D394F" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.brandSubText}>Thương hiệu chính hãng • Đã kiểm định</Text>
            </View>

            <TouchableOpacity
              style={styles.viewBrandBtn}
              onPress={() => {
                navigation.navigate('Catalog', {
                  brandName: product.brandName || product.brand?.name,
                });
              }}
            >
              <Text style={styles.viewBrandBtnText}>Xem thương hiệu</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.brandStatsGrid}>
            <View style={styles.brandStatItem}>
              <Text style={styles.brandStatValHighlight}>4.9 / 5.0</Text>
              <Text style={styles.brandStatLabel}>Đánh giá thương hiệu</Text>
            </View>
            <View style={[styles.brandStatItem, styles.brandStatBorder]}>
              <Text style={styles.brandStatVal}>100%</Text>
              <Text style={styles.brandStatLabel}>Chính hãng đảm bảo</Text>
            </View>
            <View style={styles.brandStatItem}>
              <Text style={styles.brandStatValHighlight}>24h</Text>
              <Text style={styles.brandStatLabel}>Hỗ trợ & Bảo hành</Text>
            </View>
          </View>
        </View>

        {/* 7. Accordion 1: Bảng Thành Phần (Mặc định đóng) */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setIsIngredientsOpen(!isIngredientsOpen)}
            activeOpacity={0.7}
          >
            <View style={styles.accordionTitleRow}>
              <Ionicons name="flask-outline" size={18} color="#9D394F" style={{ marginRight: 8 }} />
              <Text style={styles.accordionTitle}>BẢNG THÀNH PHẦN</Text>
            </View>
            <Ionicons
              name={isIngredientsOpen ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          {isIngredientsOpen && (
            <View style={styles.accordionBody}>
              {Array.isArray(product.ingredients) && product.ingredients.length > 0 ? (
                <View style={styles.ingredientList}>
                  {product.ingredients.map((ing: any, i: number) => {
                    const name = typeof ing === 'string' ? ing : ing?.ingredientName || ing?.name || '';
                    const purpose = typeof ing === 'object' ? ing?.purpose : null;
                    const isKey = typeof ing === 'object' && ing?.isKeyIngredient;

                    return (
                      <View key={ing?.id || i} style={styles.ingredientItemBox}>
                        <View style={styles.ingredientNameRow}>
                          <Text style={styles.ingredientBullet}>•</Text>
                          <Text style={styles.ingredientName}>{name}</Text>
                          {isKey && (
                            <View style={styles.keyIngredientBadge}>
                              <Text style={styles.keyIngredientBadgeText}>Thành phần vàng</Text>
                            </View>
                          )}
                        </View>
                        {purpose ? <Text style={styles.ingredientPurpose}>{purpose}</Text> : null}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.certifiedSafetyCard}>
                  <View style={styles.safetyHeader}>
                    <Ionicons name="shield-checkmark" size={20} color="#9D394F" style={{ marginRight: 6 }} />
                    <Text style={styles.safetyTitle}>Chứng Nhận An Toàn & Đã Cấp Phép</Text>
                  </View>
                  <Text style={styles.safetyText}>
                    Sản phẩm {product.name} đã được cấp giấy phép công bố mỹ phẩm bởi Bộ Y Tế. Công thức an toàn, lành tính, không chứa chì độc hại, giàu chất dưỡng ẩm tự nhiên bảo vệ làn môi mềm mượt suốt ngày dài.
                  </Text>
                  {specs.barcode && (
                    <View style={styles.barcodeLine}>
                      <Text style={styles.barcodeLabel}>Mã số công bố / Barcode:</Text>
                      <Text style={styles.barcodeVal}>{specs.barcode}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* 8. Accordion 2: Mô Tả Sản Phẩm (Dữ liệu API, không dính dòng, có layout đẹp) */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setIsDescriptionOpen(!isDescriptionOpen)}
            activeOpacity={0.7}
          >
            <View style={styles.accordionTitleRow}>
              <Ionicons name="document-text-outline" size={18} color="#9D394F" style={{ marginRight: 8 }} />
              <Text style={styles.accordionTitle}>MÔ TẢ SẢN PHẨM</Text>
            </View>
            <Ionicons
              name={isDescriptionOpen ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          {isDescriptionOpen && (
            <View style={styles.accordionBody}>
              {/* Render từng khối mô tả có khoảng cách rõ ràng */}
              {descriptionBlocks.length > 0 ? (
                <View style={styles.parsedContentWrap}>
                  {descriptionBlocks.map((block, bIdx) => (
                    <View key={`b-${bIdx}`} style={styles.descriptionSectionBlock}>
                      {block.title ? (
                        <View style={styles.blockHeadingRow}>
                          <Ionicons name="sparkles" size={14} color="#9D394F" style={{ marginRight: 6 }} />
                          <Text style={styles.blockHeadingText}>{block.title}</Text>
                        </View>
                      ) : null}

                      {block.items.map((line, lIdx) => {
                        const isBullet = line.startsWith('•') || line.startsWith('-');
                        const isColorShade = line.startsWith('#');

                        if (isColorShade) {
                          return (
                            <View key={`line-${lIdx}`} style={styles.colorShadeItem}>
                              <View style={styles.colorShadeDot} />
                              <Text style={styles.colorShadeText}>{line}</Text>
                            </View>
                          );
                        }

                        if (isBullet) {
                          return (
                            <View key={`line-${lIdx}`} style={styles.bulletItemRow}>
                              <Text style={styles.bulletItemDot}>•</Text>
                              <Text style={styles.bulletItemText}>
                                {line.replace(/^[•\-]\s*/, '')}
                              </Text>
                            </View>
                          );
                        }

                        return (
                          <Text key={`line-${lIdx}`} style={styles.paragraphText}>
                            {line}
                          </Text>
                        );
                      })}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.paragraphText}>
                  {product.shortDescription || 'Sản phẩm chính hãng với công nghệ hiện đại.'}
                </Text>
              )}

              {/* Bảng Thông Số Kỹ Thuật Chi Tiết */}
              <View style={styles.specsTableContainer}>
                <Text style={styles.specsTableTitle}>THÔNG SỐ KỸ THUẬT SẢN PHẨM</Text>
                <View style={styles.specsTable}>
                  <View style={styles.specsRow}>
                    <Text style={styles.specsKey}>Xuất xứ thương hiệu</Text>
                    <Text style={styles.specsVal}>{specs.brandOrigin || product.brandName || 'Hàn Quốc'}</Text>
                  </View>
                  <View style={styles.specsRow}>
                    <Text style={styles.specsKey}>Nơi sản xuất</Text>
                    <Text style={styles.specsVal}>{specs.manufacturingLocation || 'Seoul, Hàn Quốc'}</Text>
                  </View>
                  <View style={styles.specsRow}>
                    <Text style={styles.specsKey}>Hạn sử dụng</Text>
                    <Text style={styles.specsVal}>{specs.expiry || '36 tháng (12 tháng mở nắp)'}</Text>
                  </View>
                  <View style={styles.specsRow}>
                    <Text style={styles.specsKey}>Kết cấu / Hiệu ứng</Text>
                    <Text style={styles.specsVal}>{specs.textureEffect || 'Son kem lì mịn mờ'}</Text>
                  </View>
                  <View style={[styles.specsRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.specsKey}>Loại da phù hợp</Text>
                    <Text style={styles.specsVal}>{specs.skinType || 'Mọi loại da'}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* 9. Accordion 3: Hướng Dẫn Sử Dụng (Dữ liệu API từ howToUse) */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setIsHowToUseOpen(!isHowToUseOpen)}
            activeOpacity={0.7}
          >
            <View style={styles.accordionTitleRow}>
              <Ionicons name="sparkles-outline" size={18} color="#9D394F" style={{ marginRight: 8 }} />
              <Text style={styles.accordionTitle}>HƯỚNG DẪN SỬ DỤNG</Text>
            </View>
            <Ionicons
              name={isHowToUseOpen ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          {isHowToUseOpen && (
            <View style={styles.accordionBody}>
              {product.howToUse ? (
                <View style={styles.howToUseCard}>
                  {product.howToUse
                    .split('\n')
                    .map((s: string) => s.trim())
                    .filter((s: string) => s.length > 0)
                    .map((step: string, idx: number) => (
                      <View key={`step-${idx}`} style={styles.howToUseStepRow}>
                        <View style={styles.stepNumberBadge}>
                          <Text style={styles.stepNumberText}>{idx + 1}</Text>
                        </View>
                        <Text style={styles.stepText}>{step.replace(/^[-•\d.]\s*/, '')}</Text>
                      </View>
                    ))}
                </View>
              ) : (
                <View style={styles.howToUseCard}>
                  <View style={styles.howToUseStepRow}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <Text style={styles.stepText}>Thoa một lớp son dưỡng mỏng nhẹ để làm mềm môi.</Text>
                  </View>
                  <View style={styles.howToUseStepRow}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <Text style={styles.stepText}>Dùng đầu cọ lấy lượng son vừa đủ, chấm vào giữa lòng môi rồi tán nhẹ.</Text>
                  </View>
                  <View style={styles.howToUseStepRow}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <Text style={styles.stepText}>Bặm nhẹ môi để tạo hiệu ứng ombre mờ lì tự nhiên cuốn hút.</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 10. Đánh Giá Sản Phẩm (Bỏ bộ lọc, nút Xem tất cả) */}
        <View style={styles.sectionCard}>
          <View style={styles.reviewSectionHeader}>
            <View style={styles.reviewSectionTitleWrap}>
              <Text style={styles.reviewSectionTitle}>ĐÁNH GIÁ SẢN PHẨM</Text>
              <View style={styles.reviewStarBadge}>
                <Ionicons name="star" size={13} color="#FFB800" />
                <Text style={styles.reviewScoreText}>
                  {Number(product.avgRating || 4.9).toFixed(1)}/5
                </Text>
                <Text style={styles.reviewCountSmall}>
                  ({product.totalReviews || '107'})
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.viewAllReviewsBtn}
              onPress={() => {
                navigation.navigate('ProductReviews', {
                  productId: product.id,
                  slug: product.slug,
                  productName: product.name,
                  avgRating: product.avgRating || 4.9,
                  totalReviews: product.totalReviews || 107,
                });
              }}
            >
              <Text style={styles.viewAllReviewsText}>Xem tất cả</Text>
              <Ionicons name="chevron-forward" size={14} color="#9D394F" />
            </TouchableOpacity>
          </View>

          {/* Một bài đánh giá tiêu biểu đại diện */}
          <View style={styles.previewReviewItem}>
            <View style={styles.previewReviewUserRow}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120',
                }}
                style={styles.previewAvatar}
              />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.previewUserName}>Thảo My (24t)</Text>
                <View style={styles.previewStarRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons key={s} name="star" size={11} color="#FFB800" style={{ marginRight: 1 }} />
                  ))}
                  <Text style={styles.previewDateVariant}>
                    Hôm qua | Phân loại: {selectedOpt1 || 'Taupe'}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.previewContent}>
              Màu son lên chuẩn xinh xỉu, chất son lì mịn như nhung không hề làm lộ rãnh môi. Đánh lòng môi hay full môi đều cực kỳ tôn da!
            </Text>

            <View style={styles.previewImagesRow}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=200',
                }}
                style={styles.previewThumb}
              />
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200',
                }}
                style={styles.previewThumb}
              />
            </View>

            <View style={styles.sellerReplyBlock}>
              <Text style={styles.sellerReplyTitle}>Phản Hồi Của Người Bán (GlowUp Mall):</Text>
              <Text style={styles.sellerReplyText}>
                3CE Official Store chân thành cảm ơn bạn đã yêu thích sản phẩm! Chúc bạn luôn rạng rỡ và xinh đẹp nhé 💕
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 11. Thanh Hành Động Cố Định Dưới Cùng (Không có Chat ngay) */}
      <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TouchableOpacity
          style={styles.addToCartActionBtn}
          onPress={handlePressAddToCart}
          activeOpacity={0.8}
        >
          <Ionicons name="cart-outline" size={20} color="#9D394F" />
          <Text style={styles.addToCartActionText}>Thêm vào giỏ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buyNowActionBtn}
          onPress={handlePressBuyNow}
          activeOpacity={0.9}
        >
          <Text style={styles.buyNowMainText}>Mua Ngay</Text>
          <Text style={styles.buyNowSubText}>
            ₫{currentPrice.toLocaleString('vi-VN')} (Tiết kiệm 30k)
          </Text>
        </TouchableOpacity>
      </View>

      {/* 12. POPUP CHỌN BIẾN THỂ CHUẨN SHOPEE KHI BẤM MUA / THÊM MÀ CHƯA CHỌN ĐỦ */}
      <Modal
        visible={isVariantModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsVariantModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalBackdropDismiss}
            activeOpacity={1}
            onPress={() => setIsVariantModalVisible(false)}
          />

          <View style={[styles.bottomSheetContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {/* Header Popup: Ảnh thumbnail + Giá + Kho + Trạng thái đang chọn */}
            <View style={styles.popupHeader}>
              <Image source={{ uri: currentMainImage }} style={styles.popupThumb} resizeMode="contain" />
              <View style={styles.popupHeaderInfo}>
                <Text style={styles.popupPrice}>
                  ₫{currentPrice.toLocaleString('vi-VN')}
                </Text>
                <Text style={styles.popupStock}>
                  Kho: {matchedVariant?.stockQuantity ?? 252}
                </Text>
                <Text style={styles.popupPrompt}>
                  {isOptionMissing
                    ? `Vui lòng chọn: ${[!selectedOpt1 && option1Name, !selectedOpt2 && option2Name].filter(Boolean).join(', ')}`
                    : `Đã chọn: ${[selectedOpt1, selectedOpt2].filter(Boolean).join(', ')}`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.popupCloseBtn}
                onPress={() => setIsVariantModalVisible(false)}
              >
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.popupScroll} showsVerticalScrollIndicator={false}>
              {/* Option 1: Có thumbnail, bấm vào đổi ngay ảnh chính ở màn hình nền */}
              {option1Values.length > 0 && (
                <View style={styles.popupOptionSection}>
                  <Text style={styles.popupOptionTitle}>{option1Name}:</Text>
                  <View style={styles.popupOptionPillsWrap}>
                    {option1Values.map((val) => {
                      const isSelected = selectedOpt1 === val;
                      const pillImg = getVariantImage(val) || allImages[0];

                      return (
                        <TouchableOpacity
                          key={val}
                          style={[styles.popupOptionPill, isSelected && styles.popupOptionPillSelected]}
                          onPress={() => handleSelectOption1(val)}
                        >
                          {pillImg ? (
                            <Image source={{ uri: pillImg }} style={styles.popupOptionPillThumb} />
                          ) : null}
                          <Text
                            style={[
                              styles.popupOptionPillText,
                              isSelected && styles.popupOptionPillTextSelected,
                            ]}
                          >
                            {val}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Option 2: Quy cách / Hạn sử dụng */}
              {option2Values.length > 0 && (
                <View style={styles.popupOptionSection}>
                  <Text style={styles.popupOptionTitle}>{option2Name}:</Text>
                  <View style={styles.popupOptionPillsWrap}>
                    {option2Values.map((val) => {
                      const isSelected = selectedOpt2 === val;
                      return (
                        <TouchableOpacity
                          key={val}
                          style={[styles.popupOptionPill, isSelected && styles.popupOptionPillSelected]}
                          onPress={() => handleSelectOption2(val)}
                        >
                          <Text
                            style={[
                              styles.popupOptionPillText,
                              isSelected && styles.popupOptionPillTextSelected,
                            ]}
                          >
                            {val}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Bộ chọn số lượng */}
              <View style={styles.quantityRow}>
                <Text style={styles.quantityLabel}>Số lượng</Text>
                <View style={styles.quantityStepper}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Ionicons name="remove" size={16} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperNum}>{quantity}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setQuantity((q) => q + 1)}
                  >
                    <Ionicons name="add" size={16} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Nút bấm xác nhận trong popup */}
            <TouchableOpacity
              style={[styles.popupConfirmBtn, isOptionMissing && styles.popupConfirmBtnDisabled]}
              onPress={() => {
                if (isOptionMissing) {
                  showToast('Vui lòng chọn đầy đủ phân loại hàng');
                  return;
                }
                if (modalAction === 'cart') {
                  executeAddToCart();
                } else {
                  executeBuyNow();
                }
              }}
            >
              <Text style={styles.popupConfirmBtnText}>
                {modalAction === 'cart' ? 'Thêm Vào Giỏ Hàng' : 'Mua Ngay'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Toast thông báo popup */}
      {toastMsg && (
        <Animated.View style={[styles.toastContainer, { opacity: toastFadeAnim }]}>
          <Ionicons name="checkmark-circle" size={18} color="#FDE047" />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5ECEF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5ECEF',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#9D394F',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    marginTop: SPACING.lg,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  floatingHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCartBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#9D394F',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerCartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  carouselContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  carouselSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  videoPlayerContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#000000',
    position: 'relative',
  },
  nativeVideoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeVideoBtn: {
    position: 'absolute',
    top: 60,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
  },
  closeVideoBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  playVideoFloatingBtn: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  playIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#9D394F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playVideoFloatingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  mallBadge: {
    position: 'absolute',
    top: 60,
    left: 12,
    backgroundColor: '#9D394F',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
  },
  mallBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pageIndicatorPill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pageIndicatorText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  flashSaleRibbon: {
    width: '100%',
    backgroundColor: '#9D394F',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flashSaleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flashSaleTitle: {
    color: '#FDE047',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  flashSaleSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 10,
    marginTop: 1,
  },
  flashSaleRight: {
    alignItems: 'flex-end',
  },
  countdownLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerBox: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  timerNum: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  timerColon: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 2,
  },
  priceTitleCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 6,
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9D394F',
  },
  mainPriceText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#9D394F',
    lineHeight: 28,
  },
  oldPriceText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
    marginLeft: 4,
  },
  discountBadge: {
    backgroundColor: 'rgba(157, 57, 79, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  discountBadgeText: {
    color: '#9D394F',
    fontSize: 10,
    fontWeight: '800',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  titleTagMall: {
    backgroundColor: '#9D394F',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    marginTop: 2,
  },
  titleTagMallText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  productTitleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 21,
  },
  socialProofRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F5ECEF',
  },
  socialProofLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starScoreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starScoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 3,
  },
  starCountText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginLeft: 2,
  },
  socialDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#E5D6DA',
    marginHorizontal: 8,
  },
  soldText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  soldTextHighlight: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  wishlistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  wishlistCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9D394F',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 8,
  },
  variantHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  variantSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  variantSelectedValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9D394F',
  },
  variantPillList: {
    flexDirection: 'row',
    gap: 8,
  },
  option1Pill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    paddingRight: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5D6DA',
    backgroundColor: '#FEFAFC',
    gap: 6,
  },
  option1PillSelected: {
    borderColor: '#9D394F',
    borderWidth: 1.5,
    backgroundColor: 'rgba(157, 57, 79, 0.05)',
  },
  option1Thumb: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#F5ECEF',
  },
  option1Text: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  option1TextSelected: {
    fontWeight: '700',
    color: '#9D394F',
  },
  checkIconBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#9D394F',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  option2Row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option2Pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5D6DA',
    backgroundColor: '#FEFAFC',
  },
  option2PillSelected: {
    borderColor: '#9D394F',
    borderWidth: 1.5,
    backgroundColor: 'rgba(157, 57, 79, 0.05)',
  },
  option2Text: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  option2TextSelected: {
    fontWeight: '700',
    color: '#9D394F',
  },
  brandCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandAvatarWrap: {
    position: 'relative',
  },
  brandAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F9ECEE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5D6DA',
  },
  brandMallTag: {
    position: 'absolute',
    bottom: -2,
    left: 2,
    right: 2,
    backgroundColor: '#9D394F',
    borderRadius: 3,
    alignItems: 'center',
  },
  brandMallTagText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  brandInfoWrap: {
    flex: 1,
    marginLeft: 10,
  },
  brandNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  brandSubText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  viewBrandBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#9D394F',
  },
  viewBrandBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9D394F',
  },
  brandStatsGrid: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5ECEF',
  },
  brandStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  brandStatBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#F5ECEF',
  },
  brandStatValHighlight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9D394F',
  },
  brandStatVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  brandStatLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  accordionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },
  accordionBody: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5ECEF',
    marginTop: 10,
  },
  ingredientList: {
    gap: 8,
  },
  ingredientItemBox: {
    marginBottom: 4,
  },
  ingredientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  ingredientBullet: {
    fontSize: 14,
    color: '#9D394F',
    marginRight: 6,
  },
  ingredientName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  keyIngredientBadge: {
    backgroundColor: 'rgba(157, 57, 79, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  keyIngredientBadgeText: {
    color: '#9D394F',
    fontSize: 9,
    fontWeight: '700',
  },
  ingredientPurpose: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginLeft: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  certifiedSafetyCard: {
    backgroundColor: '#FEFAFC',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#9D394F',
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  safetyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9D394F',
  },
  safetyText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  barcodeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  barcodeLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  barcodeVal: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  parsedContentWrap: {
    gap: 12,
  },
  descriptionSectionBlock: {
    marginBottom: 4,
  },
  blockHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  blockHeadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9D394F',
  },
  paragraphText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 19,
    marginBottom: 6,
  },
  bulletItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletItemDot: {
    fontSize: 14,
    color: '#9D394F',
    marginRight: 6,
    lineHeight: 18,
  },
  bulletItemText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  colorShadeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingLeft: 4,
  },
  colorShadeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9D394F',
    marginRight: 8,
  },
  colorShadeText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  specsTableContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5ECEF',
  },
  specsTableTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  specsTable: {
    borderWidth: 1,
    borderColor: '#EFE5E7',
    borderRadius: 8,
    overflow: 'hidden',
  },
  specsRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE5E7',
    backgroundColor: '#FFFFFF',
  },
  specsKey: {
    width: 130,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  specsVal: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  howToUseCard: {
    gap: 8,
  },
  howToUseStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#9D394F',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  reviewSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewSectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },
  reviewStarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  reviewScoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFB800',
    marginLeft: 2,
  },
  reviewCountSmall: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginLeft: 2,
  },
  viewAllReviewsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllReviewsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9D394F',
  },
  previewReviewItem: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5ECEF',
  },
  previewReviewUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F5ECEF',
  },
  previewUserName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  previewStarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  previewDateVariant: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  previewContent: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 18,
    marginBottom: 8,
  },
  previewImagesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  previewThumb: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#F5ECEF',
  },
  sellerReplyBlock: {
    backgroundColor: '#FEFAFC',
    borderLeftWidth: 2.5,
    borderLeftColor: '#9D394F',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  sellerReplyTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9D394F',
    marginBottom: 2,
  },
  sellerReplyText: {
    fontSize: 11,
    color: COLORS.textPrimary,
    lineHeight: 16,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5D6DA',
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  addToCartActionBtn: {
    width: 110,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F5ECEF',
    backgroundColor: '#FFFFFF',
  },
  addToCartActionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9D394F',
    marginTop: 2,
  },
  buyNowActionBtn: {
    flex: 1,
    backgroundColor: '#9D394F',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  buyNowMainText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  buyNowSubText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  toastContainer: {
    position: 'absolute',
    top: 75,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdropDismiss: {
    flex: 1,
  },
  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECEF',
  },
  popupThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#F9ECEE',
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  popupHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  popupPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#9D394F',
  },
  popupStock: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  popupPrompt: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  popupCloseBtn: {
    padding: 6,
    alignSelf: 'flex-start',
  },
  popupScroll: {
    maxHeight: 320,
    marginTop: 10,
  },
  popupOptionSection: {
    marginBottom: 14,
  },
  popupOptionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  popupOptionPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popupOptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5D6DA',
    backgroundColor: '#FEFAFC',
    gap: 6,
  },
  popupOptionPillSelected: {
    borderColor: '#9D394F',
    borderWidth: 1.5,
    backgroundColor: 'rgba(157, 57, 79, 0.06)',
  },
  popupOptionPillThumb: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#F5ECEF',
  },
  popupOptionPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  popupOptionPillTextSelected: {
    fontWeight: '700',
    color: '#9D394F',
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5ECEF',
    marginBottom: 10,
  },
  quantityLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5D6DA',
    borderRadius: 6,
  },
  stepperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F9ECEE',
  },
  stepperNum: {
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  popupConfirmBtn: {
    backgroundColor: '#9D394F',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  popupConfirmBtnDisabled: {
    backgroundColor: '#AD9F9C',
  },
  popupConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
