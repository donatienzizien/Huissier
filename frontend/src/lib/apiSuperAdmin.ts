import axios from 'axios';
import { useAuthSuperAdminStore } from '../store/authSuperAdmin';

export const apiSuperAdmin = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

apiSuperAdmin.interceptors.request.use((config) => {
  const token = useAuthSuperAdminStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

apiSuperAdmin.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const estRequeteLogin = originalRequest?.url?.includes('super-admin/login');

    if (error.response?.status === 401 && !estRequeteLogin && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        await new Promise<void>((resolve) => pendingQueue.push(resolve));
        return apiSuperAdmin(originalRequest);
      }

      isRefreshing = true;
      try {
        const refreshToken = useAuthSuperAdminStore.getState().refreshToken;
        if (!refreshToken) throw error;

        const { data } = await axios.post('/api/auth/refresh', { refreshToken });
        useAuthSuperAdminStore.getState().setTokens(data.accessToken, data.refreshToken);

        pendingQueue.forEach((resolve) => resolve());
        pendingQueue = [];

        return apiSuperAdmin(originalRequest);
      } catch (refreshError) {
        useAuthSuperAdminStore.getState().logout();
        window.location.href = '/super-admin/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
