import axios from 'axios';

const api = axios.create({
  // Thay đổi IP này thành địa chỉ IPv4 máy tính của bạn khi test trên điện thoại thật
  // Ví dụ: 'http://192.168.1.10:3000/api/v1'
  baseURL: 'http://localhost:3000/api/v1', 
  timeout: 10000,
});

// Interceptor dùng để tự động nhét Token vào header sau khi đăng nhập thành công
api.interceptors.request.use(
  async (config) => {
    // const token = await SecureStore.getItemAsync('token');
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;