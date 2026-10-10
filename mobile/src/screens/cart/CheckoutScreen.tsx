import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useCartStore } from '../../store/useCartStore';

export default function CheckoutScreen({ navigation }: any) {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const selectedItems = items.filter((i) => i.selected);

  // Form địa chỉ giao hàng
  const [fullName, setFullName] = useState('Văn Kim');
  const [phoneNumber, setPhoneNumber] = useState('0905123456');
  const [address, setAddress] = useState('54 Nguyễn Lương Bằng, Phường Hòa Khánh Bắc');
  const [city, setCity] = useState('Quận Liên Chiểu, Đà Nẵng');

  // Phương thức thanh toán (COD mặc định)
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'VNPAY'>('COD');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tính toán chi phí
  const subtotal = getTotalPrice();
  const shippingFee = subtotal >= 500000 || subtotal === 0 ? 0 : 30000;
  const grandTotal = subtotal + shippingFee;

  const handlePlaceOrder = () => {
    if (!fullName.trim() || !phoneNumber.trim() || !address.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ địa chỉ nhận hàng.');
      return;
    }

    setIsSubmitting(true);

    // Giả lập gửi API POST /api/v1/orders
    setTimeout(() => {
      setIsSubmitting(false);
      const mockOrderCode = `GLOW-${Math.floor(100000 + Math.random() * 900000)}`;

      // Dọn sạch giỏ hàng sau khi đặt thành công
      clearCart();

      // Chuyển tới màn hình Đặt hàng thành công
      navigation.replace('OrderSuccess', {
        orderCode: mockOrderCode,
        totalAmount: grandTotal,
        paymentMethod: paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : 'VnPay',
      });
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận thanh toán</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 1. Địa chỉ nhận hàng */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Địa chỉ nhận hàng</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Họ và tên người nhận</Text>
            <TextInput
              style={styles.textInput}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nhập họ tên"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số điện thoại</Text>
            <TextInput
              style={styles.textInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholder="Nhập số điện thoại"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Địa chỉ chi tiết</Text>
            <TextInput
              style={styles.textInput}
              value={address}
              onChangeText={setAddress}
              placeholder="Số nhà, tên đường..."
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tỉnh / Thành phố, Quận / Huyện</Text>
            <TextInput
              style={styles.textInput}
              value={city}
              onChangeText={setCity}
              placeholder="Tỉnh/Thành phố"
            />
          </View>
        </View>

        {/* 2. Danh sách sản phẩm thanh toán */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bag-handle-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Sản phẩm đơn hàng ({selectedItems.length})</Text>
          </View>

          {selectedItems.map((item) => (
            <View key={item.id} style={styles.orderItemRow}>
              <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.productName}
                </Text>
                <Text style={styles.itemVariant}>Phân loại: {item.variantName}</Text>
                <Text style={styles.itemPrice}>
                  {item.price.toLocaleString('vi-VN')} đ x {item.quantity}
                </Text>
              </View>
              <Text style={styles.itemSubtotal}>
                {(item.price * item.quantity).toLocaleString('vi-VN')} đ
              </Text>
            </View>
          ))}
        </View>

        {/* 3. Phương thức thanh toán */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'COD' && styles.paymentOptionSelected,
            ]}
            onPress={() => setPaymentMethod('COD')}
          >
            <Ionicons
              name={paymentMethod === 'COD' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={paymentMethod === 'COD' ? theme.colors.primary : theme.colors.textMuted}
            />
            <Ionicons name="cash-outline" size={24} color="#2E7D32" style={{ marginLeft: 10 }} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.paymentTitle}>Thanh toán khi nhận hàng (COD)</Text>
              <Text style={styles.paymentSub}>Thanh toán tiền mặt cho shipper khi giao hàng</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'VNPAY' && styles.paymentOptionSelected,
              { opacity: 0.6 },
            ]}
            onPress={() =>
              Alert.alert('Thông báo', 'Cổng VNPay sẽ được tích hợp trong phiên bản tiếp theo.')
            }
          >
            <Ionicons name="radio-button-off" size={20} color={theme.colors.textMuted} />
            <Ionicons name="qr-code-outline" size={24} color="#1565C0" style={{ marginLeft: 10 }} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.paymentTitle}>Ví VNPay / QR Code (Sắp ra mắt)</Text>
              <Text style={styles.paymentSub}>Thanh toán online qua ứng dụng ngân hàng</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 4. Tổng kết chi phí */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Tóm tắt thanh toán</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tiền hàng tạm tính:</Text>
            <Text style={styles.summaryValue}>{subtotal.toLocaleString('vi-VN')} đ</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phí vận chuyển:</Text>
            <Text style={styles.summaryValue}>
              {shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString('vi-VN')} đ`}
            </Text>
          </View>

          {subtotal >= 500000 && (
            <Text style={styles.freeShipNote}>
              🎉 Đơn hàng từ 500k được miễn phí vận chuyển!
            </Text>
          )}

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Tổng thanh toán:</Text>
            <Text style={styles.totalValue}>{grandTotal.toLocaleString('vi-VN')} đ</Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Thanh đặt hàng cố định */}
      <View style={styles.footerBar}>
        <View style={styles.footerTotalContainer}>
          <Text style={styles.footerTotalLabel}>Tổng thanh toán:</Text>
          <Text style={styles.footerTotalValue}>{grandTotal.toLocaleString('vi-VN')} đ</Text>
        </View>

        <TouchableOpacity
          style={[styles.placeOrderBtn, isSubmitting && { opacity: 0.7 }]}
          disabled={isSubmitting}
          onPress={handlePlaceOrder}
        >
          <Text style={styles.placeOrderText}>
            {isSubmitting ? 'Đang xử lý...' : 'Đặt hàng (COD)'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textDark },
  content: { flex: 1, padding: 12 },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textDark, marginLeft: 6 },
  inputGroup: { marginBottom: 10 },
  inputLabel: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 4 },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.textDark,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  itemImage: { width: 50, height: 50, borderRadius: 6, backgroundColor: '#F0F0F0' },
  itemInfo: { flex: 1, marginLeft: 10 },
  itemName: { fontSize: 13, fontWeight: '600', color: theme.colors.textDark },
  itemVariant: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  itemPrice: { fontSize: 12, color: theme.colors.textDark, marginTop: 2 },
  itemSubtotal: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    marginBottom: 8,
  },
  paymentOptionSelected: { borderColor: theme.colors.primary, backgroundColor: '#FFF9FA' },
  paymentTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.textDark },
  paymentSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  summaryLabel: { fontSize: 13, color: theme.colors.textMuted },
  summaryValue: { fontSize: 13, fontWeight: '600', color: theme.colors.textDark },
  freeShipNote: { fontSize: 11, color: '#2E7D32', marginTop: 4, fontWeight: '500' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#EEEEEE', paddingTop: 8, marginTop: 8 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: theme.colors.textDark },
  totalValue: { fontSize: 17, fontWeight: '800', color: theme.colors.primary },
  footerBar: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerTotalContainer: { flex: 1 },
  footerTotalLabel: { fontSize: 11, color: theme.colors.textMuted },
  footerTotalValue: { fontSize: 17, fontWeight: '800', color: theme.colors.primary },
  placeOrderBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  placeOrderText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});