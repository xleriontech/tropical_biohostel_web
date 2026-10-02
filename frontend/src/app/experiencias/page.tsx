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
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a href="/property/tour-cafe-cacao-tropical" className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md">
          <p className="font-semibold">Tour del Café y el Cacao</p>
          <p className="text-sm text-muted-foreground">Del grano a la taza entre cafetales, cacao y frutales.</p>
        </a>
        <a href="/property/caminata-bienestar-tropical" className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md">
          <p className="font-semibold">Caminata Ecológica y Bienestar</p>
          <p className="text-sm text-muted-foreground">Bosque nativo, respiración y contemplación.</p>
        </a>
      </div>
    </div>
  );
}
