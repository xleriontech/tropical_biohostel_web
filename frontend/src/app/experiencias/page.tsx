import {
  ChevronDown,
  Droplet,
  Flame,
  Heart,
  Map as MapIcon,
  Sprout,
  Sparkles,
  UtensilsCrossed,
  Zap,
  ArrowRight,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { EXPERIENCIAS, EXPERIENCIAS_CATALOGO, RUTAS } from "@/lib/contenido";

export const metadata = { title: "Experiencias · Tropical Biohostel" };

const CATALOGO_ICONOS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  utensils: UtensilsCrossed,
  sprout: Sprout,
  droplet: Droplet,
  flame: Flame,
  sparkles: Sparkles,
  map: MapIcon,
  zap: Zap,
  heart: Heart,
};

export default function ExperienciasPage() {
  const t = EXPERIENCIAS.es;
  const items = EXPERIENCIAS_CATALOGO.es.items;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="mb-4 text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground">Inicio</a>
        <span className="mx-2">/</span>
        <span className="text-foreground">Experiencias</span>
      </nav>

      {/* Encabezado — contenido base del sitio */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Experiencias que conectan</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">{t.titulo}</h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">{t.cuerpo1}</p>
      <p className="mt-3 leading-relaxed text-muted-foreground">{t.cuerpo2}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {t.items.map((i) => (
          <span key={i} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium">{i}</span>
        ))}
      </div>
      <p className="mt-4 font-medium text-foreground">{t.cierre}</p>

      {/* Catálogo creativo — Experiencias de Gastronomía, Café y Bienestar */}
      <section className="mt-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-bosque">El catálogo de experiencias</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-bosque sm:text-4xl">
          Cada visita, una historia por vivir
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Selecciona tu experiencia: un refugio de nuestra finca espera tu llegada. Puedes diseñar tu
          estadía de dos formas — inmersión completa o pasadia — mientras vives cada momento como
          auténtico y creativo.
        </p>

        <div className="mt-10 grid items-start gap-5 sm:grid-cols-2 md:grid-cols-3">
          {items.map((i) => {
            const Icon = CATALOGO_ICONOS[i.icono] ?? UtensilsCrossed;
            const primary = i.mod[0];
            return (
              <details
                key={i.id}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-piedra bg-crema transition-all duration-300 hover:border-bosque hover:shadow-lg open:shadow-2xl"
              >
                <summary className="relative block aspect-[16/9] cursor-pointer bg-secondary [&::-webkit-details-marker]:hidden">
                  <img
                    src={i.imagen}
                    alt={i.titulo}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-tierra/55 via-tierra/10 to-transparent transition-opacity duration-300 group-hover:opacity-90" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 text-crema">
                    <Icon className="h-5 w-5 text-sol" />
                    <h3 className="mt-2 font-display text-lg font-semibold sm:text-xl">{i.titulo}</h3>
                    <p className="mt-1 font-hand text-sm text-sol">{i.tagline}</p>
                    <p className="mt-2 font-display text-2xl font-semibold sm:text-3xl text-sol">{primary.precio}</p>
                  </div>
                  <ChevronDown className="chevron absolute bottom-4 right-4 h-6 w-6 text-sol" />
                </summary>
                <div className="space-y-4 border-t border-piedra bg-crema p-5 sm:p-6">
                  <p className="text-sm leading-relaxed text-foreground sm:text-base">{i.desc}</p>
                  <ul className="space-y-2">
                    {i.incluye.map((x, k) => (
                      <li key={k} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sol" />
                        {x}
                      </li>
                    ))}
                  </ul>
                  {i.mod.map((m, k) => (
                    <div key={k} className="space-y-1 border-t border-dashed border-piedra pt-3">
                      <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                        <span className="font-semibold text-foreground">{m.label}</span>
                        <span className="text-right font-display font-semibold text-sol">{m.precio}</span>
                      </p>
                      {m.detalle && <p className="text-xs text-muted-foreground/80">{m.detalle}</p>}
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* Banner de conversión — sección 4 del documento */}
      <section className="mt-14 overflow-hidden rounded-3xl border border-sol/30 bg-sol/15 p-8 md:p-10">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-bosque">Antes de reservar</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-bosque sm:text-3xl">
            Reserva con anticipación: Cupos estrictamente limitados
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80 sm:text-base">
            Para proteger la paz, el silencio y tu privacidad en nuestros 14.000 m², contamos únicamente
            con 3 unidades de alojamiento. Todas nuestras experiencias son personalizadas y requieren
            reserva previa.
          </p>
          <a
            href="/categoria/actividades"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-bosque px-6 py-3 text-sm font-semibold text-crema shadow-lg transition-all hover:-translate-y-0.5 hover:bg-tierra"
          >
            Consultar disponibilidad y reservar mi experiencia
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Rutas del Café — página existente */}
      <section className="mt-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">Rutas del café</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-bosque sm:text-4xl">
          Tres rutas del café
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {RUTAS.es.rutas.map((r) => (
            <a
              key={r.slug}
              href={`/property/${r.slug}`}
              className="group overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="h-48 overflow-hidden">
                <img src={r.imagen} alt={r.nombre} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              <div className="p-5">
                <p className="font-semibold">{r.nombre}</p>
                <p className="mt-1 text-sm text-muted-foreground">{r.descripcion.slice(0, 90)}…</p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
