import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global 401 handler — auto-logout
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    // Network errors like refused connection have no response
    const message = error.response?.data?.error 
      || error.message 
      || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);
