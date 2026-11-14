import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useCartStore } from '../../store/useCartStore';

import { orderApi } from '../../api/orderApi';

export default function CheckoutScreen({ navigation }: any) {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const selectedItems = items.filter((i) => i.selected);

  // Form địa chỉ giao hàng
  const [fullName, setFullName] = useState('Thảo Linh Nguyễn');
  const [phoneNumber, setPhoneNumber] = useState('0912 345 678');
  const [address, setAddress] = useState('Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Quận Bình Thạnh');
  const [city, setCity] = useState('TP. Hồ Chí Minh');
  const [deliveryPreference, setDeliveryPreference] = useState<'OFFICE' | 'CALL_15'>('OFFICE');

  // Phương thức vận chuyển
  const [shippingOption, setShippingOption] = useState<'EXPRESS' | 'STANDARD'>('EXPRESS');

  // Phương thức thanh toán (Backend hỗ trợ COD và SEPAY)
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'SEPAY'>('COD');
  const [voucherCode, setVoucherCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteVersion, setQuoteVersion] = useState<string>('');
  const [serverShippingFee, setServerShippingFee] = useState<number | null>(null);
  const [serverDiscount, setServerDiscount] = useState<number>(0);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  const fetchPreview = useCallback(async () => {
    if (selectedItems.length === 0) return;
    try {
      setPreviewLoading(true);
      const res = await orderApi.previewOrder({
        items: selectedItems.map((it) => ({
          variantId: it.variantId || it.id,
          quantity: it.quantity,
        })),
        couponCode: voucherCode.trim() || undefined,
      });
      const data = res?.data || res;
      if (data?.quoteVersion) {
        setQuoteVersion(data.quoteVersion);
      }
      if (typeof data?.shippingFee === 'number') {
        setServerShippingFee(data.shippingFee);
      }
      if (typeof data?.discountAmount === 'number') {
        setServerDiscount(data.discountAmount);
      }
    } catch (err) {
      console.warn('Preview order failed', err);
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedItems, voucherCode]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  // Tính toán chi phí
  const subtotal = getTotalPrice();
  const tierShippingFee = (() => {
    if (serverShippingFee !== null) return serverShippingFee;
    if (subtotal >= 459000) return 0;
    if (subtotal >= 359000) return 5000;
    if (subtotal >= 129000) return 15000;
    return 30000;
  })();
  const shippingFee = shippingOption === 'EXPRESS' ? tierShippingFee + 15000 : tierShippingFee;
  const grandTotal = Math.max(subtotal - serverDiscount + shippingFee, 0);

  const handleApplyVoucher = () => {
    if (!voucherCode.trim()) {
      Alert.alert('Thiếu mã ưu đãi', 'Vui lòng nhập mã ưu đãi trước khi áp dụng.');
      return;
    }
    Alert.alert('Chưa thể áp dụng', 'Mã ưu đãi cần được xác thực với máy chủ trước khi sử dụng.');
  };

  const handlePlaceOrder = async () => {
    if (!fullName.trim() || !phoneNumber.trim() || !address.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ địa chỉ nhận hàng.');
      return;
    }

    if (selectedItems.length === 0) {
      Alert.alert('Giỏ hàng trống', 'Vui lòng chọn ít nhất 1 sản phẩm để đặt hàng.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Đơn hàng lấy các mặt hàng đã chọn từ giỏ hàng phía máy chủ.
      // Lấy báo giá hợp lệ (quoteVersion) nếu chưa có sẵn
      let activeQuoteVersion = quoteVersion;
      if (!activeQuoteVersion) {
        try {
          const previewRes = await orderApi.previewOrder({
            items: selectedItems.map((it) => ({
              variantId: it.variantId || it.id,
              quantity: it.quantity,
            })),
            couponCode: voucherCode.trim() || undefined,
          });
          const previewData = previewRes?.data || previewRes;
          activeQuoteVersion = previewData?.quoteVersion;
        } catch {
          // fallback
        }
      }

      const response = await orderApi.createOrder({
        shippingAddress: {
          recipientName: fullName.trim(),
          phone: phoneNumber.trim(),
          addressLine: address.trim(),
          city: city.trim(),
        },
        paymentMethod: paymentMethod === 'COD' ? 'COD' : 'SEPAY',
        quoteVersion: activeQuoteVersion || undefined,
        note: deliveryPreference === 'OFFICE' ? 'Giao giờ hành chính' : 'Gọi trước 15p',
      });

      const createdOrder = response?.data?.data || response?.data || response;
      const serverOrderCode =
        createdOrder?.orderNumber ||
        createdOrder?.orderCode ||
        createdOrder?.id ||
        'GLW-' + Math.floor(100000 + Math.random() * 900000);

      clearCart();

      navigation.replace('OrderSuccess', {
        orderId: createdOrder?.id,
        rawPaymentMethod: paymentMethod,
        orderCode: serverOrderCode,
        totalAmount: Number.isFinite(Number(createdOrder?.totalAmount))
          ? Number(createdOrder.totalAmount)
          : grandTotal,
        paymentMethod:
          paymentMethod === 'COD'
            ? 'Thanh toán khi nhận hàng (COD)'
            : 'Chuyển khoản SePay (QR Tự Động)',
      });
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể tạo đơn hàng. Vui lòng kiểm tra lại kết nối và thử lại.';
      Alert.alert('Đặt hàng thất bại', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* 1. Header Checkout */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textDark} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Xác Nhận & Thanh Toán</Text>
          <View style={styles.sslBadge}>
            <Ionicons name="lock-closed" size={11} color={theme.colors.primary} />
            <Text style={styles.sslBadgeText}>Bảo mật SSL 256-bit</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Step Progress Indicator */}
        <View style={styles.stepProgressCard}>
          <View style={styles.stepRow}>
            {/* Step 1 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepCircleDone]}>
                <Ionicons name="checkmark" size={12} color="#FFF" />
              </View>
              <Text style={styles.stepDoneLabel}>Giỏ Hàng</Text>
            </View>

            <View style={[styles.stepConnector, styles.stepConnectorActive]} />

            {/* Step 2 */}
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, styles.stepCircleActive]}>
                <Text style={styles.stepActiveNum}>2</Text>
              </View>
              <Text style={styles.stepActiveLabel}>Thanh Toán</Text>
            </View>

            <View style={styles.stepConnector} />

            {/* Step 3 */}
            <View style={styles.stepItem}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepMutedNum}>3</Text>
              </View>
              <Text style={styles.stepMutedLabel}>Hoàn Tất</Text>
            </View>
          </View>
        </View>

        {/* 3. Địa Chỉ Nhận Hàng (Delivery Address Card) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.rowAlign}>
              <View style={styles.iconCircle}>
                <Ionicons name="location" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Địa chỉ giao hàng</Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('AddressList', {
                  isSelectMode: true,
                  onSelectAddress: (addr: any) => {
                    setFullName(addr.recipientName);
                    setPhoneNumber(addr.phone);
                    setAddress(addr.addressLine);
                    setCity(addr.city + (addr.district ? `, ${addr.district}` : ''));
                  },
                })
              }
            >
              <Text style={styles.linkText}>Chọn từ Sổ địa chỉ</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Họ và tên người nhận</Text>
            <TextInput
              style={styles.textInput}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nhập họ và tên..."
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số điện thoại</Text>
            <TextInput
              style={styles.textInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholder="Nhập số điện thoại..."
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Địa chỉ chi tiết (Số nhà, tên đường)</Text>
            <TextInput
              style={styles.textInput}
              value={address}
              onChangeText={setAddress}
              placeholder="Số nhà, tòa nhà, tên đường..."
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tỉnh / Thành phố, Quận / Huyện</Text>
            <TextInput
              style={styles.textInput}
              value={city}
              onChangeText={setCity}
              placeholder="Tỉnh/Thành phố..."
            />
          </View>

          {/* Delivery Note Pills */}
          <Text style={[styles.inputLabel, { marginTop: 6 }]}>Ghi chú giao hàng chuyên biệt:</Text>
          <View style={styles.pillsRow}>
            <TouchableOpacity
              style={[styles.pillBtn, deliveryPreference === 'OFFICE' && styles.pillBtnActive]}
              onPress={() => setDeliveryPreference('OFFICE')}
            >
              <Ionicons
                name="time-outline"
                size={14}
                color={deliveryPreference === 'OFFICE' ? '#FFF' : theme.colors.textDark}
              />
              <Text style={[styles.pillText, deliveryPreference === 'OFFICE' && styles.pillTextActive]}>
                Giao giờ hành chính
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pillBtn, deliveryPreference === 'CALL_15' && styles.pillBtnActive]}
              onPress={() => setDeliveryPreference('CALL_15')}
            >
              <Ionicons
                name="call-outline"
                size={14}
                color={deliveryPreference === 'CALL_15' ? '#FFF' : theme.colors.textDark}
              />
              <Text style={[styles.pillText, deliveryPreference === 'CALL_15' && styles.pillTextActive]}>
                Gọi trước khi giao 15p
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Phương Thức Vận Chuyển Mỹ Phẩm (Shipping Options) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.rowAlign}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.tertiaryFixed }]}>
                <Ionicons name="bicycle" size={16} color={theme.colors.tertiary} />
              </View>
              <Text style={styles.cardTitle}>Vận chuyển chuyên biệt</Text>
            </View>
          </View>

          {/* Option 1: Hỏa tốc 2H Silk-Drop */}
          <TouchableOpacity
            style={[styles.shippingOptionBox, shippingOption === 'EXPRESS' && styles.shippingOptionSelected]}
            onPress={() => setShippingOption('EXPRESS')}
          >
            <View style={styles.radioIndicator}>
              {shippingOption === 'EXPRESS' && <View style={styles.radioInner} />}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={styles.rowAlign}>
                <Text style={styles.shippingTitle}>Hỏa tốc 2H Silk-Drop</Text>
                <View style={styles.coolBadge}>
                  <Ionicons name="snow-outline" size={11} color={theme.colors.tertiary} />
                  <Text style={styles.coolBadgeText}>Bảo quản mát 24°C</Text>
                </View>
              </View>
              <Text style={styles.shippingDesc}>
                Khuyên dùng cho Mỹ phẩm & Serum hoạt tính (Giao trước 17:30 hôm nay)
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.freePriceText}>0 đ</Text>
              <Text style={styles.oldPriceText}>35.000 đ</Text>
            </View>
          </TouchableOpacity>

          {/* Option 2: Tiêu chuẩn */}
          <TouchableOpacity
            style={[styles.shippingOptionBox, shippingOption === 'STANDARD' && styles.shippingOptionSelected]}
            onPress={() => setShippingOption('STANDARD')}
          >
            <View style={styles.radioIndicator}>
              {shippingOption === 'STANDARD' && <View style={styles.radioInner} />}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.shippingTitle}>Giao Tiêu Chuẩn Toàn Quốc</Text>
              <Text style={styles.shippingDesc}>Nhận hàng trong vòng 2-3 ngày làm việc</Text>
            </View>
            <Text style={styles.shippingDesc}>Miễn phí 0đ</Text>
          </TouchableOpacity>
        </View>

        {/* 5. Tóm Tắt Kiện Hàng */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.rowAlign}>
              <View style={styles.iconCircle}>
                <Ionicons name="bag-handle" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Kiện hàng ({selectedItems.length} món)</Text>
            </View>
            <Text style={styles.subLabel}>Kiểm tra trước khi thanh toán</Text>
          </View>

          {selectedItems.map((item) => (
            <View key={item.id} style={styles.orderItemRow}>
              <Image source={{ uri: item.imageUrl }} style={styles.itemThumb} />
              <View style={styles.itemMeta}>
                <Text style={styles.itemName} numberOfLines={1}>{item.productName}</Text>
                <Text style={styles.itemVariant}>{item.variantName}</Text>
                <View style={styles.rowBetween}>
                  <Text style={styles.itemPriceText}>{item.price.toLocaleString('vi-VN')} đ</Text>
                  <Text style={styles.itemQty}>SL: {item.quantity}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* 6. Phương Thức Thanh Toán */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.rowAlign}>
              <View style={styles.iconCircle}>
                <Ionicons name="card" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Phương thức thanh toán</Text>
            </View>
          </View>

          {/* COD */}
          <TouchableOpacity
            style={[styles.paymentBox, paymentMethod === 'COD' && styles.paymentBoxSelected]}
            onPress={() => setPaymentMethod('COD')}
          >
            <Ionicons
              name={paymentMethod === 'COD' ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={paymentMethod === 'COD' ? theme.colors.primary : theme.colors.textMuted}
            />
            <Ionicons name="cash-outline" size={22} color="#2E7D32" style={{ marginLeft: 10 }} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.paymentName}>Thanh toán khi nhận hàng (COD)</Text>
              <Text style={styles.paymentSub}>Kiểm tra hàng và thanh toán tiền mặt</Text>
            </View>
          </TouchableOpacity>

          {/* SePay / Chuyển khoản QR */}
          <TouchableOpacity
            style={[styles.paymentBox, paymentMethod === 'SEPAY' && styles.paymentBoxSelected]}
            onPress={() => setPaymentMethod('SEPAY')}
          >
            <Ionicons
              name={paymentMethod === 'SEPAY' ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={paymentMethod === 'SEPAY' ? theme.colors.primary : theme.colors.textMuted}
            />
            <Ionicons name="qr-code-outline" size={22} color="#1565C0" style={{ marginLeft: 10 }} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.paymentName}>Chuyển khoản SePay</Text>
                <View style={styles.hotBadge}>
                  <Text style={styles.hotBadgeText}>Tự động 24/7</Text>
                </View>
              </View>
              <Text style={styles.paymentSub}>Quét mã QR qua ứng dụng Ngân hàng</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 7. Mã Giảm Giá & Voucher */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mã ưu đãi GlowUp</Text>
          <View style={styles.voucherInputRow}>
            <TextInput
              style={styles.voucherInput}
              value={voucherCode}
              onChangeText={setVoucherCode}
              placeholder="Nhập mã voucher..."
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.applyVoucherBtn} onPress={handleApplyVoucher}>
              <Text style={styles.applyVoucherText}>Áp dụng</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 8. Bảng Tổng Kết Chi Phí */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tóm tắt đơn hàng</Text>

          <View style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>Tiền hàng tạm tính:</Text>
            <Text style={styles.summaryVal}>{subtotal.toLocaleString('vi-VN')} đ</Text>
          </View>

          <View style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>Phí vận chuyển:</Text>
            <Text style={[styles.summaryVal, shippingFee === 0 && { color: theme.colors.success }]}>
              {shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString('vi-VN')} đ`}
            </Text>
          </View>

          <View style={[styles.summaryLine, styles.totalLine]}>
            <Text style={styles.totalLabel}>Tổng thanh toán:</Text>
            <Text style={styles.totalVal}>{grandTotal.toLocaleString('vi-VN')} đ</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Footer Thanh Đặt Hàng Cố Định */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerTotalLabel}>Tổng thanh toán:</Text>
          <Text style={styles.footerTotalValue}>{grandTotal.toLocaleString('vi-VN')} đ</Text>
        </View>

        <TouchableOpacity
          style={[styles.orderBtn, isSubmitting && { opacity: 0.7 }]}
          onPress={handlePlaceOrder}
          disabled={isSubmitting}
        >
          <Ionicons name="shield-checkmark-outline" size={16} color="#FFF" />
          <Text style={styles.orderBtnText}>
            {isSubmitting ? 'Đang tạo đơn...' : 'Đặt hàng ngay'}
          </Text>
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
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  backBtn: {
    padding: 6,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  sslBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  sslBadgeText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: 12,
  },

  /* Step Progress */
  stepProgressCard: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.soft,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleDone: {
    backgroundColor: theme.colors.primary,
  },
  stepCircleActive: {
    backgroundColor: theme.colors.primary,
  },
  stepActiveNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  stepMutedNum: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  stepDoneLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  stepActiveLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  stepMutedLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.borderSubtle,
    marginHorizontal: 8,
  },
  stepConnectorActive: {
    backgroundColor: theme.colors.primary,
  },

  /* Cards */
  card: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.card,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  linkText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  subLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  /* Input fields */
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textDark,
  },
  textInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.rounded.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: theme.colors.textDark,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  pillBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  pillText: {
    fontSize: 11,
    color: theme.colors.textDark,
  },
  pillTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },

  /* Shipping Option */
  shippingOptionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: theme.rounded.lg,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  shippingOptionSelected: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderColor: theme.colors.primaryFixedDim,
  },
  radioIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  shippingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  coolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: theme.colors.tertiaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  coolBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.tertiary,
  },
  shippingDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  freePriceText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  oldPriceText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
  },

  /* Item Row */
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    gap: 10,
  },
  itemThumb: {
    width: 48,
    height: 48,
    borderRadius: theme.rounded.md,
    backgroundColor: theme.colors.surfaceContainer,
  },
  itemMeta: {
    flex: 1,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textDark,
  },
  itemVariant: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  itemPriceText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  itemQty: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  /* Payment */
  paymentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: theme.rounded.md,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  paymentBoxSelected: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderColor: theme.colors.primaryFixedDim,
  },
  paymentName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  paymentSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  hotBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hotBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1565C0',
  },

  /* Voucher */
  voucherInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  voucherInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.rounded.md,
    paddingHorizontal: 12,
    fontSize: 12,
    color: theme.colors.textDark,
    fontWeight: '700',
  },
  applyVoucherBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.rounded.md,
    justifyContent: 'center',
  },
  applyVoucherText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Summary */
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textDark,
  },
  totalLine: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  totalVal: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    backgroundColor: theme.colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    ...theme.shadows.elevated,
  },
  footerTotalLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  footerTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  orderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.rounded.lg,
  },
  orderBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});