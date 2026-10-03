import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import apiClient from '../../api/apiClient';

export default function ProductDetailScreen({ route, navigation }: any) {
    const { slug } = route.params || {};
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedVariant, setSelectedVariant] = useState('30ml');

    useEffect(() => {
        fetchDetail();
    }, [slug]);

    const fetchDetail = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get(`/products/${slug}`);
            setProduct(res.data);
        } catch {
            // Mock Fallback
            setProduct({
                name: 'GlowUp Vitamin C Glow Serum',
                brand: 'GlowUp Beauty',
                rating: 4.9,
                reviews_count: 128,
                price: 350000,
                original_price: 450000,
                description: 'Serum dưỡng sáng da GlowUp với 10% Vitamin C nguyên chất kết hợp Niacinamide và Hyaluronic Acid giúp làm mờ vết thâm, cấp ẩm và mang lại làn da căng bóng ngậm nước.',
                variants: ['30ml', '50ml'],
                ingredients: ['Vitamin C 10%', 'Niacinamide 5%', 'Hyaluronic Acid', 'Chiết xuất hoa hồng Rose Berry'],
            });
        } finally {
            setLoading(false);
        }
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
                <View style={styles.headerNav}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Ionicons name="heart-outline" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                {/* Product Image */}
                <Image
                    source={{ uri: product?.image_url || 'https://via.placeholder.com/300' }}
                    style={styles.image}
                />

                {/* Info Section */}
                <View style={styles.infoCard}>
                    <Text style={styles.brand}>{product?.brand}</Text>
                    <Text style={styles.title}>{product?.name}</Text>

                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                        <Text style={styles.ratingText}>{product?.rating} ({product?.reviews_count} đánh giá)</Text>
                    </View>

                    <View style={styles.priceRow}>
                        <Text style={styles.price}>{product?.price?.toLocaleString('vi-VN')}đ</Text>
                        {product?.original_price && (
                            <Text style={styles.originalPrice}>{product?.original_price?.toLocaleString('vi-VN')}đ</Text>
                        )}
                    </View>

                    {/* Variant Picker */}
                    <Text style={styles.sectionTitle}>Dung tích / Biến thể:</Text>
                    <View style={styles.variantRow}>
                        {product?.variants?.map((v: string) => (
                            <TouchableOpacity
                                key={v}
                                style={[styles.variantChip, selectedVariant === v && styles.selectedVariantChip]}
                                onPress={() => setSelectedVariant(v)}
                            >
                                <Text style={[styles.variantText, selectedVariant === v && styles.selectedVariantText]}>{v}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Description */}
                    <Text style={styles.sectionTitle}>Mô tả sản phẩm:</Text>
                    <Text style={styles.description}>{product?.description}</Text>

                    {/* Ingredients */}
                    <Text style={styles.sectionTitle}>Thành phần chính:</Text>
                    {product?.ingredients?.map((ing: string, i: number) => (
                        <Text key={i} style={styles.ingredientItem}>• {ing}</Text>
                    ))}
                </View>
            </ScrollView>

            {/* Sticky Bottom Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={styles.addToCartBtn}
                    onPress={() => Alert.alert('Thông báo', 'Đã thêm sản phẩm vào giỏ hàng!')}
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