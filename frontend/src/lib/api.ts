export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

/**
 * Standard fetcher for SWR and API calls with credentials
 */
export async function fetcher<T = any>(url: string): Promise<T> {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  
  const res = await fetch(fullUrl, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(errorData.message || `Request failed with status ${res.status}`);
    (error as any).status = res.status;
    (error as any).info = errorData;
    throw error;
  }

  return res.json();
}
