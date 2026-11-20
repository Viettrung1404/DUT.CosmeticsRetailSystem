import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import { isStaffUser } from '../utils/staffOperationsHelper';

import StaffDashboardScreen from '../screens/staff/StaffDashboardScreen';
import StaffPickingScannerScreen from '../screens/staff/StaffPickingScannerScreen';
import StaffHandoverScannerScreen from '../screens/staff/StaffHandoverScannerScreen';
import StaffDropoffReceiptScreen from '../screens/staff/StaffDropoffReceiptScreen';
import StaffAccessDeniedScreen from '../screens/staff/StaffAccessDeniedScreen';

const Stack = createNativeStackNavigator();

export default function StaffNavigator() {
  const { user } = useAuthStore();
  const hasStaffAccess = isStaffUser(user);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {hasStaffAccess ? (
        <>
          <Stack.Screen name="StaffDashboard" component={StaffDashboardScreen} />
          <Stack.Screen name="StaffPickingScanner" component={StaffPickingScannerScreen} />
          <Stack.Screen name="StaffHandoverScanner" component={StaffHandoverScannerScreen} />
          <Stack.Screen name="StaffDropoffReceipt" component={StaffDropoffReceiptScreen} />
          <Stack.Screen name="StaffAccessDenied" component={StaffAccessDeniedScreen} />
        </>
      ) : (
        <Stack.Screen
          name="StaffAccessDenied"
          component={StaffAccessDeniedScreen}
          initialParams={{
            message:
              'Tài khoản hiện tại của bạn không có quyền nhân viên cửa hàng hoặc kho (STORE_STAFF, STORE_MGR, ADMIN). Truy cập bị từ chối.',
          }}
        />
      )}
    </Stack.Navigator>
  );
}
