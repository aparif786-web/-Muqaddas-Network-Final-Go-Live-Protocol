import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - will be handled by auth context
      console.log('Unauthorized request');
    }
    return Promise.reject(error);
  }
);

export default api;
