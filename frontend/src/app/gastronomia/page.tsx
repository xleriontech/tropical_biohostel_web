import { GASTRONOMIA } from "@/lib/contenido";

export const metadata = { title: "Gastronomía · Tropical Biohostel" };

export default function GastronomiaPage() {
  const t = GASTRONOMIA.es;
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <nav className="mb-4 text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground">Inicio</a>
        <span className="mx-2">/</span>
        <span className="text-foreground">Gastronomía</span>
      </nav>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Sabores que se descubren</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">{t.titulo}</h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">{t.cuerpo1}</p>
      <p className="mt-3 leading-relaxed text-muted-foreground">{t.cuerpo2}</p>
      <p className="mt-3 leading-relaxed text-muted-foreground">{t.cuerpo3}</p>

      {/* Galería de la cocina de la finca */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { src: "/fotos/sitio/tropical-cocina.jpg", alt: "Guiso de la finca en la olla" },
          { src: "/fotos/sitio/tropical-cocina2.jpg", alt: "Plato de la casa con fruta de la finca" },
          { src: "/fotos/sitio/tropical-postre.jpg", alt: "Postre con mango y maracuyá" },
          { src: "/fotos/sitio/tropical-postre2.jpg", alt: "Postre de fresa y cacao" },
        ].map((f) => (
          <img
            key={f.src}
            src={f.src}
            alt={f.alt}
            loading="lazy"
            className="aspect-square w-full rounded-xl border object-cover shadow-sm"
          />
        ))}
      </div>
      <p className="mt-4 rounded-2xl border bg-secondary/30 p-5 font-medium leading-relaxed">{t.cierre}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href="/property/mesa-tropical" className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Ver Mesa Tropical</a>
        <a href="/territorio" className="rounded-full border border-input px-6 py-2.5 text-sm font-medium hover:bg-secondary">Conocer la huerta</a>
      </div>
    </div>
  );
}
