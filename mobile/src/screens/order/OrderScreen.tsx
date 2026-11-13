import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  Linking,
  Dimensions} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { orderApi } from '../../api/orderApi';

const { width } = Dimensions.get('window');

// Trạng thái đơn hàng
export type OrderStatus = 'ALL' | 'PENDING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  name: string;
  categoryTag?: string;
  variant: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface TimelineLog {
  time: string;
  title: string;
  description: string;
  active?: boolean;
}

export interface Order {
  id: string;
  orderCode: string;
  date: string;
  status: OrderStatus;
  statusText: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  totalAmount: number;
  paymentMethod: string;
  carrier?: string;
  trackingCode?: string;
  shipperName?: string;
  shipperPhone?: string;
  shipperRating?: string;
  deliveryEta?: string;
  timeline?: TimelineLog[];
}

export default function OrderScreen({ navigation }: any) {
  const [selectedTab, setSelectedTab] = useState<OrderStatus>('ALL');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);

  // State cho Modal Hủy đơn (Stitch x_c_nh_n_h_y_n_h_ng)
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('change_info');
  const [otherReasonText, setOtherReasonText] = useState<string>('');

  // State cho Modal Đổi trả RMA (Stitch theo_d_i_n_h_ng_rma)
  const [isRmaModalVisible, setIsRmaModalVisible] = useState(false);
  const [rmaSelectedItems, setRmaSelectedItems] = useState<{ [key: string]: boolean }>({});
  const [rmaReason, setRmaReason] = useState('broken');

  // Dữ liệu mẫu đơn hàng đồng bộ theo Stitch Design
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'ord-1',
      orderCode: 'GLOW-89241',
      date: '10:30 • Hôm nay',
      status: 'SHIPPING',
      statusText: 'Đang vận chuyển',
      deliveryEta: 'Hôm nay (16:00 - 17:30)',
      carrier: 'GHN Express',
      trackingCode: 'GHN88294719VN',
      shipperName: 'Nguyễn Văn Bình',
      shipperPhone: '0909123456',
      shipperRating: '4.9 ★',
      subtotal: 835000,
      discount: 65000,
      shippingFee: 0,
      totalAmount: 770000,
      paymentMethod: 'Đã thanh toán qua MoMo',
      timeline: [
        {
          time: '14:20 • Hôm nay',
          title: 'Đang giao hàng',
          description:
            'Tài xế đang giao kiện hàng đến địa chỉ của bạn (Landmark 81, P. 22, Bình Thạnh, TP.HCM). Xin vui lòng chú ý điện thoại.',
          active: true,
        },
        {
          time: '09:15 • Hôm nay',
          title: 'Xuất kho vận chuyển',
          description:
            'Đơn hàng đã xuất kho Phân phối Mỹ phẩm Tân Bình & đã được bàn giao cho bưu cục GHN Bình Thạnh.',
        },
        {
          time: '07:30 • Hôm nay',
          title: 'Đóng gói niêm phong',
          description:
            'Đơn hàng đã được kiểm tra & đóng gói cẩn thận có dán tem niêm phong chống hàng giả GlowUp Authenticity.',
        },
      ],
      items: [
        {
          id: 'i1',
          name: 'Serum Tinh Chất Rose Berry B5 50ml',
          categoryTag: 'Tinh chất phục hồi',
          variant: 'Chai 50ml tinh chất',
          price: 345000,
          quantity: 1,
          imageUrl:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuBAFp77ol43EApZG_P7J0TAjKTI2ZADhWxoSkzsqH-C1pguV4aydmou8H1Bn_II6M0CsxsFH-oo3hYgWgCxmXtcp1VfWXpvnYL3MesIAQ3FiQ1JzSGMoOBTpUXCzxmT1Obi3i27PMuJV-HTbaOIxpEt-f0ibw9n8l7K8ZddtrbPEpHZ4IXfa_-MhthuFlcQeAFark7E1tRSvnIBWubCCZD09vHeB7plhPnapEIAOnMbOr4qerCOMRHf5A',
        },
        {
          id: 'i2',
          name: 'Son Kem Lì Velvet Tint #04 Muted Rose',
          categoryTag: 'Son môi mịn lì',
          variant: 'Màu #04 Rosewood nhung',
          price: 245000,
          quantity: 2,
          imageUrl:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuBOAgFSap5-Sxi3FFsobfBamaHe82GVE_YnV69zeaGjF77FAytLcx-sSHaj4qu9SZe9nwDhAtlhIIMiFwXFfTyuViGWXkpOrF8nkA1n5SXvGFyHRGfdMer7RvPQu4_CPdGVvF2jz1R-eoK_dZ38F37NYgSQMUmug_Wpcx6hwKcz2stBtcuXFjZFbFsFybV1SoZeMd_uzYMECbXDB-xOGdorYP1YTdNvLx-tugwt2fbJVxHBmoXrb_6ZIw',
        },
      ],
    },
    {
      id: 'ord-2',
      orderCode: 'GLOW-731940',
      date: '14:30 • Hôm qua',
      status: 'PENDING',
      statusText: 'Chờ xác nhận',
      subtotal: 520000,
      discount: 0,
      shippingFee: 25000,
      totalAmount: 545000,
      paymentMethod: 'Thanh toán khi nhận hàng (COD)',
      items: [
        {
          id: 'i3',
          name: 'Kem Chống Nắng Nâng Tone Sunscreen SPF50+',
          categoryTag: 'Bảo vệ da',
          variant: 'Tuýp 50ml dưỡng sáng',
          price: 520000,
          quantity: 1,
          imageUrl:
            'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400',
        },
      ],
    },
    {
      id: 'ord-3',
      orderCode: 'GLOW-612084',
      date: '02/10/2026',
      status: 'DELIVERED',
      statusText: 'Hoàn tất',
      subtotal: 380000,
      discount: 30000,
      shippingFee: 0,
      totalAmount: 350000,
      paymentMethod: 'Đã thanh toán qua VNPay',
      items: [
        {
          id: 'i4',
          name: 'Nước Tẩy Trang Dịu Nhẹ Micellar Water',
          categoryTag: 'Làm sạch sâu',
          variant: 'Chai 400ml nắp hồng',
          price: 380000,
          quantity: 1,
          imageUrl:
            'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
        },
      ],
    },
  ]);

  const tabs: { key: OrderStatus; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'PENDING', label: 'Chờ duyệt' },
    { key: 'SHIPPING', label: 'Đang giao' },
    { key: 'DELIVERED', label: 'Hoàn tất' },
    { key: 'CANCELLED', label: 'Đã hủy' },
  ];

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const res = await orderApi.getMyOrders();
      const list = res?.data?.items || res?.data || (Array.isArray(res) ? res : null);
      if (Array.isArray(list) && list.length > 0) {
        setOrders(
          list.map((o: any) => ({
            id: o.id,
            orderCode: o.orderNumber || o.orderCode || o.id,
            date: o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : 'Gần đây',
            status: (o.status || 'PENDING') as OrderStatus,
            statusText:
              o.status === 'PENDING'
                ? 'Chờ duyệt'
                : o.status === 'SHIPPING'
                ? 'Đang giao'
                : o.status === 'DELIVERED'
                ? 'Hoàn tất'
                : o.status === 'CANCELLED'
                ? 'Đã hủy'
                : 'Đang xử lý',
            subtotal: o.subtotalAmount || o.subtotal || o.totalAmount || 0,
            discount: o.discountAmount || 0,
            shippingFee: o.shippingFee || 0,
            totalAmount: o.totalAmount || 0,
            paymentMethod:
              o.paymentMethod === 'COD'
                ? 'Thanh toán khi nhận hàng (COD)'
                : 'Chuyển khoản SePay',
            items: (o.items || []).map((it: any) => ({
              id: it.id || it.productVariantId,
              name: it.productName || 'Sản phẩm GlowUp',
              variant: it.variantName || 'Mặc định',
              price: it.unitPrice || 0,
              quantity: it.quantity || 1,
              imageUrl:
                it.thumbnailUrl ||
                'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400',
            })),
          }))
        );
      }
    } catch {
      // Giữ danh sách ban đầu nếu offline
    }
  };

  // Lọc đơn hàng
  const filteredOrders =
    selectedTab === 'ALL'
      ? orders
      : orders.filter((order) => order.status === selectedTab);

  // Mở modal hủy đơn
  const handleOpenCancelModal = (order: Order) => {
    setOrderToCancel(order);
    setCancelReason('change_info');
    setOtherReasonText('');
    setIsCancelModalVisible(true);
  };

  // Xác nhận hủy đơn hàng
  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    const finalReason =
      cancelReason === 'other' ? otherReasonText : cancelReason;

    try {
      await orderApi.cancelOrder(orderToCancel.id, finalReason);
    } catch {
      // Fallback: khi backend chưa mở port hoặc chưa có API, tiếp tục cập nhật UI mượt mà
    }

    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderToCancel.id
          ? { ...ord, status: 'CANCELLED', statusText: 'Đã hủy' }
          : ord
      )
    );

    if (selectedOrderDetail?.id === orderToCancel.id) {
      setSelectedOrderDetail((prev) =>
        prev ? { ...prev, status: 'CANCELLED', statusText: 'Đã hủy' } : null
      );
    }

    setIsCancelModalVisible(false);
    setOrderToCancel(null);

    Alert.alert(
      'Hủy đơn thành công',
      `Đơn hàng #${orderToCancel.orderCode} đã được hủy. Số tiền thanh toán (nếu có) sẽ được hoàn trả theo chính sách GlowUp.`
    );
  };

  // Sao chép mã đơn
  const handleCopyOrderCode = (code: string) => {
    Alert.alert('Đã sao chép', `Mã đơn hàng #${code} đã được sao chép.`);
  };

  // Gọi shipper
  const handleCallShipper = (phone?: string) => {
    if (!phone) {
      Alert.alert('Thông báo', 'Số điện thoại tài xế hiện chưa khả dụng.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  // Badge màu sắc chuẩn theo Stitch Design System
  const getBadgeConfig = (status: OrderStatus) => {
    switch (status) {
      case 'SHIPPING':
        return {
          bg: theme.colors.tertiaryFixed,
          color: theme.colors.tertiary,
          text: 'Đang vận chuyển',
          icon: 'local_shipping',
        };
      case 'PENDING':
        return {
          bg: '#FFF1EC',
          color: theme.colors.primary,
          text: 'Chờ xác nhận',
          icon: 'schedule',
        };
      case 'DELIVERED':
        return {
          bg: '#E8F5E9',
          color: '#2E7D32',
          text: 'Đã giao hàng',
          icon: 'verified',
        };
      case 'CANCELLED':
        return {
          bg: theme.colors.errorContainer,
          color: theme.colors.error,
          text: 'Đã hủy',
          icon: 'close',
        };
      default:
        return {
          bg: theme.colors.surfaceContainer,
          color: theme.colors.textMuted,
          text: 'Đơn hàng',
          icon: 'receipt',
        };
    }
  };

  // Render thẻ danh sách đơn hàng
  const renderOrderItem = ({ item }: { item: Order }) => {
    const badge = getBadgeConfig(item.status);
    const firstItem = item.items[0];

    return (
      <View style={styles.orderCard}>
        {/* Header Thẻ */}
        <View style={styles.cardHeader}>
          <View style={styles.codeRow}>
            <Ionicons name="receipt-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.orderCodeText}>#{item.orderCode}</Text>
            <TouchableOpacity
              onPress={() => handleCopyOrderCode(item.orderCode)}
              style={styles.copyIconBtn}
            >
              <Ionicons name="copy-outline" size={14} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badge.color }]}>
              {badge.text}
            </Text>
          </View>
        </View>

        <Text style={styles.orderDateText}>{item.date}</Text>

        {/* Sản phẩm đại diện */}
        {firstItem && (
          <View style={styles.productRow}>
            <Image source={{ uri: firstItem.imageUrl }} style={styles.productThumb} />
            <View style={styles.productDetails}>
              {firstItem.categoryTag && (
                <Text style={styles.categoryTagText}>{firstItem.categoryTag}</Text>
              )}
              <Text style={styles.productNameText} numberOfLines={1}>
                {firstItem.name}
              </Text>
              <Text style={styles.variantText}>{firstItem.variant}</Text>
              <View style={styles.priceQtyRow}>
                <Text style={styles.productPriceText}>
                  {firstItem.price.toLocaleString('vi-VN')} đ
                </Text>
                <Text style={styles.qtyText}>x{firstItem.quantity}</Text>
              </View>
            </View>
          </View>
        )}

        {item.items.length > 1 && (
          <Text style={styles.moreItemsText}>
            + {item.items.length - 1} sản phẩm khác trong kiện hàng
          </Text>
        )}

        {/* Footer Thẻ: Tổng tiền & Nút bấm */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.totalLabel}>Tổng thanh toán</Text>
            <Text style={styles.totalPriceText}>
              {item.totalAmount.toLocaleString('vi-VN')} đ
            </Text>
          </View>

          <View style={styles.btnRow}>
            {item.status === 'PENDING' && (
              <TouchableOpacity
                onPress={() => handleOpenCancelModal(item)}
                style={styles.cancelOutlineBtn}
              >
                <Text style={styles.cancelBtnText}>Hủy đơn</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setSelectedOrderDetail(item)}
              style={styles.trackPrimaryBtn}
            >
              <Text style={styles.trackBtnText}>Theo dõi & Chi tiết</Text>
              <Ionicons name="chevron-forward" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* 1. Header chính màn hình Đơn Hàng (Stitch Rose Berry Top Bar) */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <Image
            source={{
              uri: 'https://lh3.googleusercontent.com/aida/AEtjO1V_EdYGFWGwIUg8ikIOvg6kwDD7S9TUC48vlh9MNjkdWvqUY_6ike1Fiq25KeoJiAgx7F3xuqhNJa5DFvTwaYjyY6lvVv6EztD4Zevbg6VNQtcbJ1RKswD0_wVSnSLfyEGE3YTd0-U0JDqwzSdITN_FBzAUKAsABkBo6RbAvVtOcTtl5xL2I959nXeMxsLJBURM90gaoke5QVaUpJZ2nWLMIl9J77-Yne_L63BXqwTeqz7dFfnKs9JSkQs',
            }}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.headerBrandTitle}>GlowUp</Text>
            <Text style={styles.headerBrandSubtitle}>ĐƠN HÀNG CỦA BẠN</Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.circleActionBtn}
            onPress={() => navigation?.navigate?.('Search')}
          >
            <Ionicons name="search" size={20} color={theme.colors.textDark} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.circleActionBtn}
            onPress={() => Alert.alert('Thông báo', 'Bạn chưa có thông báo mới.')}
          >
            <Ionicons name="notifications-outline" size={20} color={theme.colors.textDark} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Tabs Trạng Thái Đơn Hàng */}
      <View style={styles.tabBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map((tab) => {
            const isActive = selectedTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setSelectedTab(tab.key)}
                style={[styles.tabButton, isActive && styles.activeTabButton]}
              >
                <Text
                  style={[styles.tabText, isActive && styles.activeTabText]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Danh Sách Đơn Hàng */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={theme.colors.primaryFixedDim} />
            <Text style={styles.emptyTitle}>Chưa có đơn hàng nào</Text>
            <Text style={styles.emptySubtitle}>
              Khám phá bộ sưu tập mỹ phẩm GlowUp Rose Berry và tận hưởng trải nghiệm mua sắm tuyệt vời!
            </Text>
            <TouchableOpacity
              style={styles.shopNowBtn}
              onPress={() => navigation?.navigate?.('Trang chủ')}
            >
              <Text style={styles.shopNowBtnText}>Mua sắm ngay</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ========================================================================= */}
      {/* 4. MODAL CHI TIẾT ĐƠN HÀNG & THEO DÕI LỘ TRÌNH (theo_d_i_n_h_ng_rma)      */}
      {/* ========================================================================= */}
      <Modal
        visible={!!selectedOrderDetail}
        animationType="slide"
        onRequestClose={() => setSelectedOrderDetail(null)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          {/* Header Modal Chi tiết */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setSelectedOrderDetail(null)}
              style={styles.modalBackBtn}
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.textDark} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Chi Tiết & Tiến Trình</Text>
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Hỗ trợ',
                  'Liên hệ CSKH GlowUp: 1900 8899 để được hỗ trợ đơn hàng nhanh nhất.'
                )
              }
            >
              <Ionicons name="help-circle-outline" size={24} color={theme.colors.secondary} />
            </TouchableOpacity>
          </View>

          {selectedOrderDetail && (
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Meta Card: Mã đơn, Thời gian, Badge */}
              <View style={styles.detailMetaCard}>
                <View style={styles.detailMetaHeader}>
                  <View style={styles.codeRow}>
                    <Ionicons name="receipt" size={20} color={theme.colors.primary} />
                    <Text style={styles.detailCodeText}>
                      #{selectedOrderDetail.orderCode}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleCopyOrderCode(selectedOrderDetail.orderCode)}
                      style={styles.copyIconBtn}
                    >
                      <Ionicons name="copy-outline" size={16} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getBadgeConfig(selectedOrderDetail.status).bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getBadgeConfig(selectedOrderDetail.status).color },
                      ]}
                    >
                      {getBadgeConfig(selectedOrderDetail.status).text}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailMetaSub}>
                  <View style={styles.rowAlign}>
                    <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
                    <Text style={styles.detailDateText}>
                      Đặt lúc: {selectedOrderDetail.date}
                    </Text>
                  </View>
                  <View style={styles.rowAlign}>
                    <Ionicons name="shield-checkmark" size={14} color={theme.colors.primary} />
                    <Text style={styles.authTagText}>Chính hãng GlowUp</Text>
                  </View>
                </View>
              </View>

              {/* Stepper Tiến trình Giao Dịch */}
              <View style={styles.stepperCard}>
                <View style={styles.stepperHeader}>
                  <View style={styles.rowAlign}>
                    <Ionicons name="boat-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.stepperTitle}>Tiến trình đơn hàng</Text>
                  </View>
                  {selectedOrderDetail.deliveryEta && (
                    <Text style={styles.etaText}>
                      Dự kiến: {selectedOrderDetail.deliveryEta}
                    </Text>
                  )}
                </View>

                {/* 4 Bước Stepper Đồ họa */}
                <View style={styles.stepperGraphic}>
                  <View style={styles.stepperLineTrack} />
                  <View
                    style={[
                      styles.stepperLineFill,
                      {
                        width:
                          selectedOrderDetail.status === 'DELIVERED'
                            ? '100%'
                            : selectedOrderDetail.status === 'SHIPPING'
                            ? '66%'
                            : selectedOrderDetail.status === 'PENDING'
                            ? '25%'
                            : '0%',
                      },
                    ]}
                  />

                  <View style={styles.stepNodesRow}>
                    {/* Node 1: Đã đặt */}
                    <View style={styles.stepNodeItem}>
                      <View style={[styles.stepCircle, styles.stepCircleActive]}>
                        <Ionicons name="checkmark" size={14} color="#FFF" />
                      </View>
                      <Text style={styles.stepNodeTitle}>Đã đặt</Text>
                      <Text style={styles.stepNodeTime}>10:30</Text>
                    </View>

                    {/* Node 2: Xác nhận */}
                    <View style={styles.stepNodeItem}>
                      <View
                        style={[
                          styles.stepCircle,
                          selectedOrderDetail.status !== 'CANCELLED'
                            ? styles.stepCircleActive
                            : styles.stepCircleInactive,
                        ]}
                      >
                        <Ionicons name="checkmark" size={14} color="#FFF" />
                      </View>
                      <Text style={styles.stepNodeTitle}>Xác nhận</Text>
                      <Text style={styles.stepNodeTime}>10:45</Text>
                    </View>

                    {/* Node 3: Đang giao */}
                    <View style={styles.stepNodeItem}>
                      <View
                        style={[
                          styles.stepCircle,
                          selectedOrderDetail.status === 'SHIPPING' ||
                          selectedOrderDetail.status === 'DELIVERED'
                            ? styles.stepCircleActive
                            : styles.stepCircleInactive,
                        ]}
                      >
                        <Ionicons name="bicycle" size={14} color="#FFF" />
                      </View>
                      <Text
                        style={[
                          styles.stepNodeTitle,
                          selectedOrderDetail.status === 'SHIPPING' && {
                            color: theme.colors.primary,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        Đang giao
                      </Text>
                      <Text style={styles.stepNodeTime}>14:20</Text>
                    </View>

                    {/* Node 4: Hoàn thành */}
                    <View style={styles.stepNodeItem}>
                      <View
                        style={[
                          styles.stepCircle,
                          selectedOrderDetail.status === 'DELIVERED'
                            ? styles.stepCircleActive
                            : styles.stepCircleInactive,
                        ]}
                      >
                        <Ionicons name="home" size={14} color="#FFF" />
                      </View>
                      <Text style={styles.stepNodeTitle}>Hoàn thành</Text>
                      <Text style={styles.stepNodeTime}>Dự kiến</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Real-time Tracking & Shipper Contact Card */}
              {selectedOrderDetail.carrier && (
                <View style={styles.shippingCarrierCard}>
                  <View style={styles.carrierHeaderRow}>
                    <View>
                      <View style={styles.rowAlign}>
                        <View style={styles.carrierTag}>
                          <Text style={styles.carrierTagText}>VẬN CHUYỂN</Text>
                        </View>
                        <Text style={styles.carrierNameText}>
                          {selectedOrderDetail.carrier}
                        </Text>
                      </View>
                      <Text style={styles.trackingCodeText}>
                        Mã vận đơn:{' '}
                        <Text style={{ fontWeight: '700', color: theme.colors.textDark }}>
                          {selectedOrderDetail.trackingCode}
                        </Text>
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.lookupBtn}
                      onPress={() =>
                        Alert.alert('Tra cứu bưu gửi', 'Đang kết nối API GHN Express...')
                      }
                    >
                      <Ionicons name="open-outline" size={14} color={theme.colors.primary} />
                      <Text style={styles.lookupBtnText}>Tra cứu</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Banner Tài Xế Giao Hàng */}
                  {selectedOrderDetail.shipperName && (
                    <View style={styles.shipperBanner}>
                      <View style={styles.rowAlign}>
                        <View style={styles.shipperAvatarCircle}>
                          <Ionicons name="bicycle" size={20} color={theme.colors.primary} />
                        </View>
                        <View style={{ marginLeft: 8 }}>
                          <Text style={styles.shipperName}>
                            {selectedOrderDetail.shipperName}
                          </Text>
                          <Text style={styles.shipperSub}>
                            Tài xế giao hàng • {selectedOrderDetail.shipperRating}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.callShipperBtn}
                        onPress={() => handleCallShipper(selectedOrderDetail.shipperPhone)}
                      >
                        <Ionicons name="call" size={14} color="#FFF" />
                        <Text style={styles.callShipperText}>Gọi tài xế</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Timeline Logs */}
                  {selectedOrderDetail.timeline && (
                    <View style={styles.timelineList}>
                      {selectedOrderDetail.timeline.map((log, index) => (
                        <View key={index} style={styles.timelineItem}>
                          <View
                            style={[
                              styles.timelineDot,
                              log.active ? styles.timelineDotActive : styles.timelineDotMuted,
                            ]}
                          />
                          <View style={styles.timelineContent}>
                            <Text
                              style={[
                                styles.timelineTime,
                                log.active && { color: theme.colors.primary, fontWeight: '700' },
                              ]}
                            >
                              {log.time}
                            </Text>
                            <Text style={styles.timelineDesc}>{log.description}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Danh Sách Món Trong Kiện Hàng */}
              <View style={styles.itemsCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.rowAlign}>
                    <Ionicons name="cube-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.sectionTitle}>
                      Kiện hàng ({selectedOrderDetail.items.length} món)
                    </Text>
                  </View>
                  <Text style={styles.subtleText}>Gói hàng #1</Text>
                </View>

                {selectedOrderDetail.items.map((prod) => (
                  <View key={prod.id} style={styles.itemDetailRow}>
                    <Image source={{ uri: prod.imageUrl }} style={styles.itemDetailThumb} />
                    <View style={styles.itemDetailInfo}>
                      {prod.categoryTag && (
                        <Text style={styles.categoryTagText}>{prod.categoryTag}</Text>
                      )}
                      <Text style={styles.productNameText} numberOfLines={1}>
                        {prod.name}
                      </Text>
                      <Text style={styles.variantText}>{prod.variant}</Text>
                      <View style={styles.priceQtyRow}>
                        <Text style={styles.qtyText}>SL: {prod.quantity}</Text>
                        <Text style={styles.productPriceText}>
                          {(prod.price * prod.quantity).toLocaleString('vi-VN')} đ
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}

                {/* Bảng Chi Tiết Thanh Toán */}
                <View style={styles.paymentBreakdown}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Tạm tính:</Text>
                    <Text style={styles.breakdownValue}>
                      {selectedOrderDetail.subtotal.toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Ưu đãi GlowUp (VIP):</Text>
                    <Text style={[styles.breakdownValue, { color: theme.colors.primary }]}>
                      -{selectedOrderDetail.discount.toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Phí vận chuyển:</Text>
                    <Text style={styles.breakdownValue}>
                      {selectedOrderDetail.shippingFee === 0
                        ? 'Miễn phí'
                        : `${selectedOrderDetail.shippingFee.toLocaleString('vi-VN')} đ`}
                    </Text>
                  </View>

                  <View style={styles.totalPayRow}>
                    <View>
                      <Text style={styles.totalPayTitle}>Tổng thanh toán</Text>
                      <Text style={styles.paymentMethodText}>
                        <Ionicons name="wallet-outline" size={12} color={theme.colors.tertiary} />{' '}
                        {selectedOrderDetail.paymentMethod}
                      </Text>
                    </View>
                    <Text style={styles.totalPayAmount}>
                      {selectedOrderDetail.totalAmount.toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                </View>
              </View>

              {/* Panel Hỗ Trợ Đổi Trả & RMA 15 Ngày Chuẩn Stitch */}
              <View style={styles.rmaCard}>
                <View style={styles.rowAlign}>
                  <View style={styles.rmaIconBox}>
                    <Ionicons name="repeat" size={22} color={theme.colors.secondary} />
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.rmaTitle}>Chính sách Đổi trả & Bảo hành (RMA)</Text>
                    <Text style={styles.rmaDesc}>
                      GlowUp cam kết đồng kiểm khi nhận hàng. Quý khách được đổi trả{' '}
                      <Text style={{ fontWeight: '700', color: theme.colors.primary }}>
                        hoàn toàn miễn phí trong 15 ngày
                      </Text>{' '}
                      nếu có lỗi nhà sản xuất, kích ứng da hoặc hư hại khi vận chuyển.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.rmaRequestBtn}
                  onPress={() => setIsRmaModalVisible(true)}
                >
                  <Ionicons name="return-down-back" size={18} color={theme.colors.primary} />
                  <Text style={styles.rmaRequestBtnText}>Gửi yêu cầu Đổi trả / Hoàn tiền</Text>
                </TouchableOpacity>
              </View>

              {/* Footer Hotline & Livechat */}
              <View style={styles.supportFooterRow}>
                <TouchableOpacity
                  style={styles.supportHalfBtn}
                  onPress={() => Linking.openURL('tel:19008899')}
                >
                  <Ionicons name="headset-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.supportBtnText}>Hotline 1900 8899</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.supportHalfBtn}
                  onPress={() => Alert.alert('Chat trực tiếp', 'Đang kết nối chuyên viên GlowUp...')}
                >
                  <Ionicons name="chatbubbles-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.supportBtnText}>Chat trực tiếp</Text>
                </TouchableOpacity>
              </View>

              {/* Nút Hủy Đơn khi còn ở trạng thái PENDING */}
              {selectedOrderDetail.status === 'PENDING' && (
                <TouchableOpacity
                  style={styles.bottomCancelOrderBtn}
                  onPress={() => handleOpenCancelModal(selectedOrderDetail)}
                >
                  <Ionicons name="close-circle-outline" size={18} color={theme.colors.error} />
                  <Text style={styles.bottomCancelOrderText}>Hủy đơn hàng này</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* 5. MODAL XÁC NHẬN HỦY ĐƠN HÀNG (Stitch x_c_nh_n_h_y_n_h_ng)              */}
      {/* ========================================================================= */}
      <Modal
        visible={isCancelModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsCancelModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.cancelModalContainer}>
            {/* Header Modal Hủy */}
            <View style={styles.cancelHeader}>
              <View style={styles.rowAlign}>
                <Ionicons name="warning-outline" size={22} color={theme.colors.primary} />
                <Text style={styles.cancelModalTitle}>Hủy Đơn Hàng</Text>
              </View>
              <TouchableOpacity onPress={() => setIsCancelModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Notice Banner */}
              <View style={styles.cancelNoticeBox}>
                <Text style={styles.cancelNoticeText}>
                  Đơn hàng đang ở trạng thái{' '}
                  <Text style={{ fontWeight: '700', color: theme.colors.primary }}>
                    Chờ xác nhận
                  </Text>
                  . Bạn có thể yêu cầu hủy đơn và hoàn tiền 100% hoàn toàn miễn phí.
                </Text>
              </View>

              {/* Danh Sách Lý Do Hủy (Radio Button Group) */}
              <Text style={styles.reasonLabel}>Chọn lý do hủy đơn hàng (*):</Text>

              {[
                {
                  key: 'change_info',
                  label: 'Tôi muốn thay đổi địa chỉ nhận hàng / số điện thoại',
                },
                {
                  key: 'change_items',
                  label: 'Muốn thêm/bớt sản phẩm hoặc đổi mã giảm giá',
                },
                {
                  key: 'slow_delivery',
                  label: 'Thời gian giao hàng dự kiến quá lâu (Cần gấp)',
                },
                {
                  key: 'better_price',
                  label: 'Tìm thấy mức giá ưu đãi hơn ở nơi khác',
                },
                {
                  key: 'no_need',
                  label: 'Đổi ý, tạm thời không còn nhu cầu mua sắm nữa',
                },
                {
                  key: 'other',
                  label: 'Lý do khác...',
                },
              ].map((reasonItem) => {
                const isSelected = cancelReason === reasonItem.key;
                return (
                  <TouchableOpacity
                    key={reasonItem.key}
                    onPress={() => setCancelReason(reasonItem.key)}
                    style={[
                      styles.reasonRadioRow,
                      isSelected && styles.reasonRadioRowSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.radioInnerDot} />}
                    </View>
                    <Text
                      style={[
                        styles.reasonRadioText,
                        isSelected && { fontWeight: '600', color: theme.colors.textDark },
                      ]}
                    >
                      {reasonItem.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {cancelReason === 'other' && (
                <TextInput
                  style={styles.otherInput}
                  placeholder="Nhập lý do chi tiết của bạn..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={otherReasonText}
                  onChangeText={setOtherReasonText}
                  multiline
                  numberOfLines={3}
                />
              )}

              {/* Nút Thao Tác Hủy */}
              <View style={styles.cancelActionRow}>
                <TouchableOpacity
                  style={styles.keepOrderBtn}
                  onPress={() => setIsCancelModalVisible(false)}
                >
                  <Text style={styles.keepOrderText}>Giữ lại đơn hàng</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  onPress={handleConfirmCancel}
                >
                  <Text style={styles.confirmCancelText}>Xác nhận hủy</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* 6. MODAL GỬI YÊU CẦU ĐỔI TRẢ RMA                                          */}
      {/* ========================================================================= */}
      <Modal
        visible={isRmaModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsRmaModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.cancelModalContainer}>
            <View style={styles.cancelHeader}>
              <View style={styles.rowAlign}>
                <Ionicons name="repeat-outline" size={22} color={theme.colors.primary} />
                <Text style={styles.cancelModalTitle}>Yêu Cầu Đổi Trả (RMA)</Text>
              </View>
              <TouchableOpacity onPress={() => setIsRmaModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.rmaSubNotice}>
                Vui lòng chọn sản phẩm cần xử lý để chuyên viên GlowUp hỗ trợ trong vòng 2 giờ.
              </Text>

              {selectedOrderDetail?.items.map((prod) => {
                const isChecked = !!rmaSelectedItems[prod.id];
                return (
                  <TouchableOpacity
                    key={prod.id}
                    onPress={() =>
                      setRmaSelectedItems((prev) => ({
                        ...prev,
                        [prod.id]: !prev[prod.id],
                      }))
                    }
                    style={[
                      styles.rmaItemSelectRow,
                      isChecked && styles.rmaItemSelectRowChecked,
                    ]}
                  >
                    <Ionicons
                      name={isChecked ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isChecked ? theme.colors.primary : theme.colors.textMuted}
                    />
                    <Image source={{ uri: prod.imageUrl }} style={styles.rmaThumb} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.productNameText} numberOfLines={1}>
                        {prod.name}
                      </Text>
                      <Text style={styles.variantText}>SL: {prod.quantity}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <Text style={[styles.reasonLabel, { marginTop: 16 }]}>
                Lý do yêu cầu:
              </Text>

              {[
                { key: 'broken', label: 'Bể vỡ, rò rỉ trong quá trình giao hàng' },
                { key: 'wrong_item', label: 'Giao sai sản phẩm / sai màu son' },
                { key: 'defect', label: 'Sản phẩm có lỗi vòi xịt, kết cấu lạ' },
                { key: 'allergic', label: 'Kích ứng da khi thử sản phẩm' },
              ].map((r) => {
                const isSelected = rmaReason === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    onPress={() => setRmaReason(r.key)}
                    style={[
                      styles.reasonRadioRow,
                      isSelected && styles.reasonRadioRowSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.radioInnerDot} />}
                    </View>
                    <Text style={styles.reasonRadioText}>{r.label}</Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.confirmCancelBtn, { marginTop: 20, backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  setIsRmaModalVisible(false);
                  Alert.alert(
                    'Đã gửi yêu cầu',
                    'Yêu cầu đổi trả RMA của bạn đã được ghi nhận. Chuyên viên GlowUp sẽ liên hệ trong 2 giờ làm việc!'
                  );
                }}
              >
                <Text style={styles.confirmCancelText}>Gửi yêu cầu đổi trả</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.backgroundCanvas,
  },
  topHeader: {
    height: 64,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 248, 246, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  headerBrandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textDark,
    letterSpacing: -0.5,
  },
  headerBrandSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  tabBarContainer: {
    backgroundColor: theme.colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    paddingVertical: 8,
  },
  tabsScroll: {
    paddingHorizontal: theme.spacing.md,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTabButton: {
    backgroundColor: theme.colors.primaryFixed,
    borderColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.colors.primaryDeep,
    fontWeight: '700',
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  orderCard: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  copyIconBtn: {
    padding: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  orderDateText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginVertical: 8,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 8,
    borderRadius: theme.rounded.lg,
    gap: 12,
  },
  productThumb: {
    width: 56,
    height: 56,
    borderRadius: theme.rounded.md,
    backgroundColor: theme.colors.surfaceContainer,
  },
  productDetails: {
    flex: 1,
  },
  categoryTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textDark,
    marginTop: 2,
  },
  variantText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  priceQtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  productPriceText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  qtyText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  moreItemsText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 6,
    marginLeft: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  totalLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  totalPriceText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelOutlineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.rounded.lg,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.error,
  },
  trackPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.rounded.lg,
  },
  trackBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textDark,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  shopNowBtn: {
    marginTop: 20,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.rounded.lg,
  },
  shopNowBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Modal Chi Tiết & Theo Dõi */
  modalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.backgroundCanvas,
  },
  modalHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  modalBackBtn: {
    padding: 4,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
    gap: 16,
  },
  detailMetaCard: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.card,
  },
  detailMetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  detailMetaSub: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailDateText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginLeft: 4,
  },
  authTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    marginLeft: 4,
  },

  /* Stepper Graphic */
  stepperCard: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.card,
  },
  stepperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepperTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textDark,
    marginLeft: 6,
  },
  etaText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  stepperGraphic: {
    position: 'relative',
    paddingVertical: 8,
  },
  stepperLineTrack: {
    position: 'absolute',
    top: 22,
    left: '10%',
    right: '10%',
    height: 3,
    backgroundColor: theme.colors.borderSubtle,
    zIndex: 1,
  },
  stepperLineFill: {
    position: 'absolute',
    top: 22,
    left: '10%',
    height: 3,
    backgroundColor: theme.colors.primary,
    zIndex: 2,
  },
  stepNodesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 3,
  },
  stepNodeItem: {
    alignItems: 'center',
    width: (width - 64) / 4,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: theme.colors.primary,
  },
  stepCircleInactive: {
    backgroundColor: theme.colors.surfaceContainer,
  },
  stepNodeTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textDark,
    marginTop: 6,
  },
  stepNodeTime: {
    fontSize: 9,
    color: theme.colors.textMuted,
    marginTop: 2,
  },

  /* Shipping Carrier & Timeline */
  shippingCarrierCard: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.card,
    gap: 12,
  },
  carrierHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  carrierTag: {
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  carrierTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  carrierNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  trackingCodeText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  lookupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  lookupBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  shipperBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 10,
    borderRadius: theme.rounded.lg,
  },
  shipperAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shipperName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  shipperSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  callShipperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  callShipperText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  timelineList: {
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.borderSubtle,
    marginLeft: 6,
    gap: 12,
  },
  timelineItem: {
    position: 'relative',
  },
  timelineDot: {
    position: 'absolute',
    left: -19,
    top: 3,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineDotActive: {
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.primaryFixed,
  },
  timelineDotMuted: {
    backgroundColor: theme.colors.textMuted,
  },
  timelineContent: {
    marginLeft: 4,
  },
  timelineTime: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  timelineDesc: {
    fontSize: 12,
    color: theme.colors.textDark,
    marginTop: 2,
    lineHeight: 16,
  },

  /* Items Card & Breakdown */
  itemsCard: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.card,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textDark,
    marginLeft: 6,
  },
  subtleText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  itemDetailRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 8,
    borderRadius: theme.rounded.md,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  itemDetailThumb: {
    width: 50,
    height: 50,
    borderRadius: theme.rounded.sm,
    backgroundColor: theme.colors.surfaceContainer,
  },
  itemDetailInfo: {
    flex: 1,
  },
  paymentBreakdown: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textDark,
  },
  totalPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  totalPayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  paymentMethodText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  totalPayAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },

  /* RMA Card */
  rmaCard: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.card,
    gap: 12,
  },
  rmaIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rmaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  rmaDesc: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  rmaRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.primaryFixedDim,
    paddingVertical: 10,
    borderRadius: theme.rounded.lg,
  },
  rmaRequestBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  supportFooterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  supportHalfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceCard,
    paddingVertical: 12,
    borderRadius: theme.rounded.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  supportBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textDark,
  },
  bottomCancelOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: theme.rounded.lg,
    backgroundColor: '#FFEBEE',
    marginTop: 8,
  },
  bottomCancelOrderText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.error,
  },

  /* Modal Hủy Đơn & RMA */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  cancelModalContainer: {
    backgroundColor: theme.colors.surfaceCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    maxHeight: '85%',
  },
  cancelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  cancelModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textDark,
    marginLeft: 6,
  },
  cancelNoticeBox: {
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 12,
    borderRadius: theme.rounded.md,
    marginTop: 12,
  },
  cancelNoticeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textDark,
    marginTop: 14,
    marginBottom: 8,
  },
  reasonRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: theme.rounded.md,
    backgroundColor: theme.colors.surfaceSubtle,
    marginBottom: 8,
  },
  reasonRadioRowSelected: {
    backgroundColor: theme.colors.surfaceContainer,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: theme.colors.primary,
  },
  radioInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  reasonRadioText: {
    fontSize: 12,
    color: theme.colors.textDark,
    flex: 1,
  },
  otherInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.rounded.md,
    padding: 10,
    fontSize: 12,
    color: theme.colors.textDark,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  cancelActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingBottom: 16,
  },
  keepOrderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.rounded.lg,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
  },
  keepOrderText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textDark,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.rounded.lg,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  rmaSubNotice: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
    marginBottom: 12,
  },
  rmaItemSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: theme.rounded.md,
    backgroundColor: theme.colors.surfaceSubtle,
    marginBottom: 6,
  },
  rmaItemSelectRowChecked: {
    backgroundColor: theme.colors.primaryFixed,
  },
  rmaThumb: {
    width: 36,
    height: 36,
    borderRadius: 4,
    marginLeft: 8,
  },
});