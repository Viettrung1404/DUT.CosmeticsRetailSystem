import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Clipboard,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

export default function OrderSuccessScreen({ route, navigation }: any) {
  const {
    orderCode = '',
    totalAmount = 0,
    paymentMethod = '',
    rawPaymentMethod = '',
  } = route.params || {};

  const isSepay =
    rawPaymentMethod === 'SEPAY' ||
    paymentMethod.includes('SePay') ||
    paymentMethod.includes('Chuyển khoản');

  const bankAccount = '0000000001';
  const bankName = 'ACB - Ngân hàng Á Châu';
  const accountHolder = 'CONG TY TNHH GLOWUP';
  const transferContent = orderCode || 'GLW';
  const qrUrl = `https://vietqr.app/img?bank=ACB&acc=${bankAccount}&amount=${totalAmount}&des=${encodeURIComponent(
    transferContent
  )}&holder=${encodeURIComponent(accountHolder)}&template=compact`;

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Đã sao chép', `Đã sao chép ${label}: ${text}`);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Celebration Icon */}
        <View style={styles.successIconCircle}>
          <Ionicons name="checkmark" size={48} color="#FFF" />
        </View>

        <Text style={styles.title}>Đặt Hàng Thành Công!</Text>
        <Text style={styles.subtitle}>
          Cảm ơn bạn đã lựa chọn GlowUp Cosmetics. Kiện hàng đang được chuyển đến
          bộ phận đóng gói niêm phong.
        </Text>

        {/* Order Card Preview */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <View style={styles.rowAlign}>
              <Ionicons
                name="receipt-outline"
                size={18}
                color={theme.colors.primary}
              />
              <Text style={styles.orderCodeText}>#{orderCode}</Text>
            </View>
            <View
              style={[
                styles.badgeSuccess,
                isSepay && styles.badgePendingPayment,
              ]}
            >
              <Text
                style={[
                  styles.badgeSuccessText,
                  isSepay && styles.badgePendingText,
                ]}
              >
                {isSepay ? 'Chờ thanh toán QR' : 'Chờ xác nhận'}
              </Text>
            </View>
          </View>

          <View style={styles.infoLine}>
            <Text style={styles.infoLabel}>Tổng thanh toán:</Text>
            <Text style={styles.totalValue}>
              {totalAmount.toLocaleString('vi-VN')} đ
            </Text>
          </View>

          <View style={styles.infoLine}>
            <Text style={styles.infoLabel}>Phương thức:</Text>
            <Text style={styles.infoVal}>{paymentMethod}</Text>
          </View>

          <View style={styles.infoLine}>
            <Text style={styles.infoLabel}>Dự kiến giao hàng:</Text>
            <Text
              style={[
                styles.infoVal,
                { color: theme.colors.primary, fontWeight: '700' },
              ]}
            >
              Hôm nay (16:00 - 17:30)
            </Text>
          </View>

          <View style={styles.pointsEarnedBox}>
            <Ionicons
              name="sparkles"
              size={16}
              color={theme.colors.tertiary}
            />
            <Text style={styles.pointsEarnedText}>
              +145 GlowPoints tích lũy vào thẻ VIP của bạn!
            </Text>
          </View>
        </View>

        {/* SePay VietQR Transfer Panel */}
        {isSepay && (
          <View style={styles.sepayCard}>
            <View style={styles.sepayHeader}>
              <Ionicons
                name="qr-code-outline"
                size={22}
                color={theme.colors.primary}
              />
              <Text style={styles.sepayTitle}>Quét mã VietQR chuyển khoản</Text>
            </View>
            <Text style={styles.sepaySubtitle}>
              Mở ứng dụng ngân hàng bất kỳ để quét mã QR thanh toán tức thì:
            </Text>

            <View style={styles.qrImageFrame}>
              <Image
                source={{ uri: qrUrl }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.transferDetailRow}>
              <Text style={styles.transferDetailLabel}>Ngân hàng:</Text>
              <Text style={styles.transferDetailValue}>{bankName}</Text>
            </View>

            <View style={styles.transferDetailRow}>
              <Text style={styles.transferDetailLabel}>Số tài khoản:</Text>
              <View style={styles.copyInline}>
                <Text
                  style={[styles.transferDetailValue, { fontWeight: '700' }]}
                >
                  {bankAccount}
                </Text>
                <TouchableOpacity
                  onPress={() => copyToClipboard(bankAccount, 'Số tài khoản')}
                  style={styles.copyPill}
                >
                  <Text style={styles.copyPillText}>Sao chép</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.transferDetailRow}>
              <Text style={styles.transferDetailLabel}>Chủ tài khoản:</Text>
              <Text style={styles.transferDetailValue}>{accountHolder}</Text>
            </View>

            <View style={styles.transferDetailRow}>
              <Text style={styles.transferDetailLabel}>Số tiền:</Text>
              <Text
                style={[
                  styles.transferDetailValue,
                  { color: theme.colors.primary, fontWeight: '700' },
                ]}
              >
                {totalAmount.toLocaleString('vi-VN')} đ
              </Text>
            </View>

            <View style={styles.transferDetailRow}>
              <Text style={styles.transferDetailLabel}>Nội dung CK:</Text>
              <View style={styles.copyInline}>
                <Text
                  style={[
                    styles.transferDetailValue,
                    styles.referenceHighlight,
                  ]}
                >
                  {transferContent}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    copyToClipboard(transferContent, 'Nội dung chuyển khoản')
                  }
                  style={styles.copyPill}
                >
                  <Text style={styles.copyPillText}>Sao chép</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sepayNotice}>
              ⚡ Đơn hàng sẽ được tự động kích hoạt ngay sau khi hệ thống ghi nhận
              giao dịch thành công.
            </Text>
          </View>
        )}

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
          <Ionicons
            name="arrow-back"
            size={16}
            color={theme.colors.textDark}
          />
          <Text style={styles.secondaryBtnText}>Tiếp tục mua sắm</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.backgroundCanvas,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  infoCard: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.md,
    width: '100%',
    marginBottom: 16,
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
  badgePendingPayment: {
    backgroundColor: '#FFF3E0',
  },
  badgePendingText: {
    color: '#E65100',
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
  sepayCard: {
    backgroundColor: '#FFF',
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.md,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    ...theme.shadows.card,
  },
  sepayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sepayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  sepaySubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 12,
    lineHeight: 16,
  },
  qrImageFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: theme.rounded.lg,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  transferDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  transferDetailLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  transferDetailValue: {
    fontSize: 12,
    color: theme.colors.textDark,
  },
  copyInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyPill: {
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  copyPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  referenceHighlight: {
    fontFamily: 'monospace',
    fontWeight: '700',
    color: theme.colors.primary,
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sepayNotice: {
    fontSize: 11,
    color: '#E65100',
    backgroundColor: '#FFF8E1',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
    lineHeight: 15,
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
    marginBottom: 10,
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
    marginBottom: 20,
  },
  secondaryBtnText: {
    color: theme.colors.textDark,
    fontSize: 13,
    fontWeight: '600',
  },
});
