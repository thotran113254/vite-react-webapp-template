import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

/**
 * Axios instance for API communication.
 * - Automatically attaches JWT from localStorage
 * - Attempts token refresh on 401 before redirecting to login
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api/v1",
  headers: { "Content-Type": "application/json" },
  timeout: 10_000,
});

// Request interceptor: attach bearer token if present
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// Response interceptor: attempt refresh on 401, then redirect if still failing
let isRefreshing = false;
let pendingRequests: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

// Auth credential endpoints that should NOT trigger token refresh on 401.
// Protected auth endpoints like /auth/me, /auth/profile SHOULD trigger refresh.
const NO_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

function isCredentialEndpoint(url?: string): boolean {
  if (!url) return false;
  const pathname = url.split("?")[0];
  return NO_REFRESH_PATHS.some((p) => pathname!.endsWith(p));
}

function clearAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only attempt refresh for 401 errors on non-credential endpoints
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      isCredentialEndpoint(originalRequest.url)
    ) {
      // Only clear auth for non-credential 401s (don't wipe tokens on wrong password)
      if (error.response?.status === 401 && !isCredentialEndpoint(originalRequest.url)) {
        clearAuth();
      }
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      clearAuth();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until refresh completes
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const res = await axios.post(
        `${apiClient.defaults.baseURL}/auth/refresh`,
        { refreshToken },
      );
      const { accessToken, refreshToken: newRefresh } = res.data.data;
      if (!accessToken || !newRefresh) {
        throw new Error("Malformed refresh response");
      }
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);

      // Retry queued requests
      pendingRequests.forEach((p) => p.resolve(accessToken));
      pendingRequests = [];

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    } catch {
      pendingRequests.forEach((p) => p.reject(error));
      pendingRequests = [];
      clearAuth();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY };
