import axios from 'axios';

// Use /api prefix to leverage Vite proxy in development
const baseURL = import.meta.env.NODE_ENV === 'development' ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:5000');

console.log('🔧 Axios Configuration Debug:', {
  NODE_ENV: import.meta.env.NODE_ENV,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  baseURL,
  isDevelopment: import.meta.env.NODE_ENV === 'development'
});

const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Authentication error:', error);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;