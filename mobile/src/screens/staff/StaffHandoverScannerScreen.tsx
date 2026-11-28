import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Vibration,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { theme } from '../../constants/theme';
import { staffFulfillmentApi, TaskQueueItem } from '../../api/staffFulfillmentApi';

interface Props {
  navigation: any;
  route: any;
}

export default function StaffHandoverScannerScreen({ navigation, route }: Props) {
  const storeId = route?.params?.storeId;
  const storeName = route?.params?.storeName || 'Cửa hàng';

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const lastScannedRef = useRef<number>(0);

  // Queue state
  const [queue, setQueue] = useState<TaskQueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTask, setSelectedTask] = useState<TaskQueueItem | null>(null);

  // Manual input & search
  const [scanQuery, setScanQuery] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Driver input fields
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [driverPlate, setDriverPlate] = useState<string>('');
  const [handoverNote, setHandoverNote] = useState<string>('');

  // Success dialog state
  const [handoverSuccessResult, setHandoverSuccessResult] = useState<any | null>(null);

  // 1. Tải hàng đợi Handover
  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await staffFulfillmentApi.getHandoverQueue({
        storeId,
        limit: 20,
      });
      setQueue(res.items || []);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        Alert.alert('Từ chối quyền', 'Bạn không có quyền xem hàng đợi bàn giao (403 Forbidden).');
        navigation.goBack();
      } else {
        Alert.alert('Lỗi', 'Không thể tải hàng đợi bàn giao. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  }, [storeId, navigation]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // 2. Đối chiếu mã quét với hàng đợi
  const handleMatchCode = (code: string) => {
    if (!code || !code.trim()) return;
    const clean = code.trim().toUpperCase();

    const matched = queue.find((item) => {
      const foNum = (item.fulfillmentOrderNumber || '').toUpperCase();
      const ordNum = (item.orderNumber || '').toUpperCase();
      const trackCode = (item.trackingCode || '').toUpperCase();
      const foId = (item.id || '').toUpperCase();
      return (
        clean === foNum ||
        clean === ordNum ||
        clean === trackCode ||
        clean === foId ||
        clean.includes(trackCode)
      );
    });

    if (matched) {
      try {
        Vibration.vibrate(100);
      } catch {}
      setSelectedTask(matched);
      setIsCameraOpen(false);
      setScanQuery('');
      // Gợi ý thông tin tài xế theo đơn vị
      const isAhamove = (matched.shippingServiceCode || '').toUpperCase().includes('AHAMOVE');
      setHandoverNote(isAhamove ? 'Bàn giao tài xế Ahamove Express' : 'Bàn giao bưu tá GHN Standard');
    } else {
      try {
        Vibration.vibrate([0, 200, 100, 200]);
      } catch {}
      Alert.alert(
        'Không tìm thấy kiện hàng',
        `Mã [${code}] không khớp với kiện hàng nào trong danh sách chờ bàn giao tại chi nhánh này.`
      );
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    const now = Date.now();
    if (now - lastScannedRef.current < 1500) return;
    lastScannedRef.current = now;
    handleMatchCode(data);
  };

  // 3. Xác nhận bàn giao cho tài xế
  const handleConfirmHandover = async () => {
    if (!selectedTask) return;

    // Kiểm tra tracking code bắt buộc
    const tracking = selectedTask.trackingCode;
    if (!tracking || !tracking.trim()) {
      Alert.alert(
        'Thiếu mã vận đơn 3PL',
        'Kiện hàng này chưa được gán mã vận đơn từ hãng vận chuyển (Ahamove/GHN). Không thể bàn giao cho shipper!'
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await staffFulfillmentApi.confirmHandover(selectedTask.id, {
        driverName: driverName.trim() || undefined,
        driverPhone: driverPhone.trim() || undefined,
        driverLicensePlate: driverPlate.trim() || undefined,
        note: handoverNote.trim() || undefined,
      });

      // Lưu kết quả để hiển thị phân biệt HANDED_OVER vs PICKED_UP
      setHandoverSuccessResult({
        ...res,
        foNumber: selectedTask.fulfillmentOrderNumber,
        carrier: selectedTask.shippingServiceCode,
      });

      // Clear selection và reload queue
      setSelectedTask(null);
      setDriverName('');
      setDriverPhone('');
      setDriverPlate('');
      setHandoverNote('');
      loadQueue();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        Alert.alert(
          'Xung đột cập nhật (409 Conflict)',
          'Kiện hàng này đã được nhân viên khác xác nhận bàn giao hoặc trạng thái đã thay đổi. Đang tải lại danh sách mới...',
          [{ text: 'OK', onPress: () => loadQueue() }]
        );
        setSelectedTask(null);
      } else {
        Alert.alert('Lỗi bàn giao', err?.response?.data?.message || err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (selectedTask) {
              setSelectedTask(null);
            } else {
              navigation.goBack();
            }
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Bàn Giao Kiện Hàng (Handover)</Text>
          <Text style={styles.headerSubtitle}>
            {storeName} • {queue.length} kiện chờ bàn giao
          </Text>
        </View>
        <TouchableOpacity
          style={styles.cameraBtn}
          onPress={async () => {
            if (!permission?.granted) {
              const res = await requestPermission();
              if (!res.granted) {
                Alert.alert('Yêu cầu quyền Camera', 'Vui lòng cấp quyền Camera để quét mã vận đơn.');
                return;
              }
            }
            setIsCameraOpen(true);
          }}
        >
          <Ionicons name="barcode-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Quick Search / Scan Input */}
        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>QUÉT HOẶC NHẬP MÃ VẬN ĐƠN / SỐ KIỆN THÙNG:</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="VD: GHN-123456 hoặc AHA-..."
              value={scanQuery}
              onChangeText={setScanQuery}
              autoCapitalize="characters"
              onSubmitEditing={() => handleMatchCode(scanQuery)}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={() => handleMatchCode(scanQuery)}>
              <Ionicons name="search" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Selected Task Inspection & Driver Details Form */}
        {selectedTask ? (
          <View style={styles.taskDetailCard}>
            <View style={styles.taskHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskFoNumber}>{selectedTask.fulfillmentOrderNumber}</Text>
                <Text style={styles.taskOrderNumber}>Đơn hàng: {selectedTask.orderNumber || 'N/A'}</Text>
              </View>
              <View style={styles.badgePacked}>
                <Text style={styles.badgePackedText}>{selectedTask.status}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Carrier & Tracking */}
            <View style={styles.carrierBox}>
              <View style={styles.carrierRow}>
                <Ionicons
                  name={
                    selectedTask.shippingServiceCode.includes('AHAMOVE')
                      ? 'bicycle'
                      : 'airplane'
                  }
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={styles.carrierName}>
                  {selectedTask.shippingServiceCode}
                </Text>
              </View>
              <View style={styles.trackingBox}>
                <Text style={styles.trackingLabel}>Mã vận đơn (Tracking Code):</Text>
                <Text style={styles.trackingCode}>
                  {selectedTask.trackingCode || 'CHƯA CÓ MÃ VẬN ĐƠN'}
                </Text>
              </View>
            </View>

            {/* Recipient Details */}
            <View style={styles.recipientBox}>
              <Text style={styles.recipientLabel}>Khách nhận hàng:</Text>
              <Text style={styles.recipientName}>{selectedTask.recipientName || 'Khách hàng'}</Text>
              {selectedTask.recipientPhone && (
                <Text style={styles.recipientPhone}>SĐT: {selectedTask.recipientPhone}</Text>
              )}
            </View>

            {/* Driver Information Form */}
            <Text style={styles.formTitle}>THÔNG TIN TÀI XẾ / BƯU TÁ NHẬN HÀNG</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Tên tài xế / Shipper:</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Ví dụ: Nguyễn Văn A (Ahamove/GHN)"
                value={driverName}
                onChangeText={setDriverName}
              />
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.fieldLabel}>SĐT tài xế:</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="0901234567"
                  keyboardType="phone-pad"
                  value={driverPhone}
                  onChangeText={setDriverPhone}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.fieldLabel}>Biển số xe / Mã thẻ:</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="29C-123.45"
                  autoCapitalize="characters"
                  value={driverPlate}
                  onChangeText={setDriverPlate}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Ghi chú bàn giao:</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Ghi chú thêm về ca bàn giao..."
                value={handoverNote}
                onChangeText={setHandoverNote}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setSelectedTask(null)}
              >
                <Text style={styles.cancelBtnText}>Bỏ chọn</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  submitting && { opacity: 0.7 },
                ]}
                disabled={submitting}
                onPress={handleConfirmHandover}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmBtnText}>Xác Nhận Bàn Giao</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* List of Handover Tasks */
          <View>
            <Text style={styles.sectionHeader}>DANH SÁCH KIỆN HÀNG CHỜ TÀI XẾ LẤY ({queue.length})</Text>

            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Đang tải hàng đợi bàn giao...</Text>
              </View>
            ) : queue.length === 0 ? (
              <View style={styles.centerBox}>
                <Ionicons name="cube" size={56} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Không có kiện hàng chờ bàn giao</Text>
                <Text style={styles.emptyDesc}>
                  Tất cả kiện hàng đã đóng gói đều đã được bàn giao thành công.
                </Text>
                <TouchableOpacity style={styles.reloadBtn} onPress={loadQueue}>
                  <Ionicons name="refresh" size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.reloadBtnText}>Làm mới</Text>
                </TouchableOpacity>
              </View>
            ) : (
              queue.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.cardItem}
                  activeOpacity={0.88}
                  onPress={() => {
                    setSelectedTask(item);
                    const isAha = (item.shippingServiceCode || '').toUpperCase().includes('AHAMOVE');
                    setHandoverNote(isAha ? 'Bàn giao tài xế Ahamove Express' : 'Bàn giao bưu tá GHN Standard');
                  }}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardFo}>{item.fulfillmentOrderNumber}</Text>
                      <Text style={styles.cardCarrier}>
                        Đơn vị: <Text style={{ fontWeight: '700', color: theme.colors.primary }}>{item.shippingServiceCode}</Text>
                      </Text>
                    </View>
                    <View style={styles.badgeWaiting}>
                      <Text style={styles.badgeWaitingText}>Chờ bàn giao</Text>
                    </View>
                  </View>

                  <View style={styles.cardTrackingRow}>
                    <Ionicons name="barcode-outline" size={16} color="#6B7280" />
                    <Text style={styles.cardTrackingText}>
                      Vận đơn: <Text style={{ fontWeight: '700' }}>{item.trackingCode || 'Chưa gán mã'}</Text>
                    </Text>
                  </View>

                  <View style={styles.cardBottomRow}>
                    <Text style={styles.cardRecipient}>
                      Người nhận: {item.recipientName || 'Khách hàng'} {item.recipientPhone ? `(${item.recipientPhone})` : ''}
                    </Text>
                    <Text style={styles.cardActionText}>Bàn giao →</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal Camera Scanner */}
      <Modal
        visible={isCameraOpen}
        animationType="slide"
        onRequestClose={() => setIsCameraOpen(false)}
      >
        <SafeAreaView style={styles.cameraContainer}>
          <View style={styles.cameraNav}>
            <Text style={styles.cameraTitle}>Quét Mã Vận Đơn (Tracking Code)</Text>
            <TouchableOpacity onPress={() => setIsCameraOpen(false)}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.cameraViewArea}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr', 'ean13', 'code128', 'code39'],
              }}
              onBarcodeScanned={handleBarcodeScanned}
            />
            <View style={styles.reticleOverlay}>
              <View style={styles.reticleFrame} />
              <Text style={styles.reticleInstruction}>
                Căn chỉnh mã vạch trên thùng carton vào giữa khung
              </Text>
            </View>
          </View>

          <View style={styles.cameraFooter}>
            <TouchableOpacity
              style={styles.closeCameraBtn}
              onPress={() => setIsCameraOpen(false)}
            >
              <Text style={styles.closeCameraBtnText}>Đóng máy quét</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Handover Success Modal */}
      {handoverSuccessResult && (
        <Modal transparent animationType="fade" visible={Boolean(handoverSuccessResult)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.successCard}>
              <View style={styles.successIconBox}>
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              </View>
              <Text style={styles.successTitle}>Bàn Giao Thành Công!</Text>
              <Text style={styles.successSub}>
                Kiện hàng thuộc đơn <Text style={{ fontWeight: '700' }}>{handoverSuccessResult.foNumber}</Text> đã được xác nhận bàn giao.
              </Text>

              {/* Distinction: HANDED_OVER vs PICKED_UP */}
              <View style={styles.statusExplainerBox}>
                <View style={styles.statusStep}>
                  <View style={[styles.stepDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.stepText}>
                    Trạng thái nội bộ: <Text style={{ fontWeight: '700', color: '#065F46' }}>HANDED_OVER</Text> (Đã giao tài xế tại quầy)
                  </Text>
                </View>
                <View style={styles.statusStep}>
                  <View style={[styles.stepDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.stepText}>
                    Trạng thái 3PL: <Text style={{ fontWeight: '700', color: '#92400E' }}>Chờ PICKED_UP</Text> (Shipper quét lấy hàng trên app)
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.successDoneBtn}
                onPress={() => setHandoverSuccessResult(null)}
              >
                <Text style={styles.successDoneBtnText}>Tiếp tục bàn giao kiện khác</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  cameraBtn: {
    backgroundColor: theme.colors.primary,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  searchCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  searchLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  searchBtn: {
    backgroundColor: theme.colors.primary,
    height: 42,
    width: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  reloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    marginTop: 16,
  },
  reloadBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cardItem: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardFo: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  cardCarrier: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  badgeWaiting: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeWaitingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  cardTrackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginVertical: 8,
  },
  cardTrackingText: {
    fontSize: 13,
    color: '#374151',
    marginLeft: 6,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cardRecipient: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  taskDetailCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskFoNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  taskOrderNumber: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  badgePacked: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePackedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  carrierBox: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 12,
  },
  carrierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  carrierName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    marginLeft: 6,
  },
  trackingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackingLabel: {
    fontSize: 12,
    color: '#374151',
  },
  trackingCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  recipientBox: {
    marginBottom: 16,
  },
  recipientLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  recipientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  recipientPhone: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  formTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.6,
    marginBottom: 12,
    marginTop: 8,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  fieldInput: {
    height: 42,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cameraTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cameraViewArea: {
    flex: 1,
    position: 'relative',
  },
  reticleOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleFrame: {
    width: 280,
    height: 180,
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  reticleInstruction: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cameraFooter: {
    padding: 16,
    backgroundColor: '#111827',
  },
  closeCameraBtn: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeCameraBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  successIconBox: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  successSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  statusExplainerBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  stepText: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  successDoneBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  successDoneBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
