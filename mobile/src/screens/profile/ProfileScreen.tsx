import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();
  const [isFaceIdEnabled, setIsFaceIdEnabled] = useState(true);
  const [showBarcode, setShowBarcode] = useState(false);

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
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* 1. Header Profile */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={{
              uri: 'https://lh3.googleusercontent.com/aida/AEtjO1V_EdYGFWGwIUg8ikIOvg6kwDD7S9TUC48vlh9MNjkdWvqUY_6ike1Fiq25KeoJiAgx7F3xuqhNJa5DFvTwaYjyY6lvVv6EztD4Zevbg6VNQtcbJ1RKswD0_wVSnSLfyEGE3YTd0-U0JDqwzSdITN_FBzAUKAsABkBo6RbAvVtOcTtl5xL2I959nXeMxsLJBURM90gaoke5QVaUpJZ2nWLMIl9J77-Yne_L63BXqwTeqz7dFfnKs9JSkQs',
            }}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.headerBrandTitle}>GlowUp</Text>
            <Text style={styles.headerBrandSub}>HỒ SƠ CÁ NHÂN</Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => Alert.alert('Quét mã', 'Mở máy quét mã QR/Barcode tại cửa hàng.')}
          >
            <Ionicons name="qr-code-outline" size={20} color={theme.colors.textDark} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Thẻ Tóm Tắt Thông Tin User */}
        <View style={styles.userCard}>
          <View style={styles.userRow}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{
                  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdWYLHb_5ZepaU1sDBlcL_NqUksR_UT9jMk0SnQaUpVnDQ_CTdzs7tv_OXKX2W2UuSQxAeZH-D4fL2oMywHD-rq9xItHARbttxSzWzXPRgjLmw7-ONGtjt8lsZH0vFoOKPUxiPzArQYFBK404oqa4OVaxRMeRO6Efha-t56O1khCnknkkNGdQgZGqcSWFAzOpNJo6636D7i2YAoK8voHwdX6EX1fbmnzScux-5ovDKg3rqVSU2WZKvWA',
                }}
                style={styles.avatarImg}
              />
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={10} color="#FFF" />
              </View>
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>
                  {user?.full_name || 'Thảo Linh Nguyễn'}
                </Text>
                <Ionicons name="pencil-outline" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.userEmail}>{user?.email || 'linh.thaonguyen@glowup.vn'}</Text>
              <View style={styles.vipTag}>
                <View style={styles.vipDot} />
                <Text style={styles.vipTagText}>Diamond VIP Member</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. Luxury Diamond VIP Membership Card (Stitch Design) */}
        <View style={styles.vipCard}>
          {/* Card Top */}
          <View style={styles.vipCardTop}>
            <View>
              <View style={styles.rowAlign}>
                <Ionicons name="star" size={16} color="#FFE082" />
                <Text style={styles.vipClubTitle}>GLOWUP LUXURY CLUB</Text>
              </View>
              <Text style={styles.vipMemberTier}>DIAMOND MEMBER</Text>
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
                  <Text style={styles.pointsNumber}>1.450</Text>
                  <Text style={styles.pointsUnit}>GlowPoints</Text>
                </View>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.pointsSub}>Trị giá giảm giá</Text>
                <Text style={styles.pointsVnd}>~ 145.000 đ</Text>
              </View>
            </View>

            {/* Progress to Royal Crown */}
            <View style={{ marginTop: 12 }}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>
                  Tiến độ thăng hạng <Text style={{ fontWeight: '700' }}>Royal Crown</Text>
                </Text>
                <Text style={styles.progressPercent}>72%</Text>
              </View>
              <View style={styles.vipProgressBarTrack}>
                <View style={[styles.vipProgressBarFill, { width: '72%' }]} />
              </View>
              <Text style={styles.vipHintText}>
                Chi tiêu thêm 550.000đ để thăng hạng Royal Crown & nhận hộp quà VIP.
              </Text>
            </View>
          </View>

          {/* Barcode / Member Code Button */}
          <View style={styles.vipCardBottom}>
            <View>
              <Text style={styles.memberCodeLabel}>MÃ THẺ THÀNH VIÊN</Text>
              <Text style={styles.memberCodeText}>GLW-8892-9401</Text>
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
                Đưa mã này cho thu ngân tại quầy GlowUp để tích điểm
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
              <Text style={styles.barcodeNumber}>8892 9401 2289 1102</Text>
            </View>
          )}
        </View>

        {/* 4. Quick Loyalty Grid Actions */}
        <View style={styles.quickGrid}>
          {/* Đổi Voucher */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => Alert.alert('Kho Voucher', 'Bạn đang có 4 mã giảm giá sẵn sàng áp dụng.')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: theme.colors.secondaryContainer }]}>
              <Ionicons name="ticket-outline" size={20} color={theme.colors.textDark} />
            </View>
            <View style={styles.gridCardHeader}>
              <Text style={styles.gridTitle}>Đổi Voucher</Text>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>4</Text>
              </View>
            </View>
            <Text style={styles.gridSub}>Ưu đãi quà tặng chờ đổi</Text>
          </TouchableOpacity>

          {/* Yêu thích */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => Alert.alert('Yêu thích', 'Danh sách 12 món mỹ phẩm bạn đã lưu.')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: theme.colors.primaryFixed }]}>
              <Ionicons name="heart" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.gridCardHeader}>
              <Text style={styles.gridTitle}>Yêu thích</Text>
              <Text style={styles.gridStatPink}>12 món</Text>
            </View>
            <Text style={styles.gridSub}>Lưu trữ giỏ làm đẹp</Text>
          </TouchableOpacity>

          {/* Sổ địa chỉ */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => Alert.alert('Sổ địa chỉ', 'Địa chỉ mặc định: Landmark 81, Bình Thạnh, TP.HCM.')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: theme.colors.tertiaryFixed }]}>
              <Ionicons name="location-outline" size={20} color={theme.colors.tertiary} />
            </View>
            <View style={styles.gridCardHeader}>
              <Text style={styles.gridTitle}>Sổ địa chỉ</Text>
              <Text style={styles.gridStatMuted}>2 nơi</Text>
            </View>
            <Text style={styles.gridSub}>Mặc định: TP.HCM</Text>
          </TouchableOpacity>

          {/* Đánh giá & Xu */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => Alert.alert('Đánh giá', 'Đánh giá đơn hàng vừa nhận để nhận ngay +50 Xu.')}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: theme.colors.surfaceContainer }]}>
              <Ionicons name="star-outline" size={20} color={theme.colors.textDark} />
            </View>
            <View style={styles.gridCardHeader}>
              <Text style={styles.gridTitle}>Đánh giá & Xu</Text>
              <View style={styles.coinBadge}>
                <Text style={styles.coinBadgeText}>+50 Xu</Text>
              </View>
            </View>
            <Text style={styles.gridSub}>1 đơn chờ nhận xét</Text>
          </TouchableOpacity>
        </View>

        {/* 5. Nhóm Cài Đặt Tài Khoản & Bảo Mật */}
        <Text style={styles.sectionHeaderLabel}>CÀI ĐẶT TÀI KHOẢN & BẢO MẬT</Text>
        <View style={styles.settingsGroupCard}>
          {/* Sinh trắc học FaceID */}
          <View style={styles.settingsRow}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconBox}>
                <Ionicons name="finger-print" size={18} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.settingsTitle}>Đăng nhập FaceID / Vân tay</Text>
                <Text style={styles.settingsSub}>Bảo mật giao dịch & mua sắm nhanh</Text>
              </View>
            </View>
            <Switch
              value={isFaceIdEnabled}
              onValueChange={handleToggleFaceId}
              trackColor={{ false: theme.colors.borderSubtle, true: theme.colors.primary }}
              thumbColor="#FFF"
            />
          </View>

          {/* Đơn hàng của tôi */}
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => navigation.navigate('Đơn hàng')}
          >
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconBox}>
                <Ionicons name="receipt-outline" size={18} color={theme.colors.textDark} />
              </View>
              <View>
                <Text style={styles.settingsTitle}>Lịch sử đơn hàng của tôi</Text>
                <Text style={styles.settingsSub}>Xem tiến trình vận chuyển & hóa đơn</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {/* Thông tin cá nhân */}
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => Alert.alert('Thông tin cá nhân', 'Chức năng chỉnh sửa thông tin đang hoàn thiện.')}
          >
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconBox}>
                <Ionicons name="person-outline" size={18} color={theme.colors.textDark} />
              </View>
              <View>
                <Text style={styles.settingsTitle}>Thông tin cá nhân & Ngày sinh</Text>
                <Text style={styles.settingsSub}>Nhận quà sinh nhật Bloom Luxe</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 6. Chăm Sóc Khách Hàng VIP */}
        <Text style={styles.sectionHeaderLabel}>CHĂM SÓC KHÁCH HÀNG VIP</Text>
        <View style={styles.settingsGroupCard}>
          <TouchableOpacity
            style={styles.settingsRow}
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

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => Alert.alert('Chính sách', 'GlowUp hỗ trợ đổi trả miễn phí trong 15-30 ngày.')}
          >
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.textDark} />
              </View>
              <View>
                <Text style={styles.settingsTitle}>Chính sách đổi trả & Bảo hành da</Text>
                <Text style={styles.settingsSub}>Đồng kiểm khi nhận, đổi trả 100% miễn phí</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 7. Nút Đăng Xuất */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
          <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
        </TouchableOpacity>

        {/* App Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>GlowUp Cosmetics Mobile • Phiên bản 1.0.0 (Sprint 2)</Text>
          <Text style={styles.versionSlogan}>Trao trọn yêu thương cho làn da thuần khiết</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.backgroundCanvas,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255, 248, 246, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 30,
    height: 30,
    marginRight: 8,
  },
  headerBrandTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  headerBrandSub: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textMuted,
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
    backgroundColor: theme.colors.surfaceSubtle,
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
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.card,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImg: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  userEmail: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  vipTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  vipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  vipTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
  },

  /* VIP Card Gradient */
  vipCard: {
    backgroundColor: '#C85A70',
    borderRadius: theme.rounded.xl,
    padding: theme.spacing.md,
    ...theme.shadows.elevated,
  },
  vipCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vipClubTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFE082',
    letterSpacing: 1,
  },
  vipMemberTier: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  vipCrownBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: theme.rounded.lg,
    padding: 12,
    marginVertical: 12,
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pointsSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  pointsNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },
  pointsUnit: {
    fontSize: 12,
    color: '#FFE082',
    fontWeight: '700',
    marginLeft: 4,
    marginTop: 6,
  },
  pointsVnd: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFE082',
    marginTop: 4,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  vipProgressBarTrack: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 3,
    marginVertical: 6,
    overflow: 'hidden',
  },
  vipProgressBarFill: {
    height: '100%',
    backgroundColor: '#FFE082',
    borderRadius: 3,
  },
  vipHintText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  vipCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberCodeLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
  },
  memberCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 1.5,
  },
  barcodeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  barcodeToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  barcodeDrawer: {
    backgroundColor: '#FFF',
    borderRadius: theme.rounded.md,
    padding: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  barcodeHint: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  simulatedBarcode: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  barcodeNumber: {
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.textDark,
    marginTop: 4,
    fontWeight: '600',
  },

  /* Quick Grid */
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCard: {
    width: '48%',
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.card,
  },
  gridIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
    color: theme.colors.textDark,
  },
  countPill: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  gridStatPink: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  gridStatMuted: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  gridSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  coinBadge: {
    backgroundColor: theme.colors.primaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  coinBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primaryDeep,
  },

  /* Settings Group */
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 6,
    marginLeft: 4,
  },
  settingsGroupCard: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.card,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  settingsIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textDark,
  },
  settingsSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginTop: 6,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.error,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 8,
    paddingBottom: 20,
  },
  versionText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  versionSlogan: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
});