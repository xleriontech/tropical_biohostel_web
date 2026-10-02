"use client";

import { useState } from "react";
import { unidadPrecio } from "./icons";
import { BadgeCheck, ChevronLeft, ChevronRight, Heart, Star } from "lucide-react";
import { alternarGuardado, esGuardado } from "@/lib/wishlist";
import SafeImage from "./SafeImage";

export default function PropertyCard({ property, sponsored = false }: { property: any; sponsored?: boolean }) {
  const images: any[] = property.images?.length ? property.images : [];
  const [img, setImg] = useState(0);
  const [saved, setSaved] = useState(() => esGuardado(property.slug));
  const [pop, setPop] = useState(false);

  const mainImage = images[img] || images[0];
  const rating = property.ratingPromedio ?? property.rating ?? null;
  const reviews = property.totalReviews ?? property.reviews?.length ?? 0;

  const heart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaved(alternarGuardado(property.slug));
    setPop(true);
    window.setTimeout(() => setPop(false), 350);
  };

  const shift = (e: React.MouseEvent, dir: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (images.length > 1) setImg((i) => (i + dir + images.length) % images.length);
  };

  return (
    <article className="group">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-muted">
        <a href={`/property/${property.slug}`} className="absolute inset-0 z-0" aria-label={`Ver ${property.nombre}`} />
        {mainImage ? (
          <SafeImage
            src={mainImage.url}
            alt={property.nombre}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sin imagen
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
        {sponsored ? (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-yellow-400/95 px-2.5 py-1 text-[11px] font-semibold text-yellow-900">
            Patrocinado
          </span>
        ) : (
          property.verificado && (
            <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-green-700">
              <BadgeCheck className="h-3.5 w-3.5" /> Verificado
            </span>
          )
        )}
        <button
          type="button"
          onClick={heart}
          aria-label={saved ? "Quitar de guardados" : "Guardar"}
          aria-pressed={saved}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-gray-900 shadow-sm"
        >
          <Heart className={`h-5 w-5 transition-transform ${pop ? "scale-125" : ""} ${saved ? "fill-red-500 text-red-500" : ""}`} />
        </button>
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={(e) => shift(e, -1)}
              className="absolute left-3 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-100 shadow-sm md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={(e) => shift(e, 1)}
              className="absolute right-3 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-100 shadow-sm md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
              {images.slice(0, 5).map((im: any, dot: number) => (
                <span key={im.id || dot} className={`h-1.5 w-1.5 rounded-full ${dot === img ? "bg-white" : "bg-white/50"}`} />
              ))}
            </div>
          </>
        )}
      </div>
      <a href={`/property/${property.slug}`} className="mt-3 block">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium leading-snug tracking-tight">{property.nombre}</h3>
          {rating !== null && rating !== undefined ? (
            <span className="flex shrink-0 items-center gap-1 text-sm">
              <Star className="h-3.5 w-3.5 fill-current" />
              {Number(rating).toFixed(1)}
              {reviews > 0 && <span className="text-muted-foreground">({reviews})</span>}
            </span>
          ) : (
            <span className="shrink-0 text-sm text-muted-foreground">Nuevo</span>
          )}
        </div>
        <p className="mt-0.5 text-sm capitalize text-muted-foreground">
          {property.tipo?.replace("_", " ")} · {property.ciudad || property.ubicacion}
        </p>
        <p className="text-sm text-muted-foreground">
          Hasta {property.capacidadMaxima} huéspedes
          {property.admiteMascotas ? " · Pet-friendly" : ""}
        </p>
        <p className="mt-1.5 text-sm">
          <span className="font-semibold">${Number(property.precioNoche).toLocaleString("es-CO")}</span>
          <span className="text-muted-foreground"> {unidadPrecio(property.tipo)}</span>
        </p>
      </a>
    </article>
  );
}
