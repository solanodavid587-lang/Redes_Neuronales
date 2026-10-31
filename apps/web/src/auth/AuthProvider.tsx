import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!getAccessToken()) {
      setLoading(false);
      return () => { mounted = false; };
    }

    void api.get<AuthUser>('/auth/me')
      .then((account) => {
        if (mounted) setUser(account);
      })
      .catch((error: unknown) => {
        clearAccessToken();
        if (mounted) console.error('No se pudo recuperar la sesión:', error);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    configured: true,
    signIn: async (email, password) => {
      const result = await api.post<LoginResponse>('/auth/login', { email, password });
      setAccessToken(result.access_token);
      setUser(result.user);
    },
    signOut: async () => {
      clearAccessToken();
      setUser(null);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
