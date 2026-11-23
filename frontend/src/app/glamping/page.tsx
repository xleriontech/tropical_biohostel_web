"use client";

import { useState } from "react";
import { Tent, Users, Sparkles, TreePine } from "lucide-react";

const CONTENT = {
  es: {
    nombre: "Glamping",
    eslogan: "Aventura y confort en medio del bosque",
    intro:
      "La combinación perfecta entre aventura y confort. Diseñado para grupos o familias de hasta 4 personas que desean dormir inmersos en los sonidos del bosque sin renunciar a una estadía placentera.",
    precio: "$120.000 COP",
    precioDetalle: "por persona / noche",
    precioNota: "Incluido el Desayuno",
    datos: [
      { valor: "Hasta 4", etiqueta: "personas" },
      { valor: "Bosque", etiqueta: "inmersión natural" },
      { valor: "Confort", etiqueta: "aventura sin renunciar al descanso" },
      { valor: "Desayuno", etiqueta: "incluido" },
    ],
    secciones: [
      {
        titulo: "Naturaleza sin renunciar al confort",
        icono: Tent,
        texto:
          "Nuestro glamping te permite vivir la experiencia de dormir en medio de la naturaleza, escuchando los sonidos del bosque, con la comodidad necesaria para un descanso placentero.",
      },
      {
        titulo: "Ideal para grupos y familias",
        icono: Users,
        texto:
          "Diseñado para grupos o familias de hasta 4 personas que buscan una experiencia diferente, cercana a la naturaleza y llena de tranquilidad.",
      },
      {
        titulo: "Despierta en el bosque",
        icono: TreePine,
        texto:
          "Respira aire puro, desconéctate del ruido y deja que el ritmo natural del entorno marque tu estadía. Una forma auténtica de habitar la finca.",
      },
    ],
    cierre:
      "Glamping en Tropical Biohostel: duerme en el bosque, despierta con la naturaleza.",
    cta: "Consultar disponibilidad",
  },
  en: {
    nombre: "Glamping",
    eslogan: "Adventure and comfort in the heart of the forest",
    intro:
      "The perfect combination of adventure and comfort. Designed for groups or families of up to 4 people who want to sleep immersed in the sounds of the forest without giving up a pleasant stay.",
    precio: "$120,000 COP",
    precioDetalle: "per person / night",
    precioNota: "Breakfast included",
    datos: [
      { valor: "Up to 4", etiqueta: "people" },
      { valor: "Forest", etiqueta: "natural immersion" },
      { valor: "Comfort", etiqueta: "adventure without giving up rest" },
      { valor: "Breakfast", etiqueta: "included" },
    ],
    secciones: [
      {
        titulo: "Nature without giving up comfort",
        icono: Tent,
        texto:
          "Our glamping lets you experience sleeping in nature, listening to the sounds of the forest, with the comfort you need for a pleasant rest.",
      },
      {
        titulo: "Ideal for groups and families",
        icono: Users,
        texto:
          "Designed for groups or families of up to 4 people looking for a different experience, close to nature and full of tranquility.",
      },
      {
        titulo: "Wake up in the forest",
        icono: TreePine,
        texto:
          "Breathe fresh air, disconnect from noise, and let the natural rhythm of the surroundings shape your stay. An authentic way to inhabit the farm.",
      },
    ],
    cierre:
      "Glamping at Tropical Biohostel: sleep in the forest, wake up with nature.",
    cta: "Check availability",
  },
} as const;

export default function GlampingPage() {
  const [lang, setLang] = useState<"es" | "en">("es");
  const t = CONTENT[lang];

  return (
    <div>
      <div className="relative overflow-hidden bg-[#1d1d1b] text-white">
        <img
          src="/fotos/BioHostel11.jpg"
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
            <a href="/categoria/hostales" className="hover:text-white">{lang === "es" ? "Hospedaje" : "Lodging"}</a>
            <span className="mx-2">/</span>
            <span className="text-white">{t.nombre}</span>
          </nav>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
            <Tent className="mr-1 inline h-4 w-4" /> {lang === "es" ? "Alojamiento · Tropical Biohostel" : "Lodging · Tropical Biohostel"}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">{t.nombre}</h1>
          <p className="mt-2 text-sm font-medium uppercase tracking-[0.15em] text-white/70">{lang === "es" ? "Tipo Hostal" : "Hostel type"}</p>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-emerald-100/90">{t.eslogan}</p>
          <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-white/85">{t.intro}</p>

          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-white/25 bg-white/10 p-6 backdrop-blur-sm">
            <p className="font-display text-3xl font-semibold text-white">{t.precio}</p>
            <p className="mt-1 text-sm text-white/75">{t.precioDetalle}</p>
            <p className="mt-1 text-sm font-medium text-emerald-200">{t.precioNota}</p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="https://wa.me/573209079174" target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-emerald-950 shadow-xl hover:bg-emerald-50">
              {t.cta}
            </a>
            <a href="/categoria/hostales" className="rounded-full border border-white/40 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10">
              {lang === "es" ? "Ver todos los alojamientos" : "See all lodging"}
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { src: "/fotos/BioHostel11.jpg", alt: t.nombre },
            { src: "/fotos/BioHostel8.jpg", alt: t.nombre },
            { src: "/fotos/BioHostel7.jpg", alt: t.nombre },
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