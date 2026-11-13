import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { validateAddressForm } from '../../utils/validation';
import { addressApi } from '../../api/addressApi';

export default function AddEditAddressScreen({ navigation, route }: any) {
  const existingAddress = route.params?.address;
  const isEditing = !!existingAddress;

  const [recipientName, setRecipientName] = useState(existingAddress?.recipientName || '');
  const [phone, setPhone] = useState(existingAddress?.phone || '');
  const [addressLine, setAddressLine] = useState(existingAddress?.addressLine || '');
  const [city, setCity] = useState(existingAddress?.city || 'TP. Hồ Chí Minh');
  const [district, setDistrict] = useState(existingAddress?.district || '');
  const [label, setLabel] = useState<'Nhà riêng' | 'Văn phòng'>(
    existingAddress?.label || 'Nhà riêng'
  );
  const [isDefault, setIsDefault] = useState(existingAddress?.isDefault ?? false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    const validation = validateAddressForm({
      recipientName,
      phone,
      addressLine,
      city,
      district,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    try {
      if (isEditing && existingAddress?.id) {
        await addressApi.updateAddress(existingAddress.id, {
          recipientName,
          phone,
          addressLine,
          city,
          district,
          isDefault,
        });
      } else {
        await addressApi.createAddress({
          recipientName,
          phone,
          addressLine,
          city,
          district,
          isDefault,
        });
      }

      if (route.params?.onSuccess) {
        route.params.onSuccess();
      }

      Alert.alert(
        'Thành công',
        isEditing ? 'Đã cập nhật địa chỉ thành công' : 'Đã thêm địa chỉ mới thành công',
        [
          {
            text: 'Đồng ý',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể lưu địa chỉ nhận hàng.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Cập Nhật Địa Chỉ' : 'Thêm Địa Chỉ Mới'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Nhãn địa chỉ */}
        <Text style={styles.sectionLabel}>LOẠI ĐỊA CHỈ</Text>
        <View style={styles.labelRow}>
          <TouchableOpacity
            style={[styles.labelChip, label === 'Nhà riêng' && styles.labelChipActive]}
            onPress={() => setLabel('Nhà riêng')}
          >
            <Ionicons
              name="home-outline"
              size={16}
              color={label === 'Nhà riêng' ? '#FFF' : COLORS.textBody}
            />
            <Text
              style={[
                styles.labelChipText,
                label === 'Nhà riêng' && styles.labelChipTextActive,
              ]}
            >
              Nhà riêng
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.labelChip, label === 'Văn phòng' && styles.labelChipActive]}
            onPress={() => setLabel('Văn phòng')}
          >
            <Ionicons
              name="briefcase-outline"
              size={16}
              color={label === 'Văn phòng' ? '#FFF' : COLORS.textBody}
            />
            <Text
              style={[
                styles.labelChipText,
                label === 'Văn phòng' && styles.labelChipTextActive,
              ]}
            >
              Văn phòng
            </Text>
          </TouchableOpacity>
        </View>

        {/* Thông tin liên hệ */}
        <Text style={styles.sectionLabel}>THÔNG TIN NGƯỜI NHẬN</Text>
        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Họ và tên người nhận *</Text>
          <TextInput
            style={[styles.input, errors.recipientName && styles.inputError]}
            placeholder="Ví dụ: Nguyễn Văn A"
            placeholderTextColor={COLORS.textMuted}
            value={recipientName}
            onChangeText={(text) => {
              setRecipientName(text);
              if (errors.recipientName) setErrors((e) => ({ ...e, recipientName: '' }));
            }}
          />
          {errors.recipientName ? (
            <Text style={styles.errorText}>{errors.recipientName}</Text>
          ) : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Số điện thoại *</Text>
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            placeholder="Ví dụ: 0912345678"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              if (errors.phone) setErrors((e) => ({ ...e, phone: '' }));
            }}
          />
          {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
        </View>

        {/* Địa chỉ nhận hàng */}
        <Text style={styles.sectionLabel}>ĐỊA CHỈ NHẬN HÀNG</Text>
        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Tỉnh / Thành phố *</Text>
          <TextInput
            style={[styles.input, errors.city && styles.inputError]}
            placeholder="Ví dụ: TP. Hồ Chí Minh, Hà Nội, Đà Nẵng"
            placeholderTextColor={COLORS.textMuted}
            value={city}
            onChangeText={(text) => {
              setCity(text);
              if (errors.city) setErrors((e) => ({ ...e, city: '' }));
            }}
          />
          {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Quận / Huyện</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Quận 1, Quận Bình Thạnh..."
            placeholderTextColor={COLORS.textMuted}
            value={district}
            onChangeText={setDistrict}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Địa chỉ chi tiết (Số nhà, tên đường) *</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.addressLine && styles.inputError]}
            placeholder="Ví dụ: 123 Nguyễn Trãi, Phường 2, Tòa nhà Golden"
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={3}
            value={addressLine}
            onChangeText={(text) => {
              setAddressLine(text);
              if (errors.addressLine) setErrors((e) => ({ ...e, addressLine: '' }));
            }}
          />
          {errors.addressLine ? (
            <Text style={styles.errorText}>{errors.addressLine}</Text>
          ) : null}
        </View>

        {/* Đặt làm mặc định */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Đặt làm địa chỉ mặc định</Text>
            <Text style={styles.switchSubtitle}>
              Địa chỉ này sẽ được tự động chọn khi bạn tiến hành thanh toán
            </Text>
          </View>
          <Switch
            value={isDefault}
            onValueChange={setIsDefault}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={isDefault ? COLORS.primary : '#FFF'}
          />
        </View>

        {/* Nút lưu */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{isEditing ? 'Lưu Thay Đổi' : 'Lưu Địa Chỉ'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 10,
  },
  labelChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  labelChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textBody,
    marginLeft: 6,
  },
  labelChipTextActive: {
    color: '#FFF',
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: COLORS.textDark,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 10,
    marginBottom: 24,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  switchSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    paddingRight: 10,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

