import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = 'http://192.168.X.X:3000/api/v1'; // ⚠️ Nhớ đổi lại IP của bạn

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgot = async () => {
    if (!email) {
      Alert.alert('Lỗi', 'Vui lòng nhập email của bạn!');
      return;
    }
    setLoading(true);
    try {
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
      <TextInput 
        style={styles.input} 
        placeholder="Email đã đăng ký" 
        keyboardType="email-address" 
        autoCapitalize="none" 
        value={email} 
        onChangeText={setEmail} 
      />
      <TouchableOpacity style={[styles.button, loading && { backgroundColor: '#ff99cc' }]} onPress={handleForgot} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Gửi Mã Khôi Phục</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 36, fontWeight: 'bold', color: '#ff69b4', textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#eee', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16, backgroundColor: '#fafafa' },
  button: { backgroundColor: '#ff69b4', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});