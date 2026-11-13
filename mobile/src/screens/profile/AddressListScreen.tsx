import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { addressApi, AddressPayload } from '../../api/addressApi';

export interface AddressItem {
  id: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  district?: string;
  ward?: string;
  isDefault: boolean;
  label?: 'Nhà riêng' | 'Văn phòng';
}

export default function AddressListScreen({ navigation, route }: any) {
  const isSelectMode = route.params?.isSelectMode ?? false;

  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const res = await addressApi.getAddresses();
      const list = res?.data?.items || res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(list) && list.length > 0) {
        setAddresses(
          list.map((item: any) => ({
            id: item.id,
            recipientName: item.recipientName || item.fullName || 'Khách hàng',
            phone: item.phone || '',
            addressLine: item.addressLine || item.address || '',
            city: item.city || '',
            district: item.district || '',
            ward: item.ward || '',
            isDefault: !!item.isDefault,
            label: item.label || 'Nhà riêng',
          }))
        );
      } else {
        setAddresses([]);
      }
    } catch {
      // Giữ danh sách ban đầu nếu BE rớt mạng
      setAddresses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAddresses();
  };

  const handleSetDefault = async (id: string) => {
    try {
      await addressApi.setDefaultAddress(id);
      setAddresses((prev) =>
        prev.map((item) => ({
          ...item,
          isDefault: item.id === id,
        }))
      );
      Alert.alert('Thành công', 'Đã cập nhật địa chỉ mặc định');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể cập nhật địa chỉ mặc định.');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa địa chỉ nhận hàng này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await addressApi.deleteAddress(id);
            setAddresses((prev) => prev.filter((item) => item.id !== id));
          } catch (err: any) {
            Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể xóa địa chỉ.');
          }
        },
      },
    ]);
  };

  const handleSelectAddress = (addr: AddressItem) => {
    if (isSelectMode && route.params?.onSelectAddress) {
      route.params.onSelectAddress(addr);
      navigation.goBack();
    }
  };

  const renderAddressCard = ({ item }: { item: AddressItem }) => {
    return (
      <TouchableOpacity
        style={[styles.card, item.isDefault && styles.cardDefault]}
        activeOpacity={isSelectMode ? 0.7 : 1}
        onPress={() => handleSelectAddress(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.nameRow}>
            <Text style={styles.recipientName}>{item.recipientName}</Text>
            {item.label && (
              <View style={styles.labelBadge}>
                <Text style={styles.labelText}>{item.label}</Text>
              </View>
            )}
          </View>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.defaultBadgeText}>Mặc định</Text>
            </View>
          )}
        </View>

        <Text style={styles.phoneText}>
          <Ionicons name="call-outline" size={14} color={COLORS.textMuted} /> {item.phone}
        </Text>

        <Text style={styles.addressText}>
          <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />{' '}
          {item.addressLine}
          {item.district ? `, ${item.district}` : ''}
          {item.city ? `, ${item.city}` : ''}
        </Text>

        <View style={styles.cardActions}>
          {!item.isDefault && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleSetDefault(item.id)}
            >
              <Text style={styles.actionBtnText}>Đặt mặc định</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              navigation.navigate('AddEditAddress', {
                address: item,
                onSuccess: loadAddresses,
              })
            }
          >
            <Ionicons name="create-outline" size={16} color={COLORS.textBody} />
            <Text style={[styles.actionBtnText, { marginLeft: 4 }]}>Sửa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { marginLeft: 8 }]}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
            <Text style={[styles.actionBtnText, { color: COLORS.error, marginLeft: 4 }]}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSelectMode ? 'Chọn Địa Chỉ Nhận Hàng' : 'Sổ Địa Chỉ'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Danh sách địa chỉ */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          renderItem={renderAddressCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Chưa có địa chỉ nào</Text>
              <Text style={styles.emptySubtitle}>
                Thêm địa chỉ giao hàng để đặt hàng nhanh chóng hơn.
              </Text>
            </View>
          }
        />
      )}

      {/* Nút Thêm địa chỉ mới cố định */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() =>
            navigation.navigate('AddEditAddress', {
              onSuccess: loadAddresses,
            })
          }
        >
          <Ionicons name="add" size={20} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.addBtnText}>Thêm Địa Chỉ Mới</Text>
        </TouchableOpacity>
      </View>
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
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardDefault: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginRight: 8,
  },
  labelBadge: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  phoneText: {
    fontSize: 13,
    color: COLORS.textBody,
    marginBottom: 6,
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textDark,
    marginBottom: 14,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSubtle,
    marginLeft: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
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
