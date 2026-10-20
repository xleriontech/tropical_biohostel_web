import { HERO, TERRITORIO, HOSPEDAJE, GASTRONOMIA, EXPERIENCIAS, RUTAS, FICAL, BIENESTAR, CIERRE, COSMIC } from "@/lib/contenido";

export const metadata = {
  title: "Tropical Biohostel — Nature, flavors and experiences in Nocaima",
  description: "Nature you can experience. Flavors you can discover. Experiences that stay with you. Rural stay 10 minutes from Nocaima, Colombia.",
};

export default function EnglishPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <nav className="mb-4 text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground">Inicio</a>
        <span className="mx-2">/</span>
        <span className="text-foreground">English</span>
      </nav>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">{HERO.en.kicker}</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">{HERO.en.titulo}</h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">{HERO.en.subtitulo}</p>

      <h2 className="mt-10 font-display text-2xl font-semibold">{TERRITORIO.en.titulo}</h2>
      <p className="mt-2 leading-relaxed text-muted-foreground">{TERRITORIO.en.intro}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{TERRITORIO.en.cultivos}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{TERRITORIO.en.huerta}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{TERRITORIO.en.fauna}</p>
      <p className="mt-2 font-medium">{TERRITORIO.en.cierre}</p>

      <h2 className="mt-10 font-display text-2xl font-semibold">{HOSPEDAJE.en.titulo}</h2>
      <p className="mt-2 leading-relaxed text-muted-foreground">{HOSPEDAJE.en.cuerpo1}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{HOSPEDAJE.en.cuerpo2}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{HOSPEDAJE.en.cuerpo3}</p>
      <p className="mt-2 font-medium">{HOSPEDAJE.en.cierre}</p>

      <h2 className="mt-10 font-display text-2xl font-semibold">{COSMIC.en.nombre}</h2>
      <p className="mt-1 text-muted-foreground">{COSMIC.en.eslogan}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{COSMIC.en.intro}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{COSMIC.en.arquitectura}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{COSMIC.en.exterior}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{COSMIC.en.bienestar}</p>

      <h2 className="mt-10 font-display text-2xl font-semibold">{GASTRONOMIA.en.titulo}</h2>
      <p className="mt-2 leading-relaxed text-muted-foreground">{GASTRONOMIA.en.cuerpo1}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{GASTRONOMIA.en.cuerpo2}</p>
      <p className="mt-2 font-medium">{GASTRONOMIA.en.cierre}</p>

      <h2 className="mt-10 font-display text-2xl font-semibold">{EXPERIENCIAS.en.titulo}</h2>
      <p className="mt-2 leading-relaxed text-muted-foreground">{EXPERIENCIAS.en.cuerpo1}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{EXPERIENCIAS.en.cuerpo2}</p>
      <p className="mt-2 font-medium">{EXPERIENCIAS.en.cierre}</p>

      <h2 className="mt-10 font-display text-2xl font-semibold">{FICAL.en.titulo}</h2>
      <p className="mt-2 leading-relaxed text-muted-foreground">{FICAL.en.subtitulo}</p>
      <div className="mt-3 space-y-2 leading-relaxed text-muted-foreground">
        {FICAL.en.parrafos.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <p className="mt-3 font-medium italic">{FICAL.en.cierre}</p>
      <a href="/fical-y-el-cafe" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
        Read the full story →
      </a>

      <h2 className="mt-10 font-display text-2xl font-semibold">{RUTAS.en.titulo}</h2>
      <p className="mt-2 leading-relaxed text-muted-foreground">{RUTAS.en.intro}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {RUTAS.en.rutas.map((r) => (
          <a key={r.slug} href={`/property/${r.slug}`} className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{r.tagline}</p>
            <p className="mt-1 font-semibold">{r.nombre}</p>
            <p className="mt-1 text-sm text-muted-foreground">{r.descripcion}</p>
            <p className="mt-2 font-medium text-primary">$ {r.precio.toLocaleString("en-US")} COP / person</p>
          </a>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{RUTAS.en.notas}</p>

      <h2 className="mt-10 font-display text-2xl font-semibold">{BIENESTAR.en.titulo}</h2>
      <p className="mt-2 leading-relaxed text-muted-foreground">{BIENESTAR.en.cuerpo1}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{BIENESTAR.en.cuerpo2}</p>

      <h2 className="mt-10 font-display text-2xl font-semibold">{CIERRE.en.titulo}</h2>
      <p className="mt-2 leading-relaxed text-muted-foreground">{CIERRE.en.cuerpo}</p>
      <ul className="mt-3 space-y-1">
        {CIERRE.en.recuerdos.map((r) => (
          <li key={r} className="text-muted-foreground">{r}</li>
        ))}
      </ul>
      <p className="mt-3 font-medium">{CIERRE.en.final}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href="/cosmic-bungalo" className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Meet Cosmic Bungalow</a>
        <a href="/" className="rounded-full border border-input px-6 py-2.5 text-sm font-medium hover:bg-secondary">Versión en español</a>
      </div>
    </div>
  );
}
