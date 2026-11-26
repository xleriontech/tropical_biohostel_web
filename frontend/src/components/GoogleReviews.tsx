"use client";

import { useEffect, useState } from "react";
import { MapPin, Phone, Quote, Star } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const SLUG = "tropical-biohostel";
const GOOGLE_MAPS =
  "https://www.google.com/maps/place/Tropical+Biohostel/@5.0732862,-74.3693468,17z/data=!4m8!3m7!1s0x8e408e4c500b0ded:0x930ccf82bc032730!8m2!3d5.0732862!4d-74.3693468!9m1!1b1!16s%2Fg%2F11cny2_yd8";

interface Resena {
  id: string;
  autorNombre: string;
  calificacion: number;
  comentario?: string | null;
  respuestaAnfitrion?: string | null;
  fuente: string;
  createdAt: string;
}

interface Propiedad {
  nombre?: string;
  ratingExterno?: number | null;
  resenasExternas?: number | null;
  telefono?: string | null;
}

/** "hace 8 meses" a partir de la fecha de la reseña. */
function haceCuanto(iso: string) {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias < 31) return "hace menos de un mes";
  const meses = Math.floor(dias / 30.44);
  if (meses < 12) return `hace ${meses} ${meses === 1 ? "mes" : "meses"}`;
  const anios = Math.floor(meses / 12);
  return `hace ${anios} ${anios === 1 ? "año" : "años"}`;
}

const FUENTE_LABEL: Record<string, string> = {
  google: "Google Maps",
  tripadvisor: "Tripadvisor",
  web: "Tropical Biohostel",
};

export default function GoogleReviews() {
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [propiedad, setPropiedad] = useState<Propiedad | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    Promise.all([
      fetch(`${API}/properties/${SLUG}/reviews`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API}/properties/${SLUG}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([rs, p]) => {
        if (cancelado) return;
        const lista: Resena[] = Array.isArray(rs) ? rs : [];
        setResenas(
          [...lista].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
        setPropiedad(p);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  if (cargando) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  if (resenas.length === 0) return null;

  const rating = propiedad?.ratingExterno ?? 4.8;
  const opiniones = propiedad?.resenasExternas ?? resenas.length;

  return (
    <section className="border-y border-input bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Lo que dicen los visitantes
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Reseñas de nuestros huéspedes
          </h2>
          <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-muted-foreground">
            Opiniones reales de huéspedes y visitantes que han compartido su experiencia en
            Tropical Biohostel y en Nocaima.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Ficha de Google */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              En Google Maps
            </p>
            <p className="mt-3 font-display text-5xl font-semibold text-foreground">{rating}</p>
            <div className="mt-1 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className="h-5 w-5 fill-yellow-400 text-yellow-400"
                  aria-hidden
                />
              ))}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {opiniones} {opiniones === 1 ? "opinión" : "opiniones"}
            </p>

            <div className="mt-5 space-y-2 border-t pt-5 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Nocaima, Cundinamarca · 3JFJ+87
              </p>
              {propiedad?.telefono && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  {propiedad.telefono}
                </p>
              )}
            </div>

            <a
              href={GOOGLE_MAPS}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-input px-5 py-2.5 text-sm font-medium hover:bg-secondary"
            >
              Ver todas las reseñas
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L10 14.17l7.58-7.59L19 8l-9 9z" />
              </svg>
            </a>
          </div>

          {/* Reseñas */}
          <div className="grid gap-4 sm:grid-cols-2">
            {resenas.map((r) => (
              <article
                key={r.id}
                className="flex flex-col rounded-2xl border bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{r.autorNombre}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {haceCuanto(r.createdAt)} en {FUENTE_LABEL[r.fuente] ?? r.fuente}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i <= r.calificacion
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/30"
                        }`}
                        aria-hidden
                      />
                    ))}
                  </div>
                </div>

                {r.comentario && (
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                    <Quote className="mr-1 inline h-3.5 w-3.5 text-primary/60" />
                    {r.comentario}
                  </p>
                )}

                {r.respuestaAnfitrion && (
                  <div className="mt-4 rounded-xl border-l-2 border-primary bg-secondary/40 p-3">
                    <p className="text-xs font-semibold text-primary">
                      Respuesta de Nazareth y Rodrigo
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {r.respuestaAnfitrion}
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
