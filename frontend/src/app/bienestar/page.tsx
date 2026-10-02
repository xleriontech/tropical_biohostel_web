import { BIENESTAR } from "@/lib/contenido";

export const metadata = { title: "Bienestar · Tropical Biohostel" };

export default function BienestarPage() {
  const t = BIENESTAR.es;
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <nav className="mb-4 text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground">Inicio</a>
        <span className="mx-2">/</span>
        <span className="text-foreground">Bienestar</span>
      </nav>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Pausa y conexión</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">{t.titulo}</h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">{t.cuerpo1}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {t.practicas.map((i) => (
          <span key={i} className="rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-800">{i}</span>
        ))}
      </div>
      <p className="mt-4 leading-relaxed text-muted-foreground">{t.cuerpo2}</p>
      <div className="mt-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-secondary to-accent p-5 text-sm leading-relaxed">
        En <strong>Cosmic Bungaló</strong>, una vez realizada tu reserva podrás programar —según disponibilidad— sesiones de
        Yoga, Chi Kung o Tai Chi para complementar tu descanso.
        <a href="/cosmic-bungalo" className="ml-1 font-medium text-primary hover:underline">Conocer el refugio →</a>
      </div>
    </div>
  );
}
