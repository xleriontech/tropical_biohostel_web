import { TERRITORIO } from "@/lib/contenido";

export const metadata = { title: "Territorio · Tropical Biohostel" };

export default function TerritorioPage() {
  const t = TERRITORIO.es;
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <nav className="mb-4 text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground">Inicio</a>
        <span className="mx-2">/</span>
        <span className="text-foreground">Territorio</span>
      </nav>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Naturaleza que se vive</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">{t.titulo}</h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">{t.intro}</p>
      <p className="mt-3 leading-relaxed text-muted-foreground">{t.cultivos}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {t.frutales.map((f) => (
          <span key={f} className="rounded-full border border-input bg-secondary/40 px-3 py-1 text-xs capitalize">{f}</span>
        ))}
      </div>
      <p className="mt-5 leading-relaxed text-muted-foreground">{t.huerta}</p>
      <p className="mt-3 leading-relaxed text-muted-foreground">{t.fauna}</p>
      <p className="mt-4 font-medium">{t.cierre}</p>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {t.datos.map((d) => (
          <div key={d.etiqueta} className="rounded-xl border bg-white p-5 text-center shadow-sm">
            <p className="font-display text-2xl font-semibold text-primary">{d.valor}</p>
            <p className="mt-1 text-xs text-muted-foreground">{d.etiqueta}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href="/experiencias" className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Ver experiencias</a>
        <a href="/cosmic-bungalo" className="rounded-full border border-input px-6 py-2.5 text-sm font-medium hover:bg-secondary">Conocer Cosmic Bungaló</a>
      </div>
    </div>
  );
}
