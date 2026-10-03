import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

export default function ProfileScreen() {
    const { user, logout } = useAuthStore();

    return (
        <View style={styles.center}>
            <Ionicons name="person-circle-outline" size={80} color={COLORS.primary} />
            <Text style={styles.title}>{user?.full_name || 'Khách hàng GlowUp'}</Text>
            <Text style={styles.subtitle}>{user?.email}</Text>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: SPACING.lg },
    title: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: SPACING.sm },
    subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: SPACING.xl },
    logoutBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: 12 },
    logoutText: { color: COLORS.surface, fontWeight: 'bold' },
});