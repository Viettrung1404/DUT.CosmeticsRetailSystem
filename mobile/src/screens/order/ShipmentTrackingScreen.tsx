import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Linking,
  Clipboard,
  Dimensions,
  ActivityIndicator} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { orderApi } from '../../api/orderApi';

/** Trạng thái tracking nhận về từ GET /orders/:id/tracking */
interface TrackingEvent {
  timestamp?: string;
  description?: string;
  location?: string;
}
interface Shipment {
  id: string;
  carrierCode?: string;
  trackingCode?: string | null;
  trackingUrl?: string | null;
  status?: string;
  events?: TrackingEvent[];
}
interface TrackingData {
  id: string;
  status?: string;
  shipments?: Shipment[];
  statusHistories?: Array<{ status: string; changedAt: string; note?: string }>;
}

export default function ShipmentTrackingScreen({ route, navigation }: any) {
  const { orderId = '' } = route.params || {};

  const [copied, setCopied] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('Không tìm thấy mã đơn hàng.');
      setLoading(false);
      return;
    }
    orderApi
      .getOrderTracking(orderId)
      .then((res) => {
        const data: TrackingData = res?.data ?? res;
        setTrackingData(data);
      })
      .catch(() => {
        setError('Không thể tải thông tin vận chuyển. Vui lòng thử lại sau.');
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  // Lấy shipment đầu tiên (nếu có)
  const shipment: Shipment | null = trackingData?.shipments?.[0] ?? null;
  const trackingCode = shipment?.trackingCode ?? '';
  const carrierCode = shipment?.carrierCode ?? '';

  // Xây timeline từ events của shipment + statusHistories
  const timelineItems = (() => {
    const events: Array<{ title: string; time: string; desc: string; current?: boolean }> = [];
    // Events của shipment
    if (shipment?.events?.length) {
      shipment.events.forEach((ev, i) => {
        events.push({
          title: ev.description ?? 'Cập nhật trạng thái',
          time: ev.timestamp ? new Date(ev.timestamp).toLocaleString('vi-VN') : '',
          desc: ev.location ?? '',
          current: i === 0,
        });
      });
    }
    // Fallback: status histories của đơn
    if (!events.length && trackingData?.statusHistories?.length) {
      trackingData.statusHistories.forEach((h, i) => {
        events.push({
          title: h.status,
          time: new Date(h.changedAt).toLocaleString('vi-VN'),
          desc: h.note ?? '',
          current: i === 0,
        });
      });
    }
    return events;
  })();

  const handleCopyTrackingCode = () => {
    if (!trackingCode) return;
    Clipboard.setString(trackingCode);
    setCopied(true);
    Alert.alert('Thành công', `Đã sao chép mã vận đơn: ${trackingCode}`);
    setTimeout(() => setCopied(false), 2500);
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin vận chuyển...</Text>
        </View>
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retryBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Card Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.statusBadge}>
              <Ionicons name="cube-outline" size={13} color={theme.colors.primary} />
              <Text style={styles.statusBadgeText}>{shipment?.status ?? trackingData?.status ?? 'ĐANG XỬ LÝ'}</Text>
            </View>
            {/* Disclaimer: Hỏa Tốc 2H là minh họa, không phải dịch vụ thực */}
            <View style={styles.disclaimerBadge}>
              <Text style={styles.disclaimerBadgeText}>⚡ Nhanh (minh họa)</Text>
            </View>
          </View>

          <Text style={styles.heroStatus}>Theo dõi kiện hàng</Text>
          <Text style={styles.heroSub}>
            Thông tin vận chuyển được cập nhật theo dữ liệu thực từ đơn vị vận chuyển.
          </Text>

          {/* Tracking Code Box */}
          {trackingCode ? (
          <View style={styles.trackingCodeBox}>
            <View>
              <Text style={styles.trackingLabel}>{carrierCode ? `MÃ VẬN ĐƠN ${carrierCode.toUpperCase()}` : 'MÃ VẬN ĐƠN'}</Text>
              <Text style={styles.trackingCode}>{trackingCode}</Text>
            </View>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyTrackingCode}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={15} color={theme.colors.primary} />
              <Text style={styles.copyBtnText}>{copied ? 'Đã chép' : 'Sao chép'}</Text>
            </TouchableOpacity>
          </View>
          ) : (
          <View style={styles.noTrackingBox}>
            <Text style={styles.noTrackingText}>Mã vận đơn chưa được cấp. Vui lòng kiểm tra lại sau.</Text>
          </View>
          )}
        </View>

        {/* Timeline */}
        {timelineItems.length > 0 ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Lịch sử hành trình chi tiết</Text>

          <View style={styles.timelineList}>
            {timelineItems.map((step, idx) => {
              const isLast = idx === timelineItems.length - 1;
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
                    {step.desc ? <Text style={styles.stepDesc}>{step.desc}</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        ) : (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Lịch sử hành trình</Text>
          <Text style={styles.noTrackingText}>Chưa có thông tin cập nhật từ đơn vị vận chuyển.</Text>
        </View>
        )}

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
      )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FAF0F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  disclaimerBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  disclaimerBadgeText: {
    fontSize: 9,
    color: '#888',
    fontWeight: '600',
  },
  noTrackingBox: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  noTrackingText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
});

