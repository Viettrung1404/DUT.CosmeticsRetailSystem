import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

// Import các màn hình chính
import HomeScreen from '../screens/home/HomeScreen';
import CatalogScreen from '../screens/product/CatalogScreen';
import CartScreen from '../screens/cart/CartScreen';
import OrderScreen from '../screens/order/OrderScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textMuted,
                tabBarStyle: {
                    backgroundColor: COLORS.surface,
                    borderTopColor: COLORS.border,
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarIcon: ({ color, size, focused }) => {
                    let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';

                    if (route.name === 'Trang chủ') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Danh mục') {
                        iconName = focused ? 'grid' : 'grid-outline';
                    } else if (route.name === 'Giỏ hàng') {
                        iconName = focused ? 'bag' : 'bag-outline';
                    } else if (route.name === 'Đơn hàng') {
                        iconName = focused ? 'receipt' : 'receipt-outline';
                    } else if (route.name === 'Cá nhân') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Trang chủ" component={HomeScreen} />
            <Tab.Screen name="Danh mục" component={CatalogScreen} />
            <Tab.Screen
                name="Giỏ hàng"
                component={CartScreen}
                options={{
                    tabBarBadge: 3,
                    tabBarBadgeStyle: { backgroundColor: COLORS.primary, color: '#FFF', fontSize: 10 }
                }}
            />
            <Tab.Screen name="Đơn hàng" component={OrderScreen} />
            <Tab.Screen name="Cá nhân" component={ProfileScreen} />
        </Tab.Navigator>
    );
}