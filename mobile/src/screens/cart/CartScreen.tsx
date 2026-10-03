import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';

export default function CartScreen() {
    return (
        <View style={styles.center}>
            <Ionicons name="bag-handle-outline" size={64} color={COLORS.primary} />
            <Text style={styles.title}>Giỏ hàng của bạn</Text>
            <Text style={styles.subtitle}>Tính năng quản lý giỏ hàng & Checkout sẽ hoàn thiện trong Sprint 2.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: SPACING.lg },
    title: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: SPACING.md },
    subtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xs },
});