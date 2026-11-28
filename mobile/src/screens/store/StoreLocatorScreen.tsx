import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import apiClient from '../../api/apiClient';
import {
  StoreItem,
  filterStores,
  formatGoogleMapsUrl,
  formatTelUrl,
} from '../../utils/storeHelper';

const DEFAULT_STORE_IMAGES = [
  'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=500',
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500',
  'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500',
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=500',
];

export default function StoreLocatorScreen({ navigation }: any) {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Tất cả');

  const fetchStores = useCallback(async () => {
    try {
      const res = await apiClient.get('/stores');
      const rawList = res.data?.data || res.data || [];
      const mapped: StoreItem[] = rawList.map((s: any, idx: number) => {
        let openingHours = '08:00 – 22:00 (Hàng ngày)';
        if (typeof s.openingHours === 'string') {
          openingHours = s.openingHours;
        } else if (s.openingHours?.mon_sun) {
          openingHours = `${s.openingHours.mon_sun} (Hàng ngày)`;
        }
        return {
          id: s.id,
          name: s.name,
          address: s.address,
          city: s.city || 'Việt Nam',
          district: s.district,
          phone: s.phone || '1900 8899',
          openingHours,
          lat: s.latitude,
          lng: s.longitude,
          imageUrl: s.imageUrl || DEFAULT_STORE_IMAGES[idx % DEFAULT_STORE_IMAGES.length],
        };
      });
      setStores(mapped);
    } catch (err: any) {
      console.warn('Failed to load stores from API', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStores();
  };

  // Trích xuất danh sách thành phố duy nhất
  const cityChips = ['Tất cả', ...Array.from(new Set(stores.map((s) => s.city).filter(Boolean)))];

  // Lọc theo thành phố trước, sau đó tìm theo từ khóa
  const displayedStores = filterStores(
    stores.filter((s) =>
      selectedCity === 'Tất cả' ? true : s.city === selectedCity
    ),
    searchQuery
  );

  const handleCall = (phone: string) => {
    const url = formatTelUrl(phone);
    Linking.openURL(url).catch(() => {
      Alert.alert('Không thể thực hiện', `Vui lòng quay số ${phone} thủ công.`);
    });
  };

  const handleOpenMaps = (store: StoreItem) => {
    if (store.lat && store.lng) {
      const url = formatGoogleMapsUrl(store.lat, store.lng, store.name);
      Linking.openURL(url).catch(() => {
        Alert.alert('Không thể mở bản đồ', store.address);
      });
    } else {
      Alert.alert('Địa chỉ showroom', store.address);
    }
  };

  const renderStoreCard = ({ item }: { item: StoreItem }) => {
    return (
      <View style={styles.card}>
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.cardImage}
          resizeMode="cover"
        />

        <View style={styles.cardBody}>
          <Text style={styles.storeName}>{item.name}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.primary} style={styles.icon} />
            <Text style={styles.infoText}>{item.address}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.textMuted} style={styles.icon} />
            <Text style={styles.infoText}>{item.openingHours}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color={COLORS.textMuted} style={styles.icon} />
            <Text style={styles.infoText}>{item.phone}</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => handleCall(item.phone)}
            >
              <Ionicons name="call" size={16} color={COLORS.primary} />
              <Text style={styles.callBtnText}>Gọi Hotline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mapsBtn}
              onPress={() => handleOpenMaps(item)}
            >
              <Ionicons name="navigate-outline" size={16} color="#FFF" />
              <Text style={styles.mapsBtnText}>Chỉ Đường</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hệ Thống Showroom</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Thanh tìm kiếm */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên chi nhánh, quận hoặc đường..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Chip chọn Tỉnh / Thành phố */}
      <View style={styles.chipsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={cityChips}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.cityChip,
                selectedCity === item && styles.cityChipActive,
              ]}
              onPress={() => setSelectedCity(item)}
            >
              <Text
                style={[
                  styles.cityChipText,
                  selectedCity === item && styles.cityChipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      </View>

      {/* Danh sách showroom */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách showroom...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedStores}
          keyExtractor={(item) => item.id}
          renderItem={renderStoreCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Không tìm thấy showroom</Text>
              <Text style={styles.emptySubtitle}>
                Hãy thử tìm kiếm với từ khóa khác hoặc chọn thành phố khác.
              </Text>
            </View>
          }
        />
      )}
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
  searchBarContainer: {
    padding: 16,
    backgroundColor: COLORS.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.textDark,
  },
  chipsContainer: {
    backgroundColor: COLORS.surface,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSubtle,
    marginRight: 8,
  },
  cityChipActive: {
    backgroundColor: COLORS.primary,
  },
  cityChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  cityChipTextActive: {
    color: '#FFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: 150,
  },
  cardBody: {
    padding: 16,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    width: 20,
    marginRight: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textBody,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primarySurface,
    marginRight: 8,
  },
  callBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 6,
  },
  mapsBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  mapsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 30,
  },
});

