import { EXPERIENCIAS } from "@/lib/contenido";

export const metadata = { title: "Experiencias · Tropical Biohostel" };

export default function ExperienciasPage() {
  const t = EXPERIENCIAS.es;
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <nav className="mb-4 text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground">Inicio</a>
        <span className="mx-2">/</span>
        <span className="text-foreground">Experiencias</span>
      </nav>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Experiencias que permanecen</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">{t.titulo}</h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">{t.cuerpo1}</p>
      <p className="mt-3 leading-relaxed text-muted-foreground">{t.cuerpo2}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {t.items.map((i) => (
          <span key={i} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium">{i}</span>
        ))}
      </div>
      <p className="mt-4 font-medium">{t.cierre}</p>
      <div className="mt-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-secondary to-accent p-5">
        <p className="text-sm font-semibold">Rutas del café</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tres experiencias alrededor del café: Del bosque a tu taza, Respira el bosque y Café y raíces colombianas.
        </p>
        <a href="/rutas" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
          Ver las rutas del café →
        </a>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a href="/property/tour-cafe-cacao-tropical" className="overflow-hidden rounded-xl border bg-white shadow-sm hover:shadow-md">
          <img src="/fotos/sitio/tropical-cafe.jpg" alt="Tour del Café y el Cacao" loading="lazy" className="aspect-[21/9] w-full object-cover" />
          <div className="p-5">
            <p className="font-semibold">Tour del Café y el Cacao</p>
            <p className="text-sm text-muted-foreground">Del grano a la taza entre cafetales, cacao y frutales.</p>
          </div>
        </a>
        <a href="/property/caminata-bienestar-tropical" className="overflow-hidden rounded-xl border bg-white shadow-sm hover:shadow-md">
          <img src="/fotos/sitio/tropical-gente4.jpg" alt="Caminata Ecológica y Bienestar" loading="lazy" className="aspect-[21/9] w-full object-cover" />
          <div className="p-5">
            <p className="font-semibold">Caminata Ecológica y Bienestar</p>
            <p className="text-sm text-muted-foreground">Bosque nativo, respiración y contemplación.</p>
          </div>
        </a>
      </div>
    </div>
  );
}
