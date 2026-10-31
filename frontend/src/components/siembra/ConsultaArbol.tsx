"use client";

import { useEffect, useRef, useState } from "react";
import { Coffee, Leaf, Loader2, MapPin, Search, Sprout } from "lucide-react";
import Etapas from "@/components/siembra/Etapas";
import { cargaFicha, ETAPAS, ESPECIES, type Ficha } from "@/lib/siembra";
import AtencionArbol from "@/components/siembra/AtencionArbol";

export default function ConsultaArbol({ codigoInicial }: { codigoInicial: string }) {
  const [codigo, setCodigo] = useState(codigoInicial);
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const buscar = async (c: string) => {
    const limpio = c.trim().toUpperCase();
    if (!limpio) return;
    setCargando(true);
    setError("");
    try {
      setFicha(await cargaFicha(limpio));
    } catch (e: any) {
      setFicha(null);
      setError(e.message || "Ese código no aparece entre nuestros árboles.");
    } finally {
      setCargando(false);
    }
  };

  // El enlace del recibo llega con ?codigo=: se consulta al entrar, sin obligar a pulsar Buscar.
  const arranco = useRef(false);
  useEffect(() => {
    if (arranco.current || !codigoInicial) return;
    arranco.current = true;
    buscar(codigoInicial);
  }, [codigoInicial]);

  return (
    <div data-seccion="siembra" className="bg-crema text-carbon">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cascara">Tu árbol, paso a paso</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-bosque">Mi árbol en la finca</h1>
        <p className="mt-3 leading-relaxed text-tierra">
          El código que te dimos al apadrinar es la llave de tu rincón del bosque. Escríbelo y verás en qué
          etapa va, en qué casilla vive y qué te cuenta la finca.
        </p>

        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            buscar(codigo);
          }}
        >
          <label className="sr-only" htmlFor="codigo">
            Código de apadrinamiento
          </label>
          <input
            id="codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase().slice(0, 20))}
            placeholder="TB-XXXX-XXXX"
            autoComplete="off"
            className="w-full rounded-xl border border-input bg-card px-4 py-3 font-mono text-sm tracking-wider focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button type="submit" className="btn-sol shrink-0 rounded-xl px-5 text-sm disabled:opacity-60">
            {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="sr-only">Buscar mi árbol</span>
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-[#2A241E]/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {ficha && (
          <article className="mt-6 rounded-3xl border border-piedra bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cascara">
                  Código {ficha.codigo}
                </p>
                <h2 className="mt-1 font-display text-3xl font-semibold text-bosque">
                  {ficha.alias || `${ESPECIES[ficha.especie].label} sin nombre`}
                </h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-tierra">
                  {ficha.especie === "CAFE" ? (
                    <Coffee className="h-4 w-4 text-cascara" aria-hidden />
                  ) : (
                    <Leaf className="h-4 w-4 text-hoja" aria-hidden />
                  )}
                  {ESPECIES[ficha.especie].label} · {ESPECIES[ficha.especie].nota}
                </p>
              </div>
              <Sprout className="h-8 w-8 shrink-0 text-hoja" aria-hidden />
            </div>

            <Etapas etapa={ficha.etapa} />

            <p className="mt-4 text-sm leading-relaxed text-tierra">{ETAPAS[ficha.etapa].descripcion}</p>

            <dl className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-piedra bg-piedra sm:grid-cols-2">
              <div className="bg-card px-4 py-3">
                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Su casilla</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-bosque">
                  <MapPin className="h-4 w-4 text-cascara" aria-hidden />
                  Fila {ficha.parcela.fila + 1} · Columna {ficha.parcela.columna + 1}
                  <a
                    href={`/donaciones/siembra?arbol=${ficha.parcela.fila}-${ficha.parcela.columna}`}
                    className="ml-1 text-xs font-medium text-cascara underline"
                  >
                    ver en el tablero
                  </a>
                </dd>
              </div>
              <div className="bg-card px-4 py-3">
                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Aporte</dt>
                <dd className="mt-0.5 text-sm font-semibold text-bosque">
                  {ficha.pago
                    ? `$${Number(ficha.pago.monto).toLocaleString("es-CO")} ${ficha.pago.moneda} · ${
                        ficha.pago.estado === "APROBADA" ? "confirmado" : ficha.pago.estado.toLowerCase()
                      }`
                    : "sin pago registrado"}
                </dd>
              </div>
              {ficha.fechaSiembra && (
                <div className="bg-card px-4 py-3">
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Sembrado el</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-bosque">
                    {new Date(ficha.fechaSiembra).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "America/Bogota",
                    })}
                  </dd>
                </div>
              )}
              {ficha.pais && (
                <div className="bg-card px-4 py-3">
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Llegó desde</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-bosque">{ficha.pais}</dd>
                </div>
              )}
            </dl>

            {ficha.mensaje && (
              <blockquote className="mt-5 border-l-2 border-hoja pl-4 text-sm italic leading-relaxed text-tierra">
                “{ficha.mensaje}”
              </blockquote>
            )}

            <div className="mt-5 rounded-2xl border border-piedra bg-card p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-cascara">
                Cómo lo atiende la finca
              </h3>
              <AtencionArbol
                niveles={ficha.niveles}
                estado={ficha.estado}
                ultimoRiego={ficha.ultimoRiego}
                ultimoAbono={ficha.ultimoAbono}
              />
              {ficha.cuidados.length > 0 && (
                <ul className="mt-3 space-y-1.5 border-t border-piedra pt-3 text-sm text-tierra">
                  {ficha.cuidados.map((c, i) => (
                    <li key={`${c.etiqueta}-${i}`} className="flex flex-wrap items-baseline justify-between gap-2">
                      <span>
                        {c.cantidad} {c.unidad} de {c.etiqueta.toLowerCase()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.fecha).toLocaleDateString("es-CO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          timeZone: "America/Bogota",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                ¿Quieres regalarle riego, abono o una poda?{" "}
                <a
                  href={`/donaciones/siembra?arbol=${ficha.parcela.fila}-${ficha.parcela.columna}`}
                  className="font-semibold text-bosque underline"
                >
                  Ábrelo en el tablero
                </a>{" "}
                y elige las unidades.
              </p>
            </div>

            <div className="mt-5 rounded-2xl bg-secondary/60 p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-cascara">
                Parte de la finca
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-tierra">
                {ficha.notasFinca ||
                  "La finca aún no ha escrito el primer parte de este árbol. Los partes llegan con la época: aquí nada se apura."}
              </p>
            </div>

            {!ficha.confirmado && (
              <p className="mt-4 rounded-xl border border-dashed border-sol bg-[#E8A94A]/15 px-4 py-3 text-sm text-tierra">
                Este árbol está apartado pero su pago no ha quedado confirmado. Si ya pagaste y sigues viendo
                esto, escríbenos por el chat con el código {ficha.codigo}.
              </p>
            )}
          </article>
        )}

        {!ficha && !cargando && (
          <p className="mt-6 text-sm text-muted-foreground">
            ¿Aún no tienes árbol?{" "}
            <a href="/donaciones/siembra" className="font-semibold text-bosque underline">
              Elige una casilla del tablero
            </a>{" "}
            y apadrina un café o un cacao.
          </p>
        )}
      </div>
    </div>
  );
}
