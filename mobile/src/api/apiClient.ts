import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ⚠️ Nếu quét QR chạy Điện thoại thật qua Wi-Fi: Thay IP máy tính của bạn (VD: 'http://192.168.1.15:5000/api/v1')
export const BASE_URL = 'http://192.168.1.18/api/v1';

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});

// Tự động gắn Token vào Header khi gọi bất kỳ API nào
apiClient.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default apiClient;