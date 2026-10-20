"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PropertyCard from "@/components/PropertyCard";
import AdCarousel from "@/components/AdCarousel";
import { TipoIcon } from "@/components/icons";
import { Home, Search } from "lucide-react";

export const runtime = "edge";

const CATEGORY_MAP: Record<string, { tipo: string; label: string; description: string; gradient: string; imagen: string }> = {
  hoteles: {
    tipo: "hotel",
    label: "Hoteles",
    description: "Descubre los mejores hoteles aquí, con habitaciones cómodas y servicios de calidad para una estancia inolvidable.",
    gradient: "from-blue-600/90 to-blue-900/90",
    imagen: "/fotos/sitio/tropical-voluntariado.jpg",
  },
  hostales: {
    tipo: "hostal",
    label: "Hostales",
    description: "Hostales acogedores con el mejor ambiente y precios accesibles para tu estadía.",
    gradient: "from-emerald-600/90 to-emerald-900/90",
    imagen: "/fotos/BioHostel5.jpg",
  },
  glamping: {
    tipo: "glamping",
    label: "Glamping",
    description: "Vive una experiencia única en medio de la naturaleza con todas las comodidades del camping de lujo.",
    gradient: "from-amber-600/90 to-amber-900/90",
    imagen: "/fotos/BioHostel10.jpg",
  },
  "centros-turisticos": {
    tipo: "centro_turistico",
    label: "Centros Turísticos",
    description: "Los mejores centros turísticos para disfrutar en familia o con amigos, con actividades para todos.",
    gradient: "from-teal-600/90 to-teal-900/90",
    imagen: "/fotos/sitio/tropical-gente3.jpg",
  },
  restaurantes: {
    tipo: "restaurante",
    label: "Restaurantes",
    description: "Sabores de la casa: gastronomía típica y los mejores espacios para comer.",
    gradient: "from-red-600/90 to-red-900/90",
    imagen: "/fotos/sitio/tropical-cocina.jpg",
  },
  bares: {
    tipo: "bar",
    label: "Bares",
    description: "Cócteles, cerveza artesanal y atardeceres con vista.",
    gradient: "from-purple-600/90 to-purple-900/90",
    imagen: "/fotos/sitio/InShot_20260910_172043288.jpg",
  },
  fincas: {
    tipo: "finca",
    label: "Fincas",
    description: "Fincas campestres con alojamiento, huertas, café y experiencias rurales auténticas.",
    gradient: "from-lime-600/90 to-lime-900/90",
    imagen: "/fotos/sitio/tropical-vegetal.jpg",
  },
  actividades: {
    tipo: "actividad",
    label: "Actividades y Tours",
    description: "Ecoturismo, avistamiento de aves, caminatas y tours guiados en la zona.",
    gradient: "from-cyan-600/90 to-cyan-900/90",
    imagen: "/fotos/sitio/tropical-cafe.jpg",
  },
};

const RATING_OPTIONS = [
  { value: 0, label: "Todas" },
  { value: 4, label: "4.0 o más" },
  { value: 3, label: "3.0 o más" },
  { value: 2, label: "2.0 o más" },
];

export default function CategoryPage() {
  const params = useParams();
  const tipoSlug = params?.tipo as string;
  const category = CATEGORY_MAP[tipoSlug];

  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [calificacionMin, setCalificacionMin] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async (minRating: number) => {
    if (!category) { setLoading(false); return; }
    setLoading(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/properties?tipo=${category.tipo}&limit=50${minRating > 0 ? `&calificacionMin=${minRating}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      setProperties(data.items || []);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error("Error fetching properties:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (category) fetchData(calificacionMin);
    else setLoading(false);
  }, [tipoSlug, calificacionMin]);

  const filteredProperties = properties.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.nombre?.toLowerCase().includes(q) ||
      p.ubicacion?.toLowerCase().includes(q) ||
      p.descripcion?.toLowerCase().includes(q) ||
      p.actividades?.some((a: string) => a.toLowerCase().includes(q))
    );
  });

  if (!category) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <div className="mx-auto max-w-md">
          <p className="mb-6 flex justify-center"><Search className="h-12 w-12 text-muted-foreground/40" /></p>
          <h1 className="text-2xl font-bold text-foreground mb-2">Categoría no encontrada</h1>
          <p className="text-muted-foreground mb-6">La categoría que buscas no existe o ha sido removida.</p>
          <a href="/" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-[#1d1d1b]">
        <img
          src={category.imagen}
          alt={category.label}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-80`} />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMjBtMC0yMGEyMCAyMCAwIDEgMCA0MCAwIDIwIDIwIDAgMSAwLTQwIDB6IiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-20" />
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24 relative">
          <nav className="mb-6 text-sm text-white/70">
            <a href="/" className="hover:text-white transition-colors">Inicio</a>
            <span className="mx-2">/</span>
            <span className="text-white">{category.label}</span>
          </nav>
          <div className="flex items-start gap-5">
            <span className="hidden sm:flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-sm shrink-0">
              <TipoIcon tipo={category.tipo} className="h-9 w-9" />
            </span>
            <div>
              <h1 className="font-display text-4xl font-semibold text-white drop-shadow-sm sm:text-5xl mb-3 flex items-center gap-3">
                <TipoIcon tipo={category.tipo} className="h-9 w-9 sm:hidden" /> {category.label}
              </h1>
              <p className="text-lg text-white/80 max-w-2xl drop-shadow">
                {category.description}
              </p>
              <div className="mt-4 flex items-center gap-3 text-sm text-white/70">
                <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm">
                  {total} {total === 1 ? "propiedad disponible" : "propiedades disponibles"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Search & Filters */}
        <div className="mb-8 rounded-xl border bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Buscar en ${category.label.toLowerCase()}...`}
                className="w-full rounded-xl border border-input bg-background text-foreground pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground mr-1">Calificación:</span>
            {RATING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCalificacionMin(opt.value)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                  calificacionMin === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-input bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-foreground/20"
                }`}
              >
                {opt.label}
              </button>
            ))}
            {searchQuery && (
              <span className="ml-auto text-xs text-muted-foreground">
                {filteredProperties.length} de {total} resultados
              </span>
            )}
          </div>
        </div>

        {/* Ad Banner */}
        <div className="mb-8">
          <AdCarousel placement="SEARCH_RESULTS_TOP" />
        </div>

        {/* Property Grid */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mb-4 flex justify-center">
              {searchQuery ? (
                <Search className="h-12 w-12 text-muted-foreground/40" />
              ) : (
                <Home className="h-12 w-12 text-muted-foreground/40" />
              )}
            </p>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {searchQuery ? "Sin resultados" : "No hay propiedades disponibles"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {searchQuery
                ? `No encontramos propiedades en "${category.label}" que coincidan con "${searchQuery}". Intenta con otros términos.`
                : `Actualmente no hay propiedades disponibles en ${category.label}${calificacionMin > 0 ? " con la calificación seleccionada" : ""}.`}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-input px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
            {filteredProperties.length < total && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Mostrando {filteredProperties.length} de {total} propiedades
              </p>
            )}
          </>
        )}

        {/* Sidebar Ad */}
        <div className="mt-8">
          <AdCarousel placement="SEARCH_RESULTS_SIDEBAR" />
        </div>
      </div>
    </div>
  );
}
