"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Property } from "@/types";
import PropertyDetailClient from "./PropertyDetailClient";

export default function PropertyPageClient({ slug }: { slug: string }) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        // En export estático el slug viene por prop; como respaldo leemos la URL.
        const actualSlug =
          slug && slug !== "_"
            ? slug
            : window.location.pathname.replace(/\/$/, "").split("/").pop() || slug;
        const data = await api.getProperty(actualSlug);
        if (!cancelled) setProperty(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
        <div className="mt-6 h-8 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !property) {
    const backHref = slug === "cosmic-bungalow" ? "/cosmic-bungalow/" : "/busqueda-inteligente/";
    const backLabel = slug === "cosmic-bungalow" ? "Volver a Cosmic Bungalow" : "Volver a la búsqueda";
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-foreground">Alojamiento no disponible</h1>
        <p className="mt-4 text-muted-foreground">
          No pudimos cargar este alojamiento. Puede que ya no esté publicado o que haya un problema temporal de conexión.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href={backHref}
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {backLabel}
          </a>
          <a
            href="/"
            className="rounded-full border border-input px-6 py-3 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            Ir al inicio
          </a>
        </div>
      </div>
    );
  }

  return <PropertyDetailClient property={property} />;
}
