import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

// MOCK STORE (Sẽ tách riêng sau, tạm để đây cho màn hình chạy được)
const API_URL = 'http://192.168.X.X:3000/api/v1'; // Nhớ sửa lại IP của bạn

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ Email và Mật khẩu');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      // ⚠️ Ghi chú: Chỗ này sau này sẽ chuyển vào Store, tạm thời gọi trực tiếp để test UI
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      Alert.alert('Thành công', 'Đăng nhập thành công (Đã có Token)!');
      // navigation.replace('MainTabs'); // Sẽ mở khóa khi có MainTabs
    } catch (err) {
      setError(err.response?.data?.message || 'Email hoặc mật khẩu không chính xác!');
    } finally {
      setIsLoading(false);
    }
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
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 36, fontWeight: 'bold', color: '#ff69b4', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  input: { borderWidth: 1, borderColor: '#eee', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16, backgroundColor: '#fafafa' },
  button: { backgroundColor: '#ff69b4', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  linkText: { color: '#ff69b4', fontWeight: '500' },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 15, fontWeight: '500' },
});