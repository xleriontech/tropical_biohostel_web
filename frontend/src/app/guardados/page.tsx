"use client";

import { useEffect, useState } from "react";
import PropertyCard from "@/components/PropertyCard";
import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export default function GuardadosPage() {
  const ids = useWishlist();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(
      ids.map((slug) => fetch(`${API}/properties/${slug}`).then((r) => (r.ok ? r.json() : null)).catch(() => null))
    ).then((res) => {
      setItems(res.filter(Boolean));
      setLoading(false);
    });
  }, [ids.join(",")]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Guardados</h1>
      <p className="mt-2 text-muted-foreground">
        Tus sitios favoritos en este dispositivo ({ids.length}).
      </p>

      {loading ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-[22px] bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <Heart className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-semibold">Aún no guardas nada</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Toca el corazón en cualquier sitio para guardarlo aquí y comparar después.
          </p>
          <a
            href="/"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Explorar sitios
          </a>
        </div>
      ) : (
        <div className="mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  );
}
