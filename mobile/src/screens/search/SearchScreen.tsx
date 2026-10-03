import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';

export default function SearchScreen({ navigation }: any) {
    const [keyword, setKeyword] = useState('');
    const recentSearches = ['Serum Vitamin C', 'Kem chống nắng', 'Son Mac', 'Tẩy trang L\'Oreal'];

    return (
        <View style={styles.container}>
            {/* Search Input Bar */}
            <View style={styles.searchBar}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder="Tìm kiếm sản phẩm, thương hiệu..."
                    value={keyword}
                    onChangeText={setKeyword}
                    autoFocus
                />
                {keyword !== '' && (
                    <TouchableOpacity onPress={() => setKeyword('')}>
                        <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Recent Searches */}
            <Text style={styles.sectionTitle}>Tìm kiếm gần đây</Text>
            <View style={styles.tagContainer}>
                {recentSearches.map((item, index) => (
                    <TouchableOpacity key={index} style={styles.tag} onPress={() => setKeyword(item)}>
                        <Text style={styles.tagText}>{item}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingTop: SPACING.xl, paddingHorizontal: SPACING.md },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: SPACING.sm, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg },
    input: { flex: 1, marginLeft: SPACING.sm, fontSize: 15, color: COLORS.textPrimary },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.sm },
    tagContainer: { flexDirection: 'row', flexWrap: 'wrap' },
    tag: { backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: 16, marginRight: SPACING.xs, marginBottom: SPACING.xs, borderWidth: 1, borderColor: COLORS.border },
    tagText: { color: COLORS.textMuted, fontSize: 13 },
});