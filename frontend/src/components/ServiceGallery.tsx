"use client";

import { useState, useEffect, useCallback } from "react";
import { absoluteUrl } from "@/lib/api-base";
import SafeImage from "./SafeImage";

export default function ServiceGallery({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (images.length < 2) return;
    const id = setInterval(next, 4000);
    return () => clearInterval(id);
  }, [images.length, next]);

  if (!images.length) return null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-muted" style={{ aspectRatio: "16/9" }}>
      {images.map((url, i) => (
        <SafeImage
          key={i}
          src={absoluteUrl(url)}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`}
        />
      ))}

      {images.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((i) => (i - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            onClick={() => setCurrent((i) => (i + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${i === current ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
