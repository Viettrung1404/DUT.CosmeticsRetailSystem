import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { create } from 'zustand';
import axios from 'axios';

// ⚠️ THAY IP NÀY BẰNG IPV4 CỦA MÁY TÍNH BẠN
const API_URL = 'http://192.168.11.174:3000/api/v1';

// --- QUẢN LÝ STATE ---
const useAuthStore = create((set) => ({
  isAuthenticated: false,
  isLoading: false,
  error: null,
  token: null,
  
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      // Gọi API Đăng nhập thật
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      
      // Tùy cấu trúc BE trả về (thường là response.data.access_token)
      const token = response.data.access_token || response.data.data?.access_token;
      
      set({ isAuthenticated: true, token: token, isLoading: false });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Email hoặc mật khẩu không chính xác!';
      set({ error: errorMsg, isLoading: false });
    }
  },
  
  logout: () => set({ isAuthenticated: false, token: null, error: null }),
}));

// --- MODULE AUTH ---

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuthStore();

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ Email và Mật khẩu');
      return;
    }
    login(email, password);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>GlowUp</Text>
      <Text style={styles.subtitle}>Hệ thống bán lẻ mỹ phẩm</Text>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <TextInput 
        style={styles.input} 
        placeholder="Email" 
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput 
        style={styles.input} 
        placeholder="Mật khẩu" 
        secureTextEntry={true}
        value={password}
        onChangeText={setPassword}
      />
      
      <TouchableOpacity style={[styles.button, isLoading && { backgroundColor: '#ff99cc' }]} onPress={handleLogin} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng Nhập</Text>}
      </TouchableOpacity>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }}>
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}><Text style={styles.linkText}>Quên mật khẩu?</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}><Text style={styles.linkText}>Đăng ký ngay</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const RegisterScreen = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !phone || !email || !password || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp!');
      return;
    }

    setLoading(true);
    try {
      // Gọi API Đăng ký thật
      await axios.post(`${API_URL}/auth/register`, { full_name: fullName, phone, email, password });
      
      Alert.alert('Thành công', 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Không thể tạo tài khoản lúc này.';
      Alert.alert('Lỗi', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 20 }}>
        <Ionicons name="arrow-back" size={28} color="black" />
      </TouchableOpacity>
      
      <Text style={styles.title}>Đăng Ký</Text>
      
      <TextInput style={styles.input} placeholder="Họ và tên" value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="Số điện thoại" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Mật khẩu" secureTextEntry={true} value={password} onChangeText={setPassword} />
      <TextInput style={styles.input} placeholder="Xác nhận mật khẩu" secureTextEntry={true} value={confirmPassword} onChangeText={setConfirmPassword} />
      
      <TouchableOpacity style={[styles.button, loading && { backgroundColor: '#ff99cc' }]} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Tạo Tài Khoản</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgot = async () => {
    if (!email) {
      Alert.alert('Lỗi', 'Vui lòng nhập email của bạn!'); return;
    }
    setLoading(true);
    try {
      // Gọi API Quên mật khẩu thật
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      Alert.alert('Kiểm tra Email', 'Đã gửi link khôi phục. Vui lòng kiểm tra hộp thư của bạn.', [
        { text: 'Quay lại Đăng nhập', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không tìm thấy tài khoản với email này.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 20 }}>
        <Ionicons name="arrow-back" size={28} color="black" />
      </TouchableOpacity>
      <Text style={styles.title}>Quên Mật Khẩu</Text>
      <TextInput style={styles.input} placeholder="Email đã đăng ký" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TouchableOpacity style={[styles.button, loading && { backgroundColor: '#ff99cc' }]} onPress={handleForgot} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Gửi Mã Khôi Phục</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// --- MODULE MUA HÀNG ---

const fallbackMockProducts = [
  { id: '1', name: '[MOCK] Son MAC Lipstick', price: 450000, image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400', description: 'Chưa có dữ liệu thật. Đây là dữ liệu mẫu.' },
  { id: '2', name: '[MOCK] Kem chống nắng Innisfree', price: 250000, image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400', description: 'Chưa có dữ liệu thật. Đây là dữ liệu mẫu.' },
];

const HomeScreen = ({ navigation }) => {
  const logout = useAuthStore((state) => state.logout);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Gọi API Lấy danh sách sản phẩm
        const res = await axios.get(`${API_URL}/customer/products`);
        const apiData = res.data.data || res.data; // Tùy cấu trúc BE trả về
        
        // Nếu DB rỗng, xài tạm Mock Data để báo cáo
        if (apiData && apiData.length > 0) {
          setProducts(apiData);
        } else {
          setProducts(fallbackMockProducts);
        }
      } catch (error) {
        console.log('API Error:', error);
        setProducts(fallbackMockProducts); // Lỗi mạng thì vẫn hiện Mock Data
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ProductDetail', { product: item })}>
      {/* Tùy thuộc vào việc BE đã làm chức năng up ảnh chưa, fallback về ảnh có sẵn */}
      <Image source={{ uri: item.image || item.image_url || fallbackMockProducts[0].image }} style={styles.productImage} />
      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.productPrice}>{formatPrice(item.price || item.base_price)}</Text>
      <View style={styles.buyButton}>
        <Text style={styles.buyButtonText}>Xem chi tiết</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sản phẩm mới</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#ff69b4" style={{ marginTop: 50 }} />
      ) : (
        <FlatList 
          data={products}
          keyExtractor={item => item.id?.toString()}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const ProductDetailScreen = ({ route, navigation }) => {
  const { product } = route.params;
  const [selectedVariant, setSelectedVariant] = useState('Mặc định');

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
          <Ionicons name="chevron-back" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>Chi tiết sản phẩm</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: product.image || product.image_url || fallbackMockProducts[0].image }} style={styles.detailImageBig} />
        <View style={styles.detailInfoContainer}>
          <Text style={styles.detailTitleText}>{product.name}</Text>
          <Text style={styles.detailPriceText}>{formatPrice(product.price || product.base_price)}</Text>
          <View style={styles.stockBadge}><Text style={styles.stockText}>Còn hàng</Text></View>

          <Text style={styles.sectionTitle}>Mô tả sản phẩm:</Text>
          <Text style={styles.detailDesc}>{product.description || 'Sản phẩm này chưa có mô tả chi tiết.'}</Text>
        </View>
      </ScrollView>

      <View style={styles.bottomCta}>
        <TouchableOpacity style={styles.ctaButton} onPress={() => Alert.alert('Thành công', 'Đã thêm sản phẩm vào giỏ hàng!')}>
          <Ionicons name="cart" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.ctaButtonText}>Thêm vào giỏ hàng</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const CartScreen = () => <View style={styles.container}><Text>Màn hình Giỏ hàng (Sprint 2)</Text></View>;
const ProfileScreen = () => <View style={styles.container}><Text>Màn hình Tài khoản (Sprint 2)</Text></View>;

// --- ĐIỀU HƯỚNG ---

const Tab = createBottomTabNavigator();
const MainTabs = () => (
  <Tab.Navigator screenOptions={({ route }) => ({
    headerShown: false,
    tabBarIcon: ({ color, size }) => {
      let iconName = route.name === 'Trang chủ' ? 'home' : route.name === 'Giỏ hàng' ? 'cart' : 'person';
      return <Ionicons name={iconName} size={size} color={color} />;
    },
    tabBarActiveTintColor: '#ff69b4',
    tabBarInactiveTintColor: 'gray',
  })}>
    <Tab.Screen name="Trang chủ" component={HomeScreen} />
    <Tab.Screen name="Giỏ hàng" component={CartScreen} />
    <Tab.Screen name="Tài khoản" component={ProfileScreen} />
  </Tab.Navigator>
);

const Stack = createNativeStackNavigator();
export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 36, fontWeight: 'bold', color: '#ff69b4', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  input: { borderWidth: 1, borderColor: '#eee', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16, backgroundColor: '#fafafa' },
  button: { backgroundColor: '#ff69b4', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  linkText: { color: '#ff69b4', fontWeight: '500' },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 15, fontWeight: '500' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 10, backgroundColor: '#fff' },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  logoutText: { color: 'red', fontWeight: 'bold' },
  
  card: { flex: 1, backgroundColor: '#fff', margin: 5, borderRadius: 12, padding: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  productImage: { width: '100%', height: 140, marginBottom: 10, borderRadius: 8 },
  productName: { fontSize: 14, fontWeight: '500', textAlign: 'center', marginBottom: 5, height: 40 },
  productPrice: { fontSize: 15, color: '#ff69b4', fontWeight: 'bold', marginBottom: 10 },
  buyButton: { backgroundColor: '#f0f0f0', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, width: '100%', alignItems: 'center' },
  buyButtonText: { color: '#333', fontSize: 13, fontWeight: '500' },

  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
  detailHeaderTitle: { fontSize: 18, fontWeight: 'bold' },
  detailImageBig: { width: '100%', height: 350, resizeMode: 'cover' },
  detailInfoContainer: { padding: 20, paddingBottom: 100 },
  detailTitleText: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  detailPriceText: { fontSize: 24, color: '#ff69b4', fontWeight: 'bold', marginBottom: 10 },
  stockBadge: { backgroundColor: '#e6ffe6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, alignSelf: 'flex-start', marginBottom: 20 },
  stockText: { color: 'green', fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  detailDesc: { fontSize: 15, color: '#555', lineHeight: 22 },

  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 15, borderTopWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 10 },
  ctaButton: { backgroundColor: '#ff69b4', flexDirection: 'row', padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  ctaButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});