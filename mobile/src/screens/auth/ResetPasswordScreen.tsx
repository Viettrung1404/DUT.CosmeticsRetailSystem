import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { validateResetPasswordForm } from '../../utils/validation';
import apiClient from '../../api/apiClient';

export default function ResetPasswordScreen({ navigation, route }: any) {
  const email = route.params?.email || 'user@glowup.vn';

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleReset = async () => {
    const validation = validateResetPasswordForm({
      otp,
      newPassword,
      confirmPassword,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await apiClient.post('/auth/reset-password', {
        email,
        otp: otp.trim(),
        newPassword,
      });

      Alert.alert(
        'Đổi Mật Khẩu Thành Công',
        'Mật khẩu của bạn đã được cập nhật thành công. Vui lòng đăng nhập bằng mật khẩu mới.',
        [
          {
            text: 'Đăng Nhập Ngay',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        'Không thể cập nhật mật khẩu. Vui lòng kiểm tra lại mã OTP hoặc thử lại sau.';
      Alert.alert('Thất Bại', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đặt Lại Mật Khẩu</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconCircle}>
          <Ionicons name="key-outline" size={40} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>Tạo Mật Khẩu Mới</Text>
        <Text style={styles.subtitle}>
          Mã xác thực gồm 6 chữ số đã được gửi tới email{' '}
          <Text style={{ fontWeight: '700', color: COLORS.textDark }}>{email}</Text>. Vui lòng nhập mã và thiết lập mật khẩu mới.
        </Text>

        {/* Ô nhập OTP 6 số */}
        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Mã xác thực OTP (6 chữ số) *</Text>
          <TextInput
            style={[styles.input, styles.otpInput, errors.otp && styles.inputError]}
            placeholder="• • • • • •"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={(text) => {
              setOtp(text);
              if (errors.otp) setErrors((e) => ({ ...e, otp: '' }));
            }}
          />
          {errors.otp ? <Text style={styles.errorText}>{errors.otp}</Text> : null}
        </View>

        {/* Mật khẩu mới */}
        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Mật khẩu mới (tối thiểu 6 ký tự) *</Text>
          <View style={[styles.passwordWrapper, errors.newPassword && styles.inputError]}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Nhập mật khẩu mới"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPass}
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (errors.newPassword) setErrors((e) => ({ ...e, newPassword: '' }));
              }}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Ionicons
                name={showPass ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>
          {errors.newPassword ? (
            <Text style={styles.errorText}>{errors.newPassword}</Text>
          ) : null}
        </View>

        {/* Xác nhận mật khẩu mới */}
        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Xác nhận mật khẩu mới *</Text>
          <View style={[styles.passwordWrapper, errors.confirmPassword && styles.inputError]}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Nhập lại mật khẩu mới"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPass}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors((e) => ({ ...e, confirmPassword: '' }));
              }}
            />
          </View>
          {errors.confirmPassword ? (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          ) : null}
        </View>

        {/* Nút gửi */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Xác Nhận Đổi Mật Khẩu</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textBody,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  formGroup: {
    width: '100%',
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: COLORS.textDark,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 10,
    fontWeight: '700',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  submitBtn: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

