export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL !== undefined
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : process.env.NODE_ENV === "development"
    ? "http://localhost:5000"
    : "";

export interface ApiError extends Error {
  status?: number;
  info?: unknown;
}

/**
 * Safely retrieves the authentication token from localStorage or document.cookie.
 * Essential for mobile browsers (iOS Safari, mobile Chrome) where cross-site cookies are blocked.
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const local = localStorage.getItem("token");
    if (local) return local;
  } catch {
    // localStorage might be blocked in some private browsing configurations
  }
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Persists the authentication token in both localStorage and document.cookie.
 */
export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("token", token);
  } catch {
    // ignore
  }
  const isSecure = window.location.protocol === "https:";
  document.cookie = `token=${token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
}

/**
 * Clears the authentication token from both localStorage and document.cookie.
 */
export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("token");
  } catch {
    // ignore
  }
  document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

/**
 * Centralized API request wrapper with default credentials,
 * automatic JSON headers, 403 blocked user detection, and typed ApiError.
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const fullUrl = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Mobile & Cross-Domain Compatibility: Attach Authorization header if token exists
  const token = getAuthToken();
  if (token && !(options.headers && "Authorization" in (options.headers as Record<string, string>))) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(fullUrl, {
    credentials: "include",
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // If account was blocked, redirect to login with notification
    if (
      typeof window !== "undefined" &&
      res.status === 403 &&
      (data?.isBlocked || data?.message?.toLowerCase().includes("blocked"))
    ) {
      if (!window.location.pathname.startsWith("/login")) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/login?blocked=true";
      }
    }

    const error = new Error(data.message || `Request failed with status ${res.status}`) as ApiError;
    error.status = res.status;
    error.info = data;
    throw error;
  }

  return data as T;
}

/**
 * Standard fetcher for SWR queries
 */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  return apiRequest<T>(url, { method: "GET" });
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T = unknown>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),

  post: <T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
    }),

  patch: <T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
    }),

  put: <T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
    }),

  delete: <T = unknown>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};
