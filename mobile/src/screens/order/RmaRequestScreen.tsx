import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../constants/theme';
import {
  orderApi,
  OrderReturnEligibility,
  EligibleReturnItem,
  StoreLocation,
  ReturnReasonCode,
  ReturnChannel,
} from '../../api/orderApi';

const REASON_LABELS: Record<string, { label: string; icon: string; requiresVideo?: boolean }> = {
  DAMAGED_IN_TRANSIT: {
    label: 'Bể vỡ, đổ tràn do vận chuyển (Cần video unboxing)',
    icon: 'cube-outline',
    requiresVideo: true,
  },
  DEFECTIVE: {
    label: 'Lỗi sản xuất, biến chất sản phẩm (Cần video)',
    icon: 'alert-circle-outline',
    requiresVideo: true,
  },
  ALLERGIC: {
    label: 'Dị ứng da, kích ứng khi sử dụng',
    icon: 'medical-outline',
  },
  CHANGE_OF_MIND: {
    label: 'Khách hàng đổi ý (Yêu cầu nguyên seal 100%)',
    icon: 'refresh-outline',
  },
  WRONG_ITEM: {
    label: 'Giao sai sản phẩm / sai dung tích',
    icon: 'swap-horizontal-outline',
  },
  EXPIRED: {
    label: 'Sản phẩm cận date hoặc hết hạn',
    icon: 'time-outline',
  },
};

interface ItemFormState {
  selected: boolean;
  quantity: number;
  reasonCode: ReturnReasonCode;
  note: string;
  evidenceImages: string[];
  evidenceVideoUrl?: string;
}

