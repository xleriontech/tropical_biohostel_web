import { useState, type MouseEvent } from "react";
import { money, quote, ratingLabel } from "@/lib";
import { useNido } from "@/store";
import type { Property } from "@/types";
import { cn } from "@/utils/cn";
import { Icon, paths, Star } from "./ui";

export function PropertyCard({ property, index }: { property: Property; index?: number }) {
  const { openProperty, favorites, toggleFavorite, search, setHighlightId, highlightId } = useNido();
  const [image, setImage] = useState(0);
  const [pop, setPop] = useState(false);
  const saved = favorites.includes(property.id);
  const nights = search.checkIn && search.checkOut ? quote(property, search.checkIn, search.checkOut).nights : 0;
  const total = nights > 0 ? quote(property, search.checkIn, search.checkOut).total : 0;
  const src = property.images[image] ?? property.images[0];

  const heart = (event: MouseEvent) => {
    event.stopPropagation();
    setPop(true);
    toggleFavorite(property.id);
    window.setTimeout(() => setPop(false), 350);
  };

  const shift = (event: MouseEvent, dir: number) => {
    event.stopPropagation();
    setImage((current) => (current + dir + property.images.length) % property.images.length);
  };

  return (
    <article
      className={cn("group", highlightId === property.id && "relative")}
      onMouseEnter={() => setHighlightId(property.id)}
      onMouseLeave={() => setHighlightId(null)}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-sand">
        <button type="button" onClick={() => openProperty(property.id)} className="absolute inset-0 z-0" aria-label={`Ver ${property.title}`} />
        <img src={src} alt={property.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-ink/10" />
        {(property.guestFavorite || property.isNew) && (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-medium tracking-wide">
            {property.isNew ? "Nuevo" : "Favorita"}
          </span>
        )}
        {typeof index === "number" && (
          <span className="pointer-events-none absolute bottom-3 left-3 font-serif text-sm text-white/90">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
        <button
          type="button"
          onClick={heart}
          aria-label={saved ? "Quitar de guardados" : "Guardar"}
          aria-pressed={saved}
          className={cn("absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-card/90 text-ink shadow-sm", pop && "animate-pop")}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path
              d={paths.heart}
              className={saved ? "fill-clay stroke-clay" : "fill-transparent stroke-ink"}
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {property.images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={(event) => shift(event, -1)}
              className="absolute left-3 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-card/90 opacity-100 shadow-sm md:opacity-0 md:group-hover:opacity-100"
            >
              <Icon d={paths.chevronLeft} className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={(event) => shift(event, 1)}
              className="absolute right-3 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-card/90 opacity-100 shadow-sm md:opacity-0 md:group-hover:opacity-100"
            >
              <Icon d={paths.chevron} className="h-4 w-4" />
            </button>
            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
              {property.images.slice(0, 5).map((item, dot) => (
                <span key={item} className={cn("h-1.5 w-1.5 rounded-full", dot === image ? "bg-white" : "bg-white/50")} />
              ))}
            </div>
          </>
        )}
      </div>
      <button type="button" onClick={() => openProperty(property.id)} className="mt-3 block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium leading-snug tracking-tight">{property.title}</h3>
          {property.reviewsCount > 0 ? (
            <span className="flex shrink-0 items-center gap-1 text-sm">
              <Star />
              {ratingLabel(property.rating)}
            </span>
          ) : (
            <span className="text-sm text-muted">Nuevo</span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {property.type} · {property.city}, {property.country}
        </p>
        <p className="text-sm text-muted">
          {property.guests} huéspedes · {property.bedrooms} hab
          {property.instant ? " · reserva inmediata" : ""}
        </p>
        <p className="mt-1.5 text-sm">
          {nights > 0 ? (
            <>
              <span className="font-semibold underline decoration-ink/25 underline-offset-4">{money(total)}</span>
              <span className="text-muted"> total</span>
            </>
          ) : (
            <>
              <span className="font-semibold">{money(property.price)}</span>
              <span className="text-muted"> noche</span>
            </>
          )}
        </p>
      </button>
    </article>
  );
}
