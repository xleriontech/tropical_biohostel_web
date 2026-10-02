"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Megaphone } from "lucide-react";
import { absoluteUrl } from "@/lib/api-base";
import SafeImage from "./SafeImage";

interface Ad {
  id: string;
  titulo?: string;
  imagenUrl: string;
  linkUrl: string;
  placement: string;
  prioridad: number;
  pagoTotal: number;
  sponsor?: { nombre: string; logoUrl?: string };
}

interface AdDisplayConfig {
  format: "horizontal" | "vertical" | "sidebar";
  showWithParallax: boolean;
}

/**
 * Telemetría de anuncios a prueba de ruido: usa sendBeacon (no genera
 * promesas rechazadas ni preflights) y jamás deja errores en consola.
 * Si el backend no está disponible, simplemente se pierde el evento.
 */
function trackEvent(adId: string, tipo: "impression" | "click") {
  try {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/ads/${adId}/${tipo}`;
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    fetch(url, { method: "POST", signal: ctrl.signal, keepalive: true })
      .then(() => clearTimeout(t))
      .catch(() => clearTimeout(t));
  } catch {
    // silencio total: el tracking nunca debe romper ni ensuciar la consola
  }
}

function getTier(pagoTotal: number) {
  if (pagoTotal >= 100000) return { label: "Premium", duration: 10000, skippable: false, desc: "10s · No skippeable" };
  if (pagoTotal >= 50000) return { label: "Básico", duration: 5000, skippable: true, desc: "5s · Skippeable" };
  return { label: "Gratuito", duration: 3000, skippable: true, desc: "3s · Skippeable" };
}

function getHeight(pagoTotal: number, format: string): string {
  const base = pagoTotal;
  if (format === "vertical") {
    if (base >= 100000) return "500px";
    if (base >= 50000) return "380px";
    return "260px";
  }
  if (format === "sidebar") {
    if (base >= 100000) return "320px";
    if (base >= 50000) return "260px";
    return "200px";
  }
  // horizontal
  if (base >= 100000) return "280px";
  if (base >= 50000) return "220px";
  return "160px";
}

const FORMAT_STYLES: Record<string, { container: string; image: string; overlay: string }> = {
  horizontal: {
    container: "w-full",
    image: "",
    overlay: "bg-gradient-to-r from-black/40 via-transparent to-black/20",
  },
  vertical: {
    container: "w-full",
    image: "",
    overlay: "bg-gradient-to-t from-black/50 via-transparent to-black/20",
  },
  sidebar: {
    container: "w-full",
    image: "",
    overlay: "bg-gradient-to-t from-black/50 via-transparent to-black/30",
  },
};

export default function AdCarousel({ placement, className = "" }: { placement: string; className?: string }) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(100);
  const [paused, setPaused] = useState(false);
  const [format, setFormat] = useState<AdDisplayConfig>({ format: "horizontal", showWithParallax: false });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasTracked = useRef(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/ads?placement=${placement}`)
      .then((res) => res.ok ? res.json() : [])
      .then(setAds)
      .catch(() => {});
  }, [placement]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/config/ads-display`)
      .then((res) => res.ok ? res.json() : {})
      .then((data: Record<string, AdDisplayConfig>) => {
        const pc = data[placement];
        if (pc) setFormat(pc);
      })
      .catch(() => {});
  }, [placement]);

  const trackImpression = useCallback((adId: string) => {
    trackEvent(adId, "impression");
  }, []);

  const trackClick = useCallback((adId: string) => {
    trackEvent(adId, "click");
  }, []);

  const goNext = useCallback(() => {
    setCurrent((prev) => {
      const next = (prev + 1) % ads.length;
      hasTracked.current = false;
      return next;
    });
    setProgress(100);
  }, [ads.length]);

  const ad = ads[current];
  const tier = ad ? getTier(ad.pagoTotal) : { duration: 5000, skippable: true, label: "", desc: "" };
  const fmt = FORMAT_STYLES[format.format] || FORMAT_STYLES.horizontal;
  const adHeight = ad ? getHeight(ad.pagoTotal, format.format) : "160px";

  useEffect(() => {
    if (!ad || ads.length <= 1 || paused) return;
    intervalRef.current = setInterval(goNext, tier.duration);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [ad, ads.length, paused, goNext, tier.duration]);

  useEffect(() => {
    if (!ad || ads.length <= 1 || paused) return;
    const step = 50;
    const totalSteps = tier.duration / step;
    let stepCount = 0;
    progressRef.current = setInterval(() => {
      stepCount++;
      setProgress(Math.max(0, 100 - (stepCount / totalSteps) * 100));
    }, step);
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [ad, ads.length, paused, tier.duration]);

  useEffect(() => {
    if (ad && !hasTracked.current) {
      hasTracked.current = true;
      trackImpression(ad.id);
    }
  }, [ad, trackImpression]);

  if (!ads.length) return null;

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-secondary/30 shadow-sm ${className}`}>
      {/* Dots */}
      <div className="flex gap-1 absolute top-3 left-3 z-10">
        {ads.map((_, i) => (
          <button key={i} onClick={() => { setCurrent(i); setProgress(100); hasTracked.current = false; }}
            className={`h-1.5 rounded-full transition-all ${i === current ? "w-6 bg-primary" : "w-1.5 bg-white/50 hover:bg-white/80"}`} />
        ))}
      </div>

      <a
        key={ad?.id}
        href={ad?.linkUrl || "#"}
        target="_blank"
        onClick={() => ad && trackClick(ad.id)}
        className="relative block"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className={`relative ${fmt.container} overflow-hidden bg-muted`} style={{ height: adHeight }}>
          {ad?.imagenUrl ? (
            <SafeImage src={absoluteUrl(ad.imagenUrl)} alt={ad?.titulo || ""} className={`h-full w-full object-cover ${fmt.image}`} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/30">
              <Megaphone className="h-10 w-10" />
            </div>
          )}
          {format.format === "horizontal" && (
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20" />
          )}
          {format.format === "vertical" && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
          )}

          {/* Text overlay - adapt to format */}
          <div className={`absolute ${format.format === "vertical" ? "bottom-0 left-0 right-0 p-4" : "bottom-0 left-0 right-0 p-4 sm:p-6"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className={format.format === "sidebar" ? "" : "max-w-[70%]"}>
                {ad?.titulo && (
                  <h3 className={`font-bold text-white drop-shadow-sm leading-tight mb-1 ${format.format === "vertical" ? "text-sm" : "text-base sm:text-lg"}`}>{ad.titulo}</h3>
                )}
                {ad?.sponsor?.nombre && (
                  <p className="text-xs text-white/80 drop-shadow-sm">{ad.sponsor.nombre}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-lg bg-white/20 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white border border-white/20">
                  {tier.label}
                </span>
              </div>
            </div>
          </div>

          {ad?.sponsor?.logoUrl && (
            <div className="absolute top-3 right-3">
              <img src={absoluteUrl(ad.sponsor.logoUrl)} alt="" className="h-8 w-8 rounded-lg bg-white/90 object-contain p-1 shadow-sm" />
            </div>
          )}

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div className="h-full bg-white/70 transition-[width] duration-[50ms] ease-linear" style={{ width: `${progress}%` }} />
          </div>

          {tier.skippable && ads.length > 1 && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); goNext(); }}
              className="absolute right-3 top-12 rounded-lg bg-black/30 px-2.5 py-1 text-[11px] text-white/80 hover:bg-black/50 hover:text-white backdrop-blur-sm transition-colors"
            >
              Saltar →
            </button>
          )}
        </div>
      </a>
    </div>
  );
}
