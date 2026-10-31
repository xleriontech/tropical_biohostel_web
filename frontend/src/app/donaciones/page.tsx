"use client";

import { useEffect, useState } from "react";
import { Sprout, CloudSun, HeartHandshake, Grid3x3 } from "lucide-react";

const CATEGORIA: Record<string, { label: string; Icon: any }> = {
  ARBOLES: { label: "Siembra de árboles", Icon: Sprout },
  CARBONO: { label: "Huella de carbono", Icon: CloudSun },
  GENERAL: { label: "Proyecto", Icon: HeartHandshake },
};

export default function DonacionesPage() {
  const [proyectos, setProyectos] = useState<any[] | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/donaciones/proyectos`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setProyectos(Array.isArray(d) ? d : []))
      .catch(() => setProyectos([]));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <nav className="mb-4 text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground">Inicio</a>
        <span className="mx-2">/</span>
        <span className="text-foreground">Donaciones</span>
      </nav>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Apoya el territorio</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Dona y siembra futuro 🌳</h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
        Tus aportes financian la siembra de árboles nativos, proyectos de huella de carbono y el
        cuidado de la finca. Pagos seguros vía <strong>PayPal</strong>: puedes donar con tu cuenta
        PayPal o con tarjeta, sin crear cuenta.
      </p>

      <a
        href="/donaciones/siembra"
        className="group mt-8 flex flex-col gap-4 overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
      >
        <span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Novedad · Tablero de siembra
          </span>
          <span className="mt-1 block font-display text-2xl font-semibold group-hover:text-primary">
            Apadrina un árbol de café o de cacao 🌱
          </span>
          <span className="mt-1 block max-w-2xl text-sm text-muted-foreground">
            Un ajedrez en 3D con los lugares reales de la finca: eliges tu casilla, la pagas por PayPal y
            vuelves por aquí a ver cómo crece tu árbol.
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground group-hover:bg-primary/90">
          <Grid3x3 className="h-4 w-4" /> Ver el tablero
        </span>
      </a>

      {proyectos === null ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : proyectos.length === 0 ? (
        <div className="mt-10 rounded-2xl border bg-white p-10 text-center shadow-sm">
          <HeartHandshake className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3 font-semibold">Pronto publicaremos los proyectos</p>
          <p className="mt-1 text-sm text-muted-foreground">Estamos preparando las causas que podrás apoyar.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {proyectos.map((p: any) => {
            const cat = CATEGORIA[p.categoria] || CATEGORIA.GENERAL;
            const pct = p.meta ? Math.min(100, Math.round((100 * p.recaudado) / p.meta)) : null;
            const portada =
              (Array.isArray(p.media) ? p.media.find((m: any) => m?.tipo === "imagen" && m.url)?.url : null) ||
              p.imagenUrl ||
              null;
            return (
              <a
                key={p.id}
                href={`/donaciones/${p.slug}`}
                className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {portada ? (
                  <div className="aspect-[16/9] overflow-hidden bg-muted">
                    <img src={portada} alt={p.titulo} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  </div>
                ) : (
                  <div className="aspect-[16/9] overflow-hidden bg-muted">
                    <img
                      src={
                        p.categoria === "ARBOLES"
                          ? "/fotos/sitio/tropical-gente4.jpg"
                          : p.categoria === "CARBONO"
                            ? "/fotos/sitio/tropical-flores2.jpg"
                            : "/fotos/sitio/tropical-voluntariado.jpg"
                      }
                      alt={p.titulo}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="p-5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold">
                    <cat.Icon className="h-3.5 w-3.5 text-primary" /> {cat.label}
                  </span>
                  <h2 className="mt-2 font-display text-xl font-semibold group-hover:text-primary">{p.titulo}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.descripcion}</p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-primary">
                        ${Number(p.recaudado).toLocaleString("es-CO")} {p.moneda}
                      </span>
                      {p.meta ? (
                        <span className="text-muted-foreground">meta ${Number(p.meta).toLocaleString("es-CO")}</span>
                      ) : (
                        <span className="text-muted-foreground">{p.donantes} aportes</span>
                      )}
                    </div>
                    {pct !== null && (
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                  <span className="mt-4 inline-block rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground group-hover:bg-primary/90">
                    Donar
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
