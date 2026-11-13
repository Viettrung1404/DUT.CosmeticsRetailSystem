import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { orderApi, ReturnReasonType } from '../../api/orderApi';

const RMA_REASONS: Array<{ id: ReturnReasonType; label: string; icon: string }> = [
  { id: 'DEFECTIVE', label: 'Bị đổ vỡ, hư hỏng hoặc lỗi kỹ thuật', icon: 'alert-triangle' },
  { id: 'ALLERGIC', label: 'Dị ứng da, kích ứng khi thử sản phẩm', icon: 'shield-alert' },
  { id: 'WRONG_ITEM', label: 'Giao nhầm mã màu, sai dung tích hoặc mẫu', icon: 'repeat' },
  { id: 'EXPIRED', label: 'Sản phẩm có dấu hiệu hết hạn hoặc đổi mùi', icon: 'clock' },
  { id: 'CUSTOMER_CHANGE_MIND', label: 'Đổi ý hoặc lý do cá nhân', icon: 'help-circle' },
];

const RESOLUTION_METHODS = [
  {
    id: 'REFUND',
    title: 'Hoàn tiền (Refund)',
    sub: 'Hoàn lại số tiền theo chính sách đổi trả của đơn hàng.',
    badge: 'Khuyên dùng',
    icon: 'sparkles',
  },
  {
    id: 'EXCHANGE',
    title: 'Đổi sản phẩm khác (Exchange)',
    sub: 'Đổi sang phân loại hoặc sản phẩm tương đương.',
    badge: 'Đổi hàng',
    icon: 'repeat',
  },
];

