import { RUTAS } from "@/lib/contenido";

export const metadata = {
  title: "Rutas del café · Tropical Biohostel",
  description:
    "Tres rutas del café en Tropical Biohostel: Del bosque a tu taza, Respira el bosque y Café y raíces colombianas. Café orgánico, tostión artesanal, yoga y cultura colombiana.",
};

const formatCOP = (n: number) => `$ ${n.toLocaleString("es-CO")}`;

export default function RutasPage() {
  const t = RUTAS.es;
  const tel = `tel:+57${t.contacto.replace(/\D/g, "")}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <nav className="mb-4 text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground">Inicio</a>
        <span className="mx-2">/</span>
        <span className="text-foreground">Rutas del café</span>
      </nav>

      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">{t.kicker}</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">{t.titulo}</h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">{t.intro}</p>

      {/* Contexto: la historia del café de la finca */}
      <div className="mt-6 flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <img
          src="/fotos/sitio/tropical-gente.jpg"
          alt="Procesando el café en la cocina de la finca"
          loading="lazy"
          className="h-32 w-full rounded-xl object-cover sm:w-44"
        />
        <div className="flex-1">
          <p className="font-display text-lg font-semibold">Fical y el café</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Mi abuela recogía el fruto maduro, lo secaba al sol y lo tostaba en su olla. Hoy hago la
            misma experiencia con cada uno de nuestros huéspedes: del cafetal a la taza.
          </p>
          <a href="/fical-y-el-cafe" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
            Conocer la historia →
          </a>
        </div>
      </div>

      <div className="mt-10 grid gap-6">
        {t.rutas.map((r, idx) => (
          <article key={r.slug} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <img
              src={r.imagen}
              alt={r.nombre}
              loading="lazy"
              className="aspect-[21/9] w-full object-cover"
            />
            <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {String(idx + 1).padStart(2, "0")} · {r.tagline}
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold">{r.nombre}</h2>
              </div>
              <p className="text-right">
                <span className="block font-display text-2xl font-semibold text-primary">{formatCOP(r.precio)}</span>
                <span className="text-xs text-muted-foreground">por persona</span>
              </p>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.descripcion}</p>

            <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
              {r.incluye.map((i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {i}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a
                href={`/property/${r.slug}`}
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Ver detalle y reservar
              </a>
              <a href={tel} className="text-sm font-medium text-primary hover:underline">
                Escríbenos: {t.contacto}
              </a>
            </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-secondary to-accent p-6">
        <p className="text-sm leading-relaxed">{t.notas}</p>
        <p className="mt-2 text-sm">
          Medios de pago: <strong>{t.medioPago}</strong> · {t.contacto}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-6 shadow-sm">
        <div>
          <h3 className="font-display text-lg font-semibold">¿Listo para vivir la experiencia?</h3>
          <p className="text-sm text-muted-foreground">Descarga la guía completa de las rutas del café.</p>
        </div>
        <a
          href={t.guiaPdf}
          download
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Descargar guía en PDF
        </a>
      </div>
    </div>
  );
}
