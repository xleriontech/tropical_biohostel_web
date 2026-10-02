import {
  BedDouble,
  Bike,
  Bird,
  BookOpen,
  Building2,
  CableCar,
  Compass,
  Fish,
  Flame,
  Flower2,
  Footprints,
  Home,
  Hotel,
  Mountain,
  Sparkles,
  Sprout,
  Star,
  Telescope,
  Tent,
  Tractor,
  Trees,
  UtensilsCrossed,
  Waves,
  Wine,
} from "lucide-react";

/** Icono según el tipo de sitio (alojamiento, gastronomía, tours...). */
export function TipoIcon({ tipo, className }: { tipo: string; className?: string }) {
  const cls = className || "h-5 w-5";
  switch (tipo) {
    case "hotel":
      return <Hotel className={cls} />;
    case "hostal":
      return <Home className={cls} />;
    case "glamping":
      return <Tent className={cls} />;
    case "centro_turistico":
      return <Trees className={cls} />;
    case "restaurante":
      return <UtensilsCrossed className={cls} />;
    case "bar":
      return <Wine className={cls} />;
    case "finca":
      return <Tractor className={cls} />;
    case "actividad":
      return <Compass className={cls} />;
    default:
      return <Building2 className={cls} />;
  }
}

/** Sufijo de precio según el tipo: alojamientos por noche, el resto por persona. */
export function unidadPrecio(tipo: string): string {
  switch (tipo) {
    case "restaurante":
    case "bar":
    case "actividad":
      return "/ persona";
    default:
      return "/ noche";
  }
}

/** Etiqueta en español para el tipo (usada en breadcrumb y títulos). */
export function tipoLabel(tipo: string): string {
  switch (tipo) {
    case "hotel":
      return "Hoteles";
    case "hostal":
      return "Hostales";
    case "glamping":
      return "Glamping";
    case "centro_turistico":
      return "Centros turísticos";
    case "restaurante":
      return "Restaurantes";
    case "bar":
      return "Bares";
    case "finca":
      return "Fincas";
    case "actividad":
      return "Actividades";
    default:
      return tipo.replace("_", " ");
  }
}

/** Slug de categoría para el tipo (usado en breadcrumb y enlaces). */
export function categoriaSlug(tipo: string): string {
  switch (tipo) {
    case "hotel":
      return "hoteles";
    case "hostal":
      return "hostales";
    case "glamping":
      return "glamping";
    case "centro_turistico":
      return "centros-turisticos";
    case "restaurante":
      return "restaurantes";
    case "bar":
      return "bares";
    case "finca":
      return "fincas";
    case "actividad":
      return "actividades";
    default:
      return "hoteles";
  }
}

function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Icono según la actividad (senderismo, piscina, fogata, etc.). */
export function ActividadIcon({ actividad, className }: { actividad: string; className?: string }) {
  const cls = className || "h-4 w-4";
  const a = norm(actividad);
  if (/senderismo|caminata|sendero|trekking/.test(a)) return <Footprints className={cls} />;
  if (/avistamiento|aves|pajaros|ornitologia/.test(a)) return <Bird className={cls} />;
  if (/yoga|meditacion|mindfulness/.test(a)) return <Flower2 className={cls} />;
  if (/gastronom|comida|cafetal|caf[eé]|cocina/.test(a)) return <UtensilsCrossed className={cls} />;
  if (/ciclismo|bicicleta|bici|mtb/.test(a)) return <Bike className={cls} />;
  if (/pesca|pescar/.test(a)) return <Fish className={cls} />;
  if (/canopy|tirolesa|tirolina/.test(a)) return <CableCar className={cls} />;
  if (/rappel|rapel|escalada|montana|aventura/.test(a)) return <Mountain className={cls} />;
  if (/natacion|piscina|alberca/.test(a)) return <Waves className={cls} />;
  if (/fogata|fogon/.test(a)) return <Flame className={cls} />;
  if (/astronom|estrellas/.test(a)) return <Telescope className={cls} />;
  if (/lectura|leer|libros|biblioteca/.test(a)) return <BookOpen className={cls} />;
  if (/permacultura|huerta|agroecolog|ecolog|sostenible/.test(a)) return <Sprout className={cls} />;
  if (/spa|jacuzzi|masaje|termal|bienestar/.test(a)) return <Sparkles className={cls} />;
  if (/camping|acampar|carpa|glamping/.test(a)) return <Tent className={cls} />;
  return <Compass className={cls} />;
}

/** Fila de 5 estrellas con relleno según el valor (soporta decimales con media estrella visual). */
export function StarRating({ value, className }: { value: number; className?: string }) {
  const cls = className || "h-4 w-4";
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${cls} ${i < Math.round(value) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`}
        />
      ))}
    </span>
  );
}

/** Estrella individual decorativa (rating promedio numérico). */
export function RatingBadge({ value }: { value: number | string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1 shadow-sm">
      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
      <span className="text-sm font-bold text-yellow-600">{value}</span>
    </span>
  );
}

/** Icono de cama doble reutilizable en fichas de propiedad. */
export function BedIcon({ className }: { className?: string }) {
  return <BedDouble className={className || "h-4 w-4"} />;
}
