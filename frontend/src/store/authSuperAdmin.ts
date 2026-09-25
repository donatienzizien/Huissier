import { create } from 'zustand';

export interface SuperAdminUser {
  id: string;
  nom: string;
  email: string;
  role: 'SUPER_ADMIN';
}

interface AuthSuperAdminState {
  user: SuperAdminUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (user: SuperAdminUser, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

// Cle de stockage DIFFERENTE de celle du cabinet (loginet_huissiers_session)
// et du portail client (loginet_huissiers_portail_session) - indispensable
// pour que les trois sessions (cabinet, portail, super admin) ne s'ecrasent
// jamais entre elles, meme ouvertes dans le meme navigateur.
const STORAGE_KEY = 'loginet_huissiers_super_admin_session';

function loadInitial(): Pick<AuthSuperAdminState, 'user' | 'accessToken' | 'refreshToken'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, accessToken: null, refreshToken: null };
    return JSON.parse(raw);
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

function persist(state: Pick<AuthSuperAdminState, 'user' | 'accessToken' | 'refreshToken'>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const useAuthSuperAdminStore = create<AuthSuperAdminState>((set, get) => ({
  ...loadInitial(),
  setSession: (user, accessToken, refreshToken) => {
    const next = { user, accessToken, refreshToken };
    persist(next);
    set(next);
  },
  setTokens: (accessToken, refreshToken) => {
    const next = { user: get().user, accessToken, refreshToken };
    persist(next);
    set({ accessToken, refreshToken });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));
