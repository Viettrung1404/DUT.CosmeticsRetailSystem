import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

interface Props {
  navigation: any;
  route?: any;
}

export default function StaffAccessDeniedScreen({ navigation, route }: Props) {
  const { user } = useAuthStore();
  const customMessage = route?.params?.message;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-outline" size={72} color={theme.colors.error} />
        </View>

        <Text style={styles.title}>Từ Chối Quyền Truy Cập</Text>
        <Text style={styles.subTitle}>
          {customMessage ||
            'Phân hệ Vận hành Cửa hàng & Kho chỉ dành cho nhân viên nội bộ (STORE_STAFF, STORE_MGR, ADMIN). Tài khoản khách hàng thông thường không được phép truy cập.'}
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Tài khoản hiện tại:</Text>
          <Text style={styles.infoValue}>{user?.email || 'Chưa đăng nhập'}</Text>
          <Text style={styles.infoLabel}>Vai trò (Role):</Text>
          <Text style={[styles.infoValue, { color: theme.colors.error, fontWeight: '700' }]}>
            {user?.roleName || user?.role || 'Khách hàng (CUSTOMER)'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('MainTabs')}
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryButtonText}>Quay Về Màn Hình Chính</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 28,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 2,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: '#1F2937',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
