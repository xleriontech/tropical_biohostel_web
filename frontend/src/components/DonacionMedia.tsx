"use client";

export interface MediaItem {
  tipo: "imagen" | "video";
  url: string;
}

/** Extrae el ID de un link de YouTube (watch, youtu.be, embed, shorts). */
export function youtubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  return m ? m[1] : null;
}

function Celda({ item, grande = false }: { item: MediaItem; grande?: boolean }) {
  const yt = item.tipo === "video" ? youtubeId(item.url) : null;
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-muted ${grande ? "col-span-2 aspect-[16/8]" : "aspect-video"}`}
    >
      {item.tipo === "imagen" || (!yt && item.tipo !== "video") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : yt ? (
        <iframe
          src={`https://www.youtube.com/embed/${yt}`}
          title="Video del proyecto"
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      ) : (
        <video src={item.url} controls preload="metadata" className="h-full w-full bg-black object-contain" />
      )}
    </div>
  );
}

/**
 * Collage que se adapta a la cantidad de piezas:
 * 1 = panorámica · 2 = lado a lado · 3+ = primera panorámica + pares.
 * Máximo 6 visibles con insignia +N.
 */
export default function DonacionMedia({ items }: { items: MediaItem[] }) {
  const lista = (Array.isArray(items) ? items : []).filter((m) => m && m.url);
  if (!lista.length) return null;
  const visibles = lista.slice(0, 6);
  const ocultos = lista.length - visibles.length;

  if (visibles.length === 1) {
    return (
      <div className="overflow-hidden rounded-2xl">
        <Celda item={visibles[0]} grande />
      </div>
    );
  }
  if (visibles.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {visibles.map((m, i) => (
          <Celda key={i} item={m} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <Celda item={visibles[0]} grande />
      {visibles.slice(1).map((m, i, arr) => (
        <div key={i} className="relative">
          <Celda item={m} />
          {ocultos > 0 && i === arr.length - 1 && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/55 text-lg font-semibold text-white">
              +{ocultos}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