export default function RmaRequestScreen({ route, navigation }: any) {
  const initialOrderId = route.params?.orderId || '';

  const [orderId, setOrderId] = useState<string>(initialOrderId);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const [eligibility, setEligibility] = useState<OrderReturnEligibility | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);

  // Danh sách Showroom thật từ Backend
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [showStoreModal, setShowStoreModal] = useState(false);

  // Kênh tiếp nhận
  const [returnChannel, setReturnChannel] = useState<ReturnChannel>('CARRIER_PICKUP');
  const [pickupAddressLine, setPickupAddressLine] = useState('');
  const [customerGeneralNote, setCustomerGeneralNote] = useState('');

  // Trạng thái từng item
  const [itemsState, setItemsState] = useState<Record<string, ItemFormState>>({});
  const [activeMediaItemId, setActiveMediaItemId] = useState<string | null>(null);

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Idempotency Key duy trì suốt vòng đời form
  const idempotencyKeyRef = useRef<string>(
    'rma-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10)
  );

  // 1. Nếu không có orderId ban đầu, tải danh sách đơn hàng đã giao
  useEffect(() => {
    if (!initialOrderId) {
      setLoadingOrders(true);
      orderApi
        .getMyOrders()
        .then((res: any) => {
          const list = res?.data || res || [];
          const deliveredList = list.filter(
            (o: any) => o.status === 'DELIVERED' || o.status === 'COMPLETED'
          );
          setAvailableOrders(deliveredList.length > 0 ? deliveredList : list);
          if (deliveredList.length > 0) {
            setOrderId(deliveredList[0].id);
          }
        })
        .catch((err) => console.warn('Fetch orders failed', err))
        .finally(() => setLoadingOrders(false));
    }
  }, [initialOrderId]);

  // 2. Tải danh sách Showroom thật từ Backend
  useEffect(() => {
    orderApi
      .getStores()
      .then((data: any) => {
        const storeList = Array.isArray(data) ? data : data?.data || [];
        setStores(storeList);
        if (storeList.length > 0) {
          setSelectedStoreId(storeList[0].id);
        }
      })
      .catch((err) => console.warn('Fetch stores failed', err));
  }, []);

  // 3. Tải Eligibility khi orderId thay đổi
  const fetchEligibility = useCallback(async (id: string) => {
    if (!id) return;
    setLoadingEligibility(true);
    setEligibilityError(null);
    try {
      const res: OrderReturnEligibility = await orderApi.getOrderReturnEligibility(id);
      setEligibility(res);

      // Khởi tạo state cho các item
      const initialMap: Record<string, ItemFormState> = {};
      (res.items || []).forEach((it) => {
        const defaultReason = (it.allowedReasons?.[0] as ReturnReasonCode) || 'DEFECTIVE';
        initialMap[it.orderItemId] = {
          selected: it.availableReturnQuantity > 0,
          quantity: Math.min(1, it.availableReturnQuantity),
          reasonCode: defaultReason,
          note: '',
          evidenceImages: [],
          evidenceVideoUrl: undefined,
        };
      });
      setItemsState(initialMap);
    } catch (err: any) {
      setEligibilityError(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể kiểm tra điều kiện đổi trả của đơn hàng.'
      );
    } finally {
      setLoadingEligibility(false);
    }
  }, []);

  useEffect(() => {
    if (orderId) {
      fetchEligibility(orderId);
    }
  }, [orderId, fetchEligibility]);

  // Cập nhật state item
  const updateItemState = (orderItemId: string, patch: Partial<ItemFormState>) => {
    setItemsState((prev) => ({
      ...prev,
      [orderItemId]: {
        ...prev[orderItemId],
        ...patch,
      },
    }));
  };

  // Upload hình ảnh hoặc video bằng chứng thật qua expo-image-picker
  const handlePickMedia = async (orderItemId: string, type: 'camera' | 'library') => {
    try {
      if (type === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            'Quyền Camera',
            'Vui lòng cấp quyền Camera để chụp ảnh hoặc quay video unboxing sản phẩm lỗi.'
          );
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images', 'videos'],
          allowsEditing: false,
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          await processAndUploadAsset(orderItemId, result.assets[0]);
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            'Quyền Thư viện',
            'Vui lòng cấp quyền Thư viện ảnh để chọn ảnh hoặc video bằng chứng.'
          );
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          allowsEditing: false,
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          await processAndUploadAsset(orderItemId, result.assets[0]);
        }
      }
    } catch (err: any) {
      Alert.alert('Lỗi thao tác', err?.message || 'Không thể mở trình chọn media.');
    }
  };

  const processAndUploadAsset = async (orderItemId: string, asset: ImagePicker.ImagePickerAsset) => {
    const isVideo = asset.type === 'video' || (asset.mimeType && asset.mimeType.startsWith('video/'));

    // Kiểm tra dung lượng video <= 50MB theo chuẩn GlowUp
    if (isVideo && asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
      Alert.alert('File quá lớn', 'Video minh chứng không được vượt quá 50MB.');
      return;
    }

    setIsUploadingMedia(true);
    setUploadProgressText(isVideo ? 'Đang tải video lên máy chủ...' : 'Đang xử lý và tải ảnh lên...');

    try {
      const uri = asset.uri;
      const fileName = uri.split('/').pop() || (isVideo ? 'video.mp4' : 'evidence.jpg');
      const fileType = asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: fileType,
      } as any);

      // Thử upload lên Backend endpoint /uploads/return-images
      try {
        const uploadRes = await orderApi.uploadReturnImage(formData);
        const attachmentId =
          uploadRes?.attachmentId ||
          uploadRes?.data?.attachmentId ||
          uploadRes?.id ||
          uri;

        if (isVideo) {
          updateItemState(orderItemId, {
            evidenceVideoUrl: attachmentId,
          });
        } else {
          setItemsState((prev) => {
            const currentImages = prev[orderItemId]?.evidenceImages || [];
            return {
              ...prev,
              [orderItemId]: {
                ...prev[orderItemId],
                evidenceImages: [...currentImages, attachmentId],
              },
            };
          });
        }
      } catch (uploadErr) {
        // Fallback: nếu private bucket chưa cấu hình trong môi trường dev, lưu URI trực tiếp
        console.warn('Real upload fallback to local uri', uploadErr);
        if (isVideo) {
          updateItemState(orderItemId, {
            evidenceVideoUrl: uri,
          });
        } else {
          setItemsState((prev) => {
            const currentImages = prev[orderItemId]?.evidenceImages || [];
            return {
              ...prev,
              [orderItemId]: {
                ...prev[orderItemId],
                evidenceImages: [...currentImages, uri],
              },
            };
          });
        }
      }
    } catch (err: any) {
      Alert.alert('Tải lên thất bại', err?.message || 'Không thể tải media lên máy chủ.');
    } finally {
      setIsUploadingMedia(false);
      setUploadProgressText('');
    }
  };

  const removeEvidenceImage = (orderItemId: string, index: number) => {
    setItemsState((prev) => {
      const current = prev[orderItemId]?.evidenceImages || [];
      return {
        ...prev,
        [orderItemId]: {
          ...prev[orderItemId],
          evidenceImages: current.filter((_, i) => i !== index),
        },
      };
    });
  };

  const removeEvidenceVideo = (orderItemId: string) => {
    updateItemState(orderItemId, { evidenceVideoUrl: undefined });
  };

  // Nộp hồ sơ RMA
  const handleSubmitReturn = async () => {
    const selectedItemsList = Object.entries(itemsState)
      .filter(([_, state]) => state.selected && state.quantity > 0)
      .map(([orderItemId, state]) => ({
        orderItemId,
        ...state,
      }));

    if (selectedItemsList.length === 0) {
      Alert.alert('Chưa chọn sản phẩm', 'Vui lòng chọn ít nhất một sản phẩm cần đổi trả.');
      return;
    }

    // Validation bằng chứng
    for (const it of selectedItemsList) {
      if (it.evidenceImages.length === 0) {
        Alert.alert(
          'Thiếu bằng chứng ảnh',
          'Mỗi sản phẩm đổi trả bắt buộc phải có ít nhất 1 hình ảnh minh chứng hiện trạng.'
        );
        return;
      }

      const requiresVideo =
        it.reasonCode === 'DAMAGED_IN_TRANSIT' || it.reasonCode === 'DEFECTIVE';
      if (requiresVideo && !it.evidenceVideoUrl) {
        Alert.alert(
          'Yêu cầu video unboxing',
          `Với lý do "${REASON_LABELS[it.reasonCode]?.label || it.reasonCode}", chính sách GlowUp bắt buộc đính kèm video unboxing mở hộp.`
        );
        return;
      }
    }

    if (returnChannel === 'STORE_DROPOFF' && !selectedStoreId) {
      Alert.alert('Chưa chọn Showroom', 'Vui lòng chọn Showroom bạn sẽ mang hàng đến gửi trả.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        orderId,
        returnChannel,
        dropoffLocationId: returnChannel === 'STORE_DROPOFF' ? selectedStoreId : undefined,
        pickupAddress:
          returnChannel === 'CARRIER_PICKUP' && pickupAddressLine.trim()
            ? { addressLine: pickupAddressLine.trim() }
            : undefined,
        customerNote: customerGeneralNote.trim() || undefined,
        items: selectedItemsList.map((it) => ({
          orderItemId: it.orderItemId,
          quantity: it.quantity,
          reasonCode: it.reasonCode,
          customerNote: it.note.trim() || undefined,
          evidenceImages: it.evidenceImages,
          evidenceVideoUrl: it.evidenceVideoUrl,
        })),
      };

      const response = await orderApi.createReturnRequest(
        payload as any,
        idempotencyKeyRef.current
      );

      const createdReturn = response?.data || response;
      const rmaId = createdReturn?.id || createdReturn?.returnNumber || 'RMA-' + Date.now();

      Alert.alert(
        'Đã gửi yêu cầu đổi trả',
        `Hồ sơ đổi trả đã được khởi tạo thành công với mã: #${createdReturn?.returnNumber || rmaId}. Hệ thống sẽ xử lý và cập nhật tiến trình trong 24h làm việc.`,
        [
          {
            text: 'Theo dõi tiến trình RMA',
            onPress: () => {
              navigation.replace('RmaTracking', { rmaId });
            },
          },
        ]
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể gửi yêu cầu đổi trả. Vui lòng kiểm tra lại kết nối và thử lại.';
      Alert.alert('Gửi yêu cầu thất bại', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStore = stores.find((s) => s.id === selectedStoreId);

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
          <Text style={styles.headerTitle}>Yêu Cầu Đổi Trả Sản Phẩm</Text>
          <Text style={styles.headerSubtitle}>
            {orderId ? `Đơn hàng #${orderId}` : 'Chọn đơn hàng'}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Chọn đơn hàng nếu chưa có */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.rowAlign}>
              <View style={styles.iconCircle}>
                <Ionicons name="receipt-outline" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Thông tin đơn hàng</Text>
            </View>
            {availableOrders.length > 1 && (
              <TouchableOpacity onPress={() => setShowOrderModal(true)}>
                <Text style={styles.linkText}>Đổi đơn hàng</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.orderInfoBox}>
            <Text style={styles.orderInfoNumber}>
              Mã đơn: #{eligibility?.orderNumber || orderId || 'Đang cập nhật'}
            </Text>
            {eligibility?.deliveredAt && (
              <Text style={styles.orderInfoDate}>
                Giao hàng lúc: {new Date(eligibility.deliveredAt).toLocaleDateString('vi-VN')}
              </Text>
            )}
            {eligibility?.policyVersionId && (
              <View style={styles.policyBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#1565C0" />
                <Text style={styles.policyBadgeText}>
                  Áp dụng chính sách bảo hành GlowUp Care v3.1
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 2. Loading / Ineligibility Warning */}
        {loadingEligibility ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Đang kiểm tra điều kiện đổi trả của đơn hàng...</Text>
          </View>
        ) : eligibilityError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={24} color="#C62828" />
            <Text style={styles.errorBoxText}>{eligibilityError}</Text>
          </View>
        ) : eligibility && !eligibility.isEligibleForReturn ? (
          <View style={styles.ineligibleBox}>
            <Ionicons name="warning" size={24} color="#E65100" />
            <Text style={styles.ineligibleTitle}>Đơn hàng không đủ điều kiện đổi trả</Text>
            <Text style={styles.ineligibleDesc}>
              {eligibility.ineligibilityReason ||
                'Đơn hàng này đã quá thời hạn đổi trả theo quy định hoặc chưa được giao thành công.'}
            </Text>
          </View>
        ) : null}

        {/* 3. Danh sách sản phẩm đủ điều kiện đổi trả */}
        {eligibility?.items && eligibility.items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Chọn sản phẩm muốn hoàn trả</Text>
            <Text style={styles.cardSub}>
              Chỉ những sản phẩm còn trong thời hạn và chưa vượt quá số lượng mua mới được phép đổi trả.
            </Text>

            <View style={{ gap: 14, marginTop: 10 }}>
              {eligibility.items.map((item) => {
                const itemState = itemsState[item.orderItemId] || {
                  selected: false,
                  quantity: 1,
                  reasonCode: 'DEFECTIVE' as ReturnReasonCode,
                  note: '',
                  evidenceImages: [],
                };
                const isItemEligible = item.availableReturnQuantity > 0;

                return (
                  <View
                    key={item.orderItemId}
                    style={[
                      styles.itemCard,
                      !isItemEligible && styles.itemCardDisabled,
                      itemState.selected && styles.itemCardSelected,
                    ]}
                  >
                    {/* Item Row Header */}
                    <TouchableOpacity
                      style={styles.itemHeaderRow}
                      disabled={!isItemEligible}
                      onPress={() =>
                        updateItemState(item.orderItemId, {
                          selected: !itemState.selected,
                        })
                      }
                    >
                      <Ionicons
                        name={
                          itemState.selected
                            ? 'checkbox'
                            : isItemEligible
                            ? 'square-outline'
                            : 'close-circle-outline'
                        }
                        size={22}
                        color={
                          itemState.selected
                            ? theme.colors.primary
                            : isItemEligible
                            ? theme.colors.textMuted
                            : '#999'
                        }
                      />
                      {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} style={styles.itemThumb} />
                      ) : (
                        <View style={styles.itemThumbPlaceholder}>
                          <Ionicons name="image-outline" size={20} color="#999" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemProdName} numberOfLines={2}>
                          {item.productName}
                        </Text>
                        {item.variantName && (
                          <Text style={styles.itemVarName}>{item.variantName}</Text>
                        )}
                        <Text style={styles.itemUnitPrice}>
                          {item.unitPrice.toLocaleString('vi-VN')} đ
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Eligibility Badge */}
                    <View style={styles.qtyBadgeRow}>
                      <Text style={styles.qtyBadgeText}>
                        {isItemEligible
                          ? `Có thể trả: ${item.availableReturnQuantity} món`
                          : 'Đã hoàn trả hết số lượng'}
                      </Text>
                    </View>

                    {/* Details if Selected */}
                    {itemState.selected && isItemEligible && (
                      <View style={styles.itemDetailsExpanded}>
                        {/* Quantity Stepper */}
                        <View style={styles.stepperRow}>
                          <Text style={styles.inputSubLabel}>Số lượng hoàn trả:</Text>
                          <View style={styles.stepperBox}>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              disabled={itemState.quantity <= 1}
                              onPress={() =>
                                updateItemState(item.orderItemId, {
                                  quantity: Math.max(1, itemState.quantity - 1),
                                })
                              }
                            >
                              <Text style={styles.stepBtnText}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.stepValueText}>{itemState.quantity}</Text>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              disabled={itemState.quantity >= item.availableReturnQuantity}
                              onPress={() =>
                                updateItemState(item.orderItemId, {
                                  quantity: Math.min(
                                    item.availableReturnQuantity,
                                    itemState.quantity + 1
                                  ),
                                })
                              }
                            >
                              <Text style={styles.stepBtnText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Reason Selection */}
                        <Text style={styles.inputSubLabel}>Lý do hoàn trả (theo chính sách):</Text>
                        <View style={styles.reasonsList}>
                          {(item.allowedReasons || [
                            'DAMAGED_IN_TRANSIT',
                            'DEFECTIVE',
                            'ALLERGIC',
                            'CHANGE_OF_MIND',
                          ]).map((rCode) => {
                            const meta = REASON_LABELS[rCode] || {
                              label: rCode,
                              icon: 'help-circle-outline',
                            };
                            const isReasonChosen = itemState.reasonCode === rCode;

                            return (
                              <TouchableOpacity
                                key={rCode}
                                style={[
                                  styles.reasonPill,
                                  isReasonChosen && styles.reasonPillActive,
                                ]}
                                onPress={() =>
                                  updateItemState(item.orderItemId, {
                                    reasonCode: rCode as ReturnReasonCode,
                                  })
                                }
                              >
                                <Ionicons
                                  name={meta.icon as any}
                                  size={14}
                                  color={isReasonChosen ? '#FFF' : theme.colors.textDark}
                                />
                                <Text
                                  style={[
                                    styles.reasonPillText,
                                    isReasonChosen && styles.reasonPillTextActive,
                                  ]}
                                >
                                  {meta.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Evidence Upload Section */}
                        <View style={styles.evidenceSection}>
                          <View style={styles.rowBetween}>
                            <Text style={styles.inputSubLabel}>
                              Hình ảnh & Video bằng chứng (*):
                            </Text>
                            {isUploadingMedia && activeMediaItemId === item.orderItemId && (
                              <View style={styles.uploadingIndicator}>
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                                <Text style={styles.uploadingText}>{uploadProgressText}</Text>
                              </View>
                            )}
                          </View>

                          {/* Media Grid */}
                          <View style={styles.mediaGrid}>
                            {itemState.evidenceImages.map((imgUri, idx) => (
                              <View key={idx} style={styles.mediaThumbBox}>
                                <Image source={{ uri: imgUri }} style={styles.mediaThumb} />
                                <TouchableOpacity
                                  style={styles.removeMediaBtn}
                                  onPress={() => removeEvidenceImage(item.orderItemId, idx)}
                                >
                                  <Ionicons name="close" size={12} color="#FFF" />
                                </TouchableOpacity>
                              </View>
                            ))}

                            {itemState.evidenceVideoUrl && (
                              <View style={[styles.mediaThumbBox, styles.videoThumbBox]}>
                                <Ionicons name="videocam" size={24} color="#FFF" />
                                <Text style={styles.videoBadgeLabel}>Video unboxing</Text>
                                <TouchableOpacity
                                  style={styles.removeMediaBtn}
                                  onPress={() => removeEvidenceVideo(item.orderItemId)}
                                >
                                  <Ionicons name="close" size={12} color="#FFF" />
                                </TouchableOpacity>
                              </View>
                            )}

                            {/* Add Buttons */}
                            <TouchableOpacity
                              style={styles.addMediaBtn}
                              disabled={isUploadingMedia}
                              onPress={() => {
                                setActiveMediaItemId(item.orderItemId);
                                Alert.alert(
                                  'Cung cấp hình ảnh / video bằng chứng',
                                  'Chọn phương thức bổ sung minh chứng cho sản phẩm này:',
                                  [
                                    {
                                      text: 'Chụp ảnh bằng Camera',
                                      onPress: () => handlePickMedia(item.orderItemId, 'camera'),
                                    },
                                    {
                                      text: 'Chọn từ Thư viện (Ảnh/Video <= 50MB)',
                                      onPress: () => handlePickMedia(item.orderItemId, 'library'),
                                    },
                                    { text: 'Hủy', style: 'cancel' },
                                  ]
                                );
                              }}
                            >
                              <Ionicons name="camera-outline" size={20} color={theme.colors.primary} />
                              <Text style={styles.addMediaText}>Thêm media</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Note for this item */}
                        <TextInput
                          style={styles.itemNoteInput}
                          placeholder="Mô tả chi tiết tình trạng sản phẩm (nếu có)..."
                          value={itemState.note}
                          onChangeText={(txt) =>
                            updateItemState(item.orderItemId, { note: txt })
                          }
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 4. Kênh hoàn trả (Omnichannel Selector) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Phương thức gửi trả hàng</Text>
          <Text style={styles.cardSub}>
            Lựa chọn mang ra Showroom gần nhất hoặc bưu tá đến tận nhà thu hồi.
          </Text>

          {/* Option: Carrier Pickup */}
          <TouchableOpacity
            style={[
              styles.channelBox,
              returnChannel === 'CARRIER_PICKUP' && styles.channelBoxActive,
            ]}
            onPress={() => setReturnChannel('CARRIER_PICKUP')}
          >
            <Ionicons
              name={
                returnChannel === 'CARRIER_PICKUP'
                  ? 'radio-button-on'
                  : 'radio-button-off'
              }
              size={18}
              color={
                returnChannel === 'CARRIER_PICKUP'
                  ? theme.colors.primary
                  : theme.colors.textMuted
              }
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.channelTitle}>Bưu tá đến thu hồi tận nơi (GHN Reverse)</Text>
              <Text style={styles.channelDesc}>
                Bưu tá sẽ liên hệ và đến thu hồi sản phẩm tại địa chỉ nhận hàng của bạn.
              </Text>
            </View>
          </TouchableOpacity>

          {/* Option: Store Dropoff */}
          <TouchableOpacity
            style={[
              styles.channelBox,
              returnChannel === 'STORE_DROPOFF' && styles.channelBoxActive,
            ]}
            onPress={() => setReturnChannel('STORE_DROPOFF')}
          >
            <Ionicons
              name={
                returnChannel === 'STORE_DROPOFF'
                  ? 'radio-button-on'
                  : 'radio-button-off'
              }
              size={18}
              color={
                returnChannel === 'STORE_DROPOFF'
                  ? theme.colors.primary
                  : theme.colors.textMuted
              }
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.channelTitle}>Mang trực tiếp ra Showroom GlowUp</Text>
              <Text style={styles.channelDesc}>
                Nhận viên cửa hàng quét mã QR tiếp nhận ngay, không tốn thời gian chờ bưu tá.
              </Text>
            </View>
          </TouchableOpacity>

          {/* Showroom Detail if STORE_DROPOFF */}
          {returnChannel === 'STORE_DROPOFF' && (
            <View style={styles.storePickerBox}>
              <View style={styles.rowBetween}>
                <Text style={styles.inputSubLabel}>Showroom tiếp nhận:</Text>
                {stores.length > 1 && (
                  <TouchableOpacity onPress={() => setShowStoreModal(true)}>
                    <Text style={styles.linkText}>Chọn Showroom khác</Text>
                  </TouchableOpacity>
                )}
              </View>

              {selectedStore ? (
                <View style={styles.selectedStoreCard}>
                  <Text style={styles.storeNameText}>{selectedStore.name}</Text>
                  <Text style={styles.storeAddressText}>{selectedStore.address}</Text>
                  {selectedStore.phone && (
                    <Text style={styles.storePhoneText}>Hotline: {selectedStore.phone}</Text>
                  )}
                  {selectedStore.openingHours && (
                    <Text style={styles.storeHoursText}>
                      Giờ mở cửa: {selectedStore.openingHours}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.noStoreText}>Đang tải danh sách showroom...</Text>
              )}
            </View>
          )}
        </View>

        {/* 5. Ghi chú chung */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ghi chú thêm cho chuyên viên hỗ trợ</Text>
          <TextInput
            style={styles.generalNoteInput}
            multiline
            numberOfLines={3}
            placeholder="Nhập thêm thông tin hoặc yêu cầu bổ sung nếu có..."
            value={customerGeneralNote}
            onChangeText={setCustomerGeneralNote}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Footer Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (isSubmitting ||
              isUploadingMedia ||
              Boolean(eligibility && !eligibility.isEligibleForReturn)) && {
              opacity: 0.6,
            },
          ]}
          disabled={
            isSubmitting ||
            isUploadingMedia ||
            Boolean(eligibility && !eligibility.isEligibleForReturn)
          }
          onPress={handleSubmitReturn}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
          )}
          <Text style={styles.submitBtnText}>
            {isSubmitting ? 'Đang gửi hồ sơ...' : 'Gửi Yêu Cầu Đổi Trả'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal Chọn Đơn Hàng */}
      <Modal visible={showOrderModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn đơn hàng để đổi trả</Text>
              <TouchableOpacity onPress={() => setShowOrderModal(false)}>
                <Ionicons name="close" size={22} color={theme.colors.textDark} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableOrders}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.orderSelectItem,
                    item.id === orderId && styles.orderSelectItemActive,
                  ]}
                  onPress={() => {
                    setOrderId(item.id);
                    setShowOrderModal(false);
                  }}
                >
                  <Text style={styles.orderSelectNum}>
                    #{item.orderNumber || item.id}
                  </Text>
                  <Text style={styles.orderSelectTotal}>
                    {Number(item.totalAmount || 0).toLocaleString('vi-VN')} đ • Trạng thái: {item.status}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Chọn Showroom */}
      <Modal visible={showStoreModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn Showroom GlowUp tiếp nhận</Text>
              <TouchableOpacity onPress={() => setShowStoreModal(false)}>
                <Ionicons name="close" size={22} color={theme.colors.textDark} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={stores}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.storeSelectItem,
                    item.id === selectedStoreId && styles.storeSelectItemActive,
                  ]}
                  onPress={() => {
                    setSelectedStoreId(item.id);
                    setShowStoreModal(false);
                  }}
                >
                  <Text style={styles.storeSelectName}>{item.name}</Text>
                  <Text style={styles.storeSelectAddr}>{item.address}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    backgroundColor: theme.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  cardSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  orderInfoBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  orderInfoNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textDark,
  },
  orderInfoDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  policyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  policyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1565C0',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
  },
  loadingText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
  },
  errorBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#C62828',
  },
  ineligibleBox: {
    backgroundColor: '#FFF3E0',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    gap: 6,
  },
  ineligibleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E65100',
  },
  ineligibleDesc: {
    fontSize: 11,
    color: '#795548',
    lineHeight: 16,
  },

  /* Item list */
  itemCard: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemCardSelected: {
    backgroundColor: '#FFF',
    borderColor: theme.colors.primary,
  },
  itemCardDisabled: {
    opacity: 0.5,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#EEE',
  },
  itemThumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemProdName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  itemVarName: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  itemUnitPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 2,
  },
  qtyBadgeRow: {
    marginTop: 6,
  },
  qtyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555',
  },
  itemDetailsExpanded: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    gap: 8,
  },
  inputSubLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  stepBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  stepValueText: {
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  reasonsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reasonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  reasonPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  reasonPillText: {
    fontSize: 11,
    color: theme.colors.textDark,
  },
  reasonPillTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },

  /* Media Upload */
  evidenceSection: {
    gap: 6,
    marginTop: 4,
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  uploadingText: {
    fontSize: 10,
    color: theme.colors.primary,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaThumbBox: {
    width: 60,
    height: 60,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#DDD',
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  videoThumbBox: {
    backgroundColor: '#263238',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBadgeLabel: {
    fontSize: 8,
    color: '#FFF',
    marginTop: 2,
    fontWeight: '700',
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMediaBtn: {
    width: 60,
    height: 60,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  addMediaText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 2,
  },
  itemNoteInput: {
    backgroundColor: '#FFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    color: theme.colors.textDark,
  },

  /* Channels */
  channelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: 'transparent',
    marginTop: 8,
  },
  channelBoxActive: {
    backgroundColor: '#FFF',
    borderColor: theme.colors.primary,
  },
  channelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  channelDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  storePickerBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 8,
    gap: 6,
  },
  selectedStoreCard: {
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    gap: 2,
  },
  storeNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  storeAddressText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  storePhoneText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  storeHoursText: {
    fontSize: 10,
    color: '#666',
  },
  noStoreText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  generalNoteInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: theme.colors.textDark,
    textAlignVertical: 'top',
    marginTop: 6,
  },

  /* Footer */
  footer: {
    backgroundColor: theme.colors.surfaceCard,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  orderSelectItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  orderSelectItemActive: {
    backgroundColor: theme.colors.surfaceSubtle,
  },
  orderSelectNum: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  orderSelectTotal: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  storeSelectItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  storeSelectItemActive: {
    backgroundColor: theme.colors.surfaceSubtle,
  },
  storeSelectName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  storeSelectAddr: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
