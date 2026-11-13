import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

interface NotificationItem {
  id: string;
  type: 'order' | 'promo' | 'system';
  title: string;
  category: string;
  time: string;
  content: string;
  isUnread: boolean;
  orderCode?: string;
  promoCode?: string;
  ctaText?: string;
  actionScreen?: string;
  badge?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'order',
    title: 'HỎA TỐC SILK-DROP ĐANG GIAO',
    category: 'VẬN CHUYỂN REALTIME',
    time: '14:25 Hôm nay',
    content:
      'Đơn hàng #GU-89421 đã được shipper Nguyễn Văn Tài tiếp nhận và đang trên tuyến giao đến bạn trong vòng 25 phút tới.',
    isUnread: true,
    orderCode: 'GU-89421',
    ctaText: 'Theo dõi hành trình',
    actionScreen: 'Đơn hàng',
    badge: 'Đang đến',
  },
  {
    id: 'notif-2',
    type: 'promo',
    title: 'ĐỘC QUYỀN VIP DIAMOND: GIẢM 15%',
    category: 'ƯU ĐÃI RIÊNG BẠN',
    time: '10:00 Hôm nay',
    content:
      'Tặng riêng quý cô mã ROSEVIP15 giảm ngay 15% cho mọi dòng kem dưỡng & serum phục hồi chuyên sâu. Áp dụng trong 24 giờ.',
    isUnread: true,
    promoCode: 'ROSEVIP15',
    ctaText: 'Sao chép & Mua ngay',
    actionScreen: 'Cart',
  },
  {
    id: 'notif-3',
    type: 'order',
    title: 'GIAO HÀNG THÀNH CÔNG',
    category: 'ĐƠN HÀNG HOÀN TẤT',
    time: 'Hôm qua, 16:45',
    content:
      'Đơn hàng #GU-89104 gồm 02 sản phẩm đã được giao thành công. Bạn nhận được +150 GlowPoints và quà tặng bông tẩy trang.',
    isUnread: false,
    orderCode: 'GU-89104',
    ctaText: 'Đánh giá nhận +50 Xu',
    actionScreen: 'Đơn hàng',
  },
  {
    id: 'notif-4',
    type: 'system',
    title: 'BẢO MẬT: THIẾT BỊ MỚI ĐĂNG NHẬP',
    category: 'AN TOÀN TÀI KHOẢN',
    time: '18/10/2026',
    content:
      'Tài khoản vừa kích hoạt đăng nhập FaceID thành công trên iPhone 15 Pro tại TP. Hồ Chí Minh.',
    isUnread: false,
    ctaText: 'Kiểm tra bảo mật',
    actionScreen: 'EditProfile',
  },
  {
    id: 'notif-5',
    type: 'order',
    title: 'XÁC NHẬN ĐÓNG GÓI CHUẨN XUẤT KHẨU',
    category: 'KHO GLOWUP FULFILLMENT',
    time: '17/10/2026',
    content:
      'Đơn hàng #GU-88992 đã được kiểm định chất lượng, đóng gói 3 lớp bóng khí kháng sốc và chuyển sang đối tác vận chuyển an toàn.',
    isUnread: false,
    orderCode: 'GU-88992',
  },
];

