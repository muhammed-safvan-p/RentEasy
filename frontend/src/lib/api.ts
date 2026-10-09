import { serverStatusManager } from "./serverStatus";

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
 * automatic JSON headers, 403 blocked user detection, cold-start tracking, and typed ApiError.
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

  // Track request duration for Render cold-start detection
  const reqId = `${endpoint}_${Date.now()}_${Math.random()}`;
  const finishTracking = serverStatusManager.startRequest(reqId);

  // Setup cold-start timeout controller (75 seconds to allow Render spin-up)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 75000);

  let signal: AbortSignal;
  if (options.signal) {
    if (typeof AbortSignal !== "undefined" && "any" in AbortSignal && typeof AbortSignal.any === "function") {
      signal = AbortSignal.any([options.signal, controller.signal]);
    } else {
      options.signal.addEventListener("abort", () => controller.abort(), { once: true });
      signal = controller.signal;
    }
  } else {
    signal = controller.signal;
  }

  try {
    const res = await fetch(fullUrl, {
      credentials: "include",
      ...options,
      signal,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // If session expired or unauthorized, clear token and redirect to login
      if (typeof window !== "undefined" && res.status === 401) {
        clearAuthToken();
        if (!window.location.pathname.startsWith("/login")) {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/login?expired=true";
        }
      }

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
  } catch (err: unknown) {
    if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "AbortError") {
      const timeoutErr = new Error("Server took too long to respond. The free-tier cloud server may still be waking up. Please try again.") as ApiError;
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    finishTracking();
  }
}

/**
 * Standard fetcher for SWR queries
 */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  return apiRequest<T>(url, { method: "GET" });
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (typeof body === "string") return body;
  if (typeof FormData !== "undefined" && body instanceof FormData) return body;
  if (typeof Blob !== "undefined" && body instanceof Blob) return body;
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) return body;
  return JSON.stringify(body);
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
      body: serializeBody(body),
    }),

  patch: <T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: serializeBody(body),
    }),

  put: <T = unknown>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: serializeBody(body),
    }),

  delete: <T = unknown>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};
