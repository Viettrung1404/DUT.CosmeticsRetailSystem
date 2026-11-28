import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import apiClient from '../../api/apiClient';

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

interface FaqGroup {
  category: string;
  items: FaqItem[];
}

export default function HelpCenterScreen({ navigation }: any) {
  const [faqGroups, setFaqGroups] = useState<FaqGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchFaqs = useCallback(async () => {
    try {
      const res = await apiClient.get('/faqs');
      const groups = res.data?.data || res.data || [];
      const cleanedGroups: FaqGroup[] = groups.map((g: any) => ({
        category: g.category,
        items: (g.items || []).map((it: any) => ({
          id: it.id,
          category: g.category,
          question: it.question,
          answer: (it.answer || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim(),
        })),
      }));
      setFaqGroups(cleanedGroups);
      // Mặc định mở câu hỏi đầu tiên nếu có
      if (cleanedGroups.length > 0 && cleanedGroups[0].items.length > 0) {
        setExpandedId(cleanedGroups[0].items[0].id);
      }
    } catch (err: any) {
      console.warn('Failed to load FAQs', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFaqs();
  };

  const categories = ['Tất cả', ...faqGroups.map((g) => g.category)];

  // Lọc items theo category được chọn
  const filteredItems: FaqItem[] = faqGroups
    .filter((g) => selectedCategory === 'Tất cả' || g.category === selectedCategory)
    .flatMap((g) => g.items);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCall = () => {
    Linking.openURL('tel:19008899').catch(() => {
      Alert.alert('Hotline CSKH', '1900 8899 (Hỗ trợ 24/7)');
    });
  };

  const handleEmail = () => {
    Linking.openURL('mailto:cskh@glowup.vn').catch(() => {
      Alert.alert('Email CSKH', 'cskh@glowup.vn');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trung Tâm Trợ Giúp</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Banner hỗ trợ */}
        <View style={styles.banner}>
          <Ionicons name="headset" size={32} color={COLORS.primary} />
          <Text style={styles.bannerTitle}>GlowUp Sẵn Sàng Hỗ Trợ Bạn</Text>
          <Text style={styles.bannerSubtitle}>
            Chúng tôi luôn lắng nghe và đồng hành cùng làn da của bạn 24/7
          </Text>
        </View>

        {/* Thẻ liên hệ nhanh */}
        <Text style={styles.sectionTitle}>KÊNH HỖ TRỢ TRỰC TIẾP</Text>
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactCard} onPress={handleCall}>
            <View style={[styles.contactIconCircle, { backgroundColor: COLORS.primarySurface }]}>
              <Ionicons name="call" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.contactCardTitle}>Tổng đài 24/7</Text>
            <Text style={styles.contactCardSub}>1900 8899</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={handleEmail}>
            <View style={[styles.contactIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="mail" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.contactCardTitle}>Email CSKH</Text>
            <Text style={styles.contactCardSub}>cskh@glowup.vn</Text>
          </TouchableOpacity>
        </View>

        {/* Danh mục câu hỏi */}
        <Text style={styles.sectionTitle}>CHỦ ĐỀ HỖ TRỢ</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat && styles.categoryChipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Câu hỏi thường gặp FAQ */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>CÂU HỎI THƯỜNG GẶP (FAQ)</Text>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang tải câu hỏi thường gặp...</Text>
          </View>
        ) : (
          <View style={styles.faqList}>
            {filteredItems.map((faq) => {
              const isExpanded = expandedId === faq.id;
              return (
                <View key={faq.id} style={styles.faqCard}>
                  <TouchableOpacity
                    style={styles.faqHeader}
                    activeOpacity={0.8}
                    onPress={() => toggleExpand(faq.id)}
                  >
                    <View style={styles.questionContainer}>
                      <View style={styles.faqBadge}>
                        <Text style={styles.faqBadgeText}>{faq.category}</Text>
                      </View>
                      <Text style={styles.questionText}>{faq.question}</Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.answerContainer}>
                      <Text style={styles.answerText}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Cam kết thương hiệu */}
        <View style={styles.policyCard}>
          <View style={styles.policyHeader}>
            <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
            <Text style={styles.policyTitle}>Cam Kết Đổi Trả & Bảo Hành Da</Text>
          </View>
          <Text style={styles.policyContent}>
            Mọi sản phẩm mua tại hệ thống GlowUp Cosmetics đều được kiểm định chất lượng và hỗ trợ đổi trả linh hoạt tại bất kỳ showroom nào trên toàn quốc.
          </Text>
        </View>
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
  banner: {
    backgroundColor: COLORS.primarySurface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FCE7EB',
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 10,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: COLORS.textBody,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  contactCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  contactIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  contactCardSub: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  faqList: {
    marginBottom: 24,
  },
  faqCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  questionContainer: {
    flex: 1,
    paddingRight: 10,
  },
  faqBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  faqBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    lineHeight: 20,
  },
  answerContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  answerText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textBody,
  },
  policyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  policyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginLeft: 8,
  },
  policyContent: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textBody,
  },
  categoriesRow: {
    paddingBottom: 4,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primarySurface,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  categoryChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textMuted,
  },
});

