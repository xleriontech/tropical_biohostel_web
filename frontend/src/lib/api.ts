import { Property, SearchResult } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  search: (query: string) =>
    apiFetch<SearchResult>("/search", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  getProperties: (params?: { page?: number; limit?: number; tipo?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.tipo) searchParams.set("tipo", params.tipo);
    return apiFetch(`/properties?${searchParams}`);
  },

  getProperty: (slug: string) => apiFetch<Property>(`/properties/${slug}`),

  getAd: (placement: string) => apiFetch(`/ads?placement=${placement}`),
};
