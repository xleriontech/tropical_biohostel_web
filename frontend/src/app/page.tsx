"use client";

// Tropical Biohostel - Página principal
import { useEffect, useState } from "react";
import { useSearch } from "@/lib/SearchContext";
import ParallaxCarousel from "@/components/ParallaxCarousel";
import AdCarousel from "@/components/AdCarousel";
import { StarRating, TipoIcon } from "@/components/icons";
import { Brain, Search, Star, Leaf, Coffee, UtensilsCrossed, Flower2, MoonStar, BedDouble } from "lucide-react";
import { TopRatedProperty } from "@/types";
import { HERO, TERRITORIO, HOSPEDAJE, GASTRONOMIA, EXPERIENCIAS, BIENESTAR, CIERRE, COSMIC } from "@/lib/contenido";

const CATEGORIES = [
  { href: "/categoria/hostales", label: "Hostales", tipo: "hostal" },
  { href: "/categoria/glamping", label: "Glamping", tipo: "glamping" },
  { href: "/categoria/actividades", label: "Actividades", tipo: "actividad" },
  { href: "/categoria/restaurantes", label: "Restaurantes", tipo: "restaurante" },
  { href: "/categoria/fincas", label: "Fincas", tipo: "finca" },
  { href: "/categoria/hoteles", label: "Hoteles", tipo: "hotel" },
];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [topRated, setTopRated] = useState<TopRatedProperty[]>([]);
  const [topLoading, setTopLoading] = useState(true);
  const [adWithParallax, setAdWithParallax] = useState(false);
  const { setOpenSearch, setInitialQuery } = useSearch();

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/config/ads-display`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: any) => {
        if (data?.HOME_BANNER?.showWithParallax) setAdWithParallax(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews/top-rated?limit=6`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setTopRated)
      .catch(() => {})
      .finally(() => setTopLoading(false));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setInitialQuery(query.trim());
      setOpenSearch(true);
    }
  };

  return (
    <div>
      {/* Hero — identidad Tropical */}
      <div className="relative min-h-[calc(100vh-4rem)] overflow-x-clip">
        <ParallaxCarousel />
        <div className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 bg-black/20">
          <div className="mx-auto w-full max-w-3xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
              {HERO.es.kicker}
            </p>
            <h1 className="mb-4 px-2 font-display text-4xl font-semibold tracking-tight text-white drop-shadow-lg sm:text-5xl">
              {HERO.es.titulo}
            </h1>
            <p className="mb-8 text-lg text-white/90 drop-shadow">{HERO.es.subtitulo}</p>

            <form onSubmit={handleSearch} className="mx-auto max-w-xl">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ej: cabaña para 2 con yoga, hospedaje con mascota…"
                  className="flex-1 rounded-lg border border-white/20 bg-white/90 px-4 py-3 text-sm shadow-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90"
                >
                  <Search className="h-4 w-4" />
                  Buscar
                </button>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href="/property/tropical-biohostel"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-foreground shadow-xl hover:bg-white/90"
              >
                {HERO.es.ctaHospedaje}
              </a>
              <a
                href="/cosmic-bungalo"
                className="rounded-full border border-white/40 bg-white/15 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/25"
              >
                {HERO.es.ctaCosmic}
              </a>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <a
                href="/busqueda-inteligente"
                className="group flex max-w-full items-center gap-2 rounded-full bg-gradient-to-r from-[hsl(var(--grad-from))] to-[hsl(var(--grad-to))] px-5 py-3 text-sm font-bold shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl sm:px-8 sm:py-3.5 sm:text-base"
                style={{
                  color: "hsl(var(--grad-fg))",
                  boxShadow: "0 20px 40px -12px hsl(var(--grad-from) / 0.55)",
                }}
              >
                <Brain className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:rotate-12" />
                <span className="truncate">Zemisqua: el buscador ancestral encuentra tu lugar ideal</span>
                <span className="flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                  Nuevo
                </span>
              </a>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["Yoga y bienestar", "Tour café y cacao", "Cosmic Bungaló", "Gastronomía de la finca"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setInitialQuery(tag);
                    setOpenSearch(true);
                  }}
                  className="rounded-full border border-white/30 bg-white/20 px-4 py-1.5 text-xs text-white backdrop-blur-sm hover:bg-white/30"
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="mt-10 border-t border-white/20 pt-8">
              <p className="mb-4 text-sm text-white/80">Explora por categoría</p>
              <div className="flex flex-wrap justify-center gap-3">
                {CATEGORIES.map((cat) => (
                  <a
                    key={cat.href}
                    href={cat.href}
                    className="flex items-center gap-2 rounded-lg bg-white/15 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/25"
                  >
                    <TipoIcon tipo={cat.tipo} className="h-4 w-4" /> {cat.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {adWithParallax && (
          <div className="absolute bottom-6 left-1/2 z-20 w-full max-w-4xl -translate-x-1/2 px-4">
            <AdCarousel placement="HOME_BANNER" />
          </div>
        )}
      </div>

      {!adWithParallax && (
        <div className="mx-auto max-w-7xl px-4 py-8">
          <AdCarousel placement="HOME_BANNER" />
        </div>
      )}

      {/* Territorio */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Naturaleza que se vive</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{TERRITORIO.es.titulo}</h2>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">{TERRITORIO.es.intro}</p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="h-48 bg-gradient-to-br from-[#1E3D24] to-[#16264D] flex items-center justify-center text-white text-sm uppercase">Bosque nativo</div>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="h-48 bg-gradient-to-br from-[#1E3D24] to-[#16264D] flex items-center justify-center text-white text-sm uppercase">Café cultivado</div>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="h-48 bg-gradient-to-br from-[#1E3D24] to-[#16264D] flex items-center justify-center text-white text-sm uppercase">Frutales diversos</div>
          </div>
        </div>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">{TERRITORIO.es.cultivos}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {TERRITORIO.es.frutales.map((f) => (
            <span key={f} className="rounded-full border border-input bg-secondary/40 px-3 py-1 text-xs capitalize">
              {f}
            </span>
          ))}
        </div>
        <p className="mt-6 max-w-3xl leading-relaxed text-muted-foreground">{TERRITORIO.es.huerta}</p>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">{TERRITORIO.es.fauna}</p>
        <p className="mt-4 font-medium">{TERRITORIO.es.cierre}</p>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {TERRITORIO.es.datos.map((d) => (
            <div key={d.etiqueta} className="rounded-xl border bg-white p-5 text-center shadow-sm">
              <p className="font-display text-2xl font-semibold text-primary">{d.valor}</p>
              <p className="mt-1 text-xs text-muted-foreground">{d.etiqueta}</p>
            </div>
          ))}
        </div>
        <a href="/territorio" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <Leaf className="h-4 w-4" /> Descubrir el territorio
        </a>
      </section>

      {/* Hospedaje */}
      <section className="border-y border-input bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Descansar</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{HOSPEDAJE.es.titulo}</h2>
          <div className="mt-4 max-w-3xl space-y-3 leading-relaxed text-muted-foreground">
            <p>{HOSPEDAJE.es.cuerpo1}</p>
            <p>{HOSPEDAJE.es.cuerpo2}</p>
            <p>{HOSPEDAJE.es.cuerpo3}</p>
            <p className="font-medium text-foreground">{HOSPEDAJE.es.cierre}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="h-48 bg-gradient-to-br from-[#1E3D24] to-[#16264D] flex items-center justify-center text-white text-sm uppercase rounded-t-xl">3 cabañas con baño privado</div>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="h-48 bg-gradient-to-br from-[#1E3D24] to-[#16264D] flex items-center justify-center text-white text-sm uppercase rounded-t-xl">Comedor para 10</div>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="h-48 bg-gradient-to-br from-[#1E3D24] to-[#16264D] flex items-center justify-center text-white text-sm uppercase rounded-t-xl">Cosmic Bungaló</div>
            </div>
          </div>
        </div>
      </section>

      {/* Cosmic destacado */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-[#16264D] via-[#1E3D24] to-[#7A2E14] text-white shadow-xl">
          <div className="grid gap-0 md:grid-cols-2">
            <div className="p-8 sm:p-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Espacio especial</p>
              <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{COSMIC.es.nombre}</h2>
              <p className="mt-2 text-emerald-100/90">{COSMIC.es.eslogan}</p>
              <p className="mt-4 leading-relaxed text-white/85">{COSMIC.es.intro}</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {COSMIC.es.datos.map((d) => (
                  <div key={d.etiqueta} className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                    <p className="font-semibold">{d.valor}</p>
                    <p className="text-xs text-white/70">{d.etiqueta}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="/cosmic-bungalo" className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-50">
                  Descubrir Cosmic Bungaló
                </a>
                <a href="/property/cosmic-bungalo" className="rounded-full border border-white/40 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
                  Ver y reservar
                </a>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-3 bg-black/20 p-8 sm:p-10">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Lo que lo hace único</p>
              {[
                "Cabaña hexagonal de ~5 m² · ladrillo prensado y materiales de la finca",
                "Mándalas, runas, matices y pisos rústicos hechos a mano",
                "Baño con ducha + pileta natural al aire libre entre vegetación",
                "Ranas, mariposas, colibríes y criaturas del bosque",
                "Rincón para observar estrellas · leer, escribir, pintar",
                "Yoga, Chi Kung y Tai Chi programables tras tu reserva",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2.5 rounded-xl bg-white/10 p-3 text-sm backdrop-blur-sm">
                  <Star className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Gastronomía + Experiencias + Bienestar */}
      <section className="mx-auto max-w-7xl px-4 pb-4">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="h-24 bg-gradient-to-br from-[#1E3D24] to-[#16264D] flex items-center justify-center text-white text-sm uppercase rounded-txl">Del territorio a la mesa</div>
            <h3 className="mt-3 font-display text-xl font-semibold">{GASTRONOMIA.es.titulo}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{GASTRONOMIA.es.cuerpo1}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{GASTRONOMIA.es.cuerpo2}</p>
            <a href="/gastronomia" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Del territorio a la mesa →
            </a>
          </div>
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="h-24 bg-gradient-to-br from-[#1E3D24] to-[#16264D] flex items-center justify-center text-white text-sm uppercase rounded-txl">Experiencias que conectan</div>
            <h3 className="mt-3 font-display text-xl font-semibold">{EXPERIENCIAS.es.titulo}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{EXPERIENCIAS.es.cuerpo1}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {EXPERIENCIAS.es.items.map((i) => (
                <span key={i} className="rounded-full bg-secondary px-2.5 py-1 text-[11px]">
                  {i}
                </span>
              ))}
            </div>
            <a href="/experiencias" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Ver experiencias →
            </a>
          </div>
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="h-24 bg-gradient-to-br from-[#1E3D24] to-[#16264D] flex items-center justify-center text-white text-sm uppercase rounded-txl">Bienestar y conexión</div>
            <h3 className="mt-3 font-display text-xl font-semibold">{BIENESTAR.es.titulo}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{BIENESTAR.es.cuerpo1}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {BIENESTAR.es.practicas.map((i) => (
                <span key={i} className="rounded-full bg-secondary px-2.5 py-1 text-[11px]">
                  {i}
                </span>
              ))}
            </div>
            <a href="/bienestar" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Pausa y bienestar →
            </a>
          </div>
        </div>
      </section>

      {/* Cierre */}
      <section className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Visión</p>
        <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{CIERRE.es.titulo}</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-muted-foreground">{CIERRE.es.cuerpo}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {CIERRE.es.recuerdos.map((r) => (
            <span key={r} className="rounded-full border border-input bg-white px-4 py-1.5 text-sm shadow-sm">
              {r}
            </span>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-xl font-medium">{CIERRE.es.final}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          ¿Prefieres leer en inglés? <a href="/en" className="text-primary hover:underline">Read in English</a>
        </p>
        <a
          href="https://www.google.com/maps/search/Tropical%20Biohostel%20Nocaima"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L10 14.17l7.58-7.59L19 8l-9 9z"/></svg>
          Ver en Google Maps
        </a>
      </section>

      {/* Top Rated */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-10 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Colección viva</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Los Mejores Calificados
          </h2>
          <p className="mt-2 text-muted-foreground">Descubre los espacios mejor evaluados por nuestros visitantes</p>
        </div>

        {topLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : topRated.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Star className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-2">Aún no hay propiedades con calificaciones. ¡Sé el primero en dejar una reseña!</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {topRated.map((p) => {
              const mainImage = p.images?.find((img) => img.esPrincipal) || p.images?.[0];
              return (
                <a
                  key={p.id}
                  href={`/property/${p.slug}`}
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
                    <div className="absolute right-3 top-3 rounded-lg bg-white/90 px-2.5 py-1 shadow-sm">
                      <span className="text-sm font-bold text-yellow-600">{p.ratingPromedio}</span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-8">
                      <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                        {p.tipo.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="mb-1 font-semibold text-foreground group-hover:text-primary transition-colors">{p.nombre}</h3>
                    <p className="mb-2 text-sm text-muted-foreground truncate">{p.ciudad || p.ubicacion}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StarRating value={p.ratingPromedio} />
                        <span className="text-xs text-muted-foreground">({p.totalReviews})</span>
                      </div>
                      <span className="text-sm font-medium text-primary">
                        ${Number(p.precioNoche).toLocaleString("es-CO")}
                      </span>
                    </div>
                    {p.reviews && p.reviews.length > 0 && (
                      <div className="mt-3 rounded-lg bg-secondary/20 p-3">
                        <p className="text-xs text-muted-foreground italic line-clamp-2">
                          &ldquo;{p.reviews[0].comentario || "Excelente experiencia"}&rdquo;
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">— {p.reviews[0].autorNombre}</p>
                      </div>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
