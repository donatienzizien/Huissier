import axios from 'axios';
import { useAuthPortailStore } from '../store/authPortail';

export const apiPortail = axios.create({
  baseURL: '/api/portail-client',
  headers: { 'Content-Type': 'application/json' },
});

apiPortail.interceptors.request.use((config) => {
  const token = useAuthPortailStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Pas de rafraîchissement automatique côté portail (V1) : si le jeton
// expire, on redirige simplement vers la connexion. IMPORTANT : on
// n'applique cette redirection QUE si la requête en échec n'était pas
// elle-même la tentative de connexion — sinon un simple mauvais mot de
// passe (401 normal) déclenche un rechargement de page qui efface le
// message d'erreur avant que l'utilisateur ait pu le lire.
apiPortail.interceptors.response.use(
  (response) => response,
  (error) => {
    const estRequeteLogin = error.config?.url?.includes('/login');
    if (error.response?.status === 401 && !estRequeteLogin) {
      useAuthPortailStore.getState().logout();
      window.location.href = '/portail/login';
    }
    return Promise.reject(error);
  },
);