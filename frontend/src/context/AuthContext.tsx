import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { isApiEnabled, api, setAuthToken, type AuthUser } from '../api/client';

const AUTH_STORAGE_KEY = 'travel_app_auth';

function loadStoredAuth(): { user: AuthUser; token: string } | null {
  if (!isApiEnabled()) return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { user: AuthUser; token: string };
    if (data?.user?.id && data?.token) {
      setAuthToken(data.token);
      return data;
    }
  } catch {
    /* ignore */
  }
  return null;
}

type AuthContextValue = {
  currentUser: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUserAndToken: (user: AuthUser, token: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => loadStoredAuth()?.user ?? null);
  const [token, setTokenState] = useState<string | null>(() => loadStoredAuth()?.token ?? null);

  useEffect(() => {
    if (token) setAuthToken(token);
    else setAuthToken(null);
  }, [token]);

  const setUserAndToken = useCallback((user: AuthUser, newToken: string) => {
    setCurrentUser(user);
    setTokenState(newToken);
    if (isApiEnabled()) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token: newToken }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!isApiEnabled()) return;
    const { user, token: newToken } = await api.auth.login(email, password);
    setUserAndToken(user, newToken);
  }, [setUserAndToken]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setTokenState(null);
    setAuthToken(null);
    if (isApiEnabled()) localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const value: AuthContextValue = {
    currentUser,
    token,
    login,
    logout,
    setUserAndToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
