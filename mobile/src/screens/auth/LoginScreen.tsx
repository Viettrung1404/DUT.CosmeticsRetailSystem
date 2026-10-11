import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication'; // 1. Import thư viện
import * as SecureStore from 'expo-secure-store';
import { COLORS, SPACING } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

export default function LoginScreen({ navigation }: any) {
  // Điền sẵn thông tin test nhanh
  const [email, setEmail] = useState('customer@glowup.com');
  const [password, setPassword] = useState('12345678');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ Email/SĐT và Mật khẩu.');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
    } catch (err: any) {
      Alert.alert(
        'Đăng nhập thất bại',
        err.response?.data?.message || 'Tài khoản hoặc mật khẩu không chính xác.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 2. Hàm xử lý Đăng nhập bằng Sinh trắc học (FaceID / Vân tay)
  const handleBiometricAuth = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert('Thông báo', 'Thiết bị không hỗ trợ cảm biến sinh trắc học.');
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert('Thông báo', 'Chưa cài đặt Vân tay/FaceID trên thiết bị.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Xác thực Vân tay / Face ID để đăng nhập GlowUp',
        fallbackLabel: 'Dùng Mật khẩu',
        cancelLabel: 'Hủy',
      });

      if (result.success) {
        // Đăng nhập thành công -> Cập nhật State và vào thẳng MainTabs
        await setAuth(
          { email: 'customer@glowup.com', full_name: 'Văn Kim (Test Biometrics)' },
          'mock-test-jwt-token-123456'
        );
        Alert.alert('Thành công', 'Đăng nhập thành công! ✨');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể xác thực sinh trắc học.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: COLORS.background }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Logo & Header */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>GlowUp</Text>
          <Text style={styles.brandSubtitle}>COSMETICS & BEAUTY</Text>
          <Text style={styles.welcomeText}>Chào mừng bạn quay trở lại ✨</Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.label}>Email hoặc Số điện thoại</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="nhap.email@domain.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <Text style={styles.label}>Mật khẩu</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginBtnText}>
              {loading ? 'Đang xử lý...' : 'Đăng nhập'}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Hoặc</Text>
            <View style={styles.divider} />
          </View>

          {/* Nút bấm Đăng nhập bằng Sinh trắc học */}
          <TouchableOpacity style={styles.socialBtn} onPress={handleBiometricAuth}>
            <Ionicons name="finger-print-outline" size={22} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.socialBtnText}>Đăng nhập bằng Sinh trắc học</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Chưa có tài khoản? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  brandTitle: { fontSize: 36, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 1 },
  brandSubtitle: { fontSize: 11, fontWeight: '600', color: COLORS.secondary, letterSpacing: 3, marginTop: -2, marginBottom: SPACING.sm },
  welcomeText: { fontSize: 15, color: COLORS.textMuted },
  formCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, elevation: 2 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.xs, marginTop: SPACING.xs },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  inputIcon: { marginRight: SPACING.xs },
  input: { flex: 1, height: 48, color: COLORS.textPrimary, fontSize: 14 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: SPACING.md },
  forgotText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  loginBtn: { backgroundColor: COLORS.primary, borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: SPACING.xs },
  loginBtnText: { color: COLORS.surface, fontSize: 16, fontWeight: 'bold' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.lg },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { marginHorizontal: SPACING.sm, color: COLORS.textMuted, fontSize: 12 },
  socialBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary, height: 46 },
  socialBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xl },
  footerText: { color: COLORS.textPrimary, fontSize: 14 },
  registerLink: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' },
});