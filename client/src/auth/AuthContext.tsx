import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';
import type { CurrentUser } from '../api/types';

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<CurrentUser>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ user: CurrentUser | null }>('/auth/me')
      .then((response) => setUser(response.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await api.post<{ user: CurrentUser }>('/auth/sign-in', { email, password });
    setUser(response.user);
    return response.user;
  }, []);

  const signOut = useCallback(async () => {
    await api.post('/auth/sign-out');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut }),
    [user, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

export function homePathFor(user: CurrentUser): string {
  return user.role === 'acme_admin' ? '/admin/orders' : '/';
}
