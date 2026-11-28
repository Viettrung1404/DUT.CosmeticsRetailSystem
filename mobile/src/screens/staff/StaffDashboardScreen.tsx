import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { staffFulfillmentApi } from '../../api/staffFulfillmentApi';
import { isStaffUser } from '../../utils/staffOperationsHelper';

export default function StaffDashboardScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>(
    user?.storeId || undefined
  );
  const [selectedStoreName, setSelectedStoreName] = useState<string>('Tất cả chi nhánh');
  const [pickingCount, setPickingCount] = useState<number>(0);
  const [handoverCount, setHandoverCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // RBAC Guard
  useEffect(() => {
    if (!isStaffUser(user)) {
      navigation.replace('StaffAccessDenied', {
        message: 'Tài khoản của bạn không có vai trò nhân viên hợp lệ để truy cập Staff Mode.',
      });
    }
  }, [user, navigation]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // 1. Tải danh sách cửa hàng
      try {
        const storeList = await staffFulfillmentApi.getStores();
        setStores(storeList);
        if (selectedStoreId) {
          const matched = storeList.find((s: any) => s.id === selectedStoreId);
          if (matched) setSelectedStoreName(matched.name);
        }
      } catch (e) {
        console.warn('Could not load stores list:', e);
      }

      // 2. Tải hàng đợi Picking
      try {
        const pickingRes = await staffFulfillmentApi.getPickingQueue({
          storeId: selectedStoreId,
          limit: 10,
        });
        setPickingCount(pickingRes.total || 0);
      } catch (err: any) {
        if (err?.response?.status === 403) {
          navigation.replace('StaffAccessDenied', {
            message: 'Backend từ chối quyền xem hàng đợi (403 Forbidden). Cần quyền ORDER_ONLINE_VIEW / FULFILLMENT_PICK.',
          });
          return;
        }
      }

      // 3. Tải hàng đợi Handover
      try {
        const handoverRes = await staffFulfillmentApi.getHandoverQueue({
          storeId: selectedStoreId,
          limit: 10,
        });
        setHandoverCount(handoverRes.total || 0);
      } catch (err: any) {
        if (err?.response?.status === 403) {
          navigation.replace('StaffAccessDenied', {
            message: 'Backend từ chối quyền xem hàng đợi bàn giao (403 Forbidden).',
          });
          return;
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStoreId, navigation]);

  useEffect(() => {
    if (isStaffUser(user)) {
      loadData();
    }
  }, [loadData, user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSelectStore = () => {
    if (!stores || stores.length === 0) {
      Alert.alert('Thông báo', 'Không có danh sách chi nhánh để lựa chọn.');
      return;
    }

    const options = [
      {
        text: 'Tất cả chi nhánh',
        onPress: () => {
          setSelectedStoreId(undefined);
          setSelectedStoreName('Tất cả chi nhánh');
        },
      },
      ...stores.map((s: any) => ({
        text: s.name,
        onPress: () => {
          setSelectedStoreId(s.id);
          setSelectedStoreName(s.name);
        },
      })),
      { text: 'Hủy', style: 'cancel' as const },
    ];

    Alert.alert('Chọn Chi Nhánh Vận Hành', 'Chọn cửa hàng / kho trực thuộc:', options);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <View>
            <Text style={styles.appTitle}>GlowUp Store Ops</Text>
            <Text style={styles.staffBadge}>
              {user?.roleName || user?.role || 'STORE_STAFF'} • {user?.full_name || user?.fullName || user?.email}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.storePickerBtn} onPress={handleSelectStore}>
          <Ionicons name="business-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.storePickerText} numberOfLines={1}>
            {selectedStoreName}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 2. Banner Thông tin Vận hành */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Bàn Làm Việc Nhân Viên</Text>
              <Text style={styles.bannerSubtitle}>
                Quét mã vạch chuẩn xác, đối chiếu số lô FEFO và tiếp nhận RMA theo quy trình chuẩn.
              </Text>
            </View>
            <View style={styles.bannerIconBadge}>
              <Ionicons name="scan-circle" size={44} color={theme.colors.primary} />
            </View>
          </View>

          {/* Quick Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{pickingCount}</Text>
              <Text style={styles.metricLabel}>Chờ nhặt hàng</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{handoverCount}</Text>
              <Text style={styles.metricLabel}>Chờ bàn giao</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricNumber, { color: '#059669' }]}>Sẵn sàng</Text>
              <Text style={styles.metricLabel}>Showroom RMA</Text>
            </View>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Đang đồng bộ dữ liệu hàng đợi...</Text>
          </View>
        ) : (
          <View style={styles.actionsSection}>
            <Text style={styles.sectionHeader}>NGHIỆP VỤ VẬN HÀNH CHÍNH</Text>

            {/* MB-05: Staff Mobile Picking Scanner */}
            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.88}
              onPress={() =>
                navigation.navigate('StaffPickingScanner', {
                  storeId: selectedStoreId,
                  storeName: selectedStoreName,
                })
              }
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="barcode-outline" size={28} color="#2563EB" />
              </View>
              <View style={styles.actionContent}>
                <View style={styles.actionHeaderRow}>
                  <Text style={styles.actionTitle}>1. Nhặt Hàng (Picking Scanner)</Text>
                  {pickingCount > 0 && (
                    <View style={styles.badgeDanger}>
                      <Text style={styles.badgeDangerText}>{pickingCount} đơn</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.actionDesc}>
                  Quét barcode sản phẩm, đối chiếu lô FEFO chỉ định từ Backend, kiểm tra tiến độ 100%.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* MB-06: Staff Mobile Handover Scanner */}
            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.88}
              onPress={() =>
                navigation.navigate('StaffHandoverScanner', {
                  storeId: selectedStoreId,
                  storeName: selectedStoreName,
                })
              }
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="cube-outline" size={28} color="#16A34A" />
              </View>
              <View style={styles.actionContent}>
                <View style={styles.actionHeaderRow}>
                  <Text style={styles.actionTitle}>2. Bàn Giao Kiện (Handover)</Text>
                  {handoverCount > 0 && (
                    <View style={styles.badgeWarning}>
                      <Text style={styles.badgeWarningText}>{handoverCount} kiện</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.actionDesc}>
                  Quét mã vận đơn carton, đối chiếu Ahamove/GHN, xác nhận bàn giao cho tài xế 3PL.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* MB-07: Staff Store Drop-off Receipt Scanner */}
            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.88}
              onPress={() =>
                navigation.navigate('StaffDropoffReceipt', {
                  storeId: selectedStoreId,
                  storeName: selectedStoreName,
                })
              }
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="qr-code-outline" size={28} color="#D97706" />
              </View>
              <View style={styles.actionContent}>
                <View style={styles.actionHeaderRow}>
                  <Text style={styles.actionTitle}>3. Tiếp Nhận RMA Tại Quầy</Text>
                  <View style={styles.badgeSuccess}>
                    <Text style={styles.badgeSuccessText}>Showroom</Text>
                  </View>
                </View>
                <Text style={styles.actionDesc}>
                  Quét QR RMA của khách, kiểm tra showroom tiếp nhận, chụp ảnh kiện và nhập kho QUARANTINED.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  appTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  staffBadge: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  storePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    maxWidth: 160,
  },
  storePickerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginHorizontal: 4,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  bannerIconBadge: {
    marginLeft: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 12,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 10,
  },
  actionsSection: {
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
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
  actionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionContent: {
    flex: 1,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  actionDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
  },
  badgeDanger: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeDangerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeWarningText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  badgeSuccess: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
});
