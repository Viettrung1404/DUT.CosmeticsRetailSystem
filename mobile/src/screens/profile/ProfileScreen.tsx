import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  Linking,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { loyaltyApi } from '../../api/loyaltyApi';
import { authApi } from '../../api/authApi';
import { isStaffUser } from '../../utils/staffOperationsHelper';
import AppHeader from '../../components/AppHeader';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, checkAuth } = useAuthStore();
  const [isFaceIdEnabled, setIsFaceIdEnabled] = useState(true);
  const [showBarcode, setShowBarcode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loyaltyData, setLoyaltyData] = useState<any>(null);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);

  const isStaff = isStaffUser(user);

  // Tải dữ liệu loyalty khi đăng nhập
  const loadProfileData = useCallback(async () => {
    if (!user) {
      setLoyaltyData(null);
      return;
    }

    try {
      setLoadingLoyalty(true);
      const [loyaltyRes, profileRes] = await Promise.allSettled([
        loyaltyApi.getLoyaltyProfile(),
        authApi.getProfile(),
      ]);

      if (loyaltyRes.status === 'fulfilled') {
        const data = loyaltyRes.value?.data || loyaltyRes.value;
        setLoyaltyData(data);
      } else if (profileRes.status === 'fulfilled') {
        const data = profileRes.value?.data || profileRes.value;
        setLoyaltyData(data);
      }
    } catch {
      // Giữ fallback UI
    } finally {
      setLoadingLoyalty(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const onRefresh = () => {
    setRefreshing(true);
    checkAuth().finally(() => {
      loadProfileData();
    });
  };

  const handleToggleFaceId = (value: boolean) => {
    setIsFaceIdEnabled(value);
    Alert.alert(
      'Sinh trắc học',
      value
        ? 'Đã kích hoạt đăng nhập nhanh bằng FaceID / Vân tay.'
        : 'Đã tắt xác thực sinh trắc học.'
    );
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  // Thông tin user hiển thị
  const displayName = user?.fullName || user?.full_name || (user?.email ? user.email.split('@')[0] : 'Khách vãng lai');
  const userEmail = user?.email || 'Chưa đăng nhập';
  const tierName = loyaltyData?.tierName || loyaltyData?.loyaltyTier?.name || (isStaff ? 'STAFF / ADMIN' : 'Thành viên GlowUp');
  const points = loyaltyData?.points ?? loyaltyData?.totalPoints ?? 0;
  const pointsVnd = points * 100;
  const memberCode = user?.id ? `GLW-${user.id.substring(0, 8).toUpperCase()}` : 'GLW-GUEST';

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      {/* 1. Header Profile chuẩn GlowUp */}
      <AppHeader
        title="GlowUp"
        subtitle="HỒ SƠ CÁ NHÂN"
        rightActions={
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => navigation.navigate('NotificationCenter')}
            >
              <Ionicons name="notifications-outline" size={20} color={theme.colors.textDark} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.circleBtn, { marginLeft: 8 }]}
              onPress={() => navigation.navigate('StoreLocator')}
            >
              <Ionicons name="storefront-outline" size={18} color={theme.colors.textDark} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        {/* 2. Thẻ Thông Tin User hoặc Welcome Khách vãng lai */}
        {user ? (
          <TouchableOpacity
            style={styles.userCard}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.userRow}>
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={10} color="#FFF" />
                </View>
              </View>

              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Ionicons name="pencil-outline" size={16} color={theme.colors.primary} />
                </View>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {userEmail}
                </Text>
                <View style={styles.vipTag}>
                  <View style={styles.vipDot} />
                  <Text style={styles.vipTagText}>{tierName}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.guestCard}>
            <View style={styles.guestRow}>
              <View style={styles.guestIconCircle}>
                <Ionicons name="person-circle-outline" size={48} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.guestTitle}>Chào mừng quý khách ✨</Text>
                <Text style={styles.guestSubtitle}>
                  Đăng nhập để nhận ngay ưu đãi VIP, tích lũy GlowPoints và theo dõi đơn hàng dễ dàng.
                </Text>
              </View>
            </View>

            <View style={styles.guestBtnRow}>
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={() => navigation.navigate('AuthStack', { screen: 'Login' })}
                activeOpacity={0.85}
              >
                <Ionicons name="log-in-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.loginBtnText}>Đăng nhập</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.registerBtn}
                onPress={() => navigation.navigate('AuthStack', { screen: 'Register' })}
                activeOpacity={0.85}
              >
                <Text style={styles.registerBtnText}>Tạo tài khoản</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 3. Luxury VIP Membership Card */}
        <TouchableOpacity
          style={styles.vipCard}
          activeOpacity={0.92}
          onPress={() => (user ? navigation.navigate('Loyalty') : navigation.navigate('AuthStack', { screen: 'Login' }))}
        >
          <View style={styles.vipCardTop}>
            <View>
              <View style={styles.rowAlign}>
                <Ionicons name="star" size={16} color="#FFE082" />
                <Text style={styles.vipClubTitle}>GLOWUP LUXURY CLUB</Text>
              </View>
              <Text style={styles.vipMemberTier}>
                {user ? tierName.toUpperCase() : 'ĐẶC QUYỀN THÀNH VIÊN VIP'}
              </Text>
            </View>
            <View style={styles.vipCrownBox}>
              <Ionicons name="ribbon" size={22} color="#FFE082" />
            </View>
          </View>

          {/* Point Balance */}
          <View style={styles.pointsBox}>
            <View style={styles.pointsRow}>
              <View>
                <Text style={styles.pointsSub}>Điểm tích lũy khả dụng</Text>
                <View style={styles.rowAlign}>
                  <Text style={styles.pointsNumber}>
                    {user ? points.toLocaleString('vi-VN') : '0'}
                  </Text>
                  <Text style={styles.pointsUnit}>GlowPoints</Text>
                </View>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.pointsSub}>Trị giá giảm giá</Text>
                <Text style={styles.pointsVnd}>
                  {user ? `~ ${pointsVnd.toLocaleString('vi-VN')} đ` : '~ 0 đ'}
                </Text>
              </View>
            </View>

            {/* Hint */}
            <View style={{ marginTop: 10 }}>
              <View style={styles.vipProgressBarTrack}>
                <View
                  style={[
                    styles.vipProgressBarFill,
                    { width: user ? (points > 1000 ? '100%' : `${Math.min(100, (points / 1000) * 100)}%`) : '15%' },
                  ]}
                />
              </View>
              <Text style={styles.vipHintText}>
                {user
                  ? 'Tích 1 điểm cho mỗi 10.000đ chi tiêu. Đổi mã voucher giảm tới 50%.'
                  : 'Đăng nhập để liên kết thẻ thành viên và nhận 100 điểm thưởng khởi đầu.'}
              </Text>
            </View>
          </View>

          {/* Barcode / Member Code Button */}
          <View style={styles.vipCardBottom}>
            <View>
              <Text style={styles.memberCodeLabel}>MÃ THẺ THÀNH VIÊN</Text>
              <Text style={styles.memberCodeText}>{memberCode}</Text>
            </View>

            <TouchableOpacity
              style={styles.barcodeToggleBtn}
              onPress={() => setShowBarcode(!showBarcode)}
            >
              <Ionicons name="barcode-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.barcodeToggleText}>
                {showBarcode ? 'Thu gọn' : 'Chạm để quét mã'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Expandable Barcode Graphic */}
          {showBarcode && (
            <View style={styles.barcodeDrawer}>
              <Text style={styles.barcodeHint}>
                Đưa mã này cho thu ngân tại Showroom GlowUp để tích điểm trực tiếp
              </Text>
              <View style={styles.simulatedBarcode}>
                {[4, 2, 6, 2, 8, 3, 5, 2, 7, 3, 2, 6, 4, 3, 8, 2, 5].map((w, idx) => (
                  <View
                    key={idx}
                    style={{
                      width: w,
                      height: 40,
                      backgroundColor: '#281811',
                      marginHorizontal: 1,
                    }}
                  />
                ))}
              </View>
              <Text style={styles.barcodeNumber}>{memberCode}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 4. Quick Grid Actions */}
        <View style={styles.quickGrid}>
          {/* Đổi Voucher */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => (user ? navigation.navigate('Loyalty') : navigation.navigate('AuthStack', { screen: 'Login' }))}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#FFF0F5' }]}>
              <Ionicons name="ticket-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.gridCardHeader}>
              <Text style={styles.gridTitle}>Kho Voucher</Text>
              <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
            </View>
            <Text style={styles.gridSub}>Ưu đãi quà tặng & đổi điểm</Text>
          </TouchableOpacity>

          {/* Yêu thích */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('Wishlist')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="heart" size={20} color="#EF4444" />
            </View>
            <View style={styles.gridCardHeader}>
              <Text style={styles.gridTitle}>Yêu thích</Text>
              <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
            </View>
            <Text style={styles.gridSub}>Bộ sưu tập mỹ phẩm đã lưu</Text>
          </TouchableOpacity>

          {/* Sổ địa chỉ */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => (user ? navigation.navigate('AddressList') : navigation.navigate('AuthStack', { screen: 'Login' }))}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="location-outline" size={20} color="#16A34A" />
            </View>
            <View style={styles.gridCardHeader}>
              <Text style={styles.gridTitle}>Sổ địa chỉ</Text>
              <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
            </View>
            <Text style={styles.gridSub}>Quản lý địa chỉ giao hàng</Text>
          </TouchableOpacity>

          {/* Showroom */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('StoreLocator')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="business-outline" size={20} color="#2563EB" />
            </View>
            <View style={styles.gridCardHeader}>
              <Text style={styles.gridTitle}>Showroom</Text>
              <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
            </View>
            <Text style={styles.gridSub}>Hệ thống cửa hàng toàn quốc</Text>
          </TouchableOpacity>
        </View>

        {/* 5. Nhóm Cài Đặt Tài Khoản & Bảo Mật */}
        <Text style={styles.sectionHeaderLabel}>TÀI KHOẢN & BẢO MẬT</Text>
        <View style={styles.settingsGroupCard}>
          {/* Đơn hàng của tôi */}
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Đơn hàng' })}
          >
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconBox}>
                <Ionicons name="receipt-outline" size={18} color={theme.colors.textDark} />
              </View>
              <View>
                <Text style={styles.settingsTitle}>Lịch sử đơn hàng của tôi</Text>
                <Text style={styles.settingsSub}>Xem tiến trình vận chuyển & hóa đơn mua sắm</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {/* Thông tin cá nhân & Hồ sơ da */}
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => (user ? navigation.navigate('EditProfile') : navigation.navigate('AuthStack', { screen: 'Login' }))}
          >
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconBox}>
                <Ionicons name="person-outline" size={18} color={theme.colors.textDark} />
              </View>
              <View>
                <Text style={styles.settingsTitle}>Thông tin cá nhân & Hồ sơ da</Text>
                <Text style={styles.settingsSub}>Cập nhật tên, số điện thoại & loại da</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {/* Sổ địa chỉ */}
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => (user ? navigation.navigate('AddressList') : navigation.navigate('AuthStack', { screen: 'Login' }))}
          >
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconBox}>
                <Ionicons name="location-outline" size={18} color={theme.colors.textDark} />
              </View>
              <View>
                <Text style={styles.settingsTitle}>Sổ địa chỉ nhận hàng</Text>
                <Text style={styles.settingsSub}>Thiết lập địa chỉ giao hàng mặc định</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {/* Đổi mật khẩu */}
          {user && (
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => navigation.navigate('ChangePassword')}
            >
              <View style={styles.settingsRowLeft}>
                <View style={styles.settingsIconBox}>
                  <Ionicons name="lock-closed-outline" size={18} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={styles.settingsTitle}>Đổi mật khẩu tài khoản</Text>
                  <Text style={styles.settingsSub}>Bảo vệ an toàn thông tin & điểm tích luỹ</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* Sinh trắc học FaceID */}
          <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconBox}>
                <Ionicons name="finger-print" size={18} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.settingsTitle}>Đăng nhập FaceID / Vân tay</Text>
                <Text style={styles.settingsSub}>Kích hoạt xác thực sinh trắc học</Text>
              </View>
            </View>
            <Switch
              value={isFaceIdEnabled}
              onValueChange={handleToggleFaceId}
              trackColor={{ false: theme.colors.borderSubtle, true: theme.colors.primary }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* 6. Tiện ích & Hỗ trợ Khách hàng */}
        <Text style={styles.sectionHeaderLabel}>TIỆN ÍCH & TRỢ GIÚP</Text>
        <View style={styles.settingsGroupCard}>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => navigation.navigate('StoreLocator')}
          >
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconBox}>
                <Ionicons name="business-outline" size={18} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.settingsTitle}>Hệ thống Showroom GlowUp</Text>
                <Text style={styles.settingsSub}>Tra cứu chi nhánh gần nhất & giờ mở cửa</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => navigation.navigate('HelpCenter')}
          >
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconBox}>
                <Ionicons name="help-circle-outline" size={18} color={theme.colors.textDark} />
              </View>
              <View>
                <Text style={styles.settingsTitle}>Trung tâm trợ giúp & Chính sách</Text>
                <Text style={styles.settingsSub}>FAQ, chính sách đổi trả & bảo hành</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingsRow, { borderBottomWidth: 0 }]}
            onPress={() => Linking.openURL('tel:19008899')}
          >
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconBox}>
                <Ionicons name="headset-outline" size={18} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.settingsTitle}>Tư vấn sắc đẹp riêng 24/7</Text>
                <Text style={styles.settingsSub}>Hotline hỗ trợ: 1900 8899</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 7. Vận Hành Nội Bộ & Kho Cửa Hàng (Staff Mode) */}
        <Text style={styles.sectionHeaderLabel}>VẬN HÀNH NỘI BỘ</Text>
        <View style={styles.settingsGroupCard}>
          <TouchableOpacity
            style={[styles.settingsRow, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('StaffMode')}
          >
            <View style={styles.settingsRowLeft}>
              <View style={[styles.settingsIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="scan-circle-outline" size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.settingsTitle, { color: '#1D4ED8', fontWeight: '700' }]}>
                    Chế độ Nhân viên Cửa hàng (Staff Mode)
                  </Text>
                  {isStaff && (
                    <View style={styles.activeStaffBadge}>
                      <Text style={styles.activeStaffBadgeText}>Active</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.settingsSub}>
                  Nhặt hàng (Picking), Bàn giao bưu tá & Tiếp nhận RMA
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 8. Nút Đăng Xuất hoặc Đăng Nhập */}
        {user ? (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
            <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.guestLoginBarBtn}
            onPress={() => navigation.navigate('AuthStack', { screen: 'Login' })}
          >
            <Ionicons name="log-in-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.guestLoginBarText}>Đăng nhập tài khoản GlowUp</Text>
          </TouchableOpacity>
        )}

        {/* App Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>GlowUp Cosmetics Mobile • Phiên bản 1.0.0</Text>
          <Text style={styles.versionSlogan}>Trao trọn yêu thương cho làn da thuần khiết</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FAF7F5',
  },
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 8,
  },
  headerBrandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#281811',
  },
  headerBrandSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8C7A70',
    letterSpacing: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5EFEB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
    gap: 14,
  },

  /* User Info Card */
  userCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEAE6',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  vipTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  vipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginRight: 6,
  },
  vipTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },

  /* Guest Card */
  guestCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFEAE6',
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF0F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  guestSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
  },
  guestBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  loginBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  registerBtn: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  registerBtnText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  /* VIP Card */
  vipCard: {
    backgroundColor: '#281811',
    borderRadius: 18,
    padding: 16,
  },
  vipCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vipClubTitle: {
    color: '#FFE082',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  vipMemberTier: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  vipCrownBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 224, 130, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  pointsSub: {
    color: '#D1C7BD',
    fontSize: 11,
    marginBottom: 2,
  },
  pointsNumber: {
    color: '#FFE082',
    fontSize: 22,
    fontWeight: '800',
    marginRight: 4,
  },
  pointsUnit: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    alignSelf: 'flex-end',
    marginBottom: 3,
  },
  pointsVnd: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  vipProgressBarTrack: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  vipProgressBarFill: {
    height: '100%',
    backgroundColor: '#FFE082',
    borderRadius: 3,
  },
  vipHintText: {
    color: '#D1C7BD',
    fontSize: 10,
    lineHeight: 14,
  },
  vipCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  memberCodeLabel: {
    color: '#A89B91',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  memberCodeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  barcodeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  barcodeToggleText: {
    color: '#281811',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  barcodeDrawer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  barcodeHint: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  simulatedBarcode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    marginVertical: 4,
  },
  barcodeNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 2,
    marginTop: 4,
  },

  /* Quick Grid */
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCard: {
    width: '48.5%',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEAE6',
  },
  gridIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  gridSub: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 3,
  },

  /* Settings Section */
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginTop: 6,
    marginLeft: 4,
  },
  settingsGroupCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEAE6',
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFEB',
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF7F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  settingsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  settingsSub: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  activeStaffBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 6,
  },
  activeStaffBadgeText: {
    color: '#16A34A',
    fontSize: 9,
    fontWeight: '700',
  },

  /* Logout & Login buttons */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  logoutText: {
    color: theme.colors.error,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  guestLoginBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  guestLoginBarText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },

  versionContainer: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  versionText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  versionSlogan: {
    fontSize: 10,
    color: '#B5A89F',
    marginTop: 2,
    fontStyle: 'italic',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
