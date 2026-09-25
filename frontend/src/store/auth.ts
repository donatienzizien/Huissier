import { create } from 'zustand';

export interface AuthUser {
  id: string;
  nom: string;
  prenom?: string;
  email: string;
  role: 'HUISSIER' | 'CLERC' | 'COMPTABLE' | 'SECRETAIRE' | 'AGENT_TERRAIN';
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const STORAGE_KEY = 'loginet_huissiers_session';

function loadInitial(): Pick<AuthState, 'user' | 'accessToken' | 'refreshToken'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, accessToken: null, refreshToken: null };
    return JSON.parse(raw);
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

function persist(state: Pick<AuthState, 'user' | 'accessToken' | 'refreshToken'>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const useAuthStore = create<AuthState>((set, get) => ({
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
