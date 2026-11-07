import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  Linking,
  Clipboard,
  Dimensions,
} from 'react-native';
import { Ionicons, Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

export default function ShipmentTrackingScreen({ route, navigation }: any) {
  const { orderId = 'GU-89241', trackingCode = 'GHN-8842109VN' } = route.params || {};

  const [copied, setCopied] = useState(false);

  const shipmentSteps = [
    {
      title: 'Đang trên tuyến giao đến bạn',
      time: '15:20 • Hôm nay',
      desc: 'Tài xế Nguyễn Văn Tuấn đang di chuyển trên đường Nguyễn Hữu Cảnh, cách bạn khoảng 1.2km.',
      done: true,
      current: true,
    },
    {
      title: 'Kiện hàng đã xuất kho trung chuyển HCM',
      time: '13:45 • Hôm nay',
      desc: 'Bưu kiện hoàn tất thủ tục bàn giao cho đơn vị vận chuyển GHN Express.',
      done: true,
    },
    {
      title: 'Đã đóng gói kiểm định 3 lớp chống sốc',
      time: '10:15 • Hôm nay',
      desc: 'Sản phẩm được niêm phong tem chống hàng giả GlowUp Authentic và màng bọc chống sốc.',
      done: true,
    },
    {
      title: 'Đơn hàng được xác nhận thành công',
      time: '09:00 • Hôm nay',
      desc: 'Hệ thống tiếp nhận thanh toán và chuyển thông tin sang trung tâm hoàn tất đơn hàng.',
      done: true,
    },
  ];

  const handleCopyTrackingCode = () => {
    Clipboard.setString(trackingCode);
    setCopied(true);
    Alert.alert('Thành công', `Đã sao chép mã vận đơn: ${trackingCode}`);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCallShipper = () => {
    Linking.openURL('tel:0909123456').catch(() => {
      Alert.alert('Gọi tài xế', 'Đang liên hệ tài xế Nguyễn Văn Tuấn: 0909 123 456');
    });
  };

  const handleChangeSchedule = () => {
    Alert.alert('Đổi giờ giao', 'Bạn có thể chọn hẹn lại giờ giao hàng buổi tối hoặc vào ngày mai.', [
      { text: 'Giao tối nay (19:00 - 21:00)', onPress: () => Alert.alert('Đã cập nhật', 'Tài xế sẽ giao sau 19:00 tối nay.') },
      { text: 'Giao ngày mai', onPress: () => Alert.alert('Đã cập nhật', 'Đơn hàng được dời sang ngày mai.') },
      { text: 'Giữ nguyên', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Hành trình Vận chuyển</Text>
          <Text style={styles.headerSubtitle}>Mã đơn #{orderId}</Text>
        </View>
        <TouchableOpacity
          style={styles.headActionBtn}
          onPress={() => navigation.navigate('Đơn hàng')}
        >
          <Ionicons name="receipt-outline" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Realtime Delivery Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.silkDropBadge}>
              <Ionicons name="flash" size={13} color="#FFF" />
              <Text style={styles.silkDropText}>HỎA TỐC 2H SILK-DROP</Text>
            </View>
            <Text style={styles.estimatedArrival}>Đến trong ~25 phút</Text>
          </View>

          <Text style={styles.heroStatus}>Kiện hàng đang trên đường giao</Text>
          <Text style={styles.heroSub}>
            Tài xế đang di chuyển trên tuyến đường giao nhanh nhất để đảm bảo nhiệt độ mỹ phẩm tối ưu.
          </Text>

          {/* Tracking Code Box */}
          <View style={styles.trackingCodeBox}>
            <View>
              <Text style={styles.trackingLabel}>MÃ VẬN ĐƠN GHN</Text>
              <Text style={styles.trackingCode}>{trackingCode}</Text>
            </View>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyTrackingCode}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={15} color={theme.colors.primary} />
              <Text style={styles.copyBtnText}>{copied ? 'Đã chép' : 'Sao chép'}</Text>
            </TouchableOpacity>
          </View>

          {/* Shipper Contact Card */}
          <View style={styles.shipperRow}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFoJz9_e_s-F6Qp7q_U-y5g3RjK4o0LzYd5z3aX7wV5t3v1L7s_9m4q_WAoKCYLRFBkJ4vw',
              }}
              style={styles.shipperAvatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.shipperCarrier}>Đối tác vận chuyển GHN</Text>
              <Text style={styles.shipperName}>Nguyễn Văn Tuấn</Text>
              <Text style={styles.shipperRating}>⭐ 4.95 • 1.280 chuyến giao an toàn</Text>
            </View>
            <TouchableOpacity style={styles.callShipperBtn} onPress={handleCallShipper}>
              <Ionicons name="call" size={16} color="#FFF" />
              <Text style={styles.callShipperText}>Gọi</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Realtime Stepper Timeline */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Lịch sử hành trình chi tiết</Text>

          <View style={styles.timelineList}>
            {shipmentSteps.map((step, idx) => {
              const isLast = idx === shipmentSteps.length - 1;
              return (
                <View key={idx} style={styles.timelineItem}>
                  <View style={styles.timelineIndicatorCol}>
                    <View
                      style={[
                        styles.timelineDot,
                        step.current ? styles.timelineDotCurrent : styles.timelineDotDone,
                      ]}
                    >
                      {step.current ? (
                        <View style={styles.pulseInner} />
                      ) : (
                        <Ionicons name="checkmark" size={11} color="#FFF" />
                      )}
                    </View>
                    {!isLast && <View style={styles.timelineLineDone} />}
                  </View>

                  <View style={styles.timelineDetails}>
                    <Text
                      style={[
                        styles.stepTitle,
                        step.current && styles.stepTitleActive,
                      ]}
                    >
                      {step.title}
                    </Text>
                    <Text style={styles.stepTime}>{step.time}</Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Destination & Package Items */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Địa chỉ nhận hàng</Text>
          <View style={styles.addressBox}>
            <Ionicons name="pin-outline" size={20} color={theme.colors.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.receiverInfo}>Thảo Linh Nguyễn • 0938 ••• 921</Text>
              <Text style={styles.receiverAddress}>
                Landmark 4, Vinhomes Central Park, 208 Nguyễn Hữu Cảnh, P.22, Q. Bình Thạnh, TP. Hồ Chí Minh
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          <TouchableOpacity style={styles.rescheduleBtn} onPress={handleChangeSchedule}>
            <Feather name="calendar" size={16} color={theme.colors.primary} />
            <Text style={styles.rescheduleText}>Đổi giờ giao / Ghi chú cho tài xế</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.orderDetailBtn}
            onPress={() => navigation.navigate('Đơn hàng')}
          >
            <Ionicons name="receipt-outline" size={16} color="#FFF" />
            <Text style={styles.orderDetailText}>Xem chi tiết đơn hàng & Hóa đơn</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF8F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3E9EB',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  headActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#281811',
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3E9EB',
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  silkDropBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  silkDropText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  estimatedArrival: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  heroStatus: {
    fontSize: 16,
    fontWeight: '700',
    color: '#281811',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 12,
    color: '#725950',
    lineHeight: 17,
    marginBottom: 12,
  },
  trackingCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF0F2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3DCE1',
    marginBottom: 12,
  },
  trackingLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  trackingCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#281811',
    letterSpacing: 1,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3DCE1',
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  shipperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEFAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  shipperAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
  },
  shipperCarrier: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  shipperName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#281811',
    marginTop: 1,
  },
  shipperRating: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 1,
  },
  callShipperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  callShipperText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3E9EB',
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#281811',
    marginBottom: 14,
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 65,
  },
  timelineIndicatorCol: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: theme.colors.primary,
  },
  timelineDotCurrent: {
    backgroundColor: theme.colors.primary,
    borderWidth: 3,
    borderColor: '#FFD9DD',
  },
  pulseInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  timelineLineDone: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.primaryFixedDim,
    marginVertical: 4,
  },
  timelineDetails: {
    flex: 1,
    paddingBottom: 14,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#554244',
  },
  stepTitleActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  stepTime: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  stepDesc: {
    fontSize: 11,
    color: '#725950',
    lineHeight: 15,
    marginTop: 2,
  },
  addressBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FEFAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  receiverInfo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#281811',
  },
  receiverAddress: {
    fontSize: 12,
    color: '#554244',
    lineHeight: 16,
    marginTop: 2,
  },
  actionGroup: {
    gap: 10,
    marginTop: 4,
  },
  rescheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAF0F2',
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3DCE1',
  },
  rescheduleText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  orderDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    height: 48,
    borderRadius: 14,
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  orderDetailText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

