import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

// Các trạng thái đơn hàng theo FR-03.01
type OrderStatus = 'ALL' | 'PENDING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';

interface OrderItem {
  id: string;
  name: string;
  variant: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface Order {
  id: string;
  orderCode: string;
  date: string;
  status: OrderStatus;
  statusText: string;
  items: OrderItem[];
  totalAmount: number;
}

export default function OrderScreen({ navigation }: any) {
  const [selectedTab, setSelectedTab] = useState<OrderStatus>('ALL');

  // Dữ liệu mẫu đơn hàng
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'ord-1',
      orderCode: 'GLOW-849201',
      date: '10/10/2026 14:30',
      status: 'PENDING',
      statusText: 'Chờ xác nhận',
      totalAmount: 730000,
      items: [
        {
          id: 'i1',
          name: 'Tinh Chất Dưỡng Ẩm Serum Hyaluronic Acid GlowUp',
          variant: 'Chai 50ml',
          price: 450000,
          quantity: 1,
          imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
        },
        {
          id: 'i2',
          name: 'Son Kem Lì Velvet Lip Tint Rose Berry',
          variant: 'Màu 03 - Velvet Red',
          price: 280000,
          quantity: 1,
          imageUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400',
        },
      ],
    },
    {
      id: 'ord-2',
      orderCode: 'GLOW-731940',
      date: '08/10/2026 09:15',
      status: 'SHIPPING',
      statusText: 'Đang giao hàng',
      totalAmount: 520000,
      items: [
        {
          id: 'i3',
          name: 'Kem Chống Nắng Nâng Tone Sunscreen SPF50+',
          variant: 'Tuýp 50ml',
          price: 520000,
          quantity: 1,
          imageUrl: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400',
        },
      ],
    },
    {
      id: 'ord-3',
      orderCode: 'GLOW-612084',
      date: '02/10/2026 16:45',
      status: 'DELIVERED',
      statusText: 'Hoàn tất',
      totalAmount: 380000,
      items: [
        {
          id: 'i4',
          name: 'Nước Tẩy Trang Dịu Nhẹ Micellar Water',
          variant: 'Chai 400ml',
          price: 380000,
          quantity: 1,
          imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
        },
      ],
    },
  ]);

  const tabs: { key: OrderStatus; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'PENDING', label: 'Chờ xác nhận' },
    { key: 'SHIPPING', label: 'Đang giao' },
    { key: 'DELIVERED', label: 'Hoàn tất' },
    { key: 'CANCELLED', label: 'Đã hủy' },
  ];

  // Lọc danh sách theo tab được chọn
  const filteredOrders =
    selectedTab === 'ALL'
      ? orders
      : orders.filter((order) => order.status === selectedTab);

  const getStatusBadgeStyle = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return { bg: '#FFF3E0', text: '#E65100' };
      case 'SHIPPING':
        return { bg: '#E3F2FD', text: '#1565C0' };
      case 'DELIVERED':
        return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'CANCELLED':
        return { bg: '#FFEBEE', text: '#C62828' };
      default:
        return { bg: '#F5F5F5', text: '#616161' };
    }
  };

  const handleCancelOrder = (orderId: string, orderCode: string) => {
    Alert.alert(
      'Hủy đơn hàng',
      `Bạn có chắc muốn hủy đơn hàng ${orderCode}?`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy đơn',
          style: 'destructive',
          onPress: () => {
            setOrders((prev) =>
              prev.map((ord) =>
                ord.id === orderId
                  ? { ...ord, status: 'CANCELLED', statusText: 'Đã hủy' }
                  : ord
              )
            );
            Alert.alert('Thành công', `Đơn hàng ${orderCode} đã được hủy.`);
          },
        },
      ]
    );
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const badgeStyle = getStatusBadgeStyle(item.status);
    const firstProduct = item.items[0];

    return (
      <View style={styles.orderCard}>
        {/* Header Thẻ Đơn Hàng */}
        <View style={styles.cardHeader}>
          <View style={styles.codeRow}>
            <Ionicons name="receipt-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.orderCode}>{item.orderCode}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={[styles.statusText, { color: badgeStyle.text }]}>
              {item.statusText}
            </Text>
          </View>
        </View>

        <Text style={styles.dateText}>Thời gian đặt: {item.date}</Text>

        {/* Sản phẩm đại diện */}
        <View style={styles.productSnippet}>
          <Image source={{ uri: firstProduct.imageUrl }} style={styles.productImg} />
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={1}>
              {firstProduct.name}
            </Text>
            <Text style={styles.productVariant}>Phân loại: {firstProduct.variant}</Text>
            <Text style={styles.productPrice}>
              {firstProduct.price.toLocaleString('vi-VN')} đ x {firstProduct.quantity}
            </Text>
          </View>
        </View>

        {item.items.length > 1 && (
          <Text style={styles.moreItemsText}>
            + Xem thêm {item.items.length - 1} sản phẩm khác
          </Text>
        )}

        {/* Tổng tiền & Nút Hành động */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.totalLabel}>Tổng thanh toán:</Text>
            <Text style={styles.totalAmount}>
              {item.totalAmount.toLocaleString('vi-VN')} đ
            </Text>
          </View>

          <View style={styles.actionGroup}>
            {item.status === 'PENDING' && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => handleCancelOrder(item.id, item.orderCode)}
              >
                <Text style={styles.cancelBtnText}>Hủy đơn</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.detailBtn}
              onPress={() =>
                Alert.alert(
                  'Chi tiết đơn hàng',
                  `Mã đơn: ${item.orderCode}\nTrạng thái: ${item.statusText}\nTổng tiền: ${item.totalAmount.toLocaleString('vi-VN')} đ`
                )
              }
            >
              <Text style={styles.detailBtnText}>Chi tiết</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
      </View>

      {/* Thanh Tab lọc trạng thái */}
      <View style={styles.tabContainer}>
        <FlatList
          horizontal
          data={tabs}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t) => t.key}
          renderItem={({ item }) => {
            const isActive = selectedTab === item.key;
            return (
              <TouchableOpacity
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => setSelectedTab(item.key)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Danh sách Đơn hàng */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={70} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>Chưa có đơn hàng nào</Text>
          <Text style={styles.emptySubtitle}>
            Không tìm thấy đơn hàng thuộc trạng thái này.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(ord) => ord.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listPadding}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textDark },
  tabContainer: { backgroundColor: '#FFF', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tabItem: { paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 4, borderRadius: 20 },
  tabItemActive: { backgroundColor: theme.colors.primary },
  tabText: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '500' },
  tabTextActive: { color: '#FFF', fontWeight: '700' },
  listPadding: { padding: 12 },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeRow: { flexDirection: 'row', alignItems: 'center' },
  orderCode: { fontSize: 14, fontWeight: '700', color: theme.colors.textDark, marginLeft: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  dateText: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },
  productSnippet: { flexDirection: 'row', marginTop: 12, backgroundColor: '#FAFAFA', padding: 8, borderRadius: 8 },
  productImg: { width: 50, height: 50, borderRadius: 6, backgroundColor: '#E0E0E0' },
  productInfo: { flex: 1, marginLeft: 10, justifyContent: 'center' },
  productName: { fontSize: 13, fontWeight: '600', color: theme.colors.textDark },
  productVariant: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  productPrice: { fontSize: 12, color: theme.colors.primary, fontWeight: '600', marginTop: 2 },
  moreItemsText: { fontSize: 11, color: theme.colors.textMuted, fontStyle: 'italic', marginTop: 6 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalLabel: { fontSize: 11, color: theme.colors.textMuted },
  totalAmount: { fontSize: 15, fontWeight: '800', color: theme.colors.primary, marginTop: 2 },
  actionGroup: { flexDirection: 'row' },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#E53935',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelBtnText: { color: '#E53935', fontSize: 12, fontWeight: '600' },
  detailBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textDark, marginTop: 12 },
  emptySubtitle: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', marginTop: 4 },
});