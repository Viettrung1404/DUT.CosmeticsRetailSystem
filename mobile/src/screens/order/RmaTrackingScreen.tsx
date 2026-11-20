import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { orderApi } from '../../api/orderApi';
import { RMA_STATUS_MAP, getRmaStatusMeta } from '../../utils/rmaHelper';

export { RMA_STATUS_MAP, getRmaStatusMeta };

const STEPS = [
  { title: 'Nộp yêu cầu', key: 'SUBMITTED' },
  { title: 'Xét duyệt hồ sơ', key: 'REVIEW' },
  { title: 'Tiếp nhận hàng', key: 'RECEIVE' },
  { title: 'Kiểm định KCS', key: 'INSPECT' },
  { title: 'Quyết toán', key: 'SETTLE' },
];

export default function RmaTrackingScreen({ route, navigation }: any) {
  const { rmaId = '' } = route.params || {};

  const [returnOrder, setReturnOrder] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchReturnDetail = useCallback(async (isRefresh = false) => {
    if (!rmaId) {
      setError('Không tìm thấy mã hồ sơ đổi trả.');
      setLoading(false);
      return;
    }
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await orderApi.getReturnDetail(rmaId);
      setReturnOrder(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể tải chi tiết tiến trình đổi trả RMA.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [rmaId]);

  useEffect(() => {
    fetchReturnDetail();
  }, [fetchReturnDetail]);

  const handleCopy = (code: string) => {
    if (!code) return;
    Clipboard.setString(code);
    setCopiedCode(code);
    Alert.alert('Đã sao chép', `Mã tiếp nhận: ${code}`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCall = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Lỗi', `Không thể quay số tới ${phone}`);
    });
  };

  const statusKey = (returnOrder?.status || 'SUBMITTED').toUpperCase();
  const statusMeta = RMA_STATUS_MAP[statusKey] || RMA_STATUS_MAP['SUBMITTED'];
  const isStoreDropoff =
    returnOrder?.returnChannel === 'STORE_DROPOFF' ||
    Boolean(returnOrder?.dropoffLocationId);
  const dropoffStore = returnOrder?.dropoffLocation;
  const returnCode =
    returnOrder?.returnCode || returnOrder?.returnNumber || returnOrder?.id || rmaId;
  const currentStepIndex = statusMeta.stepIndex;
  const pickupAddressDisplay = returnOrder?.pickupAddress
    ? String(returnOrder.pickupAddress.addressLine || returnOrder.pickupAddress)
    : '';

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
          <Text style={styles.headerTitle}>Tiến trình Đổi trả RMA</Text>
          <Text style={styles.headerSubtitle}>#{returnCode}</Text>
        </View>
        <TouchableOpacity
          style={styles.headActionBtn}
          onPress={() => fetchReturnDetail(true)}
          disabled={loading || refreshing}
        >
          <Ionicons name="refresh-outline" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Đang tải tiến trình hồ sơ đổi trả...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={52} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchReturnDetail()}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : returnOrder ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchReturnDetail(true)}
              colors={[theme.colors.primary]}
            />
          }
        >
          {/* Hero Status Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View
                style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}
              >
                <Ionicons
                  name={statusMeta.icon as any}
                  size={14}
                  color={statusMeta.color}
                />
                <Text
                  style={[styles.statusBadgeText, { color: statusMeta.color }]}
                >
                  {statusMeta.label}
                </Text>
              </View>
              <Text style={styles.heroDate}>
                {returnOrder.createdAt
                  ? new Date(returnOrder.createdAt).toLocaleDateString('vi-VN')
                  : ''}
              </Text>
            </View>

            <Text style={styles.heroTitle}>{statusMeta.label}</Text>
            <Text style={styles.heroDesc}>{statusMeta.description}</Text>

            {/* Rejection Notice if REJECTED */}
            {statusKey === 'REJECTED' && returnOrder.rejectionReason && (
              <View style={styles.rejectionBox}>
                <Ionicons name="alert-circle" size={18} color="#C62828" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rejectionTitle}>Lý do từ chối:</Text>
                  <Text style={styles.rejectionText}>
                    {returnOrder.rejectionReason}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Stepper Progress Bar */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Các bước xử lý yêu cầu</Text>
            <View style={styles.stepperContainer}>
              {STEPS.map((step, idx) => {
                const isPast = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const isFuture = idx > currentStepIndex;

                return (
                  <View key={idx} style={styles.stepperItem}>
                    <View
                      style={[
                        styles.stepperCircle,
                        isPast && styles.stepperCircleDone,
                        isCurrent && styles.stepperCircleCurrent,
                        isFuture && styles.stepperCircleFuture,
                      ]}
                    >
                      {isPast ? (
                        <Ionicons name="checkmark" size={11} color="#FFF" />
                      ) : (
                        <Text
                          style={[
                            styles.stepperNum,
                            isCurrent && styles.stepperNumCurrent,
                          ]}
                        >
                          {idx + 1}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stepperLabel,
                        isCurrent && styles.stepperLabelCurrent,
                        isPast && styles.stepperLabelDone,
                      ]}
                      numberOfLines={2}
                    >
                      {step.title}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Omnichannel Logistics Card */}
          {isStoreDropoff ? (
            /* Store Dropoff Card with QR Code Container */
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.rowAlign}>
                  <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="business" size={16} color="#2E7D32" />
                  </View>
                  <Text style={styles.cardTitle}>Tiếp nhận tại Showroom GlowUp</Text>
                </View>
              </View>

              {/* QR Container */}
              <View style={styles.qrContainer}>
                <Ionicons name="qr-code" size={100} color={theme.colors.textDark} />
                <Text style={styles.qrHint}>Mã tiếp nhận quét tại quầy:</Text>
                <View style={styles.qrCodeBox}>
                  <Text style={styles.qrCodeText}>{returnCode}</Text>
                  <TouchableOpacity onPress={() => handleCopy(returnCode)}>
                    <Ionicons
                      name={copiedCode === returnCode ? 'checkmark' : 'copy-outline'}
                      size={16}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.qrSubText}>
                  Vui lòng mang sản phẩm đến Showroom. Nhân viên quầy sẽ quét mã này để hoàn tất thủ tục tiếp nhận trong 2 phút.
                </Text>
              </View>

              {dropoffStore && (
                <View style={styles.storeDetailsCard}>
                  <Text style={styles.storeNameText}>{dropoffStore.name}</Text>
                  <Text style={styles.storeAddressText}>{dropoffStore.address}</Text>
                  {dropoffStore.phone && (
                    <View style={styles.rowBetween}>
                      <Text style={styles.storePhoneText}>
                        Hotline: {dropoffStore.phone}
                      </Text>
                      <TouchableOpacity
                        style={styles.callStoreBtn}
                        onPress={() => handleCall(dropoffStore.phone)}
                      >
                        <Ionicons name="call" size={12} color="#FFF" />
                        <Text style={styles.callStoreBtnText}>Gọi</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            /* Carrier Reverse Pickup Card */
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.rowAlign}>
                  <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="bicycle" size={16} color="#1565C0" />
                  </View>
                  <Text style={styles.cardTitle}>Thu hồi tận nơi (GHN Reverse)</Text>
                </View>
              </View>
              <Text style={styles.carrierPickupDesc}>
                Bưu tá GHN sẽ liên hệ trước khi tới thu hồi gói hàng. Vui lòng đóng gói sản phẩm cẩn thận kèm hộp bảo quản ban đầu.
              </Text>

              {Boolean(pickupAddressDisplay) && (
                <View style={styles.pickupAddressBox}>
                  <Text style={styles.pickupAddressTitle}>Địa chỉ bưu tá thu hồi:</Text>
                  <Text style={styles.pickupAddressText}>{pickupAddressDisplay}</Text>
                </View>
              )}
            </View>
          )}

          {/* Returned Items & QC Outcomes */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Sản phẩm trong hồ sơ ({returnOrder.items?.length || 0} món)
            </Text>

            <View style={{ gap: 10, marginTop: 8 }}>
              {(returnOrder.items || []).map((it: any, idx: number) => {
                const pName =
                  it.variant?.product?.name || it.name || 'Sản phẩm mỹ phẩm';
                const vName = [it.variant?.option1Value, it.variant?.option2Value]
                  .filter(Boolean)
                  .join(' - ');
                const imgUri =
                  it.variant?.product?.images?.[0] ||
                  it.imageUrl ||
                  null;

                return (
                  <View key={it.id || idx} style={styles.returnedItemRow}>
                    {imgUri ? (
                      <Image source={{ uri: imgUri }} style={styles.itemThumb} />
                    ) : (
                      <View style={styles.itemThumbPlaceholder}>
                        <Ionicons name="image-outline" size={18} color="#999" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemNameText} numberOfLines={2}>
                        {pName}
                      </Text>
                      {vName ? <Text style={styles.itemVarText}>{vName}</Text> : null}
                      <Text style={styles.itemQtyText}>
                        Số lượng: <Text style={{ fontWeight: '700' }}>{it.quantity}</Text> • Lý do: {it.reasonCode || returnOrder.reason}
                      </Text>

                      {/* QC Inspection Outcome if available */}
                      {it.condition && (
                        <View style={styles.qcResultBadge}>
                          <Ionicons name="shield-checkmark" size={12} color="#00796B" />
                          <Text style={styles.qcResultText}>
                            KCS: {it.condition} {it.note ? `• ${it.note}` : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Financial Settlement Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quyết toán tài chính</Text>
            <View style={styles.summaryLine}>
              <Text style={styles.summaryLabel}>Tiền hoàn trả dự kiến:</Text>
              <Text style={styles.summaryVal}>
                {Number(returnOrder.refundAmount || 0).toLocaleString('vi-VN')} đ
              </Text>
            </View>

            {Number(returnOrder.totalRefundApproved || 0) > 0 && (
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Số tiền đã duyệt hoàn:</Text>
                <Text style={[styles.summaryVal, { color: '#2E7D32', fontWeight: '800' }]}>
                  {Number(returnOrder.totalRefundApproved).toLocaleString('vi-VN')} đ
                </Text>
              </View>
            )}

            <View style={styles.settlementNoteBox}>
              <Ionicons name="information-circle-outline" size={14} color="#666" />
              <Text style={styles.settlementNoteText}>
                Số tiền hoàn sẽ được chuyển về tài khoản ban đầu hoặc ví điểm thưởng sau khi bước kiểm định KCS hoàn tất.
              </Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Không tìm thấy thông tin hồ sơ đổi trả này.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.backgroundCanvas,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  headActionBtn: {
    padding: 6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  errorText: {
    marginTop: 10,
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  heroCard: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textDark,
    marginTop: 2,
  },
  heroDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  rejectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C62828',
  },
  rejectionText: {
    fontSize: 11,
    color: '#B71C1C',
    marginTop: 2,
  },
  card: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textDark,
  },

  /* Stepper */
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  stepperItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepperCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepperCircleDone: {
    backgroundColor: '#2E7D32',
  },
  stepperCircleCurrent: {
    backgroundColor: theme.colors.primary,
  },
  stepperCircleFuture: {
    backgroundColor: '#EEEEEE',
  },
  stepperNum: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
  },
  stepperNumCurrent: {
    color: '#FFF',
  },
  stepperLabel: {
    fontSize: 9,
    textAlign: 'center',
    color: '#999',
    lineHeight: 12,
  },
  stepperLabelCurrent: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  stepperLabelDone: {
    color: '#2E7D32',
    fontWeight: '600',
  },

  /* QR Container */
  qrContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 18,
    borderRadius: 12,
    marginTop: 6,
    gap: 8,
  },
  qrHint: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  qrCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  qrCodeText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textDark,
    letterSpacing: 0.5,
  },
  qrSubText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
  storeDetailsCard: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 12,
    borderRadius: 8,
    gap: 4,
    marginTop: 6,
  },
  storeNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  storeAddressText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  storePhoneText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  callStoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  callStoreBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },

  /* Carrier reverse */
  carrierPickupDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  pickupAddressBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 10,
    borderRadius: 6,
    marginTop: 4,
    gap: 2,
  },
  pickupAddressTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  pickupAddressText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },

  /* Returned Items */
  returnedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#EEE',
  },
  itemThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textDark,
  },
  itemVarText: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  itemQtyText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  qcResultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  qcResultText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00796B',
  },

  /* Settlement */
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  settlementNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  settlementNoteText: {
    flex: 1,
    fontSize: 10,
    color: '#666',
    lineHeight: 14,
  },
});
