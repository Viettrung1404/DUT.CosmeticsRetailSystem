import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ⚠️ Thay IP máy tính của bạn khi đổi mạng Wi-Fi (Kiểm tra bằng lệnh ipconfig)
export const BASE_URL = 'http://10.10.16.117:3000/api/v1';

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