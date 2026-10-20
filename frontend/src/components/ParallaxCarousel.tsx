"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ParallaxImage {
  url: string;
  alt?: string;
}

interface ParallaxConfig {
  images: ParallaxImage[];
  intervalSeconds: number;
  transitionMode?: "fade" | "slide" | "zoom";
  transitionDuration?: number;
}

const FALLBACK_IMAGES: ParallaxImage[] = [
  { url: "/fotos/BioHostel10.jpg", alt: "Cosmic Bungalow — cama y mándala" },
  { url: "/fotos/BioHostel2.jpg", alt: "Pileta natural al aire libre" },
  { url: "/fotos/BioHostel9.jpg", alt: "Habitación con mándalas" },
  { url: "/fotos/BioHostel6.jpg", alt: "Rincón de descanso artesanal" },
  { url: "/fotos/BioHostel5.jpg", alt: "Interior en bambú de Cosmic Bungalow" },
];

export default function ParallaxCarousel() {
  const [images, setImages] = useState<ParallaxImage[]>(FALLBACK_IMAGES);
  const [interval, setInterval_] = useState(5);
  const [transitionMode, setTransitionMode] = useState<"fade" | "slide" | "zoom">("fade");
  const [transitionDuration, setTransitionDuration] = useState(600);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [offsetY, setOffsetY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/config/parallax`)
      .then((res) => res.json())
      .then((data: ParallaxConfig) => {
        if (data.images && data.images.length > 0) setImages(data.images);
        if (data.intervalSeconds) setInterval_(data.intervalSeconds);
        if (data.transitionMode) setTransitionMode(data.transitionMode);
        if (data.transitionDuration) setTransitionDuration(data.transitionDuration);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleScroll = () => setOffsetY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const advance = useCallback(() => {
    setPrevIndex(currentIndex);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [currentIndex, images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(advance, interval * 1000);
    return () => clearInterval(timer);
  }, [images.length, interval, advance]);

  const dur = transitionDuration;
  const parY = offsetY * 0.4;

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {images.map((img, i) => {
        const isCurrent = i === currentIndex;
        const isPrev = i === prevIndex;

        let style: React.CSSProperties = {
          position: "absolute",
          inset: 0,
          willChange: "transform, opacity",
        };

        if (transitionMode === "slide") {
          const txPrev = isPrev ? "-30%" : "0%";
          const txCurr = isCurrent ? "0%" : isPrev ? "-30%" : "30%";
          style = {
            ...style,
            opacity: isCurrent || isPrev ? 1 : 0,
            transform: `translateX(${isCurrent ? txCurr : isPrev ? txPrev : "30%"}) translateY(${parY}px) scale(1.1)`,
            transition: isCurrent || isPrev ? `transform ${dur}ms ease-in-out, opacity ${dur}ms ease-in-out` : "none",
            zIndex: isCurrent ? 2 : isPrev ? 1 : 0,
          };
        } else if (transitionMode === "zoom") {
          style = {
            ...style,
            opacity: isCurrent ? 1 : isPrev ? 0 : 0,
            transform: `translateY(${parY}px) scale(${isCurrent ? 1.1 : isPrev ? 1.4 : 1.1})`,
            transition: `transform ${dur}ms ease-out, opacity ${dur * 0.6}ms ease-in-out`,
            zIndex: isCurrent ? 2 : 1,
          };
        } else {
          // fade
          style = {
            ...style,
            opacity: isCurrent ? 1 : 0,
            transform: `translateY(${parY}px) scale(1.1)`,
            transition: `opacity ${dur}ms ease-in-out`,
            zIndex: isCurrent ? 2 : 1,
          };
        }

        return (
          <div key={i} style={style}>
            <img
              src={img.url}
              alt={img.alt || `Fondo ${i + 1}`}
              className="h-full w-full object-cover"
            />
          </div>
        );
      })}
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
}
