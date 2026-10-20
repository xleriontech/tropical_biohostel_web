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
        En <strong>Cosmic Bungalow</strong>, una vez realizada tu reserva podrás programar —según disponibilidad— sesiones de
        Yoga, Chi Kung o Tai Chi para complementar tu descanso.
        <a href="/cosmic-bungalo" className="ml-1 font-medium text-primary hover:underline">Conocer el refugio →</a>
      </div>

      {/* El bosque como escenario de bienestar */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { src: "/fotos/sitio/tropical-flores2.jpg", alt: "Jardín de bugambilias y dracaena" },
          { src: "/fotos/sitio/tropical-voluntariado.jpg", alt: "Rincón verde de la finca" },
          { src: "/fotos/sitio/IMG-20260910-WA0029.jpg", alt: "Mascotas bienvenidas en Tropical Biohostel" },
        ].map((f) => (
          <img
            key={f.src}
            src={f.src}
            alt={f.alt}
            loading="lazy"
            className="aspect-[4/3] w-full rounded-xl border object-cover shadow-sm"
          />
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        El entorno es hogar de una gran variedad de aves y de especies como armadillos y zorros.
        También hay espacios donde puedes trabajar o desarrollar proyectos personales en contacto con
        la naturaleza, haciendo de la tranquilidad y el entorno parte de tu experiencia.
      </p>
    </div>
  );
}
