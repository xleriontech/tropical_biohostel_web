"use client";

import { useState } from "react";
import { COSMIC } from "@/lib/contenido";
import { MoonStar, BedDouble, Bath, Palette, BookOpen, Sparkles } from "lucide-react";

export default function CosmicBungaloPage() {
  const [lang, setLang] = useState<"es" | "en">("es");
  const t = COSMIC[lang];

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#16264D] via-[#1E3D24] to-[#7A2E14] text-white">
        <img
          src="/fotos/BioHostel9.jpg"
          alt="Interior del Cosmic Bungalow"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#16264D]/80 via-[#1E3D24]/80 to-[#7A2E14]/80" />
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:py-20">
          <div className="mb-4 flex justify-center gap-2">
            <button
              onClick={() => setLang("es")}
              className={`rounded-full px-4 py-1 text-xs font-semibold ${lang === "es" ? "bg-white text-emerald-950" : "border border-white/40 text-white"}`}
            >
              Español
            </button>
            <button
              onClick={() => setLang("en")}
              className={`rounded-full px-4 py-1 text-xs font-semibold ${lang === "en" ? "bg-white text-emerald-950" : "border border-white/40 text-white"}`}
            >
              English
            </button>
          </div>
          <nav className="mb-6 text-sm text-white/60">
            <a href="/" className="hover:text-white">Inicio</a>
            <span className="mx-2">/</span>
            <span className="text-white">{t.nombre}</span>
          </nav>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
            <MoonStar className="mr-1 inline h-4 w-4" /> {lang === "es" ? "Espacio especial de Tropical Biohostel" : "Tropical Biohostel signature space"}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">{t.nombre}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-emerald-100/90">{t.eslogan}</p>
          <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-white/85">{t.intro}</p>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-white/75">{t.habitacion}</p>

          {/* Precio */}
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-white/25 bg-white/10 p-6 backdrop-blur-sm">
            <p className="font-display text-3xl font-semibold text-white">{t.precio}</p>
            <p className="mt-1 text-sm text-white/75">{t.precioDetalle}</p>
            <p className="mt-2 text-sm text-emerald-200">{t.precioAdicional}</p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="/property/cosmic-bungalo" className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-emerald-950 shadow-xl hover:bg-emerald-50">
              {lang === "es" ? "Ver y reservar" : "See & book"}
            </a>
            <a href="/bienestar" className="rounded-full border border-white/40 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10">
              Yoga · Chi Kung · Tai Chi
            </a>
          </div>
        </div>
      </div>

      {/* Datos */}
      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* Galería real de la finca */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { src: "/fotos/BioHostel10.jpg", alt: "Cama, mándala y runas" },
            { src: "/fotos/BioHostel2.jpg", alt: "Pileta natural al aire libre" },
            { src: "/fotos/BioHostel9.jpg", alt: "Habitación con mándala" },
            { src: "/fotos/BioHostel1.jpg", alt: "Baño artesanal con murales" },
          ].map((f) => (
            <img key={f.src} src={f.src} alt={f.alt} loading="lazy"
              className="aspect-[4/3] w-full rounded-xl border object-cover shadow-sm" />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {t.datos.map((d) => (
            <div key={d.etiqueta} className="rounded-xl border bg-white p-5 text-center shadow-sm">
              <p className="font-display text-xl font-semibold text-primary">{d.valor}</p>
              <p className="mt-1 text-xs text-muted-foreground">{d.etiqueta}</p>
            </div>
          ))}
        </div>

        {/* Arquitectura */}
        <section className="mt-10 rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <Palette className="h-6 w-6 text-primary" /> {t.arquitecturaTitulo}
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{t.arquitectura}</p>
        </section>

        {/* Descanso */}
        <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <BedDouble className="h-6 w-6 text-primary" /> {t.descansoTitulo}
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{t.descanso}</p>
        </section>

        {/* Exterior */}
        <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <Bath className="h-6 w-6 text-primary" /> {t.exteriorTitulo}
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{t.exterior}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {t.fauna.map((f) => (
              <span key={f} className="rounded-full bg-emerald-50 px-3 py-1 text-xs capitalize text-emerald-800">
                {f}
              </span>
            ))}
          </div>
        </section>

        {/* Entorno */}
        <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <BookOpen className="h-6 w-6 text-primary" /> {t.entornoTitulo}
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{t.entorno}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {t.crear.map((c) => (
              <span key={c} className="rounded-full bg-secondary px-3 py-1 text-xs">
                {c}
              </span>
            ))}
          </div>
        </section>

        {/* Bienestar post-reserva */}
        <section className="mt-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-secondary to-accent p-6 shadow-sm sm:p-8">
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <Sparkles className="h-6 w-6 text-primary" /> {t.bienestarTitulo}
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{t.bienestar}</p>
        </section>

        <p className="mx-auto mt-8 max-w-2xl text-center font-display text-xl italic leading-relaxed">{t.cierre}</p>
        <div className="mt-6 text-center">
          <a href="/property/cosmic-bungalo" className="inline-block rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            {lang === "es" ? "Reservar Cosmic Bungalow" : "Book Cosmic Bungalow"}
          </a>
        </div>
      </div>
    </div>
  );
}
