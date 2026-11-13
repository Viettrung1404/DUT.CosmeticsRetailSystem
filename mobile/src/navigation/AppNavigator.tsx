import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import ProductDetailScreen from '../screens/product/ProductDetailScreen';
import SearchScreen from '../screens/search/SearchScreen';
import CheckoutScreen from '../screens/cart/CheckoutScreen';
import OrderSuccessScreen from '../screens/cart/OrderSuccessScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';
import NotificationCenterScreen from '../screens/profile/NotificationCenterScreen';
import WishlistScreen from '../screens/profile/WishlistScreen';
import RmaRequestScreen from '../screens/order/RmaRequestScreen';
import RmaTrackingScreen from '../screens/order/RmaTrackingScreen';
import ShipmentTrackingScreen from '../screens/order/ShipmentTrackingScreen';
import LoyaltyScreen from '../screens/profile/LoyaltyScreen';

// Các màn hình mới bổ sung theo chuẩn thiết kế GlowUp
import AddressListScreen from '../screens/profile/AddressListScreen';
import AddEditAddressScreen from '../screens/profile/AddEditAddressScreen';
import StoreLocatorScreen from '../screens/store/StoreLocatorScreen';
import HelpCenterScreen from '../screens/profile/HelpCenterScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

import { COLORS } from '../constants/theme';

const Stack = createNativeStackNavigator();

const linking: any = {
  prefixes: ['http://localhost:8081', 'glowup://'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          'Trang chủ': '',
          'Danh mục': 'catalog',
          'Giỏ hàng': 'cart',
          'Đơn hàng': 'orders',
          'Cá nhân': 'profile',
        },
      },
      ProductDetail: 'product/:slug',
      Search: 'search',
      StoreLocator: 'stores',
      Checkout: 'checkout',
      Wishlist: 'wishlist',
      AddressList: 'addresses',
      Loyalty: 'loyalty',
    },
  },
};

export default function AppNavigator() {
  const { isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{ headerShown: false }}
      >
        {/* 1. Root Tab Navigation (Khách vãng lai và Thành viên đều duyệt được) */}
        <Stack.Screen name="MainTabs" component={MainTabs} />

        {/* 2. Mua sắm & Khám phá */}
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="StoreLocator" component={StoreLocatorScreen} />

        {/* 3. Giỏ hàng & Thanh toán */}
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} />

        {/* 4. Sổ địa chỉ */}
        <Stack.Screen name="AddressList" component={AddressListScreen} />
        <Stack.Screen name="AddEditAddress" component={AddEditAddressScreen} />

        {/* 5. Tài khoản & Khách hàng thân thiết */}
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
        <Stack.Screen name="Wishlist" component={WishlistScreen} />
        <Stack.Screen name="Loyalty" component={LoyaltyScreen} />
        <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />

        {/* 6. Đơn hàng & Hậu mãi */}
        <Stack.Screen name="RmaRequest" component={RmaRequestScreen} />
        <Stack.Screen name="RmaTracking" component={RmaTrackingScreen} />
        <Stack.Screen name="ShipmentTracking" component={ShipmentTrackingScreen} />

        {/* 7. Ngăn xếp Xác thực (Auth Stack & Screens) */}
        <Stack.Screen
          name="AuthStack"
          component={AuthStack}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
