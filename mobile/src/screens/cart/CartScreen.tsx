import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useCartStore, CartItem } from '../../store/useCartStore';

export default function CartScreen({ navigation }: any) {
  const {
    items,
    updateQuantity,
    removeItem,
    toggleSelect,
    toggleSelectAll,
    getTotalPrice,
    getSelectedCount,
  } = useCartStore();

  const isAllSelected = items.length > 0 && items.every((i) => i.selected);
  const totalPrice = getTotalPrice();
  const selectedCount = getSelectedCount();

  const handleConfirmDelete = (id: string, name: string) => {
    Alert.alert(
      'Xóa sản phẩm',
      `Bạn có chắc muốn xóa "${name}" khỏi giỏ hàng?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => removeItem(id) },
      ]
    );
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartCard}>
      {/* Checkbox chọn sản phẩm */}
      <TouchableOpacity
        onPress={() => toggleSelect(item.id)}
        style={styles.checkboxContainer}
      >
        <Ionicons
          name={item.selected ? 'checkbox' : 'square-outline'}
          size={22}
          color={item.selected ? theme.colors.primary : theme.colors.textMuted}
        />
      </TouchableOpacity>

      {/* Ảnh sản phẩm */}
      <Image source={{ uri: item.imageUrl }} style={styles.productImage} />

      {/* Thông tin chi tiết */}
      <View style={styles.itemInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.productName}
        </Text>
        <Text style={styles.variantName}>{item.variantName}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceText}>
            {item.price.toLocaleString('vi-VN')} đ
          </Text>
          {item.originalPrice && (
            <Text style={styles.originalPriceText}>
              {item.originalPrice.toLocaleString('vi-VN')} đ
            </Text>
          )}
        </View>

        {/* Bộ tăng/giảm số lượng */}
        <View style={styles.actionRow}>
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              onPress={() => updateQuantity(item.id, -1)}
              style={styles.stepperBtn}
            >
              <Ionicons name="remove" size={16} color={theme.colors.textDark} />
            </TouchableOpacity>

            <Text style={styles.quantityText}>{item.quantity}</Text>

            <TouchableOpacity
              onPress={() => updateQuantity(item.id, 1)}
              style={styles.stepperBtn}
            >
              <Ionicons name="add" size={16} color={theme.colors.textDark} />
            </TouchableOpacity>
          </View>

          {/* Nút xóa */}
          <TouchableOpacity
            onPress={() => handleConfirmDelete(item.id, item.productName)}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={20} color="#E53935" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Giỏ hàng ({items.length})</Text>
      </View>

      {items.length === 0 ? (
        /* Trạng thái giỏ hàng trống */
        <View style={styles.emptyContainer}>
          <Ionicons
            name="cart-outline"
            size={80}
            color={theme.colors.textMuted}
          />
          <Text style={styles.emptyTitle}>Giỏ hàng của bạn đang trống</Text>
          <Text style={styles.emptySubtitle}>
            Hãy khám phá các sản phẩm mỹ phẩm ưu đãi và thêm vào giỏ nhé!
          </Text>
          <TouchableOpacity
            style={styles.shopNowBtn}
            onPress={() => navigation?.navigate('HomeTab')}
          >
            <Text style={styles.shopNowText}>Tiếp tục mua sắm</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Chọn tất cả Bar */}
          <View style={styles.selectAllBar}>
            <TouchableOpacity
              onPress={toggleSelectAll}
              style={styles.selectAllBtn}
            >
              <Ionicons
                name={isAllSelected ? 'checkbox' : 'square-outline'}
                size={22}
                color={isAllSelected ? theme.colors.primary : theme.colors.textMuted}
              />
              <Text style={styles.selectAllText}>
                Chọn tất cả ({items.length} sản phẩm)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Danh sách sản phẩm */}
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderCartItem}
            contentContainerStyle={styles.listPadding}
            showsVerticalScrollIndicator={false}
          />

          {/* Thanh tổng tiền & Nút Checkout cố định bên dưới */}
          <View style={styles.footerBar}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>
                Tổng tạm tính ({selectedCount} món):
              </Text>
              <Text style={styles.totalValue}>
                {totalPrice.toLocaleString('vi-VN')} đ
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.checkoutBtn,
                selectedCount === 0 && styles.disabledBtn,
              ]}
              disabled={selectedCount === 0}
              onPress={() => navigation?.navigate('Checkout')}
            >
              <Text style={styles.checkoutText}>
                Thanh toán ({selectedCount})
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  selectAllBar: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.textDark,
    fontWeight: '500',
  },
  listPadding: {
    padding: 12,
    paddingBottom: 20,
  },
  cartCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  checkboxContainer: {
    justifyContent: 'center',
    marginRight: 8,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textDark,
    lineHeight: 18,
  },
  variantName: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
    marginRight: 6,
  },
  originalPriceText: {
    fontSize: 12,
    color: '#9E9E9E',
    textDecorationLine: 'line-through',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  stepperBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F5F5F5',
  },
  quantityText: {
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textDark,
  },
  deleteBtn: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textDark,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  shopNowBtn: {
    marginTop: 24,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  shopNowText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footerBar: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.primary,
    marginTop: 2,
  },
  checkoutBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginLeft: 12,
  },
  disabledBtn: {
    backgroundColor: '#BDBDBD',
  },
  checkoutText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
    marginRight: 6,
  },
});