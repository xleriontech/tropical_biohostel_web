"use client";

import { useState } from "react";
import SafeImage from "./SafeImage";

export default function Gallery({ images }: { images: { url: string; esPrincipal?: boolean; id: string }[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (!images.length) return null;

  const main = images[0];
  // La grilla md tiene 4 celdas libres (la principal ocupa 2x2): más fotos
  // crearían filas implícitas sin altura. Se muestran 4 y el resto va al lightbox.
  const visibles = images.slice(1, 5);
  const ocultas = images.length - 1 - visibles.length;
  const soloUna = images.length === 1;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:grid-rows-2 md:h-[420px]">
        <div
          className={`relative row-span-2 h-72 overflow-hidden rounded-xl cursor-pointer group sm:h-80 md:h-full ${soloUna ? "col-span-2 md:col-span-4" : "col-span-2 md:col-span-2"}`}
          onClick={() => setLightbox(main.url)}
        >
          <SafeImage src={main.url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
        {visibles.map((item, i) => (
          <div
            key={item.id || i}
            className="relative h-32 overflow-hidden rounded-xl cursor-pointer group sm:h-40 md:h-full"
            onClick={() => setLightbox(item.url)}
          >
            <SafeImage src={item.url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            {ocultas > 0 && i === visibles.length - 1 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-semibold text-white">
                +{ocultas}
              </div>
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
