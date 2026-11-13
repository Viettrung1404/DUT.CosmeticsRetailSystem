import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import { productApi } from '../../api/productApi';

import { useCartStore } from '../../store/useCartStore';
import { useWishlistStore } from '../../store/useWishlistStore';

export default function ProductDetailScreen({ route, navigation }: any) {
    const insets = useSafeAreaInsets();
    const { slug, productId } = route.params || {};
    const productIdentifier = slug || productId;
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
    const { addItem } = useCartStore();
    const { toggleWishlist, isInWishlist } = useWishlistStore();

    useEffect(() => {
        fetchDetail();
    }, [productIdentifier]);

    const fetchDetail = async () => {
        try {
            setLoading(true);
            const result = await productApi.getProductDetail(productIdentifier);
            const productData = result?.data ?? result;
            setProduct(productData);
            setSelectedVariantId(
                productData?.variants?.find(
                    (variant: any) =>
                        variant.id &&
                        (variant.stockQuantity == null || variant.stockQuantity > 0),
                )?.id
                    || null,
            );
        } catch {
            // Mock Fallback
            setProduct({
                id: slug || 'prod-vc',
                name: 'GlowUp Vitamin C Glow Serum',
                brand: 'GlowUp Beauty',
                rating: 4.9,
                reviews_count: 128,
                price: 350000,
                original_price: 450000,
                description: 'Serum dưỡng sáng da GlowUp với 10% Vitamin C nguyên chất kết hợp Niacinamide và Hyaluronic Acid giúp làm mờ vết thâm, cấp ẩm và mang lại làn da căng bóng ngậm nước.',
                variants: [],
                image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
                ingredients: ['Vitamin C 10%', 'Niacinamide 5%', 'Hyaluronic Acid', 'Chiết xuất hoa hồng Rose Berry'],
            });
        } finally {
            setLoading(false);
        }
    };

    const cleanDescription = (product?.description || product?.shortDescription || '')
        .replace(/<[^>]*>?/gm, '')
        .replace(/&nbsp;/g, ' ')
        .trim();

    const isFav = product ? isInWishlist(product.id || slug || 'prod-vc') : false;
    const productImage =
        product?.primaryImage ||
        product?.image_url ||
        product?.images?.[0]?.imageUrl ||
        'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400';
    const selectedVariant = product?.variants?.find(
        (variant: any) => variant.id === selectedVariantId,
    ) || (product?.id ? {
        id: product.defaultVariantId || product.id,
        effectivePrice: product.salePrice || product.price || product.basePrice || 350000,
        price: product.basePrice || product.price || 350000,
        stockQuantity: product.stockQuantity ?? 99,
        sku: 'DEFAULT',
        option1Value: 'Tiêu chuẩn',
    } : null);

    const getVariantLabel = (variant: any) =>
        [variant?.option1Value, variant?.option2Value, variant?.option3Value].filter(Boolean).join(' / ')
        || variant?.sku || 'Tiêu chuẩn';

    const handleToggleHeart = async () => {
        if (!product) return;
        const productId = product.id || slug || 'prod-vc';
        try {
            const added = await toggleWishlist({
                productId,
                slug: product.slug,
                name: product.name,
                brand: product.brandName || product.brand || 'GLOWUP LAB',
                price: product.basePrice || product.price || 350000,
                originalPrice: product.salePrice || product.original_price,
                imageUrl: productImage,
                category: 'Serum',
                rating: product.avgRating || product.rating || 4.9,
                reviewsCount: product.totalReviews || product.reviews_count || 128,
                stockStatus: 'in_stock',
            });

            Alert.alert(
                added ? 'Đã lưu yêu thích ❤️' : 'Đã bỏ yêu thích 💔',
                added
                    ? `"${product.name}" đã được thêm vào bộ sưu tập Wishlist của bạn.`
                    : `"${product.name}" đã được xóa khỏi Wishlist.`
            );
        } catch (error: any) {
            Alert.alert('Không thể cập nhật yêu thích', error?.message || 'Vui lòng thử lại.');
        }
    };

    const handleAddToCart = () => {
        if (!product) return;
        if (!selectedVariant?.id) {
            Alert.alert('Không thể thêm vào giỏ', 'Sản phẩm hiện chưa có biến thể hợp lệ để đặt hàng.');
            return;
        }

        addItem({
            id: selectedVariant.id,
            variantId: selectedVariant.id,
            productId: product.id,
            productName: product.name,
            variantName: getVariantLabel(selectedVariant),
            price: selectedVariant.effectivePrice ?? selectedVariant.price,
            originalPrice: product.basePrice,
            imageUrl: productImage,
            stock: selectedVariant.stockQuantity ?? 0,
        }, 1).then(() => {
            Alert.alert(
                'Thêm thành công',
                `Đã thêm "${product.name} (${getVariantLabel(selectedVariant)})" vào giỏ hàng!`,
                [
                    { text: 'Tiếp tục xem', style: 'cancel' },
                    { text: 'Xem giỏ hàng', onPress: () => navigation.navigate('MainTabs', { screen: 'Giỏ hàng' }) }
                ]
            );
        }).catch((error: any) => {
            Alert.alert(
                'Không thể thêm vào giỏ',
                error?.response?.data?.message || error?.message || 'Vui lòng thử lại.',
            );
        });
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <ScrollView contentContainerStyle={styles.container}>
                {/* Header Bar */}
                <View style={[styles.headerNav, { paddingTop: Math.max(insets.top, SPACING.md) }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleToggleHeart}>
                        <Ionicons
                            name={isFav ? 'heart' : 'heart-outline'}
                            size={24}
                            color={COLORS.primary}
                        />
                    </TouchableOpacity>
                </View>

                {/* Product Image */}
                <Image
                    source={{ uri: productImage }}
                    style={styles.image}
                />

                {/* Info Section */}
                <View style={styles.infoCard}>
                    <Text style={styles.brand}>{product?.brandName || product?.brand || 'GLOWUP'}</Text>
                    <Text style={styles.title}>{product?.name}</Text>

                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                        <Text style={styles.ratingText}>
                            {(product?.avgRating ?? product?.rating ?? 5.0).toFixed(1)} ({product?.totalReviews ?? product?.reviews_count ?? 0} đánh giá)
                        </Text>
                    </View>

                    <View style={styles.priceRow}>
                        <Text style={styles.price}>
                            {(selectedVariant?.effectivePrice ?? selectedVariant?.price ?? product?.basePrice ?? product?.price)?.toLocaleString('vi-VN')}đ
                        </Text>
                        {product?.basePrice && selectedVariant?.effectivePrice && product.basePrice > selectedVariant.effectivePrice ? (
                            <Text style={styles.originalPrice}>
                                {product.basePrice.toLocaleString('vi-VN')}đ
                            </Text>
                        ) : null}
                    </View>

                    {/* Variant Picker */}
                    {product?.variants && product.variants.length > 0 ? (
                        <>
                            <Text style={styles.sectionTitle}>Dung tích / Biến thể:</Text>
                            <View style={styles.variantRow}>
                                {product.variants.map((variant: any) => (
                                    <TouchableOpacity
                                        key={variant.id || variant.sku}
                                        style={[styles.variantChip, selectedVariantId === variant.id && styles.selectedVariantChip]}
                                        onPress={() => setSelectedVariantId(variant.id)}
                                    >
                                        <Text style={[styles.variantText, selectedVariantId === variant.id && styles.selectedVariantText]}>
                                            {getVariantLabel(variant)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    ) : null}

                    {/* Description */}
                    {cleanDescription ? (
                        <>
                            <Text style={styles.sectionTitle}>Mô tả sản phẩm:</Text>
                            <Text style={styles.description}>{cleanDescription}</Text>
                        </>
                    ) : null}

                    {/* Ingredients */}
                    {Array.isArray(product?.ingredients) && product.ingredients.length > 0 ? (
                        <>
                            <Text style={styles.sectionTitle}>Thành phần chính:</Text>
                            {product.ingredients.map((ing: string, i: number) => (
                                <Text key={i} style={styles.ingredientItem}>• {ing}</Text>
                            ))}
                        </>
                    ) : null}
                </View>
            </ScrollView>

            {/* Sticky Bottom Bar */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
                <TouchableOpacity
                    style={styles.addToCartBtn}
                    onPress={handleAddToCart}
                >
                    <Ionicons name="bag-handle-outline" size={20} color={COLORS.surface} style={{ marginRight: 8 }} />
                    <Text style={styles.btnText}>Thêm vào giỏ hàng</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    container: { paddingBottom: 100 },
    headerNav: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.md, marginTop: SPACING.lg },
    image: { width: '100%', height: 280, resizeMode: 'contain' },
    infoCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, marginTop: SPACING.md },
    brand: { color: COLORS.textMuted, fontSize: 12, textTransform: 'uppercase' },
    title: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginVertical: SPACING.xs },
    ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
    ratingText: { marginLeft: 4, color: COLORS.textMuted, fontSize: 13 },
    priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
    price: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary, marginRight: SPACING.sm },
    originalPrice: { fontSize: 14, color: COLORS.textMuted, textDecorationLine: 'line-through' },
    sectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: SPACING.md, marginBottom: SPACING.xs },
    variantRow: { flexDirection: 'row', marginBottom: SPACING.sm },
    variantChip: { backgroundColor: COLORS.background, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: 8, marginRight: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
    selectedVariantChip: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    variantText: { color: COLORS.textPrimary },
    selectedVariantText: { color: COLORS.surface, fontWeight: 'bold' },
    description: { color: COLORS.textPrimary, lineHeight: 20, fontSize: 14 },
    ingredientItem: { color: COLORS.textMuted, fontSize: 13, marginBottom: 2 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
    addToCartBtn: { backgroundColor: COLORS.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: SPACING.md, borderRadius: 12 },
    btnText: { color: COLORS.surface, fontWeight: 'bold', fontSize: 16 },
});
