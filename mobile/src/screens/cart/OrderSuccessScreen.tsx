import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

export default function OrderSuccessScreen({ route, navigation }: any) {
  const { orderCode, totalAmount, paymentMethod } = route.params || {
    orderCode: 'GLOW-89241',
    totalAmount: 770000,
    paymentMethod: 'Thanh toán khi nhận hàng (COD)',
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.content}>
        {/* Animated Celebration Icon */}
        <View style={styles.successIconCircle}>
          <Ionicons name="checkmark" size={48} color="#FFF" />
        </View>

        <Text style={styles.title}>Đặt Hàng Thành Công!</Text>
        <Text style={styles.subtitle}>
          Cảm ơn bạn đã lựa chọn GlowUp Cosmetics. Kiện hàng đang được chuyển đến bộ phận đóng gói niêm phong.
        </Text>

        {/* Order Card Preview */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <View style={styles.rowAlign}>
              <Ionicons name="receipt-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.orderCodeText}>#{orderCode}</Text>
            </View>
            <View style={styles.badgeSuccess}>
              <Text style={styles.badgeSuccessText}>Chờ xác nhận</Text>
            </View>
          </View>

          <View style={styles.infoLine}>
            <Text style={styles.infoLabel}>Tổng thanh toán:</Text>
            <Text style={styles.totalValue}>{totalAmount.toLocaleString('vi-VN')} đ</Text>
          </View>

          <View style={styles.infoLine}>
            <Text style={styles.infoLabel}>Phương thức:</Text>
            <Text style={styles.infoVal}>{paymentMethod}</Text>
          </View>

          <View style={styles.infoLine}>
            <Text style={styles.infoLabel}>Dự kiến giao hàng:</Text>
            <Text style={[styles.infoVal, { color: theme.colors.primary, fontWeight: '700' }]}>
              Hôm nay (16:00 - 17:30)
            </Text>
          </View>

          <View style={styles.pointsEarnedBox}>
            <Ionicons name="sparkles" size={16} color={theme.colors.tertiary} />
            <Text style={styles.pointsEarnedText}>
              +145 GlowPoints tích lũy vào thẻ VIP của bạn!
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Đơn hàng' })}
        >
          <Ionicons name="cube-outline" size={18} color="#FFF" />
          <Text style={styles.primaryBtnText}>Theo dõi tiến trình đơn hàng</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Trang chủ' })}
        >
          <Ionicons name="arrow-back" size={16} color={theme.colors.textDark} />
          <Text style={styles.secondaryBtnText}>Tiếp tục mua sắm</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.backgroundCanvas,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...theme.shadows.card,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  infoCard: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.md,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.card,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderCodeText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  badgeSuccess: {
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeSuccessText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textDark,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  pointsEarnedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.tertiaryFixed,
    padding: 10,
    borderRadius: theme.rounded.md,
    marginTop: 4,
  },
  pointsEarnedText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.tertiary,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    width: '100%',
    paddingVertical: 14,
    borderRadius: theme.rounded.lg,
    marginBottom: 12,
    ...theme.shadows.soft,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceCard,
    width: '100%',
    paddingVertical: 12,
    borderRadius: theme.rounded.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  secondaryBtnText: {
    color: theme.colors.textDark,
    fontSize: 13,
    fontWeight: '600',
  },
});