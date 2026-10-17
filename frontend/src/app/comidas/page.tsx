"use client";

import { useEffect, useState } from "react";
import { UtensilsCrossed, Clock, Leaf, MessageCircle, Soup } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

const TIPO_LABEL: Record<string, string> = {
  DESAYUNO: "Desayuno",
  ALMUERZO: "Almuerzo",
  CENA: "Cena",
  MERIENDA: "Merienda",
  CAFETERIA: "Cafetería",
  OTRO: "Menú",
};

const TIPO_ICONO: Record<string, string> = {
  DESAYUNO: "🌅",
  ALMUERZO: "🍽️",
  CENA: "🌙",
  MERIENDA: "☕",
  CAFETERIA: "🍵",
  OTRO: "🍴",
};

const CATEGORIA_LABEL: Record<string, string> = {
  entrada: "Entradas",
  principal: "Plato principal",
  postre: "Postres",
  bebida: "Bebidas",
  extra: "Extras",
};

interface Plato {
  id: string;
  nombre: string;
  descripcion?: string | null;
  categoria?: string | null;
  precio?: number | null;
  etiquetas?: string[];
}

interface Menu {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  horario?: string | null;
  platos: Plato[];
}

export default function ComidasPage() {
  const [menus, setMenus] = useState<Menu[] | null>(null);

  useEffect(() => {
    fetch(`${API}/menus`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setMenus(Array.isArray(d) ? d : []))
      .catch(() => setMenus([]));
  }, []);

  const agrupar = (platos: Plato[]) => {
    const grupos: Record<string, Plato[]> = {};
    for (const p of platos) {
      const k = (p.categoria || "").toLowerCase();
      if (!grupos[k]) grupos[k] = [];
      grupos[k].push(p);
    }
    return Object.entries(grupos);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
        Inicio / Comidas
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Del territorio a la mesa</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Alimentación consciente con productos naturales, locales y de la finca. Menús
        personalizados según tu dieta, alergias y el número de personas de tu visita.
      </p>

      {menus === null && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl border bg-white shadow-sm"
            />
          ))}
        </div>
      )}

      {menus !== null && menus.length === 0 && (
        <div className="mt-8 rounded-xl border bg-white p-10 text-center shadow-sm">
          <UtensilsCrossed className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">Los menús se están preparando 🌱</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Muy pronto publicaremos la carta de la finca. Mientras tanto, pregunta a Nati qué
            podemos cocinar para ti.
          </p>
        </div>
      )}

      {menus !== null && menus.length > 0 && (
        <div className="mt-8 space-y-6">
          {menus.map((m) => (
            <article
              key={m.id}
              className="overflow-hidden rounded-xl border bg-white shadow-sm"
            >
              {m.imagenUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.imagenUrl}
                  alt={m.titulo}
                  className="h-48 w-full object-cover"
                />
              )}
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-2xl">{TIPO_ICONO[m.tipo] || "🍴"}</span>
                  <div>
                    <h2 className="text-xl font-semibold">{m.titulo}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                        {TIPO_LABEL[m.tipo] || m.tipo}
                      </span>
                      {m.horario && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {m.horario}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {m.descripcion && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {m.descripcion}
                  </p>
                )}

                {m.platos.length > 0 ? (
                  <div className="mt-5 space-y-5">
                    {agrupar(m.platos).map(([cat, platos]) => (
                      <div key={cat || "sin"}>
                        {cat && (
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
                            {CATEGORIA_LABEL[cat] || cat}
                          </h3>
                        )}
                        <ul className="divide-y">
                          {platos.map((p) => (
                            <li
                              key={p.id}
                              className="flex items-start justify-between gap-4 py-3"
                            >
                              <div>
                                <p className="font-medium">{p.nombre}</p>
                                {p.descripcion && (
                                  <p className="mt-0.5 text-sm text-muted-foreground">
                                    {p.descripcion}
                                  </p>
                                )}
                                {(p.etiquetas || []).length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {(p.etiquetas || []).map((e) => (
                                      <span
                                        key={e}
                                        className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700"
                                      >
                                        <Leaf className="h-3 w-3" />
                                        {e.replace(/-/g, " ")}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span className="shrink-0 text-sm font-semibold">
                                {p.precio != null
                                  ? `$${Number(p.precio).toLocaleString("es-CO")}`
                                  : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Soup className="h-4 w-4" /> Pronto agregaremos los platos de este menú.
                  </p>
                )}
              </div>
            </article>
          ))}

          {/* CTA de menú personalizado */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
            <MessageCircle className="mx-auto h-8 w-8 text-primary" />
            <h3 className="mt-2 font-semibold">¿Necesitas un menú personalizado?</h3>
            <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
              Cuéntale a Nati cuántas personas son, si hay dietas o alergias, y arma con ella el
              menú ideal para tu visita.
            </p>
            <a
              href="/gastronomia"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <UtensilsCrossed className="h-4 w-4" /> Conocer la gastronomía
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
