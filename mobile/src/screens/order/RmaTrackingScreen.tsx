import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

export default function RmaTrackingScreen({ route, navigation }: any) {
  const { rmaId = 'RMA-GU-89241' } = route.params || {};

  const [activeStep] = useState(2); // 0: Đã tạo, 1: Đã duyệt, 2: Đang thu hồi hàng, 3: Đã hoàn tiền

  const timeline = [
    {
      step: 0,
      title: 'Đã gửi yêu cầu đổi trả',
      time: '14:20 • Hôm nay',
      desc: 'Hệ thống đã ghi nhận yêu cầu hoàn trả sản phẩm cho đơn hàng #GU-89241.',
      done: true,
    },
    {
      step: 1,
      title: 'GlowUp Care đã phê duyệt hồ sơ',
      time: '14:45 • Hôm nay',
      desc: 'Chuyên viên kiểm định hình ảnh hợp lệ, áp dụng chính sách bảo hành da 100%.',
      done: true,
    },
    {
      step: 2,
      title: 'Tài xế đang đến thu hồi hàng tận nơi',
      time: '15:10 • Đang diễn ra',
      desc: 'Shipper Nguyễn Văn Tài (0905 ••• 882) đang trên đường tới thu hồi sản phẩm.',
      done: true,
      current: true,
    },
    {
      step: 3,
      title: 'Kiểm định kho & Hoàn tiền',
      time: 'Dự kiến trong ngày mai',
      desc: 'Hoàn tiền sẽ được xử lý theo chính sách hiện hành (minh họa).',
      done: false,
    },
  ];

  const handleCallShipper = () => {
    Linking.openURL('tel:0905888882').catch(() => {
      Alert.alert('Gọi tài xế', 'Đang kết nối tới số điện thoại 0905 888 882');
    });
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
          <Text style={styles.headerTitle}>Tiến trình Đổi trả RMA</Text>
          <Text style={styles.headerSubtitle}>Mã RMA: #{rmaId}</Text>
        </View>
        <TouchableOpacity
          style={styles.headActionBtn}
          onPress={() => navigation.navigate('Đơn hàng')}
        >
          <Ionicons name="receipt-outline" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Card Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.statusBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.statusBadgeText}>ĐANG THU HỒI HÀNG</Text>
            </View>
            <Text style={styles.estimatedTimeText}>Dự kiến hoàn tất trong 24H</Text>
          </View>

          <Text style={styles.heroTitle}>Shipper đang đến thu hồi hàng</Text>
          <Text style={styles.heroDesc}>
            Vui lòng đóng gói sản phẩm kèm hộp hoặc túi giấy ban đầu. Bạn không cần thanh toán bất kỳ chi phí nào.{'\n'}
            <Text style={styles.heroDisclaimer}>(Thông tin shipper bên dưới là minh họa)</Text>
          </Text>

          {/* Shipper Contact Box */}
          <View style={styles.shipperCard}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFoJz9_e_s-F6Qp7q_U-y5g3RjK4o0LzYd5z3aX7wV5t3v1L7s_9m4q_WAoKCYLRFBkJ4vw',
              }}
              style={styles.shipperAvatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.shipperRole}>Tài xế thu hồi GlowUp Express</Text>
              <Text style={styles.shipperName}>Nguyễn Văn Tài</Text>
              <Text style={styles.shipperPlate}>Biển số: 43-C1 • 882.19</Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={handleCallShipper}>
              <Ionicons name="call" size={16} color="#FFF" />
              <Text style={styles.callText}>Gọi</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Timeline Stepper */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Các bước xử lý yêu cầu</Text>

          <View style={styles.timelineContainer}>
            {timeline.map((item, index) => {
              const isLast = index === timeline.length - 1;
              return (
                <View key={index} style={styles.timelineRow}>
                  {/* Left Column: Icon & Line */}
                  <View style={styles.timelineIndicatorCol}>
                    <View
                      style={[
                        styles.timelineDot,
                        item.done && styles.timelineDotDone,
                        item.current && styles.timelineDotCurrent,
                      ]}
                    >
                      {item.done ? (
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                      ) : (
                        <View style={styles.innerDot} />
                      )}
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineLine,
                          item.done && styles.timelineLineDone,
                        ]}
                      />
                    )}
                  </View>

                  {/* Right Column: Content */}
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineHeaderRow}>
                      <Text
                        style={[
                          styles.timelineStepTitle,
                          item.current && styles.timelineStepTitleActive,
                        ]}
                      >
                        {item.title}
                      </Text>
                    </View>
                    <Text style={styles.timelineTime}>{item.time}</Text>
                    <Text style={styles.timelineDesc}>{item.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Sản phẩm thu hồi */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Sản phẩm thu hồi & Hoàn tiền</Text>
          <View style={styles.productRow}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPXszzaZJ-CKUqKGl1J4deKZphZWEeI5wLZcRF4oEpOzXUO9ILg594tMOGfQ7aDAnD95tHnThxQrBtzkasEPGicqQ1T7NExYkLEEnizjxYjw7DGhSJlCXq1vuTPjO9ypCl0NS-S1IpwTFIxWBzMPYyKUoBL_brngE8FpEkY-UBKyrw1En0aY17KO3r3ggQqtFpdaM8_nf_Fh4rkRtTc8DxrF0NWl13rvId3Y6KNw4IfnB9rLDDho7jaA',
              }}
              style={styles.productImg}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.productBrand}>GLOWUP LAB</Text>
              <Text style={styles.productName} numberOfLines={2}>
                Serum Rose Berry B5 Phục Hồi Hàng Rào Ẩm 50ml
              </Text>
              <Text style={styles.productVariant}>Dung tích: 50ml • Số lượng: x1</Text>
              <View style={styles.priceRow}>
                <Text style={styles.productPrice}>345.000₫</Text>
                <View style={styles.refundTag}>
                  <Text style={styles.refundTagText}>Hoàn tiền (minh họa)</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Trợ giúp nhanh */}
        <View style={styles.helpCard}>
          <MaterialIcons name="support-agent" size={24} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.helpTitle}>Cần hỗ trợ về yêu cầu RMA?</Text>
            <Text style={styles.helpDesc}>
              Bộ phận Chăm sóc khách hàng VIP luôn túc trực hỗ trợ 24/7.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.chatSupportBtn}
            onPress={() => Alert.alert('Tư vấn', 'Đang kết nối khung chat với chuyên viên GlowUp Care...')}
          >
            <Text style={styles.chatSupportText}>Chat ngay</Text>
          </TouchableOpacity>
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
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3E9EB',
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF0F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  estimatedTimeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#281811',
    marginBottom: 4,
  },
  heroDesc: {
    fontSize: 12,
    color: '#725950',
    lineHeight: 17,
    marginBottom: 14,
  },
  shipperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEFAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  shipperAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
  },
  shipperRole: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  shipperName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#281811',
    marginTop: 1,
  },
  shipperPlate: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  callText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3E9EB',
    shadowColor: '#C85A70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#281811',
    marginBottom: 14,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 65,
  },
  timelineIndicatorCol: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EFE5E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: theme.colors.primary,
  },
  timelineDotCurrent: {
    borderWidth: 3,
    borderColor: '#FFD9DD',
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.textMuted,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#EFE5E7',
    marginVertical: 4,
  },
  timelineLineDone: {
    backgroundColor: theme.colors.primaryFixedDim,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 14,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineStepTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#554244',
  },
  timelineStepTitleActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  timelineTime: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  timelineDesc: {
    fontSize: 11,
    color: '#725950',
    lineHeight: 15,
    marginTop: 2,
  },
  productRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#FEFAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFE5E7',
  },
  productImg: {
    width: 64,
    height: 64,
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  refundTag: {
    backgroundColor: '#FAD9CD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  refundTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primaryDeep,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAF0F2',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3DCE1',
  },
  helpTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#281811',
  },
  helpDesc: {
    fontSize: 11,
    color: '#725950',
    marginTop: 1,
  },
  chatSupportBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  chatSupportText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  heroDisclaimer: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
});

