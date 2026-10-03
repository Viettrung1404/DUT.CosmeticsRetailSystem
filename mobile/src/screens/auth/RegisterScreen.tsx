import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import apiClient from '../../api/apiClient';

export default function RegisterScreen({ navigation }: any) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!fullName || !email || !password) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các thông tin bắt buộc.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
            return;
        }

        try {
            setLoading(true);
            await apiClient.post('/auth/register', {
                full_name: fullName,
                email,
                phone,
                password,
            });
            Alert.alert('Thành công', 'Đăng ký tài khoản thành công! Vui lòng đăng nhập.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') },
            ]);
        } catch (err: any) {
            Alert.alert('Đăng ký thất bại', err.response?.data?.message || 'Có lỗi xảy ra.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>GlowUp Cosmetics</Text>
            <Text style={styles.subtitle}>Tạo tài khoản mới</Text>

            <TextInput
                style={styles.input}
                placeholder="Họ và tên *"
                value={fullName}
                onChangeText={setFullName}
            />
            <TextInput
                style={styles.input}
                placeholder="Email *"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                style={styles.input}
                placeholder="Số điện thoại"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
            />
            <TextInput
                style={styles.input}
                placeholder="Mật khẩu (tối thiểu 8 ký tự) *"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />
            <TextInput
                style={styles.input}
                placeholder="Xác nhận mật khẩu *"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
            />

            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Đang xử lý...' : 'Đăng ký'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>Đã có tài khoản? <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Đăng nhập ngay</Text></Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: COLORS.background, padding: SPACING.lg, justifyContent: 'center' },
    title: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center', marginBottom: SPACING.xs },
    subtitle: { fontSize: 16, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.xl },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
    button: { backgroundColor: COLORS.primary, borderRadius: 12, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.sm },
    buttonText: { color: COLORS.surface, fontWeight: 'bold', fontSize: 16 },
    linkButton: { marginTop: SPACING.lg, alignItems: 'center' },
    linkText: { color: COLORS.textPrimary, fontSize: 14 },
});