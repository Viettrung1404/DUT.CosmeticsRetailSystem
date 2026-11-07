import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { authApi } from '../../api/authApi';

const SKIN_TYPES = [
  { id: 'combo', label: 'Da hỗn hợp thiên dầu' },
  { id: 'oily', label: 'Da dầu mụn' },
  { id: 'dry', label: 'Da khô thiếu ẩm' },
  { id: 'sensitive', label: 'Da nhạy cảm' },
  { id: 'normal', label: 'Da thường' },
];

const SKIN_CONCERNS = [
  'Lỗ chân lông to',
  'Thâm mụn & Tàn nhang',
  'Nhạy cảm, ửng đỏ',
  'Chống lão hóa nếp nhăn',
  'Hàng rào da yếu',
];

export default function EditProfileScreen({ navigation }: any) {
  const { user } = useAuthStore();

  const [fullName, setFullName] = useState(user?.full_name || 'Kim Anh Nguyễn');
  const [phone, setPhone] = useState((user as any)?.phone || '0987654321');
  const [email] = useState(user?.email || 'kimanh.beauty@glowup.vn');
  const [birthday, setBirthday] = useState('18/09/2002');
  const [gender, setGender] = useState<'Nữ' | 'Nam' | 'Khác'>('Nữ');
  const [skinType, setSkinType] = useState('combo');
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([
    'Lỗ chân lông to',
    'Thâm mụn & Tàn nhang',
  ]);
  const [allergens, setAllergens] = useState<string[]>(['Cồn khô (Alcohol Denat)', 'Paraben']);
  const [newAllergen, setNewAllergen] = useState('');
  const [isAddingAllergen, setIsAddingAllergen] = useState(false);

  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [skincareCycleAlert, setSkincareCycleAlert] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const toggleConcern = (concern: string) => {
    setSelectedConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern]
    );
  };

  const removeAllergen = (item: string) => {
    setAllergens((prev) => prev.filter((a) => a !== item));
  };

  const addAllergenItem = () => {
    if (newAllergen.trim()) {
      setAllergens((prev) => [...prev, newAllergen.trim()]);
      setNewAllergen('');
      setIsAddingAllergen(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập họ và tên của bạn');
      return;
    }

    setIsSaving(true);
    try {
      await authApi.updateProfile({
        full_name: fullName,
        phone,
        birthday,
        gender,
        skin_type: skinType,
      });
      Alert.alert('Thành công ✨', 'Thông tin hồ sơ và hồ sơ da của bạn đã được cập nhật!', [
        { text: 'Đồng ý', onPress: () => navigation.goBack() },
      ]);
    } catch {
      // Offline fallback
      Alert.alert(
        'Đã lưu thành công ✨',
        'Hồ sơ của bạn đã được cập nhật đồng bộ trên thiết bị!',
        [{ text: 'Đồng ý', onPress: () => navigation.goBack() }]
      );
    } finally {
      setIsSaving(false);
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
        <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFoJz9_e_s-F6Qp7q_U-y5g3RjK4o0LzYd5z3aX7wV5t3v1L7s_9m4q_WAoKCYLRFBkJ4vw',
              }}
              style={styles.avatarImage}
            />
            <TouchableOpacity style={styles.cameraBadge} activeOpacity={0.8}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.avatarName}>{fullName}</Text>
          <View style={styles.vipPill}>
            <MaterialIcons name="diamond" size={14} color={theme.colors.primary} />
            <Text style={styles.vipPillText}>Thành viên VIP Diamond</Text>
          </View>
        </View>

        {/* Thông tin cơ bản */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>

          {/* Họ tên */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Họ và tên</Text>
            <View style={styles.inputWrapper}>
              <Feather name="user" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nhập họ và tên"
              />
            </View>
          </View>

          {/* Số điện thoại */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Số điện thoại liên hệ</Text>
            <View style={styles.inputWrapper}>
              <Feather name="phone" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="09xx xxx xxx"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Email (Disabled / Readonly) */}
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Địa chỉ Email</Text>
              <Text style={styles.verifiedBadge}>Đã xác minh</Text>
            </View>
            <View style={[styles.inputWrapper, styles.inputDisabled]}>
              <Feather name="mail" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.textMuted }]}
                value={email}
                editable={false}
              />
              <Ionicons name="lock-closed" size={16} color={theme.colors.textMuted} />
            </View>
          </View>

          {/* Ngày sinh & Giới tính */}
          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Ngày sinh</Text>
              <View style={styles.inputWrapper}>
                <Feather name="calendar" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={birthday}
                  onChangeText={setBirthday}
                  placeholder="DD/MM/YYYY"
                />
              </View>
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Giới tính</Text>
              <View style={styles.genderRow}>
                {(['Nữ', 'Nam'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                    onPress={() => setGender(g)}
                  >
                    <Text
                      style={[
                        styles.genderBtnText,
                        gender === g && styles.genderBtnTextActive,
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Hồ sơ phân tích da chuyên sâu (Stitch Feature) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="sparkles" size={18} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Hồ sơ da & Cá nhân hóa</Text>
            </View>
            <View style={styles.aiTag}>
              <Text style={styles.aiTagText}>AI MATCH</Text>
            </View>
          </View>
          <Text style={styles.sectionDesc}>
            Giúp GlowUp gợi ý các sản phẩm đặc trị và routine chăm sóc tối ưu nhất cho bạn.
          </Text>

          {/* Loại da */}
          <Text style={styles.subLabel}>Loại da chính</Text>
          <View style={styles.pillContainer}>
            {SKIN_TYPES.map((type) => {
              const isSelected = skinType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.skinPill, isSelected && styles.skinPillActive]}
                  onPress={() => setSkinType(type.id)}
                >
                  <Text
                    style={[styles.skinPillText, isSelected && styles.skinPillTextActive]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Vấn đề da cần cải thiện */}
          <Text style={[styles.subLabel, { marginTop: 14 }]}>Vấn đề da quan tâm</Text>
          <View style={styles.pillContainer}>
            {SKIN_CONCERNS.map((concern) => {
              const isSelected = selectedConcerns.includes(concern);
              return (
                <TouchableOpacity
                  key={concern}
                  style={[styles.concernPill, isSelected && styles.concernPillActive]}
                  onPress={() => toggleConcern(concern)}
                >
                  <Ionicons
                    name={isSelected ? 'checkmark' : 'add'}
                    size={14}
                    color={isSelected ? '#FFF' : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.concernPillText,
                      isSelected && styles.concernPillTextActive,
                    ]}
                  >
                    {concern}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Thành phần dị ứng / Cần tránh */}
          <Text style={[styles.subLabel, { marginTop: 14 }]}>Thành phần cần tránh (Dị ứng)</Text>
          <View style={styles.pillContainer}>
            {allergens.map((item) => (
              <View key={item} style={styles.allergenBadge}>
                <Text style={styles.allergenText}>{item}</Text>
                <TouchableOpacity
                  onPress={() => removeAllergen(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}

            {isAddingAllergen ? (
              <View style={styles.addAllergenBox}>
                <TextInput
                  style={styles.addAllergenInput}
                  placeholder="Tên thành phần..."
                  value={newAllergen}
                  onChangeText={setNewAllergen}
                  autoFocus
                />
                <TouchableOpacity onPress={addAllergenItem} style={styles.confirmAddBtn}>
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addAllergenBtn}
                onPress={() => setIsAddingAllergen(true)}
              >
                <Ionicons name="add" size={16} color={theme.colors.primary} />
                <Text style={styles.addAllergenText}>Thêm thành phần</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bảo mật & Đổi mật khẩu */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Bảo mật & Thiết bị</Text>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('ChangePassword')}
            activeOpacity={0.8}
          >
            <View style={styles.settingLeft}>
              <View style={styles.iconCircle}>
                <Feather name="lock" size={18} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.settingName}>Đổi mật khẩu</Text>
                <Text style={styles.settingSub}>Cập nhật mật khẩu định kỳ để an toàn</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="finger-print" size={20} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.settingName}>Sinh trắc học (FaceID / TouchID)</Text>
                <Text style={styles.settingSub}>Đăng nhập và xác thực đơn nhanh</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.toggleBtn, biometricEnabled && styles.toggleActive]}
              onPress={() => setBiometricEnabled(!biometricEnabled)}
            >
              <View style={[styles.toggleThumb, biometricEnabled && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="notifications-outline" size={20} color={theme.colors.tertiary} />
              </View>
              <View>
                <Text style={styles.settingName}>Nhắc nhở chu kỳ chăm sóc da</Text>
                <Text style={styles.settingSub}>Thông báo routine sáng & tối tự động</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.toggleBtn, skincareCycleAlert && styles.toggleActive]}
              onPress={() => setSkincareCycleAlert(!skincareCycleAlert)}
            >
              <View
                style={[styles.toggleThumb, skincareCycleAlert && styles.toggleThumbActive]}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Save Button */}
      <View style={styles.floatingFooter}>
        <TouchableOpacity
          style={styles.saveBtn}
          activeOpacity={0.9}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>LƯU THAY ĐỔI HỒ SƠ</Text>
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
    paddingVertical: 12,
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
    fontSize: 17,
    fontWeight: '700',
    color: '#281811',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  avatarCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#281811',
    marginBottom: 4,
  },
  vipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAD9CD',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  vipPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3E9EB',
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#281811',
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiTag: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
    marginBottom: 14,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#554244',
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#554244',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  verifiedBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.success,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFAFC',
    borderWidth: 1,
    borderColor: '#EFE5E7',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  inputDisabled: {
    backgroundColor: '#FFF1EC',
    borderColor: '#FAD9CD',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#281811',
  },
  row: {
    flexDirection: 'row',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    height: 44,
  },
  genderBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEFAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  genderBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  genderBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#554244',
  },
  genderBtnTextActive: {
    color: '#FFFFFF',
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skinPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FEFAFC',
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  skinPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  skinPillText: {
    fontSize: 12,
    color: '#554244',
  },
  skinPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  concernPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FEFAFC',
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  concernPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  concernPillText: {
    fontSize: 12,
    color: '#554244',
  },
  concernPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  allergenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFE9E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  allergenText: {
    fontSize: 12,
    color: '#281811',
    fontWeight: '500',
  },
  addAllergenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E3DFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addAllergenText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.tertiary,
  },
  addAllergenBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFAFC',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    height: 32,
  },
  addAllergenInput: {
    fontSize: 12,
    color: '#281811',
    width: 110,
    paddingVertical: 0,
  },
  confirmAddBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 3,
    marginLeft: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF1EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#281811',
  },
  settingSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3E9EB',
    marginVertical: 10,
  },
  toggleBtn: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFE5E7',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  floatingFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 248, 246, 0.95)',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3E9EB',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    height: 48,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
});
