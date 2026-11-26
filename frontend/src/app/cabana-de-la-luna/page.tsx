"use client";

import { useState } from "react";
import { Moon, BedDouble, Bath, Shirt, Users, Sparkles } from "lucide-react";

const CONTENT = {
  es: {
    nombre: "Cabaña de la Luna",
    eslogan: "Calidez, confort y descanso en medio de la naturaleza",
    intro:
      "Un espacio cálido y acogedor de 5 × 5 m, completamente equipado y pensado para el máximo confort. Dispone de un amplio baño y un cómodo vestier, ideal para desconectarte con todas las comodidades a tu alcance.",
    capacidad: "Capacidad conjunta entre ambas cabañas: hasta 7 personas.",
    precio: "$360.000 COP",
    precioDetalle: "por noche",
    precioNota: "Incluido el Desayuno",
    datos: [
      { valor: "5 × 5 m", etiqueta: "espacio acogedor" },
      { valor: "Baño amplio", etiqueta: "comodidad total" },
      { valor: "Vestier", etiqueta: "espacio para tu estadía" },
      { valor: "Hasta 7", etiqueta: "personas entre ambas cabañas" },
    ],
    secciones: [
      {
        titulo: "Confort pensado para ti",
        icono: BedDouble,
        texto:
          "La Cabaña de la Luna está diseñada para que descanses con tranquilidad. Cada detalle está pensado para ofrecerte una estadía cómoda, cálida y conectada con el entorno natural de la finca.",
      },
      {
        titulo: "Baño amplio y vestier",
        icono: Bath,
        texto:
          "Cuenta con un baño amplio y un cómodo vestier, para que tengas todo lo que necesitas durante tu estadía sin renunciar a la comodidad.",
      },
      {
        titulo: "Naturaleza y descanso",
        icono: Sparkles,
        texto:
          "Despierta con los sonidos del bosque, respira aire puro y disfruta de un refugio donde la calma y la naturaleza son protagonistas.",
      },
    ],
    cierre:
      "Cabaña de la Luna: un refugio cálido para desconectarte, descansar y habitar la naturaleza con confort.",
    cta: "Consultar disponibilidad",
  },
  en: {
    nombre: "Moon Cabin",
    eslogan: "Warmth, comfort, and rest in the heart of nature",
    intro:
      "A warm and welcoming 5 × 5 m space, fully equipped and designed for maximum comfort. It features a spacious bathroom and a comfortable walk-in closet, ideal for disconnecting with every convenience at hand.",
    capacidad: "Combined capacity between both cabins: up to 7 people.",
    precio: "$360,000 COP",
    precioDetalle: "per night",
    precioNota: "Breakfast included",
    datos: [
      { valor: "5 × 5 m", etiqueta: "cozy space" },
      { valor: "Spacious bath", etiqueta: "total comfort" },
      { valor: "Walk-in closet", etiqueta: "room for your stay" },
      { valor: "Up to 7", etiqueta: "people between both cabins" },
    ],
    secciones: [
      {
        titulo: "Comfort designed for you",
        icono: BedDouble,
        texto:
          "Moon Cabin is designed for peaceful rest. Every detail is meant to offer you a comfortable, warm stay connected to the farm's natural surroundings.",
      },
      {
        titulo: "Spacious bathroom and closet",
        icono: Bath,
        texto:
          "It features a spacious bathroom and a comfortable walk-in closet, so you have everything you need during your stay without giving up comfort.",
      },
      {
        titulo: "Nature and rest",
        icono: Sparkles,
        texto:
          "Wake up to the sounds of the forest, breathe fresh air, and enjoy a refuge where calm and nature take center stage.",
      },
    ],
    cierre:
      "Moon Cabin: a warm refuge to disconnect, rest, and inhabit nature in comfort.",
    cta: "Check availability",
  },
} as const;

export default function CabanaDeLaLunaPage() {
  const [lang, setLang] = useState<"es" | "en">("es");
  const t = CONTENT[lang];

  return (
    <div>
      <div className="relative overflow-hidden bg-[#1d1d1b] text-white">
        <img
          src="/fotos/BioHostel5.jpg"
          alt={t.nombre}
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1d1d1b]/70 via-[#2a3a2a]/50 to-[#1d1d1b]/70" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-16 text-center sm:py-20">
          <div className="mb-4 flex justify-center gap-2">
            <button onClick={() => setLang("es")} className={`rounded-full px-4 py-1 text-xs font-semibold ${lang === "es" ? "bg-white text-emerald-950" : "border border-white/40 text-white"}`}>Español</button>
            <button onClick={() => setLang("en")} className={`rounded-full px-4 py-1 text-xs font-semibold ${lang === "en" ? "bg-white text-emerald-950" : "border border-white/40 text-white"}`}>English</button>
          </div>
          <nav className="mb-6 text-sm text-white/60">
            <a href="/" className="hover:text-white">Inicio</a>
            <span className="mx-2">/</span>
            <a href="/categoria/hostales/" className="hover:text-white">{lang === "es" ? "Hospedaje" : "Lodging"}</a>
            <span className="mx-2">/</span>
            <span className="text-white">{t.nombre}</span>
          </nav>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
            <Moon className="mr-1 inline h-4 w-4" /> {lang === "es" ? "Alojamiento · Tropical Biohostel" : "Lodging · Tropical Biohostel"}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">{t.nombre}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-emerald-100/90">{t.eslogan}</p>
          <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-white/85">{t.intro}</p>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-white/70">{t.capacidad}</p>

          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-white/25 bg-white/10 p-6 backdrop-blur-sm">
            <p className="font-display text-3xl font-semibold text-white">{t.precio}</p>
            <p className="mt-1 text-sm text-white/75">{t.precioDetalle}</p>
            <p className="mt-1 text-sm font-medium text-emerald-200">{t.precioNota}</p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="https://wa.me/573209079174" target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-emerald-950 shadow-xl hover:bg-emerald-50">
              {t.cta}
            </a>
            <a href="/categoria/hostales/" className="rounded-full border border-white/40 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10">
              {lang === "es" ? "Ver todos los alojamientos" : "See all lodging"}
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { src: "/fotos/BioHostel5.jpg", alt: t.nombre },
            { src: "/fotos/BioHostel6.jpg", alt: t.nombre },
            { src: "/fotos/BioHostel4.jpg", alt: t.nombre },
            { src: "/fotos/BioHostel3.jpg", alt: t.nombre },
          ].map((f) => (
            <img key={f.src} src={f.src} alt={f.alt} loading="lazy" className="aspect-[4/3] w-full rounded-xl border object-cover shadow-sm" />
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

        {t.secciones.map((s, i) => {
          const Icon = s.icono;
          return (
            <section key={i} className="mt-6 rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
              <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
                <Icon className="h-6 w-6 text-primary" /> {s.titulo}
              </h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{s.texto}</p>
            </section>
          );
        })}

        <p className="mx-auto mt-8 max-w-2xl text-center font-display text-xl italic leading-relaxed">{t.cierre}</p>
        <div className="mt-6 text-center">
          <a href="https://wa.me/573209079174" target="_blank" rel="noopener noreferrer" className="inline-block rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            {t.cta}
          </a>
        </div>
      </div>
    </div>
  );
}