export default function RmaRequestScreen({ route, navigation }: any) {
  const { orderId = 'GU-89241', items: routeItems } = route.params || {};

  // Giữ nguyên Idempotency-Key trong suốt vòng đời của form RMA
  const idempotencyKeyRef = useRef<string>(
    'rma-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10)
  );

  const [selectedItems, setSelectedItems] = useState<{ [key: string]: boolean }>({
    'item-1': true,
  });

  const [selectedReason, setSelectedReason] = useState<ReturnReasonType>('DEFECTIVE');
  const [selectedType, setSelectedType] = useState<'REFUND' | 'EXCHANGE'>('REFUND');
  const [note, setNote] = useState('');
  const [evidenceImages, setEvidenceImages] = useState<string[]>([
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAPXszzaZJ-CKUqKGl1J4deKZphZWEeI5wLZcRF4oEpOzXUO9ILg594tMOGfQ7aDAnD95tHnThxQrBtzkasEPGicqQ1T7NExYkLEEnizjxYjw7DGhSJlCXq1vuTPjO9ypCl0NS-S1IpwTFIxWBzMPYyKUoBL_brngE8FpEkY-UBKyrw1En0aY17KO3r3ggQqtFpdaM8_nf_Fh4rkRtTc8DxrF0NWl13rvId3Y6KNw4IfnB9rLDDho7jaA',
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const orderProducts = routeItems || [
    {
      id: 'item-1',
      orderItemId: 'item-1',
      name: 'Serum Rose Berry B5 Phục Hồi Hàng Rào Ẩm 50ml',
      brand: 'GLOWUP LAB',
      price: 345000,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPXszzaZJ-CKUqKGl1J4deKZphZWEeI5wLZcRF4oEpOzXUO9ILg594tMOGfQ7aDAnD95tHnThxQrBtzkasEPGicqQ1T7NExYkLEEnizjxYjw7DGhSJlCXq1vuTPjO9ypCl0NS-S1IpwTFIxWBzMPYyKUoBL_brngE8FpEkY-UBKyrw1En0aY17KO3r3ggQqtFpdaM8_nf_Fh4rkRtTc8DxrF0NWl13rvId3Y6KNw4IfnB9rLDDho7jaA',
      variant: 'Chai 50ml',
      quantity: 1,
    },
    {
      id: 'item-2',
      orderItemId: 'item-2',
      name: 'Kem Dưỡng Glass Skin Barrier Cream 50g',
      brand: 'GLOWUP LAB',
      price: 390000,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFoJz9_e_s-F6Qp7q_U-y5g3RjK4o0LzYd5z3aX7wV5t3v1L7s_9m4q_WAoKCYLRFBkJ4vw',
      variant: 'Hũ 50g',
      quantity: 1,
    },
  ];

  const toggleItem = (id: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const addImageEvidence = () => {
    Alert.alert('Thêm hình ảnh minh chứng', 'Chọn phương thức cung cấp ảnh sản phẩm lỗi/hỏng:', [
      {
        text: 'Chụp ảnh bằng Camera',
        onPress: () => {
          setEvidenceImages((prev) => [
            ...prev,
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDhU0n1c3dv6DGZ8a2VJP9OMa-8E38wU9vwljidCxKn0i2C1ij5YAY7p1VavTZwGl9Hz0QLnWwilETSfTDzoZ3eEd8f9amVfrQF3e46Voq6vpX-jXddrp8iK_nvUU9FGaCUsZJMTIJKU8g8OCGO7YHQVyWjQmg6NseeG6Vu5mEee-7HKAmNCsOeBny-3U_aD7BXLL2QzoxKqsC9deTGM23ZfQPNXUMegiM041dJ1_SW6YRt3v2kKv_UyQ',
          ]);
        },
      },
      {
        text: 'Chọn từ Thư viện',
        onPress: () => {
          setEvidenceImages((prev) => [
            ...prev,
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDFoJz9_e_s-F6Qp7q_U-y5g3RjK4o0LzYd5z3aX7wV5t3v1L7s_9m4q_WAoKCYLRFBkJ4vw',
          ]);
        },
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const removeImage = (index: number) => {
    setEvidenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;
  const totalRefund = orderProducts
    .filter((p: any) => selectedItems[p.id || p.orderItemId])
    .reduce((sum: number, p: any) => sum + p.price * p.quantity, 0);

  const handleSubmit = async () => {
    if (selectedCount === 0) {
      Alert.alert('Chưa chọn sản phẩm', 'Vui lòng chọn ít nhất 1 sản phẩm bạn muốn đổi trả.');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsToReturn = orderProducts
        .filter((p: any) => selectedItems[p.id || p.orderItemId])
        .map((p: any) => ({
          orderItemId: p.orderItemId || p.id,
          quantity: p.quantity || 1,
        }));

      await orderApi.createReturnRequest(
        {
          orderId,
          type: selectedType,
          reason: selectedReason,
          items: itemsToReturn,
        },
        idempotencyKeyRef.current
      );

      Alert.alert(
        'Tạo yêu cầu thành công! ✨',
        `Mã yêu cầu đổi trả cho đơn #${orderId} đã được tiếp nhận. Đội ngũ GlowUp Care sẽ liên hệ kiểm định trong vòng 24H.`,
        [
          {
            text: 'Theo dõi tiến trình',
            onPress: () => navigation.replace('RmaTracking', { rmaId: `RMA-${orderId}` }),
          },
        ]
      );
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể gửi yêu cầu đổi trả. Vui lòng kiểm tra lại đơn hàng và thử lại.';
      Alert.alert('Gửi yêu cầu thất bại', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
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
          <Text style={styles.headerTitle}>Yêu cầu Đổi trả & Hoàn tiền</Text>
          <Text style={styles.headerSubtitle}>Đơn hàng #{orderId}</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Cam kết GlowUp */}
        <View style={styles.guaranteeBanner}>
          <View style={styles.guaranteeIconCircle}>
            <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.guaranteeTitle}>Đặc quyền Đổi trả 30 Ngày</Text>
            <Text style={styles.guaranteeDesc}>
              Cam kết thu hồi tận nơi 0đ, bảo hành kích ứng da 100% hoàn tiền hoặc đổi sản phẩm lành tính hơn.
            </Text>
          </View>
        </View>

        {/* Bước 1: Chọn sản phẩm cần đổi trả */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>1. Chọn sản phẩm đổi trả</Text>
            <Text style={styles.selectedCountText}>Đã chọn: {selectedCount}</Text>
          </View>

          {orderProducts.map((p: any) => {
            const isChecked = !!selectedItems[p.id];
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.productSelectCard, isChecked && styles.productSelectCardActive]}
                activeOpacity={0.88}
                onPress={() => toggleItem(p.id)}
              >
                <Ionicons
                  name={isChecked ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={isChecked ? theme.colors.primary : theme.colors.textMuted}
                />
                <Image source={{ uri: p.image }} style={styles.productThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.productBrand}>{p.brand}</Text>
                  <Text style={styles.productName} numberOfLines={2}>
                    {p.name}
                  </Text>
                  <Text style={styles.productVariant}>Phân loại: {p.variant} • SL: x{p.quantity}</Text>
                  <Text style={styles.productPrice}>{p.price.toLocaleString('vi-VN')}₫</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bước 2: Lý do đổi trả */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>2. Lý do đổi trả sản phẩm</Text>
          <View style={styles.reasonsList}>
            {RMA_REASONS.map((r) => {
              const isSelected = selectedReason === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.reasonItem, isSelected && styles.reasonItemActive]}
                  onPress={() => setSelectedReason(r.id)}
                >
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={isSelected ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <Text style={[styles.reasonLabel, isSelected && styles.reasonLabelActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.subLabel, { marginTop: 14 }]}>Mô tả chi tiết tình trạng</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={3}
            placeholder="Mô tả cụ thể vấn đề bạn gặp phải để GlowUp hỗ trợ nhanh nhất..."
            value={note}
            onChangeText={setNote}
          />
        </View>

        {/* Bước 3: Hình ảnh minh chứng */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>3. Ảnh chụp minh chứng tình trạng</Text>
            <Text style={styles.hintText}>Tối đa 4 ảnh</Text>
          </View>
          <Text style={styles.evidenceHint}>
            Chụp rõ nhãn phụ, nắp hộp hoặc tình trạng bao bì hư hỏng/kích ứng.
          </Text>

          <View style={styles.imageGrid}>
            {evidenceImages.map((uri, idx) => (
              <View key={idx} style={styles.imageBox}>
                <Image source={{ uri }} style={styles.evidenceImg} />
                <TouchableOpacity
                  style={styles.deleteImgBtn}
                  onPress={() => removeImage(idx)}
                >
                  <Ionicons name="close" size={12} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}

            {evidenceImages.length < 4 && (
              <TouchableOpacity style={styles.uploadBtn} onPress={addImageEvidence}>
                <Feather name="camera" size={20} color={theme.colors.primary} />
                <Text style={styles.uploadText}>Thêm ảnh</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bước 4: Phương thức hoàn tiền / đổi hàng */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>4. Chọn hình thức xử lý</Text>
          {RESOLUTION_METHODS.map((res) => {
            const isSelected = selectedType === res.id;
            return (
              <TouchableOpacity
                key={res.id}
                style={[styles.resolutionCard, isSelected && styles.resolutionCardActive]}
                onPress={() => setSelectedType(res.id as any)}
                activeOpacity={0.88}
              >
                <View style={styles.resolutionHeader}>
                  <View style={styles.rowAlign}>
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? theme.colors.primary : theme.colors.textMuted}
                    />
                    <Text style={styles.resolutionTitle}>{res.title}</Text>
                  </View>
                  <View style={styles.resolutionBadge}>
                    <Text style={styles.resolutionBadgeText}>{res.badge}</Text>
                  </View>
                </View>
                <Text style={styles.resolutionSub}>{res.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bước 5: Địa chỉ thu hồi hàng */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>5. Địa chỉ nhân viên tới thu hồi</Text>
            <TouchableOpacity onPress={() => Alert.alert('Địa chỉ', 'Bạn có thể chọn địa chỉ khác trong sổ địa chỉ.')}>
              <Text style={styles.changeAddressText}>Thay đổi</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickupBox}>
            <Ionicons name="location-outline" size={20} color={theme.colors.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <View style={styles.rowAlign}>
                <Text style={styles.pickupName}>Thảo Linh Nguyễn</Text>
                <Text style={styles.pickupPhone}>• 0938 ••• 921</Text>
                <View style={styles.defaultPill}>
                  <Text style={styles.defaultPillText}>Mặc định</Text>
                </View>
              </View>
              <Text style={styles.pickupAddress}>
                Landmark 4, Vinhomes Central Park, 208 Nguyễn Hữu Cảnh, P.22, Q. Bình Thạnh, TP. Hồ Chí Minh
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Action */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalRefundLabel}>Tổng giá trị hoàn trả:</Text>
          <Text style={styles.totalRefundPrice}>{totalRefund.toLocaleString('vi-VN')}₫</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, (selectedCount === 0 || isSubmitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={selectedCount === 0 || isSubmitting}
          activeOpacity={0.9}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={18} color="#FFF" />
              <Text style={styles.submitBtnText}>GỬI YÊU CẦU ĐỔI TRẢ</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    paddingBottom: 100,
  },
  guaranteeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAF0F2',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3DCE1',
  },
  guaranteeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guaranteeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  guaranteeDesc: {
    fontSize: 11,
    color: '#725950',
    lineHeight: 16,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3E9EB',
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#281811',
  },
  selectedCountText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  productSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FEFAFC',
    borderWidth: 1,
    borderColor: '#EFE5E7',
    marginBottom: 8,
  },
  productSelectCardActive: {
    backgroundColor: '#FFF5F6',
    borderColor: theme.colors.primaryFixedDim,
  },
  productThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F8EFF1',
  },
  productBrand: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#281811',
    marginTop: 1,
  },
  productVariant: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 2,
  },
  reasonsList: {
    gap: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#FEFAFC',
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  reasonItemActive: {
    backgroundColor: '#FFF5F6',
    borderColor: theme.colors.primaryFixedDim,
  },
  reasonLabel: {
    fontSize: 12,
    color: '#554244',
  },
  reasonLabelActive: {
    color: '#281811',
    fontWeight: '600',
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#554244',
    marginBottom: 6,
  },
  textArea: {
    backgroundColor: '#FEFAFC',
    borderWidth: 1,
    borderColor: '#EFE5E7',
    borderRadius: 12,
    padding: 10,
    fontSize: 12,
    color: '#281811',
    textAlignVertical: 'top',
    height: 70,
  },
  hintText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  evidenceHint: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 10,
  },
  imageGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  imageBox: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  evidenceImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  deleteImgBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtn: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    backgroundColor: '#FFF5F6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  resolutionCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEFAFC',
    borderWidth: 1,
    borderColor: '#EFE5E7',
    marginBottom: 8,
  },
  resolutionCardActive: {
    backgroundColor: '#FFF5F6',
    borderColor: theme.colors.primaryFixedDim,
  },
  resolutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  resolutionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#281811',
  },
  resolutionBadge: {
    backgroundColor: '#FAD9CD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  resolutionBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primaryDeep,
  },
  resolutionSub: {
    fontSize: 11,
    color: '#725950',
    lineHeight: 15,
    marginLeft: 26,
  },
  changeAddressText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  pickupBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FEFAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  pickupName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#281811',
  },
  pickupPhone: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  defaultPill: {
    backgroundColor: '#EFE5E7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 6,
  },
  defaultPillText: {
    fontSize: 9,
    color: '#554244',
    fontWeight: '600',
  },
  pickupAddress: {
    fontSize: 12,
    color: '#554244',
    lineHeight: 16,
    marginTop: 4,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 248, 246, 0.96)',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3E9EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalRefundLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  totalRefundPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: '#DBC0C3',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

