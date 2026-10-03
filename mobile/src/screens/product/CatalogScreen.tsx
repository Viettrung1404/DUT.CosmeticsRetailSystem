import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import apiClient from '../../api/apiClient';

export default function CatalogScreen({ navigation }: any) {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');

    const categories = ['Tất cả', 'Chăm sóc da', 'Son môi', 'Kem chống nắng', 'Trang điểm'];

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/products');
            setProducts(res.data.data || res.data || []);
        } catch {
            // Mock Fallback Data nếu BE chưa seed xong
            setProducts([
                { id: '1', name: 'Vitamin C Glow Serum 30ml', brand: 'GlowUp', base_price: 450000, sale_price: 350000, slug: 'glowup-vitamin-c-serum' },
                { id: '2', name: 'Kem Chống Nắng Hydra Barrier 50g', brand: 'La Roche-Posay', base_price: 490000, sale_price: 420000, slug: 'hydra-barrier-sunscreen' },
                { id: '3', name: 'Son Dưỡng Ẩm Rose Velvet', brand: 'MAC', base_price: 550000, sale_price: 480000, slug: 'mac-rose-velvet' },
                { id: '4', name: 'Nước Tẩy Trang Micellar Water', brand: 'L\'Oréal', base_price: 220000, sale_price: 180000, slug: 'loreal-micellar' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const renderProductItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ProductDetail', { slug: item.slug })}
        >
            <Image
                source={{ uri: item.image_url || 'https://via.placeholder.com/150' }}
                style={styles.cardImage}
            />
            <Text style={styles.brand}>{item.brand}</Text>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            <View style={styles.priceContainer}>
                <Text style={styles.salePrice}>{(item.sale_price || item.base_price).toLocaleString('vi-VN')}đ</Text>
                {item.sale_price && <Text style={styles.basePrice}>{item.base_price.toLocaleString('vi-VN')}đ</Text>}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Search Header */}
            <TouchableOpacity style={styles.searchHeader} onPress={() => navigation.navigate('Search')}>
                <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
                <Text style={styles.searchText}>Tìm kiếm mỹ phẩm, thương hiệu...</Text>
            </TouchableOpacity>

            {/* Category Pills */}
            <View style={styles.categoryContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={categories}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.chip, activeCategory === item && styles.activeChip]}
                            onPress={() => setActiveCategory(item)}
                        >
                            <Text style={[styles.chipText, activeCategory === item && styles.activeChipText]}>{item}</Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Product Grid */}
            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={products}
                    numColumns={2}
                    keyExtractor={(item) => item.id}
                    renderItem={renderProductItem}
                    contentContainerStyle={styles.listContainer}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingTop: SPACING.xl },
    searchHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, margin: SPACING.md, padding: SPACING.md, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
    searchText: { color: COLORS.textMuted, marginLeft: SPACING.sm },
    categoryContainer: { paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
    chip: { backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 20, marginRight: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
    activeChip: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { color: COLORS.textPrimary, fontSize: 13 },
    activeChipText: { color: COLORS.surface, fontWeight: 'bold' },
    listContainer: { paddingHorizontal: SPACING.xs },
    card: { flex: 1, backgroundColor: COLORS.surface, margin: SPACING.xs, padding: SPACING.sm, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
    cardImage: { width: '100%', height: 130, borderRadius: 8, marginBottom: SPACING.xs },
    brand: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase' },
    productName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, height: 36 },
    priceContainer: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs },
    salePrice: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary, marginRight: SPACING.xs },
    basePrice: { fontSize: 11, color: COLORS.textMuted, textDecorationLine: 'line-through' },
});