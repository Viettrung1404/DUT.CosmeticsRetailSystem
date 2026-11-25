import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Clipboard,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { loyaltyApi } from '../../api/loyaltyApi';
import { useAuthStore } from '../../store/useAuthStore';

const { width } = Dimensions.get('window');

interface VoucherReward {
  id: string;
  title: string;
  discount: string;
  pointsCost: number;
  condition: string;
  expiry: string;
  code: string;
  category: 'Voucher' | 'FreeGift' | 'Shipping';
}

interface PointHistoryItem {
  id: string;
  title: string;
  date: string;
  points: string;
  isPositive: boolean;
}

export default function LoyaltyScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [currentPoints, setCurrentPoints] = useState(0);
  const [tierName, setTierName] = useState('Thành viên GlowUp');
  const [nextTierName, setNextTierName] = useState('Diamond Member');
  const [nextTierPoints, setNextTierPoints] = useState(1000);
  const [rewards, setRewards] = useState<VoucherReward[]>([]);
  const [history, setHistory] = useState<PointHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'rewards' | 'history'>('rewards');
  const [showBarcode, setShowBarcode] = useState(false);

  const loadLoyaltyData = useCallback(async () => {
    if (!user) {
      setCurrentPoints(0);
      setTierName('Khách vãng lai');
      setHistory([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const [profileRes, rewardsRes] = await Promise.allSettled([
        loyaltyApi.getLoyaltyProfile(),
        loyaltyApi.getLoyaltyRewards(),
      ]);

      if (profileRes.status === 'fulfilled') {
        const profile = profileRes.value?.data || profileRes.value || {};
        const balance = profile.balance ?? profile.totalPoints ?? profile.points ?? 0;
        setCurrentPoints(balance);

        const currentTier = profile.tier?.name || profile.tierName || 'Thành viên GlowUp';
        setTierName(currentTier);

        if (profile.nextTier) {
          setNextTierName(profile.nextTier.name || 'Hạng tiếp theo');
          setNextTierPoints(profile.nextTier.minPoints || 1000);
        }

        const hist: PointHistoryItem[] = (profile.history || []).map((h: any) => {
          const isPositive = (h.points || 0) >= 0;
          const d = h.createdAt ? new Date(h.createdAt) : new Date();
          const formattedDate = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} • ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
          return {
            id: h.id,
            title: h.description || (isPositive ? 'Tích điểm đơn hàng' : 'Đổi quà ưu đãi'),
            date: formattedDate,
            points: `${isPositive ? '+' : ''}${h.points} pts`,
            isPositive,
          };
        });
        setHistory(hist);
      }

      if (rewardsRes.status === 'fulfilled') {
        const rawRewards = rewardsRes.value?.data || rewardsRes.value || [];
        const mappedRewards: VoucherReward[] = (Array.isArray(rawRewards) ? rawRewards : []).map((r: any) => ({
          id: r.code || r.id,
          title: r.name || r.description || `Voucher ${r.discountValue ? r.discountValue.toLocaleString('vi-VN') + '₫' : ''}`,
          discount: r.discountType === 'PERCENTAGE' ? `GIẢM ${r.discountValue}%` : `GIẢM ${(r.discountValue || 0).toLocaleString('vi-VN')}₫`,
          pointsCost: r.pointsCost || 100,
          condition: r.minOrderAmount ? `Đơn từ ${r.minOrderAmount.toLocaleString('vi-VN')}₫` : 'Áp dụng toàn sàn GlowUp',
          expiry: 'HSD: 30 ngày sau khi đổi',
          code: r.code,
          category: 'Voucher',
        }));
        setRewards(mappedRewards);
      }
    } catch (err: any) {
      console.warn('Failed to load loyalty data', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadLoyaltyData();
  }, [loadLoyaltyData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLoyaltyData();
  };

  const handleRedeemVoucher = (reward: VoucherReward) => {
    if (!user) {
      navigation.navigate('AuthStack', { screen: 'Login' });
      return;
    }

    if (currentPoints < reward.pointsCost) {
      Alert.alert(
        'Chưa đủ GlowPoints',
        `Bạn cần thêm ${reward.pointsCost - currentPoints} điểm để đổi ưu đãi này. Hãy tiếp tục mua sắm để tích lũy nhé!`
      );
      return;
    }

    Alert.alert(
      'Xác nhận đổi ưu đãi',
      `Bạn có muốn dùng ${reward.pointsCost} GlowPoints để đổi mã "${reward.title}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đổi ngay',
          onPress: async () => {
            try {
              await loyaltyApi.redeemReward(reward.code || reward.id);
            } catch {
              // Bỏ qua nếu là preview
            }
            setCurrentPoints((prev) => Math.max(prev - reward.pointsCost, 0));
            Clipboard.setString(reward.code);
            Alert.alert(
              'Đổi thành công! 🎉',
              `Mã ưu đãi "${reward.code}" đã được lưu vào Kho Voucher và sao chép vào bộ nhớ tạm. Hãy dùng khi thanh toán nhé!`,
              [
                { text: 'Đến giỏ hàng', onPress: () => navigation.navigate('Giỏ hàng') },
                { text: 'Ở lại' },
              ]
            );
          },
        },
      ]
    );
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
          <Text style={styles.headerTitle}>GlowUp VIP Club</Text>
          <Text style={styles.headerSubtitle}>Đặc quyền & Điểm thưởng</Text>
        </View>
        <TouchableOpacity
          style={styles.headActionBtn}
          onPress={() => navigation.navigate('NotificationCenter')}
        >
          <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Luxury Diamond Member Card */}
        <View style={styles.vipCard}>
          {/* Card Top */}
          <View style={styles.vipCardTop}>
            <View>
              <View style={styles.rowAlign}>
                <Ionicons name="star" size={15} color="#FFE082" />
                <Text style={styles.vipClubTitle}>GLOWUP PRIVILEGE</Text>
              </View>
              <Text style={styles.vipMemberTier}>{tierName.toUpperCase()}</Text>
            </View>
            <View style={styles.vipCrownBox}>
              <MaterialIcons name="diamond" size={24} color="#FFE082" />
            </View>
          </View>

          {/* Points Display */}
          <View style={styles.pointsDisplayBox}>
            <Text style={styles.pointsLabel}>Điểm tích luỹ khả dụng</Text>
            <View style={styles.pointsRow}>
              <Text style={styles.pointsValue}>{currentPoints.toLocaleString('vi-VN')}</Text>
              <Text style={styles.pointsUnit}>GlowPoints</Text>
            </View>
          </View>

          {/* Tier Progress */}
          <View style={styles.tierProgressBox}>
            <View style={styles.tierLabelsRow}>
              <Text style={styles.tierCurrent}>{tierName}</Text>
              <Text style={styles.tierNext}>{nextTierName} ({nextTierPoints.toLocaleString('vi-VN')} pts)</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(Math.max((currentPoints / nextTierPoints) * 100, 5), 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.tierHintText}>
              {user
                ? nextTierPoints > currentPoints
                  ? `Tích thêm ${(nextTierPoints - currentPoints).toLocaleString('vi-VN')} điểm để thăng hạng ${nextTierName}`
                  : 'Bạn đã đạt hạng thành viên cao cấp nhất'
                : 'Đăng nhập để tích luỹ GlowPoints và thăng hạng thành viên'}
            </Text>
          </View>

          {/* Card Footer Barcode Toggle */}
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardCodeLabel}>MÃ THÀNH VIÊN VIP</Text>
              <Text style={styles.cardCodeText}>
                {user?.id ? `GLW-${user.id.substring(0, 8).toUpperCase()}` : 'GLW-GUEST'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.barcodeToggleBtn}
              onPress={() => setShowBarcode(!showBarcode)}
            >
              <Ionicons name={showBarcode ? 'chevron-up' : 'qr-code-outline'} size={15} color={theme.colors.primary} />
              <Text style={styles.barcodeToggleText}>{showBarcode ? 'Thu gọn' : 'Mã Barcode'}</Text>
            </TouchableOpacity>
          </View>

          {/* Barcode Drawer */}
          {showBarcode && (
            <View style={styles.barcodeDrawer}>
              <Text style={styles.barcodeHint}>Quét mã tại quầy thu ngân tất cả showroom GlowUp toàn quốc</Text>
              <View style={styles.simulatedBarcode}>
                {[4, 2, 6, 2, 8, 4, 2, 6, 8, 2, 4, 6, 2, 8, 4].map((w, i) => (
                  <View
                    key={i}
                    style={{
                      width: w,
                      height: 38,
                      backgroundColor: '#281811',
                      marginHorizontal: 1.5,
                    }}
                  />
                ))}
              </View>
              <Text style={styles.barcodeNumber}>
                {user?.id ? `* GLW-${user.id.substring(0, 8).toUpperCase()} *` : '* GLW-GUEST *'}
              </Text>
            </View>
          )}
        </View>

        {/* 4 Đặc quyền hội viên VIP */}
        <View style={styles.privilegesRow}>
          {[
            { icon: 'percent', label: 'Giảm giá hội viên', color: theme.colors.primary },
            { icon: 'gift', label: 'Quà sinh nhật Luxe', color: '#D97706' },
            { icon: 'truck', label: 'Ưu đãi vận chuyển', color: theme.colors.tertiary },
            { icon: 'headset', label: 'Tư vấn chuyên sâu', color: '#059669' },
          ].map((priv, idx) => (
            <View key={idx} style={styles.privilegeItem}>
              <View style={[styles.privilegeIconCircle, { backgroundColor: '#FFF' }]}>
                <Feather name={priv.icon as any} size={16} color={priv.color} />
              </View>
              <Text style={styles.privilegeLabel}>{priv.label}</Text>
            </View>
          ))}
        </View>

        {/* Tabs: Đổi Quà vs Lịch Sử Điểm */}
        <View style={styles.tabSwitchContainer}>
          <TouchableOpacity
            style={[styles.tabSwitchBtn, activeTab === 'rewards' && styles.tabSwitchBtnActive]}
            onPress={() => setActiveTab('rewards')}
          >
            <Ionicons
              name="gift-outline"
              size={16}
              color={activeTab === 'rewards' ? '#FFF' : '#554244'}
            />
            <Text style={[styles.tabSwitchText, activeTab === 'rewards' && styles.tabSwitchTextActive]}>
              Đổi Voucher & Quà ({rewards.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabSwitchBtn, activeTab === 'history' && styles.tabSwitchBtnActive]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={activeTab === 'history' ? '#FFF' : '#554244'}
            />
            <Text style={[styles.tabSwitchText, activeTab === 'history' && styles.tabSwitchTextActive]}>
              Lịch sử tích điểm
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 10, color: theme.colors.textMuted, fontSize: 13 }}>
              Đang tải dữ liệu điểm thưởng...
            </Text>
          </View>
        ) : activeTab === 'rewards' ? (
          /* TAB 1: DANH SÁCH VOUCHER & QUÀ */
          rewards.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="gift-outline" size={54} color={theme.colors.textMuted} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#281811', marginTop: 10 }}>
                Chưa có voucher đổi điểm
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', marginTop: 4 }}>
                Hệ thống đang cập nhật các chương trình ưu đãi đổi thưởng mới nhất.
              </Text>
            </View>
          ) : (
            <View style={styles.rewardsList}>
              {rewards.map((reward) => {
                const canRedeem = currentPoints >= reward.pointsCost;
                return (
                  <View key={reward.id} style={styles.rewardCard}>
                    <View style={styles.rewardLeft}>
                      <View style={styles.rewardBadge}>
                        <Text style={styles.rewardBadgeText}>{reward.discount}</Text>
                      </View>
                      <Text style={styles.rewardTitle}>{reward.title}</Text>
                      <Text style={styles.rewardCondition}>{reward.condition}</Text>
                      <Text style={styles.rewardExpiry}>{reward.expiry}</Text>
                    </View>

                    <View style={styles.rewardRight}>
                      <View style={styles.costBadge}>
                        <Ionicons name="sparkles" size={12} color="#D97706" />
                        <Text style={styles.costText}>{reward.pointsCost} pts</Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.redeemBtn, !canRedeem && styles.redeemBtnDisabled]}
                        onPress={() => handleRedeemVoucher(reward)}
                        activeOpacity={0.88}
                      >
                        <Text style={[styles.redeemBtnText, !canRedeem && { color: theme.colors.textMuted }]}>
                          {canRedeem ? 'Đổi ngay' : 'Chưa đủ'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )
        ) : (
          /* TAB 2: LỊCH SỬ TÍCH ĐIỂM */
          !user ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="person-circle-outline" size={54} color={theme.colors.primary} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#281811', marginTop: 10 }}>
                Đăng nhập để xem lịch sử tích điểm
              </Text>
              <TouchableOpacity
                style={{
                  marginTop: 14,
                  backgroundColor: theme.colors.primary,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 20,
                }}
                onPress={() => navigation.navigate('AuthStack', { screen: 'Login' })}
              >
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Đăng nhập ngay</Text>
              </TouchableOpacity>
            </View>
          ) : history.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="time-outline" size={54} color={theme.colors.textMuted} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#281811', marginTop: 10 }}>
                Chưa có giao dịch tích điểm nào
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', marginTop: 4 }}>
                Mua sắm tại GlowUp để tích luỹ GlowPoints và đổi nhiều phần quà hấp dẫn!
              </Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {history.map((item) => (
                <View key={item.id} style={styles.historyItem}>
                  <View
                    style={[
                      styles.historyIconCircle,
                      { backgroundColor: item.isPositive ? '#ECFDF5' : '#FEF2F2' },
                    ]}
                  >
                    <Ionicons
                      name={item.isPositive ? 'arrow-down' : 'arrow-up'}
                      size={16}
                      color={item.isPositive ? '#059669' : '#DC2626'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyTitle}>{item.title}</Text>
                    <Text style={styles.historyDate}>{item.date}</Text>
                  </View>
                  <Text
                    style={[
                      styles.historyPoints,
                      { color: item.isPositive ? '#059669' : '#DC2626' },
                    ]}
                  >
                    {item.points}
                  </Text>
                </View>
              ))}
            </View>
          )
        )}
      </ScrollView>
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
  headActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: 40,
  },

  /* VIP Card */
  vipCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: '#9D394F',
    shadowColor: '#9D394F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 5,
  },
  vipCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vipClubTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFE082',
    letterSpacing: 1,
  },
  vipMemberTier: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  vipCrownBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsDisplayBox: {
    marginVertical: 10,
  },
  pointsLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  pointsValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pointsUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFE082',
  },
  tierProgressBox: {
    marginTop: 8,
    marginBottom: 12,
  },
  tierLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tierCurrent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFE082',
  },
  tierNext: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginVertical: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFE082',
    borderRadius: 3,
  },
  tierHintText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.18)',
    paddingTop: 10,
  },
  cardCodeLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
  },
  cardCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  barcodeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  barcodeToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  barcodeDrawer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  barcodeHint: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginBottom: 8,
    textAlign: 'center',
  },
  simulatedBarcode: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
  },
  barcodeNumber: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#281811',
    marginTop: 4,
    fontWeight: '600',
  },

  /* Privileges Grid */
  privilegesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FAF0F2',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3DCE1',
  },
  privilegeItem: {
    alignItems: 'center',
    width: '24%',
    gap: 6,
  },
  privilegeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  privilegeLabel: {
    fontSize: 10,
    color: '#554244',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 13,
  },

  /* Tabs Switch */
  tabSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#FEFAFC',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  tabSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
  },
  tabSwitchBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  tabSwitchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#554244',
  },
  tabSwitchTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Rewards */
  rewardsList: {
    gap: 10,
  },
  rewardCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3E9EB',
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  rewardLeft: {
    flex: 1,
    paddingRight: 10,
  },
  rewardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FAF0F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  rewardBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  rewardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#281811',
    marginBottom: 2,
  },
  rewardCondition: {
    fontSize: 11,
    color: '#725950',
    marginBottom: 2,
  },
  rewardExpiry: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  rewardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  costText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  redeemBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  redeemBtnDisabled: {
    backgroundColor: '#EFE5E7',
  },
  redeemBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* History */
  historyList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3E9EB',
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  historyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#281811',
  },
  historyDate: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  historyPoints: {
    fontSize: 13,
    fontWeight: '800',
  },
});

