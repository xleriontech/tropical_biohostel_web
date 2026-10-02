"use client";

import { useEffect, useState } from "react";
import { TipoIcon } from "@/components/icons";
import { Home, Users } from "lucide-react";

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("PUBLICADO");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/properties?limit=500`, {
      headers: { Authorization: `Bearer ${token || ""}` },
    })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        setProperties(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const cuenta = (e: string) => properties.filter((p) => p.estado === e).length;
  const visibles = properties.filter((p) => {
    if (filtroEstado !== "TODOS" && p.estado !== filtroEstado) return false;
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      p.nombre?.toLowerCase().includes(q) ||
      p.slug?.toLowerCase().includes(q) ||
      p.ciudad?.toLowerCase().includes(q) ||
      p.tipo?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Propiedades</h1>
          <p className="text-sm text-muted-foreground">
            {visibles.length} de {properties.length} · {cuenta("PUBLICADO")} publicadas · {cuenta("BORRADOR")} borradores · {cuenta("ARCHIVADO")} archivadas
          </p>
        </div>
        <a
          href="/admin/properties/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Nueva Propiedad
        </a>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, ciudad o tipo…"
            className="w-full rounded-xl border border-input bg-white py-2.5 pl-4 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {["PUBLICADO", "BORRADOR", "ARCHIVADO", "TODOS"].map((e) => (
          <button
            key={e}
            onClick={() => setFiltroEstado(e)}
            className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
              filtroEstado === e
                ? "bg-primary text-primary-foreground"
                : "border border-input text-muted-foreground hover:text-foreground"
            }`}
          >
            {e === "TODOS" ? `Todas (${properties.length})` : `${e} (${cuenta(e)})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((p) => {
            const mainImage = p.images?.find((img: any) => img.esPrincipal) || p.images?.[0];
            return (
              <div
                key={p.id}
                className="group overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  {mainImage ? (
                    <img
                      src={mainImage.url}
                      alt={p.nombre}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/40">
                      <TipoIcon tipo={p.tipo} className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-8">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                        p.estado === "PUBLICADO"
                          ? "bg-green-100 text-green-800"
                          : p.estado === "BORRADOR"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {p.estado}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <TipoIcon tipo={p.tipo} className="h-4 w-4" />
                    </span>
                    <span className="rounded bg-secondary/50 px-2 py-0.5 text-[11px] font-medium uppercase text-muted-foreground">
                      {p.tipo.replace("_", " ")}
                    </span>
                  </div>
                  <h3 className="mb-1 font-semibold text-foreground">{p.nombre}</h3>
                  <p className="mb-3 text-sm text-muted-foreground truncate">{p.ubicacion}</p>
                  <div className="mb-3 flex items-center gap-4 text-sm">
                    <span className="font-medium text-primary">${Number(p.precioNoche).toLocaleString("es-CO")} COP</span>
                    <span className="text-muted-foreground">/ noche</span>
                    <span className="ml-auto flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> {p.capacidadMaxima} pers.
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {p.actividades?.slice(0, 3).map((act: string) => (
                      <span key={act} className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] text-muted-foreground">
                        {act}
                      </span>
                    ))}
                    {(p.actividades?.length || 0) > 3 && (
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] text-muted-foreground">
                        +{p.actividades.length - 3}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 border-t pt-3">
                    <a
                      href={`/admin/properties/${p.id}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      Editar
                    </a>
                    <a
                      href={`/property/${p.slug}`}
                      target="_blank"
                      className="flex items-center justify-center rounded-lg border border-input px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Ver
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && visibles.length === 0 && (
        <div className="flex min-h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-muted">
          <div className="text-center">
            <p className="flex justify-center text-muted-foreground/40"><Home className="h-10 w-10" /></p>
            <p className="mt-2 text-muted-foreground">
              {properties.length === 0 ? "No hay propiedades todavía" : "Sin resultados con ese filtro"}
            </p>
            <a href="/admin/properties/new" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Crear propiedad
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
