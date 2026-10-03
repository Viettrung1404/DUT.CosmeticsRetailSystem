import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';

export default function OrderScreen() {
    return (
        <View style={styles.center}>
            <Ionicons name="receipt-outline" size={64} color={COLORS.secondary} />
            <Text style={styles.title}>Quản lý Đơn hàng</Text>
            <Text style={styles.subtitle}>Tính năng theo dõi đơn hàng & hành trình vận chuyển sẽ hoàn thiện trong Sprint 2.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: SPACING.lg },
    title: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: SPACING.md },
    subtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xs },
});