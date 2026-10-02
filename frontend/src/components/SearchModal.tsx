"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearch } from "@/lib/SearchContext";
import { SearchResult } from "@/types";
import PropertyCard from "./PropertyCard";
import AdCarousel from "./AdCarousel";

export default function SearchModal() {
  const { openSearch, setOpenSearch, initialQuery, setInitialQuery } = useSearch();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  // Sync initial query when modal opens
  useEffect(() => {
    if (!openSearch) {
      setResults(null);
      setQuery("");
      return;
    }

    const q = initialQuery;
    if (q !== undefined) {
      setQuery(q);
      performSearch(q);
    } else {
      setQuery("");
      setResults(null);
    }
  }, [openSearch]);

  // Focus input when modal opens
  useEffect(() => {
    if (openSearch && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [openSearch]);

  // Debounced search on type
  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); setError(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (data && (data.message || data.error)) || `Error del servidor (${res.status})`,
        );
      }
      // La API debe devolver { filters, results[], sponsored[], total }.
      // Cualquier otra forma (error HTML, proxy, túnel caído) se rechaza
      // para no romper el render.
      if (!data || !Array.isArray((data as any).results) || !Array.isArray((data as any).sponsored)) {
        throw new Error("Respuesta inesperada del servidor. Intenta de nuevo.");
      }
      setResults(data);
    } catch (err: any) {
      console.error("Search failed:", err);
      setResults(null);
      setError(err?.message === "Failed to fetch"
        ? "No se pudo conectar con el servidor. Revisa tu conexión."
        : err?.message || "No se pudo completar la búsqueda.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => performSearch(val), 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timerRef.current) clearTimeout(timerRef.current);
    performSearch(query);
  };

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenSearch(false);
    };
    if (openSearch) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  // Reset state on close
  const close = () => {
    setOpenSearch(false);
    setResults(null);
    setQuery("");
  };

  if (!openSearch) return null;

  const resultList = Array.isArray(results?.results) ? results!.results : [];
  const sponsoredList = Array.isArray(results?.sponsored) ? results!.sponsored : [];
  const hasResults = resultList.length > 0 || sponsoredList.length > 0;

  const filterChips: string[] = [];
  if (results?.filters) {
    const f = results.filters;
    if (f.tipo) filterChips.push(f.tipo.replace("_", " "));
    if (f.admiteMascotas) filterChips.push("pet-friendly");
    if (f.seguroDisponible) filterChips.push("con seguro");
    if (f.numeroHuespedesMin) filterChips.push(`${f.numeroHuespedesMin} personas`);
    if (f.numeroHabitacionesMin) filterChips.push(`${f.numeroHabitacionesMin} hab.`);
    for (const a of f.actividades || []) filterChips.push(a);
    for (const k of f.palabrasClave || []) filterChips.push(k);
    if (f.presupuestoMaximo) filterChips.push(`máx $${f.presupuestoMaximo.toLocaleString("es-CO")}`);
    if (f.ubicacion) filterChips.push(`en ${f.ubicacion}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm">
      <div className="mt-[10vh] w-full max-w-4xl mx-4">
        <form onSubmit={handleSubmit} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Describe tu alojamiento ideal..."
            className="w-full rounded-xl border border-white/20 bg-white px-5 py-4 pr-12 text-base shadow-2xl focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
          />
          <button type="button" onClick={close} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </form>

        <div className="mt-4 max-h-[70vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
          {loading && (
            <div className="p-8 text-center text-muted-foreground">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-2 text-sm">Buscando...</p>
            </div>
          )}

          {!loading && !error && query && !hasResults && (
            <div className="p-8 text-center text-muted-foreground">
              No se encontraron resultados para &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading && error && (
            <div className="p-8 text-center">
              <p className="font-medium text-red-600">No se pudo buscar</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              <button
                onClick={() => performSearch(query)}
                className="mt-4 rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted"
              >
                Reintentar
              </button>
            </div>
          )}

          {!loading && !query && (
            <div className="p-8 text-center text-muted-foreground">
              Escribe lo que buscas en lenguaje natural
            </div>
          )}

          {hasResults && (
            <div className="p-4">
              {filterChips.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {filterChips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}
              <AdCarousel placement="SEARCH_RESULTS_TOP" className="mb-4" />
              {sponsoredList.length > 0 && (
                <div className="mb-6">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patrocinados</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {sponsoredList.map((p) => (
                      <div key={p.id} onClick={close}>
                        <PropertyCard property={p} sponsored />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Resultados ({results?.total ?? resultList.length})
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {resultList.map((p) => (
                    <div key={p.id} onClick={close}>
                      <PropertyCard property={p} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
