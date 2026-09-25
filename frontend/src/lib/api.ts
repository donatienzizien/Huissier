import axios from 'axios';
import { useAuthStore } from '../store/auth';

export const api = axios.create({
  baseURL: '/api',
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

    // Un 401 sur /auth/login signifie "identifiants invalides" - ce n'est
    // PAS un token expire a rafraichir. Le laisser remonter tel quel pour
    // que le formulaire de connexion puisse afficher le message d'erreur,
    // au lieu de tenter un refresh (qui echoue puisqu'aucune session
    // n'existe encore) et de recharger la page, ce qui effacait le
    // message instantanement.
    const estRequeteLogin = originalRequest?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !estRequeteLogin && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        await new Promise<void>((resolve) => pendingQueue.push(resolve));
        return api(originalRequest);
      }

      isRefreshing = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) throw error;

        const { data } = await axios.post('/api/auth/refresh', { refreshToken });
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
