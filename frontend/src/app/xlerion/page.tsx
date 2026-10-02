import { Brain, Code2, Cpu, Leaf, Mail, Phone } from "lucide-react";

export const metadata = {
  title: "Xlerion Disruptive Tech - Colombia · Quiénes hicieron este sitio",
  description: "Xlerion Disruptive Tech - Colombia: empresa de tecnología que desarrolló la plataforma de Tropical Biohostel.",
};

const PILARES = [
  {
    Icon: Code2,
    titulo: "Desarrollo a medida",
    texto: "Plataformas web, paneles de administración y sistemas que resuelven necesidades reales, sin plantillas genéricas.",
  },
  {
    Icon: Brain,
    titulo: "Inteligencia artificial aplicada",
    texto: "Asistentes conversacionales, búsqueda en lenguaje natural y sistemas RAG que aprenden de tu documentación.",
  },
  {
    Icon: Leaf,
    titulo: "Tecnología con propósito",
    texto: "Proyectos que conectan territorio, naturaleza y comunidad, como esta plataforma de turismo rural.",
  },
];

const HECHO_CON = [
  "Next.js + React",
  "NestJS + PostgreSQL",
  "Inteligencia artificial (Gemini / OpenAI)",
  "Búsqueda semántica RAG",
  "Pagos PayPal",
  "Mapas y geolocalización",
];

export default function XlerionPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <nav className="mb-4 text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground">Inicio</a>
        <span className="mx-2">/</span>
        <span className="text-foreground">Xlerion</span>
      </nav>

      {/* Héroe */}
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-[#16264D] via-[#1E3D24] to-[#7A2E14] p-8 text-white shadow-xl sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
          <Cpu className="mr-1 inline h-4 w-4" /> Quiénes hicieron este sitio
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
          Xlerion Disruptive Tech - Colombia
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-white/85">
          Empresa colombiana de tecnología disruptiva. Diseñamos y desarrollamos esta plataforma
          para Tropical Biohostel: hospedaje, experiencias, inteligencia artificial, donaciones y
          mapas, todo en un solo lugar.
        </p>
      </div>

      {/* Pilares */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {PILARES.map((p) => (
          <div key={p.titulo} className="rounded-2xl border bg-white p-5 shadow-sm">
            <p.Icon className="h-7 w-7 text-primary" />
            <h2 className="mt-2 font-display text-lg font-semibold">{p.titulo}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.texto}</p>
          </div>
        ))}
      </div>

      {/* Fundadores */}
      <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
        <h2 className="font-display text-2xl font-semibold">Fundadores</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Las personas detrás de Xlerion Disruptive Tech - Colombia.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            { nombre: "Fundador/a", rol: "Rol por confirmar" },
            { nombre: "Fundador/a", rol: "Rol por confirmar" },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-input bg-secondary/30 p-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary font-display text-xl font-semibold text-primary-foreground">
                {f.nombre.charAt(0)}
              </span>
              <div>
                <p className="font-semibold">{f.nombre}</p>
                <p className="text-sm text-muted-foreground">{f.rol}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Este sitio + contacto */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl font-semibold">Este sitio fue hecho con</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {HECHO_CON.map((t) => (
              <span key={t} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                {t}
              </span>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-secondary to-accent p-6 shadow-sm">
          <h2 className="font-display text-2xl font-semibold">Contacto</h2>
          <div className="mt-3 space-y-2.5 text-sm">
            <a href="tel:+573208605600" className="flex items-center gap-2.5 hover:text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Phone className="h-4 w-4" />
              </span>
              +57 320 860 5600
            </a>
            <a href="mailto:ultimatexlerion@gmail.com" className="flex items-center gap-2.5 hover:text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="h-4 w-4" />
              </span>
              ultimatexlerion@gmail.com
            </a>
            <a href="mailto:dev@xlerion.com" className="flex items-center gap-2.5 hover:text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="h-4 w-4" />
              </span>
              dev@xlerion.com
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
