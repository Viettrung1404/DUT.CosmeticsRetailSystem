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
import { staffFulfillmentApi, TaskQueueItem, PickListResponse } from '../../api/staffFulfillmentApi';
import {
  PickItemState,
  verifyPickingBarcode,
  isPickingListComplete,
  calculatePickingProgress,
} from '../../utils/staffOperationsHelper';

interface Props {
  navigation: any;
  route: any;
}

export default function StaffPickingScannerScreen({ navigation, route }: Props) {
  const storeId = route?.params?.storeId;
  const storeName = route?.params?.storeName || 'Cửa hàng';

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerActive, setScannerActive] = useState<boolean>(true);

  // Queue state
  const [queue, setQueue] = useState<TaskQueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState<boolean>(true);
  const [selectedFo, setSelectedFo] = useState<TaskQueueItem | null>(null);

  // Pick list state
  const [pickList, setPickList] = useState<PickListResponse | null>(null);
  const [pickItems, setPickItems] = useState<PickItemState[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [loadingPickList, setLoadingPickList] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Manual input & feedback
  const [manualCode, setManualCode] = useState<string>('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const lastScannedTimeRef = useRef<number>(0);

  // 1. Tải danh sách đơn cần nhặt
  const loadQueue = useCallback(async () => {
    try {
      setLoadingQueue(true);
      const res = await staffFulfillmentApi.getPickingQueue({
        storeId,
        limit: 20,
      });
      setQueue(res.items || []);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        Alert.alert('Từ chối quyền', 'Bạn không có quyền xem hàng đợi nhặt hàng (403 Forbidden).');
        navigation.goBack();
      } else {
        Alert.alert('Lỗi', 'Không thể tải hàng đợi nhặt hàng. Vui lòng thử lại.');
      }
    } finally {
      setLoadingQueue(false);
    }
  }, [storeId, navigation]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // 2. Tải Pick List khi chọn một FO
  const handleSelectFo = async (item: TaskQueueItem) => {
    try {
      setSelectedFo(item);
      setLoadingPickList(true);
      setFeedback(null);

      // Nếu đơn ở trạng thái ALLOCATED, tự động chuyển sang PICKING
      if (item.status === 'ALLOCATED') {
        try {
          await staffFulfillmentApi.startPicking(item.id);
        } catch (e) {
          console.log('startPicking info:', e);
        }
      }

      const res = await staffFulfillmentApi.getPickList(item.id);
      setPickList(res);
      const states: PickItemState[] = (res.items || []).map((it) => ({
        ...it,
        pickedCount: 0,
      }));
      setPickItems(states);
      setActiveItemIndex(0);
    } catch (err: any) {
      Alert.alert('Lỗi tải Pick List', err?.response?.data?.message || err.message);
    } finally {
      setLoadingPickList(false);
    }
  };

  // 3. Xử lý quét mã vạch (từ Camera hoặc Manual Input)
  const handleProcessBarcode = (code: string) => {
    if (!code || !code.trim() || pickItems.length === 0) return;
    const cleanCode = code.trim().toUpperCase();

    // Tìm xem mã quét khớp với sản phẩm nào trong Pick List
    let matchedIndex = -1;

    // Ưu tiên kiểm tra mục đang active trước
    const activeItem = pickItems[activeItemIndex];
    if (activeItem && activeItem.pickedCount < activeItem.quantity) {
      const activeMatch = verifyPickingBarcode(cleanCode, activeItem);
      if (activeMatch.success) {
        matchedIndex = activeItemIndex;
      }
    }

    // Nếu không khớp active item, quét qua toàn bộ Pick List
    if (matchedIndex === -1) {
      for (let i = 0; i < pickItems.length; i++) {
        const item = pickItems[i];
        if (item.pickedCount < item.quantity) {
          const res = verifyPickingBarcode(cleanCode, item);
          if (res.success) {
            matchedIndex = i;
            break;
          }
        }
      }
    }

    if (matchedIndex !== -1) {
      // Quét đúng!
      const target = pickItems[matchedIndex];
      const updated = [...pickItems];
      updated[matchedIndex] = {
        ...target,
        pickedCount: target.pickedCount + 1,
      };
      setPickItems(updated);
      setActiveItemIndex(matchedIndex);

      // Rung phản hồi thành công
      try {
        Vibration.vibrate(100);
      } catch {}

      setFeedback({
        type: 'success',
        message: `✓ Đã nhặt thành công: ${target.productName} (${updated[matchedIndex].pickedCount}/${target.quantity}) - Lô: ${target.batchCode}`,
      });
      setManualCode('');
    } else {
      // Quét sai!
      try {
        Vibration.vibrate([0, 200, 100, 200]);
      } catch {}

      // Kiểm tra xem có phải quét đúng SKU nhưng sai Lô không
      const wrongBatchItem = pickItems.find(
        (it) => it.sku.toUpperCase() === cleanCode || (it.barcode && it.barcode.toUpperCase() === cleanCode)
      );

      if (wrongBatchItem) {
        const expStr = wrongBatchItem.expiryDate
          ? new Date(wrongBatchItem.expiryDate).toLocaleDateString('vi-VN')
          : 'N/A';
        setFeedback({
          type: 'error',
          message: `⚠ CẢNH BÁO: Sai số lô! Sản phẩm ${wrongBatchItem.productName} phải nhặt đúng Lô FEFO [${wrongBatchItem.batchCode}], hạn dùng: ${expStr}`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: `✕ Mã vạch [${cleanCode}] không tồn tại trong Pick List của đơn này!`,
        });
      }
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    const now = Date.now();
    // Throttle scan 1.5s để tránh duplicate scan
    if (now - lastScannedTimeRef.current < 1500) return;
    lastScannedTimeRef.current = now;
    handleProcessBarcode(data);
  };

  // 4. Hoàn tất nhặt hàng
  const handleCompletePicking = async () => {
    if (!selectedFo || pickItems.length === 0) return;

    if (!isPickingListComplete(pickItems)) {
      Alert.alert(
        'Chưa nhặt đủ hàng',
        'Vẫn còn sản phẩm chưa nhặt đủ số lượng theo Pick List. Vui lòng quét đủ tất cả các mặt hàng.'
      );
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        items: pickItems.map((it) => ({
          variantId: it.variantId,
          batchCode: it.batchCode,
          quantity: it.pickedCount,
          barcode: it.barcode || undefined,
        })),
      };

      await staffFulfillmentApi.completePicking(selectedFo.id, payload);

      Alert.alert(
        'Hoàn tất nhặt hàng!',
        `Đơn ${selectedFo.fulfillmentOrderNumber} đã được chuyển sang trạng thái PICKED (Đã nhặt xong, chờ đóng gói).`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedFo(null);
              setPickList(null);
              setPickItems([]);
              setIsCameraModalOpen(false);
              loadQueue();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Lỗi hoàn tất nhặt hàng', err?.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const progress = calculatePickingProgress(pickItems);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (selectedFo) {
              setSelectedFo(null);
              setPickList(null);
              setPickItems([]);
            } else {
              navigation.goBack();
            }
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {selectedFo ? `Nhặt Đơn: ${selectedFo.fulfillmentOrderNumber}` : 'Hàng Đợi Nhặt Hàng'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {storeName} • {selectedFo ? `Tiến độ: ${progress.percentage}%` : `${queue.length} đơn chờ`}
          </Text>
        </View>
        {selectedFo && (
          <TouchableOpacity
            style={styles.cameraToggleBtn}
            onPress={async () => {
              if (!permission?.granted) {
                const res = await requestPermission();
                if (!res.granted) {
                  Alert.alert('Yêu cầu quyền Camera', 'Vui lòng cấp quyền truy cập Camera để quét mã.');
                  return;
                }
              }
              setIsCameraModalOpen(true);
            }}
          >
            <Ionicons name="camera" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Screen Mode 1: Chọn FO từ Hàng Đợi */}
      {!selectedFo ? (
        <ScrollView style={styles.container} contentContainerStyle={styles.queueContent}>
          <Text style={styles.sectionTitle}>DANH SÁCH ĐƠN HÀNG CẦN NHẶT</Text>

          {loadingQueue ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Đang tải hàng đợi...</Text>
            </View>
          ) : queue.length === 0 ? (
            <View style={styles.centerBox}>
              <Ionicons name="checkmark-done-circle-outline" size={64} color="#10B981" />
              <Text style={styles.emptyTitle}>Hàng đợi trống!</Text>
              <Text style={styles.emptySubtitle}>
                Hiện không có đơn hàng nào cần nhặt tại chi nhánh này.
              </Text>
              <TouchableOpacity style={styles.refreshBtn} onPress={loadQueue}>
                <Ionicons name="refresh" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.refreshBtnText}>Làm mới</Text>
              </TouchableOpacity>
            </View>
          ) : (
            queue.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.foCard}
                activeOpacity={0.88}
                onPress={() => handleSelectFo(item)}
              >
                <View style={styles.foHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.foNumber}>{item.fulfillmentOrderNumber}</Text>
                    <Text style={styles.orderNumber}>
                      Mã đơn gốc: {item.orderNumber || 'N/A'} • {item.shippingServiceCode}
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{item.status}</Text>
                  </View>
                </View>

                <View style={styles.foDivider} />

                <View style={styles.foDetailsRow}>
                  <View style={styles.foDetailCol}>
                    <Text style={styles.detailLabel}>Khách nhận:</Text>
                    <Text style={styles.detailValue}>{item.recipientName || 'Khách hàng'}</Text>
                  </View>
                  <View style={styles.foDetailCol}>
                    <Text style={styles.detailLabel}>Số lượng SP:</Text>
                    <Text style={[styles.detailValue, { fontWeight: '700', color: theme.colors.primary }]}>
                      {item.totalItemsCount} món
                    </Text>
                  </View>
                </View>

                <View style={styles.actionPrompt}>
                  <Text style={styles.actionPromptText}>Bắt đầu nhặt hàng →</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        /* Screen Mode 2: Tiến trình Nhặt hàng & Quét Barcode */
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.container} contentContainerStyle={styles.pickContent}>
            {/* Progress Bar */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Tiến độ nhặt hàng:</Text>
                <Text style={styles.progressValue}>
                  {progress.totalPicked} / {progress.totalRequired} SP ({progress.percentage}%)
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progress.percentage}%`,
                      backgroundColor: progress.isComplete ? '#10B981' : theme.colors.primary,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Banner phản hồi (Feedback) */}
            {feedback && (
              <View
                style={[
                  styles.feedbackBanner,
                  feedback.type === 'success'
                    ? styles.feedbackSuccess
                    : feedback.type === 'error'
                    ? styles.feedbackError
                    : styles.feedbackInfo,
                ]}
              >
                <Ionicons
                  name={
                    feedback.type === 'success'
                      ? 'checkmark-circle'
                      : feedback.type === 'error'
                      ? 'alert-circle'
                      : 'information-circle'
                  }
                  size={22}
                  color={
                    feedback.type === 'success'
                      ? '#065F46'
                      : feedback.type === 'error'
                      ? '#991B1B'
                      : '#1E40AF'
                  }
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.feedbackText,
                    {
                      color:
                        feedback.type === 'success'
                          ? '#065F46'
                          : feedback.type === 'error'
                          ? '#991B1B'
                          : '#1E40AF',
                    },
                  ]}
                >
                  {feedback.message}
                </Text>
              </View>
            )}

            {/* Quick Manual Barcode Input Bar */}
            <View style={styles.manualInputCard}>
              <Text style={styles.manualInputLabel}>QUÉT HOẶC NHẬP MÃ VẠCH (SKU / BARCODE / LOT):</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.barcodeInput}
                  placeholder="Ví dụ: SKU-LIP-01 hoặc mã vạch..."
                  value={manualCode}
                  onChangeText={setManualCode}
                  autoCapitalize="characters"
                  onSubmitEditing={() => handleProcessBarcode(manualCode)}
                />
                <TouchableOpacity
                  style={styles.verifyBtn}
                  onPress={() => handleProcessBarcode(manualCode)}
                >
                  <Text style={styles.verifyBtnText}>Xác nhận</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Pick List Items */}
            <Text style={styles.sectionTitle}>DANH SÁCH SẢN PHẨM & LÔ FEFO CHỈ ĐỊNH</Text>

            {loadingPickList ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              pickItems.map((item, idx) => {
                const isFinished = item.pickedCount >= item.quantity;
                return (
                  <View
                    key={`${item.variantId}-${item.batchCode}-${idx}`}
                    style={[
                      styles.itemCard,
                      isFinished && styles.itemCardComplete,
                      activeItemIndex === idx && !isFinished && styles.itemCardActive,
                    ]}
                  >
                    <View style={styles.itemTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemProductName}>{item.productName}</Text>
                        <Text style={styles.itemSku}>SKU: {item.sku} {item.barcode ? `• Barcode: ${item.barcode}` : ''}</Text>
                      </View>
                      <View
                        style={[
                          styles.qtyBadge,
                          isFinished ? styles.qtyBadgeDone : styles.qtyBadgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.qtyBadgeText,
                            isFinished ? styles.qtyTextDone : styles.qtyTextPending,
                          ]}
                        >
                          {item.pickedCount} / {item.quantity}
                        </Text>
                      </View>
                    </View>

                    {/* FEFO Lot & Expiry Tag */}
                    <View style={styles.fefoBox}>
                      <View style={styles.fefoTag}>
                        <Ionicons name="pricetag" size={13} color="#B45309" />
                        <Text style={styles.fefoText}>Lô FEFO: {item.batchCode}</Text>
                      </View>
                      <View style={styles.fefoTag}>
                        <Ionicons name="calendar-outline" size={13} color="#4B5563" />
                        <Text style={styles.fefoDate}>
                          HSD: {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('vi-VN') : 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Bottom Fixed Action Button */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[
                styles.completeBtn,
                (!progress.isComplete || submitting) && styles.completeBtnDisabled,
              ]}
              disabled={!progress.isComplete || submitting}
              onPress={handleCompletePicking}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.completeBtnText}>
                    {progress.isComplete
                      ? 'Hoàn Tất Nhặt Hàng (100%)'
                      : `Chưa nhặt đủ (${progress.totalPicked}/${progress.totalRequired})`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal Camera Scanner */}
      <Modal
        visible={isCameraModalOpen}
        animationType="slide"
        onRequestClose={() => setIsCameraModalOpen(false)}
      >
        <SafeAreaView style={styles.cameraModalContainer}>
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraHeaderTitle}>Quét Mã Vạch / QR Code</Text>
            <TouchableOpacity
              style={styles.cameraCloseBtn}
              onPress={() => setIsCameraModalOpen(false)}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.cameraWrapper}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr',
                  'ean13',
                  'ean8',
                  'code128',
                  'code39',
                  'upc_a',
                  'upc_e',
                ],
              }}
              onBarcodeScanned={handleBarcodeScanned}
            />

            {/* Target Reticle Overlay */}
            <View style={styles.reticleOverlay}>
              <View style={styles.reticleBox}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <Text style={styles.reticleText}>Căn chỉnh mã vạch vào giữa khung để quét</Text>
            </View>
          </View>

          {/* Live Scanner Mini Feedback */}
          {feedback && (
            <View
              style={[
                styles.scannerMiniFeedback,
                feedback.type === 'success' ? styles.bgSuccess : styles.bgError,
              ]}
            >
              <Text style={styles.scannerMiniFeedbackText}>{feedback.message}</Text>
            </View>
          )}

          <View style={styles.cameraFooter}>
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setIsCameraModalOpen(false)}
            >
              <Text style={styles.closeModalBtnText}>Đóng Camera (Nhập thủ công)</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
  cameraToggleBtn: {
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
  queueContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pickContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 6,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 18,
  },
  refreshBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  foCard: {
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
  foHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  foNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  orderNumber: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  foDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  foDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  foDetailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    color: '#374151',
    marginTop: 2,
  },
  actionPrompt: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  actionPromptText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  progressCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  feedbackSuccess: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  feedbackError: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  feedbackInfo: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  manualInputCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  manualInputLabel: {
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
  barcodeInput: {
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
  verifyBtn: {
    backgroundColor: theme.colors.primary,
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  verifyBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemCardActive: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: '#FFF',
  },
  itemCardComplete: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemProductName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  itemSku: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  qtyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  qtyBadgePending: {
    backgroundColor: '#F3F4F6',
  },
  qtyBadgeDone: {
    backgroundColor: '#DCFCE7',
  },
  qtyBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  qtyTextPending: {
    color: '#4B5563',
  },
  qtyTextDone: {
    color: '#15803D',
  },
  fefoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: 'space-between',
  },
  fefoTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fefoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    marginLeft: 4,
  },
  fefoDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    marginLeft: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
  },
  completeBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  completeBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  completeBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cameraModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cameraHeaderTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cameraCloseBtn: {
    padding: 6,
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
  reticleOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleBox: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#10B981',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  reticleText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scannerMiniFeedback: {
    padding: 12,
    alignItems: 'center',
  },
  bgSuccess: {
    backgroundColor: '#059669',
  },
  bgError: {
    backgroundColor: '#DC2626',
  },
  scannerMiniFeedbackText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cameraFooter: {
    padding: 16,
    backgroundColor: '#111827',
  },
  closeModalBtn: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
