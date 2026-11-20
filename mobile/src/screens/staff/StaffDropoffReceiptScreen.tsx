import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Vibration,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../constants/theme';
import { staffFulfillmentApi } from '../../api/staffFulfillmentApi';
import { verifyDropoffEligibility } from '../../utils/staffOperationsHelper';

interface Props {
  navigation: any;
  route: any;
}

export default function StaffDropoffReceiptScreen({ navigation, route }: Props) {
  const storeId = route?.params?.storeId;
  const storeName = route?.params?.storeName || 'Showroom';

  // Camera QR scanner
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const lastScannedRef = useRef<number>(0);

  // Search & RMA order details
  const [rmaInput, setRmaInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [returnOrder, setReturnOrder] = useState<any | null>(null);
  const [eligibility, setEligibility] = useState<{ eligible: boolean; reason?: string } | null>(
    null
  );

  // In-store receipt inputs
  const [conditionNote, setConditionNote] = useState<string>(
    'Bao bì còn nguyên vẹn, tem seal đầy đủ khi khách mang tới showroom.'
  );
  const [receivedCount, setReceivedCount] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Success result modal
  const [receiptResult, setReceiptResult] = useState<any | null>(null);

  // 1. Tìm kiếm và tải chi tiết RMA
  const handleLookupRma = async (codeOrId: string) => {
    if (!codeOrId || !codeOrId.trim()) {
      Alert.alert('Chưa nhập mã', 'Vui lòng quét QR hoặc nhập mã yêu cầu đổi trả (RMA).');
      return;
    }

    // Làm sạch chuỗi quét nếu có tiền tố "rma:"
    let cleanCode = codeOrId.trim();
    if (cleanCode.toLowerCase().startsWith('rma:')) {
      cleanCode = cleanCode.substring(4);
    }

    try {
      setLoading(true);
      setReturnOrder(null);
      setEligibility(null);

      const rmaData = await staffFulfillmentApi.getReturnDetail(cleanCode);
      setReturnOrder(rmaData);

      // Tính tổng số lượng hàng hoàn để điền sẵn
      const totalQty = (rmaData.items || []).reduce(
        (sum: number, it: any) => sum + (it.quantity || 1),
        0
      );
      setReceivedCount(String(totalQty));

      // Kiểm tra tính hợp lệ và địa điểm showroom
      const check = verifyDropoffEligibility(rmaData, storeId);
      setEligibility(check);

      try {
        Vibration.vibrate(check.eligible ? 100 : [0, 200, 100, 200]);
      } catch {}

      if (!check.eligible) {
        Alert.alert('Không thể tiếp nhận', check.reason || 'Hồ sơ không đủ điều kiện.');
      }
    } catch (err: any) {
      Alert.alert(
        'Không tìm thấy hồ sơ',
        err?.response?.data?.message || 'Không tìm thấy hồ sơ đổi trả với mã này.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    const now = Date.now();
    if (now - lastScannedRef.current < 1500) return;
    lastScannedRef.current = now;
    setIsCameraOpen(false);
    setRmaInput(data);
    handleLookupRma(data);
  };

  // 2. Chụp ảnh kiện hàng thực tế tại quầy
  const handleTakePhoto = async () => {
    if (photos.length >= 2) {
      Alert.alert('Giới hạn ảnh', 'Đã chụp tối đa 2 ảnh tình trạng kiện hàng.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền Camera', 'Ứng dụng cần quyền Camera để chụp ảnh kiện hàng tiếp nhận.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const handlePickPhoto = async () => {
    if (photos.length >= 2) {
      Alert.alert('Giới hạn ảnh', 'Đã chụp tối đa 2 ảnh tình trạng kiện hàng.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updated = [...photos];
    updated.splice(index, 1);
    setPhotos(updated);
  };

  // 3. Tiếp nhận hàng tại quầy và ghi nhận Quarantined Inventory
  const handleConfirmReceiveAtStore = async () => {
    if (!returnOrder) return;

    if (!eligibility?.eligible) {
      Alert.alert(
        'Từ chối tiếp nhận',
        eligibility?.reason || 'Hồ sơ đổi trả không hợp lệ hoặc không đúng showroom.'
      );
      return;
    }

    const count = parseInt(receivedCount, 10);
    if (isNaN(count) || count <= 0) {
      Alert.alert('Số lượng không hợp lệ', 'Vui lòng nhập số lượng sản phẩm thực tế tiếp nhận.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await staffFulfillmentApi.receiveStoreDropoff(returnOrder.id, {
        packageConditionNote: conditionNote.trim(),
        receivedItemsCount: count,
      });

      setReceiptResult(res);
      setReturnOrder(null);
      setRmaInput('');
      setPhotos([]);
    } catch (err: any) {
      Alert.alert('Lỗi tiếp nhận tại Showroom', err?.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Tiếp Nhận RMA Tại Quầy</Text>
          <Text style={styles.headerSubtitle}>{storeName} • Showroom Drop-off</Text>
        </View>
        <TouchableOpacity
          style={styles.qrScanBtn}
          onPress={async () => {
            if (!permission?.granted) {
              const res = await requestPermission();
              if (!res.granted) {
                Alert.alert('Cần quyền Camera', 'Vui lòng cấp quyền Camera để quét mã QR RMA.');
                return;
              }
            }
            setIsCameraOpen(true);
          }}
        >
          <Ionicons name="qr-code-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Search & Scan Box */}
        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>QUÉT MÃ QR RMA CỦA KHÁCH HOẶC NHẬP MÃ ĐỔI TRẢ:</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="VD: RET-20261119-001 hoặc mã UUID..."
              value={rmaInput}
              onChangeText={setRmaInput}
              autoCapitalize="characters"
              onSubmitEditing={() => handleLookupRma(rmaInput)}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={() => handleLookupRma(rmaInput)}>
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Ionicons name="search" size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Inspection View */}
        {returnOrder && (
          <View style={styles.rmaDetailCard}>
            {/* Eligibility Banner */}
            {eligibility && (
              <View
                style={[
                  styles.eligibilityBanner,
                  eligibility.eligible ? styles.bgEligible : styles.bgIneligible,
                ]}
              >
                <Ionicons
                  name={eligibility.eligible ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={eligibility.eligible ? '#065F46' : '#991B1B'}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.eligibilityText,
                    { color: eligibility.eligible ? '#065F46' : '#991B1B' },
                  ]}
                >
                  {eligibility.eligible
                    ? 'Hồ sơ hợp lệ để tiếp nhận tại Showroom này'
                    : eligibility.reason}
                </Text>
              </View>
            )}

            {/* RMA Header */}
            <View style={styles.rmaHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rmaCode}>{returnOrder.returnCode || returnOrder.id}</Text>
                <Text style={styles.rmaDate}>
                  Tạo lúc: {new Date(returnOrder.createdAt).toLocaleString('vi-VN')}
                </Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{returnOrder.status}</Text>
              </View>
            </View>

            {/* Showroom Destination Verification */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Showroom chỉ định:</Text>
              <Text
                style={[
                  styles.infoVal,
                  {
                    fontWeight: '700',
                    color:
                      eligibility?.eligible
                        ? '#059669'
                        : '#DC2626',
                  },
                ]}
              >
                {returnOrder.dropoffLocation?.name ||
                  returnOrder.dropoffLocationName ||
                  'Chưa gán showroom'}
              </Text>
            </View>

            {/* Customer Details */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Khách hàng:</Text>
              <Text style={styles.infoVal}>
                {returnOrder.customer?.user?.fullName ||
                  returnOrder.customerName ||
                  returnOrder.order?.shippingAddress?.fullName ||
                  'Khách hàng'}
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Items List */}
            <Text style={styles.itemsHeader}>DANH SÁCH MẶT HÀNG ĐỔI TRẢ:</Text>
            {(returnOrder.items || []).map((it: any, idx: number) => (
              <View key={it.id || idx} style={styles.itemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>
                    {it.productVariant?.product?.name || it.productName || 'Sản phẩm mỹ phẩm'}
                  </Text>
                  <Text style={styles.itemSku}>
                    SKU: {it.productVariant?.sku || it.sku || 'N/A'} • Lý do: {it.reasonCategory || it.reason}
                  </Text>
                </View>
                <View style={styles.itemQtyBadge}>
                  <Text style={styles.itemQtyText}>SL: {it.quantity || 1}</Text>
                </View>
              </View>
            ))}

            <View style={styles.divider} />

            {/* Staff Condition Note & Received Count Input */}
            <Text style={styles.formSectionTitle}>KIỂM TRA THỰC TẾ & TIẾP NHẬN TẠI QUẦY</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Số lượng thực tế tiếp nhận:</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="number-pad"
                value={receivedCount}
                onChangeText={setReceivedCount}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Ghi chú tình trạng vỏ hộp / tem seal:</Text>
              <TextInput
                style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                multiline
                numberOfLines={3}
                placeholder="Ghi rõ bao bì nguyên vẹn hay rách seal..."
                value={conditionNote}
                onChangeText={setConditionNote}
              />
            </View>

            {/* Photos capture */}
            <Text style={styles.formLabel}>Ảnh chụp kiện hàng tại quầy (tối đa 2 ảnh):</Text>
            <View style={styles.photosRow}>
              {photos.map((uri, idx) => (
                <View key={idx} style={styles.photoThumbWrapper}>
                  <Image source={{ uri }} style={styles.photoThumb} />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => handleRemovePhoto(idx)}
                  >
                    <Ionicons name="close" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}

              {photos.length < 2 && (
                <View style={styles.photoButtonsWrapper}>
                  <TouchableOpacity style={styles.addPhotoBtn} onPress={handleTakePhoto}>
                    <Ionicons name="camera" size={20} color={theme.colors.primary} />
                    <Text style={styles.addPhotoBtnText}>Chụp ảnh</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.addPhotoBtn} onPress={handlePickPhoto}>
                    <Ionicons name="images" size={20} color="#6B7280" />
                    <Text style={[styles.addPhotoBtnText, { color: '#6B7280' }]}>Thư viện</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Quarantine Notice */}
            <View style={styles.quarantineNotice}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#B45309" />
              <Text style={styles.quarantineNoticeText}>
                Sau khi xác nhận, sản phẩm sẽ được tự động đưa vào kho{' '}
                <Text style={{ fontWeight: '800' }}>CÁCH LY (QUARANTINED)</Text> tại Showroom này để chờ chuyên viên QC thẩm định.
              </Text>
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              style={[
                styles.confirmReceiveBtn,
                (!eligibility?.eligible || submitting) && styles.btnDisabled,
              ]}
              disabled={!eligibility?.eligible || submitting}
              onPress={handleConfirmReceiveAtStore}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="receipt" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.confirmReceiveBtnText}>Xác Nhận Tiếp Nhận & In Phiếu</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal Camera QR Scanner */}
      <Modal
        visible={isCameraOpen}
        animationType="slide"
        onRequestClose={() => setIsCameraOpen(false)}
      >
        <SafeAreaView style={styles.cameraContainer}>
          <View style={styles.cameraNav}>
            <Text style={styles.cameraTitle}>Quét Mã QR RMA Khách Hàng</Text>
            <TouchableOpacity onPress={() => setIsCameraOpen(false)}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.cameraViewArea}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={handleBarcodeScanned}
            />
            <View style={styles.qrReticleOverlay}>
              <View style={styles.qrReticleBox} />
              <Text style={styles.qrReticleInstruction}>
                Căn chỉnh mã QR RMA trên điện thoại khách hàng vào khung
              </Text>
            </View>
          </View>

          <View style={styles.cameraFooter}>
            <TouchableOpacity
              style={styles.closeCameraBtn}
              onPress={() => setIsCameraOpen(false)}
            >
              <Text style={styles.closeCameraBtnText}>Đóng máy quét QR</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Success Receipt Modal */}
      {receiptResult && (
        <Modal transparent animationType="fade" visible={Boolean(receiptResult)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.receiptCard}>
              <View style={styles.receiptIconBox}>
                <Ionicons name="checkmark-done-circle" size={54} color="#10B981" />
              </View>

              <Text style={styles.receiptTitle}>Tiếp Nhận Thành Công!</Text>
              <Text style={styles.receiptSub}>
                Đã lập Phiếu Tiếp Nhận Đổi Trả tại Showroom
              </Text>

              {/* Receipt Code Box */}
              <View style={styles.receiptCodeBox}>
                <Text style={styles.receiptCodeLabel}>MÃ PHIẾU TIẾP NHẬN (RETURN RECEIPT):</Text>
                <Text style={styles.receiptCodeVal}>
                  {receiptResult.receipt?.receiptCode || 'RCP-SUCCESS'}
                </Text>
              </View>

              {/* Status & Inventory Highlights */}
              <View style={styles.quarantineSuccessBox}>
                <Text style={styles.qsTitle}>TÌNH TRẠNG TỒN KHO SHOWROOM:</Text>
                <Text style={styles.qsDesc}>
                  ✓ Đã ghi nhận <Text style={{ fontWeight: '800' }}>{receiptResult.receipt?.receivedItemsCount || 1} sản phẩm</Text> vào tồn kho{' '}
                  <Text style={{ fontWeight: '800', color: '#B45309' }}>QUARANTINED (Cách Ly)</Text>.
                </Text>
                <Text style={styles.qsDesc}>
                  ✓ Trạng thái hồ sơ: <Text style={{ fontWeight: '800', color: '#059669' }}>RECEIVED</Text> (Đang chờ thẩm định QC).
                </Text>
              </View>

              <TouchableOpacity
                style={styles.receiptDoneBtn}
                onPress={() => setReceiptResult(null)}
              >
                <Text style={styles.receiptDoneBtnText}>Hoàn tất</Text>
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
  qrScanBtn: {
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
  rmaDetailCard: {
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
  eligibilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  bgEligible: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  bgIneligible: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  eligibilityText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  rmaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  rmaCode: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  rmaDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoVal: {
    fontSize: 13,
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },
  itemsHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  itemSku: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  itemQtyBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  itemQtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  formSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.6,
    marginBottom: 12,
    marginTop: 4,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  photoThumbWrapper: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 10,
    position: 'relative',
  },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButtonsWrapper: {
    flexDirection: 'row',
  },
  addPhotoBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#F9FAFB',
  },
  addPhotoBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 4,
  },
  quarantineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  quarantineNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
    marginLeft: 8,
  },
  confirmReceiveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  btnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  confirmReceiveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
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
  qrReticleOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrReticleBox: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  qrReticleInstruction: {
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
  receiptCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  receiptIconBox: {
    marginBottom: 10,
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  receiptSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  receiptCodeBox: {
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  receiptCodeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  receiptCodeVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  quarantineSuccessBox: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4B5563',
    marginBottom: 6,
  },
  qsDesc: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
    marginVertical: 2,
  },
  receiptDoneBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  receiptDoneBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
