import { create } from 'zustand';

export interface AuthPortailClient {
  id: string;
  nom: string;
  prenom?: string;
  email: string;
}

interface AuthPortailState {
  client: AuthPortailClient | null;
  accessToken: string | null;
  setSession: (client: AuthPortailClient, accessToken: string) => void;
  logout: () => void;
}

const STORAGE_KEY = 'loginet_portail_session';

function loadInitial(): Pick<AuthPortailState, 'client' | 'accessToken'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { client: null, accessToken: null };
    return JSON.parse(raw);
  } catch {
    return { client: null, accessToken: null };
  }
}

export const useAuthPortailStore = create<AuthPortailState>((set) => ({
  ...loadInitial(),
  setSession: (client, accessToken) => {
    const next = { client, accessToken };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set(next);
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ client: null, accessToken: null });
  },
}));