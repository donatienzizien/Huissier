import axios from 'axios';
import { useAuthStore } from '../store/auth';

export const api = axios.create({
  baseURL: 'https://huissier-backend-ny5e.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const estRequeteLogin = originalRequest?.url?.includes('/auth/login');

    if (
      error.response?.status === 401 &&
      !estRequeteLogin &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        await new Promise<void>((resolve) => pendingQueue.push(resolve));
        return api(originalRequest);
      }

      isRefreshing = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) throw error;

        const { data } = await axios.post(
          'https://huissier-backend-ny5e.onrender.com/api/auth/refresh',
          { refreshToken },
        );
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);

        pendingQueue.forEach((resolve) => resolve());
        pendingQueue = [];

        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