export default function NotificationCenterScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'all' | 'order' | 'promo' | 'system'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isUnread: false })));
  };

  const handleNotificationPress = (item: NotificationItem) => {
    // Đánh dấu đã đọc
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isUnread: false } : n))
    );

    if (item.actionScreen) {
      if (item.promoCode) {
        Alert.alert(
          'Đã sao chép mã ưu đãi! ✨',
          `Mã ${item.promoCode} đã được lưu vào bộ nhớ tạm. Hãy áp dụng ngay khi thanh toán nhé!`
        );
      }
      navigation.navigate(item.actionScreen);
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'all') return true;
    return item.type === activeTab;
  });

  const getIconForType = (type: NotificationItem['type']) => {
    switch (type) {
      case 'order':
        return <Feather name="truck" size={18} color={theme.colors.primary} />;
      case 'promo':
        return <Ionicons name="gift-outline" size={20} color="#D97706" />;
      case 'system':
        return <Feather name="shield" size={18} color={theme.colors.tertiary} />;
    }
  };

  const getIconBg = (type: NotificationItem['type']) => {
    switch (type) {
      case 'order':
        return '#FAF0F2';
      case 'promo':
        return '#FEF3C7';
      case 'system':
        return '#EEF2FF';
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
        <Text style={styles.headerTitle}>Trung tâm Thông báo</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markReadBtn}>
            <Ionicons name="checkmark-done" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {/* Tabs Filter */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'order', label: 'Đơn hàng' },
            { key: 'promo', label: 'Ưu đãi & Quà' },
            { key: 'system', label: 'Hệ thống' },
          ].map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, isSelected && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.key as any)}
              >
                <Text style={[styles.tabButtonText, isSelected && styles.tabButtonTextActive]}>
                  {tab.label}
                </Text>
                {tab.key === 'all' && unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notification List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={56} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
            <Text style={styles.emptySub}>
              Các cập nhật mới nhất về đơn hàng, ưu đãi và hệ thống sẽ xuất hiện tại đây.
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              style={[
                styles.notifCard,
                notif.isUnread && styles.notifCardUnread,
              ]}
              activeOpacity={0.88}
              onPress={() => handleNotificationPress(notif)}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: getIconBg(notif.type) }]}>
                  {getIconForType(notif.type)}
                </View>

                <View style={styles.cardMeta}>
                  <View style={styles.metaTop}>
                    <Text style={styles.categoryText}>{notif.category}</Text>
                    <Text style={styles.timeText}>{notif.time}</Text>
                  </View>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                </View>

                {notif.isUnread && <View style={styles.unreadDot} />}
              </View>

              <Text style={styles.notifContent}>{notif.content}</Text>

              {notif.promoCode && (
                <View style={styles.promoBanner}>
                  <View>
                    <Text style={styles.promoLabel}>MÃ ƯU ĐÃI ĐỘC QUYỀN</Text>
                    <Text style={styles.promoCode}>{notif.promoCode}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyPromoBtn}
                    onPress={() => handleNotificationPress(notif)}
                  >
                    <Ionicons name="copy-outline" size={14} color="#FFF" />
                    <Text style={styles.copyPromoText}>Áp dụng ngay</Text>
                  </TouchableOpacity>
                </View>
              )}

              {notif.ctaText && !notif.promoCode && (
                <TouchableOpacity
                  style={styles.ctaRow}
                  onPress={() => handleNotificationPress(notif)}
                >
                  <Text style={styles.ctaText}>{notif.ctaText}</Text>
                  <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}

        {/* Editorial Highlight Banner */}
        <View style={styles.editorialCard}>
          <Image
            source={{
              uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBi787AYQ4KX1yEGWroFFbEo2z-qZImV0IHeMJev-pGXXfSHm2fbHysHERLD2cKRnMnzoEWbY1dDO5V-1A0Chi4J9_ibrQoOv9WOnUdZqLqvnmNrWeW2bRaSyUuBlrIm7fJrnvdJbpgyOLgk7HV1fTmY4xrNR1926n-oZ6CRWE8b_1S71AfoNrE8md9HLWll4y-4g98zo8Sep9p6xftNzpBQX0Hi8eUv1BOrVxujDnm-TSeL7dW7t-ekg',
            }}
            style={styles.editorialImage}
          />
          <View style={styles.editorialContent}>
            <Text style={styles.editorialBadge}>GỢI Ý RIÊNG BẠN</Text>
            <Text style={styles.editorialTitle} numberOfLines={1}>
              Quy trình phục hồi Glow Skin ban đêm
            </Text>
            <Text style={styles.editorialDesc} numberOfLines={2}>
              Khám phá 3 bước tái sinh hàng rào ẩm sau ngày dài tiếp xúc khói bụi.
            </Text>
            <TouchableOpacity
              style={styles.editorialLink}
              onPress={() => navigation.navigate('Catalog')}
            >
              <Text style={styles.editorialLinkText}>Khám phá ngay</Text>
              <Ionicons name="arrow-forward" size={13} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footerNote}>
          <MaterialIcons name="verified-user" size={18} color={theme.colors.textMuted} />
          <Text style={styles.footerNoteText}>
            Bạn đã xem toàn bộ thông báo trong 30 ngày gần nhất.
          </Text>
        </View>
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
  markReadBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#281811',
  },
  tabsContainer: {
    backgroundColor: '#FFF8F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3E9EB',
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabButtonText: {
    fontSize: 13,
    color: '#554244',
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 12,
  },
  notifCard: {
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
  notifCardUnread: {
    borderColor: '#F3DCE1',
    backgroundColor: '#FFFCFC',
    borderLeftWidth: 3.5,
    borderLeftColor: theme.colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: {
    flex: 1,
  },
  metaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#281811',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginTop: 4,
  },
  notifContent: {
    fontSize: 13,
    color: '#554244',
    lineHeight: 18,
  },
  promoBanner: {
    marginTop: 10,
    backgroundColor: '#FAF0F2',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F3DCE1',
  },
  promoLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  promoCode: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 1,
    marginTop: 2,
  },
  copyPromoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  copyPromoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#281811',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  editorialCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3E9EB',
    gap: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  editorialImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#FAF0F2',
  },
  editorialContent: {
    flex: 1,
  },
  editorialBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  editorialTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#281811',
    marginTop: 2,
  },
  editorialDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 15,
    marginTop: 2,
  },
  editorialLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  editorialLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    marginBottom: 24,
  },
  footerNoteText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
});

