import { RUTAS, FICAL } from "@/lib/contenido";
import { ArrowRight, Coffee, HandHeart, Sprout, Sun, Flame } from "lucide-react";

export const metadata = {
  title: "Fical y el café · Tropical Biohostel",
  description:
    "La historia de una abuela, una finca y un café que sigue creciendo entre los árboles. Del fruto maduro a la taza, el proceso artesanal del café de Tropical Biohostel.",
};

const ICONOS = [Sprout, Sun, HandHeart, Flame, Coffee];

export default function FicalCafePage() {
  const t = FICAL.es;

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden bg-[#1d1d1b] text-white">
        <img
          src="/fotos/sitio/InShot_20260910_172043288.jpg"
          alt="Del fruto a la taza: el proceso del café en Tropical Biohostel"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1d1d1b] via-[#1d1d1b]/70 to-[#1d1d1b]/30" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
          <nav className="mb-6 text-sm text-white/60">
            <a href="/" className="hover:text-white">Inicio</a>
            <span className="mx-2">/</span>
            <span className="text-white">Fical y el café</span>
          </nav>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
            {t.kicker}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">{t.titulo}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/85">{t.subtitulo}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/rutas"
              className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-emerald-950 shadow-xl hover:bg-emerald-50"
            >
              Ver las rutas del café
            </a>
            <a
              href="#proceso"
              className="rounded-full border border-white/40 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Cómo lo hacemos
            </a>
          </div>
        </div>
      </div>

      {/* La historia */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          La historia
        </p>
        <div className="mt-5 space-y-5 leading-relaxed text-muted-foreground">
          {t.parrafos.map((p, i) => (
            <p key={i} className={i === 0 ? "text-lg text-foreground" : undefined}>
              {p}
            </p>
          ))}
        </div>
        <p className="mt-8 border-l-4 border-primary pl-5 font-display text-xl italic leading-relaxed text-foreground">
          {t.cierre}
        </p>
      </section>

      {/* El proceso */}
      <section id="proceso" className="border-y border-input bg-secondary/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Del fruto a la taza
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
              Un proceso que se hereda
            </h2>
            <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-muted-foreground">
              Cada paso lo hacemos como lo hacía mi abuela. No hay atajos: el café se recoge, se
              seca al sol, se despulpa, se tuesta en la olla y se muele a mano.
            </p>
          </div>

          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {t.proceso.map((p, i) => {
              const Icono = ICONOS[i] ?? Coffee;
              return (
                <li key={p.paso} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                  <img
                    src={p.imagen}
                    alt={p.titulo}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover"
                  />
                  <div className="p-5">
                    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                      <Icono className="h-4 w-4" /> {p.paso}
                    </p>
                    <h3 className="mt-1.5 font-display text-lg font-semibold">{p.titulo}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.texto}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Galería */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-2xl font-semibold">El café, de cerca</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {t.galeria.map((g) => (
            <img
              key={g.src}
              src={g.src}
              alt={g.alt}
              loading="lazy"
              className="aspect-square w-full rounded-xl border object-cover shadow-sm"
            />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 pb-16">
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-secondary to-accent p-8 text-center shadow-sm">
          <h2 className="font-display text-2xl font-semibold">Vive la experiencia del café</h2>
          <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-muted-foreground">
            Tres rutas para recorrer la finca de punta a punta: desde el cafetal y la tostión
            artesanal hasta la danza tradicional y el almuerzo típico de la región.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {RUTAS.es.rutas.map((r) => (
              <a
                key={r.slug}
                href={`/property/${r.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-input bg-white px-5 py-2.5 text-sm font-medium hover:bg-secondary"
              >
                {r.nombre}
                <ArrowRight className="h-4 w-4" />
              </a>
            ))}
            <a
              href="/rutas"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Ver las 3 rutas
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
