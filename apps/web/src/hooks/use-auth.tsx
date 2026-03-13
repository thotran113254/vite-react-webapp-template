import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User, LoginDto, RegisterDto, AuthTokens } from "@app/shared";
import { apiClient, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/lib/api-client";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthLoginResponse {
  tokens: AuthTokens;
  user: User;
}

function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** Provides authentication state and actions throughout the app. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate user from token on mount.
  // The apiClient interceptor handles token refresh transparently on 401,
  // so this will succeed even if the access token has expired (as long as
  // the refresh token is still valid).
  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token && !localStorage.getItem(REFRESH_TOKEN_KEY)) {
      setIsLoading(false);
      return;
    }
    apiClient
      .get<{ data: User }>("/auth/me")
      .then((res) => setUser(res.data.data))
      .catch((err: unknown) => {
        // Only clear tokens on 401 (auth failure). Network errors should not
        // wipe valid tokens — the user can retry on reconnect.
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          clearTokens();
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (credentials: LoginDto): Promise<void> => {
    const res = await apiClient.post<{ data: AuthLoginResponse }>(
      "/auth/login",
      credentials,
    );
    const { tokens, user: authedUser } = res.data.data;
    storeTokens(tokens);
    setUser(authedUser);
  }, []);

  const register = useCallback(async (data: RegisterDto): Promise<void> => {
    const res = await apiClient.post<{ data: AuthLoginResponse }>(
      "/auth/register",
      data,
    );
    const { tokens, user: newUser } = res.data.data;
    storeTokens(tokens);
    setUser(newUser);
  }, []);

  const logout = useCallback((): void => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    // Notify server with refresh token for blacklisting (fire-and-forget)
    apiClient.post("/auth/logout", { refreshToken: refreshToken ?? "" }).catch(() => {});
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook to access auth context. Must be used within AuthProvider. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
