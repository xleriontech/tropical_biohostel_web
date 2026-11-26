const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

/** Origen del backend (sin /api final). Ej: http://localhost:3001 */
export function apiOrigin(): string {
  return API.replace(/\/api$/, "");
}

/**
 * Convierte una URL de imagen a absoluta:
 * - http(s)://... → tal cual
 * - /uploads/... → origen del backend (los archivos subidos viven ahí)
 * - demás rutas /... → origen del frontend (public/: logos, fotos del sitio)
 */
export function absoluteUrl(u?: string | null): string {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/uploads/")) return `${apiOrigin()}${u}`;
  if (u.startsWith("/") && typeof window !== "undefined") return `${window.location.origin}${u}`;
  if (u.startsWith("/")) return `${apiOrigin()}${u}`;
  return `${apiOrigin()}/${u}`;
}

export function apiUrl(): string {
  return API;
}
