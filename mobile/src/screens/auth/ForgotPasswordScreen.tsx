import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import apiClient from '../../api/apiClient';

export default function ForgotPasswordScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendRecovery = async () => {
        if (!email) {
            Alert.alert('Lỗi', 'Vui lòng nhập Email của bạn.');
            return;
        }
        try {
            setLoading(true);
            await apiClient.post('/auth/forgot-password', { email });
            Alert.alert('Thành công', 'Hướng dẫn khôi phục mật khẩu đã được gửi đến email của bạn.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') },
            ]);
        } catch (err: any) {
            Alert.alert('Thất bại', err.response?.data?.message || 'Email không tồn tại trong hệ thống.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Khôi phục Mật khẩu</Text>
            <Text style={styles.subtitle}>Nhập email đã đăng ký để nhận liên kết khôi phục</Text>

            <TextInput
                style={styles.input}
                placeholder="Nhập Email của bạn"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            <TouchableOpacity style={styles.button} onPress={handleSendRecovery} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Đang gửi...' : 'Gửi liên kết khôi phục'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>Quay lại <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Đăng nhập</Text></Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg, justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center', marginBottom: SPACING.xs },
    subtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.xl },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
    button: { backgroundColor: COLORS.primary, borderRadius: 12, padding: SPACING.md, alignItems: 'center' },
    buttonText: { color: COLORS.surface, fontWeight: 'bold', fontSize: 16 },
    linkButton: { marginTop: SPACING.lg, alignItems: 'center' },
    linkText: { color: COLORS.textPrimary, fontSize: 14 },
});