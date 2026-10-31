"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Coffee, Eye, HeartHandshake, Leaf, MapPin, Sprout, Table2 } from "lucide-react";
import ApadrinarModal from "@/components/siembra/ApadrinarModal";
import AtencionArbol from "@/components/siembra/AtencionArbol";
import Etapas from "@/components/siembra/Etapas";
import MimarModal from "@/components/siembra/MimarModal";
import TableroLista from "@/components/siembra/TableroLista";
import { cargaTablero, ETAPAS, ESPECIES, type ParcelaTablero, type Tablero } from "@/lib/siembra";

// Sin `ssr: false`: en el edge runtime de Cloudflare Pages ese modo deja el módulo
// fuera del manifest y la página responde 500. El tablero de todas formas solo se
// monta cuando el tablero ya llegó, o sea siempre en el navegador.
const Tablero3D = dynamic(() => import("@/components/siembra/Tablero3D"), {
  loading: () => (
    <div className="h-[340px] w-full rounded-3xl border bg-muted sm:h-[460px]" aria-hidden>
      <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Preparando el tablero de la finca…
      </p>
    </div>
  ),
});

const hayWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};

export default function SiembraPage() {
  const [tablero, setTablero] = useState<Tablero | null>(null);
  const [seleccion, setSeleccion] = useState<{ fila: number; columna: number } | null>(null);
  const [vista, setVista] = useState<"3d" | "lista">("3d");
  const [modal, setModal] = useState(false);
  const [mimar, setMimar] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [aviso, setAviso] = useState("");
  const [mimo, setMimo] = useState("");
  const [sobre, setSobre] = useState<ParcelaTablero | null>(null);
  const reducido = useRef(false);

  const recargar = useCallback(() => {
    cargaTablero()
      .then(setTablero)
      .catch(() => setAviso("No pudimos cargar el tablero. Recarga la página."));
  }, []);

  useEffect(() => {
    recargar();
    reducido.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducido.current || !hayWebGL()) setVista("lista");
    // Deep link: /donaciones/siembra?arbol=3-4 abre la casilla del árbol de alguien.
    const p = new URLSearchParams(window.location.search).get("arbol");
    if (p && /^\d+-\d+$/.test(p)) {
      const [f, c] = p.split("-").map(Number);
      setSeleccion({ fila: f, columna: c });
    }
  }, [recargar]);

  const parcela = useMemo(
    () => (seleccion ? tablero?.parcelas.find((x) => x.fila === seleccion.fila && x.columna === seleccion.columna) || null : null),
    [seleccion, tablero],
  );

  const elegir = (p: ParcelaTablero) => {
    setSeleccion({ fila: p.fila, columna: p.columna });
    setMimar(false);
    setMimo("");
    setAviso(
      p.estado === "LIBRE"
        ? `Casilla libre: fila ${p.fila + 1}, columna ${p.columna + 1}.`
        : p.estado === "RESERVADA"
          ? `Esa casilla está apartada mientras se completa un pago.`
          : `Esa casilla ya tiene un árbol apadrinado${p.arbol?.alias ? `: ${p.arbol.alias}` : ""}.`,
    );
  };

  const stats = tablero?.estadisticas;

  return (
    <div data-seccion="siembra" className="bg-crema text-carbon">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <nav className="text-sm text-muted-foreground" aria-label="Ruta">
          <a href="/" className="hover:text-foreground">Inicio</a>
          <span className="mx-2">/</span>
          <a href="/donaciones" className="hover:text-foreground">Donaciones</a>
          <span className="mx-2">/</span>
          <span className="text-foreground">Siembra</span>
        </nav>

        <header className="mt-4 grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cascara">
              Donde el café comienza
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-[1.05] text-bosque sm:text-5xl">
              Apadrina un árbol de café o cacao en nuestra finca
            </h1>
            <p className="mt-4 max-w-2xl leading-relaxed text-tierra">
              Cada casilla del tablero es un lugar real de la finca. Elige uno, define si quieres
              un café de ladera o un cacao de sombra, y el árbol queda tuyo: con tu nombre en la
              placa y el parte de la finca contando cómo crece. El bosque no tiene prisa, y por
              eso todo en él tiene sentido.
            </p>
          </div>

          {stats && (
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-piedra bg-piedra text-center">
              {[
                { k: "Casillas libres", v: stats.libres, Icon: Sprout },
                { k: "Árboles sembrados", v: stats.ocupadas, Icon: HeartHandshake },
                { k: "De café", v: stats.cafe, Icon: Coffee },
                { k: "De cacao", v: stats.cacao, Icon: Leaf },
              ].map(({ k, v, Icon }) => (
                <div key={k} className="bg-card px-3 py-4">
                  <Icon className="mx-auto h-4 w-4 text-cascara" aria-hidden />
                  <dd className="mt-1 font-display text-2xl font-semibold text-bosque">{v}</dd>
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
                </div>
              ))}
            </dl>
          )}
        </header>

        {!tablero ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="h-[340px] animate-pulse rounded-3xl bg-muted sm:h-[460px]" />
            <div className="h-24 animate-pulse rounded-3xl bg-muted" />
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-full border border-piedra bg-card p-1" role="group" aria-label="Vista del tablero">
                <button
                  type="button"
                  onClick={() => setVista("3d")}
                  aria-pressed={vista === "3d"}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    vista === "3d" ? "bg-bosque text-crema" : "text-tierra hover:bg-secondary"
                  }`}
                >
                  <Eye className="h-4 w-4" /> Vista 3D
                </button>
                <button
                  type="button"
                  onClick={() => setVista("lista")}
                  aria-pressed={vista === "lista"}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    vista === "lista" ? "bg-bosque text-crema" : "text-tierra hover:bg-secondary"
                  }`}
                >
                  <Table2 className="h-4 w-4" /> Vista lista
                </button>
              </div>

              <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tierra">
                <li className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-[3px] bg-piedra" aria-hidden /> Libre para apadrinar
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-[3px] bg-hoja" aria-hidden /> Con árbol
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-[3px] bg-[#E8A94A]/70" aria-hidden /> Apartada
                </li>
              </ul>
            </div>

            <div className="relative mt-4">
              {vista === "3d" ? (
                <Tablero3D
                  parcelas={tablero.parcelas}
                  filas={tablero.filas}
                  columnas={tablero.columnas}
                  seleccion={seleccion}
                  onSelect={elegir}
                  onHover={setSobre}
                  animar={!reducido.current}
                />
              ) : (
                <TableroLista
                  parcelas={tablero.parcelas}
                  filas={tablero.filas}
                  columnas={tablero.columnas}
                  seleccion={seleccion}
                  onSelect={elegir}
                />
              )}
              {vista === "3d" && (
                <p
                  className={`pointer-events-none absolute left-4 top-4 rounded-full border border-piedra bg-[#F5EFE0]/90 px-3 py-1.5 text-xs font-medium text-tierra shadow-sm transition-opacity ${
                    sobre ? "opacity-100" : "opacity-0"
                  }`}
                  aria-hidden
                >
                  {sobre
                    ? sobre.estado === "LIBRE"
                      ? `Libre para apadrinar · fila ${sobre.fila + 1} · columna ${sobre.columna + 1}`
                      : sobre.estado === "RESERVADA"
                        ? `Apartada mientras se paga · fila ${sobre.fila + 1} · columna ${sobre.columna + 1}`
                        : `${sobre.arbol?.alias || ESPECIES[sobre.arbol!.especie].label} · ${
                            ESPECIES[sobre.arbol!.especie].label
                          } ${ETAPAS[sobre.arbol!.etapa].label.toLowerCase()} · fila ${sobre.fila + 1} · columna ${
                            sobre.columna + 1
                          }`
                    : ""}
                </p>
              )}
            </div>

            <section className="mt-4 rounded-3xl border border-piedra bg-card p-5" aria-live="polite">
              {aviso && !parcela && <p className="text-sm text-tierra">{aviso}</p>}
              {parcela && parcela.estado === "LIBRE" ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
                  <p className="flex items-center gap-2 font-display text-lg font-semibold text-bosque">
                    <MapPin className="h-5 w-5 text-cascara" />
                    Fila {parcela.fila + 1} · Columna {parcela.columna + 1}
                    <span className="text-sm font-normal text-muted-foreground">
                      {tablero.montoPorArbol !== null
                        ? `· $${Number(tablero.montoPorArbol).toLocaleString("es-CO")} ${tablero.moneda} por el árbol`
                        : `· tú defines el aporte, en ${tablero.moneda}`}
                    </span>
                  </p>
                  <div className="flex flex-col items-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setModal(true)}
                      disabled={!tablero.pagoHabilitado}
                      className="btn-sol rounded-full px-6 py-2.5 text-sm shadow-sm transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Apadrinar esta casilla
                    </button>
                    {tablero.pagoSimulado && (
                      <p className="text-[11px] uppercase tracking-wider text-sol">
                        Pago simulado · entorno de pruebas
                      </p>
                    )}
                  </div>
                </div>
              ) : parcela?.arbol?.confirmado ? (
                <div className="mt-2">
                  <p className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold text-bosque">
                    {parcela.arbol.especie === "CAFE" ? (
                      <Coffee className="h-5 w-5 text-cascara" aria-hidden />
                    ) : (
                      <Leaf className="h-5 w-5 text-hoja" aria-hidden />
                    )}
                    {parcela.arbol.alias || "Árbol sin nombre"}
                    <span className="text-sm font-normal text-muted-foreground">
                      · {ESPECIES[parcela.arbol.especie].label.toLowerCase()}, casilla fila {parcela.fila + 1} ·
                      columna {parcela.columna + 1}
                    </span>
                  </p>
                  <Etapas etapa={parcela.arbol.etapa} compacto />
                  <AtencionArbol
                    niveles={parcela.arbol.niveles}
                    estado={parcela.arbol.estado}
                    ultimoRiego={parcela.arbol.ultimoRiego}
                    ultimoAbono={parcela.arbol.ultimoAbono}
                  />
                  <p className="mt-2 text-sm leading-relaxed text-tierra">
                    {ETAPAS[parcela.arbol.etapa].descripcion} {ESPECIES[parcela.arbol.especie].nota} Cada árbol
                    apadrinado lleva su plántula, el hoyado, el tutor, el mantenimiento del primer año y la placa
                    con el nombre que eligió quien lo apadrinó.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      ¿Es tu árbol?{" "}
                      <a href="/donaciones/mi-arbol" className="font-semibold text-bosque underline">
                        Ábrelo con tu código
                      </a>{" "}
                      para leer el parte de la finca.
                    </p>
                    {tablero.cuidados.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setMimar(true)}
                        disabled={!tablero.pagoHabilitado}
                        className="btn-sol rounded-full px-6 py-2.5 text-sm shadow-sm transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Mimar este árbol
                      </button>
                    )}
                  </div>
                </div>
              ) : parcela ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-tierra">
                  <Sprout className="h-4 w-4 text-sol" aria-hidden />
                  Fila {parcela.fila + 1} · Columna {parcela.columna + 1} está apartada mientras alguien completa
                  el pago. Si no se confirma, vuelve a quedar libre en unos minutos.
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  {vista === "3d"
                    ? "Toca cualquier casilla para ver qué hay en ella; las libres se pueden apadrinar. Arrastra para girar la finca."
                    : "Elige cualquier casilla de la tabla: las libres se pueden apadrinar y las demás cuentan su árbol."}
                </p>
              )}
              {!tablero.pagoHabilitado && (
                <p className="mt-3 rounded-xl bg-secondary/70 px-4 py-3 text-sm text-tierra">
                  La finca está terminando de conectar el pago por PayPal. Mientras tanto puedes apoyar la
                  siembra en{" "}
                  <a href="/donaciones" className="font-semibold text-bosque underline">
                    los proyectos ya abiertos
                  </a>
                  , o escribirnos por el chat para apadrinar tu árbol por consignación.
                </p>
              )}
            </section>

            {tablero.donantes.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-2xl font-semibold text-bosque">Ya hacen parte del bosque</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {tablero.donantes.map((d, i) => (
                    <li
                      key={`${d.alias}-${i}`}
                      className="flex items-center gap-2 rounded-full border border-piedra bg-card px-4 py-1.5 text-sm"
                    >
                      {d.especie === "CAFE" ? (
                        <Coffee className="h-4 w-4 text-cascara" aria-hidden />
                      ) : (
                        <Leaf className="h-4 w-4 text-hoja" aria-hidden />
                      )}
                      {d.alias}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-piedra bg-card p-5">
                <h2 className="font-display text-xl font-semibold text-bosque">¿Ya apadrinaste?</h2>
                <p className="mt-1 text-sm text-tierra">
                  Con el código que te dimos al pagar puedes volver por tu árbol, ver en qué etapa va y leer
                  el parte de la finca.
                </p>
                <a
                  href="/donaciones/mi-arbol"
                  className="mt-3 inline-block rounded-full border border-bosque px-5 py-2 text-sm font-semibold text-bosque hover:bg-secondary"
                >
                  Consultar mi árbol →
                </a>
              </div>
              <div className="rounded-3xl border border-piedra bg-card p-5">
                <h2 className="font-display text-xl font-semibold text-bosque">¿Qué hace la finca con tu aporte?</h2>
                <p className="mt-1 text-sm leading-relaxed text-tierra">
                  La plántula, el hoyado, el tutor, el mantenimiento del primer año y la placa con tu nombre.
                  Los partes de crecimiento los publica la finca: cada árbol tiene su propio ritmo.
                </p>
              </div>
            </section>
          </>
        )}
      </div>

      {modal && parcela && tablero && (
        <ApadrinarModal
          casilla={parcela}
          tablero={tablero}
          onCerrar={() => setModal(false)}
          onListo={(c) => {
            setModal(false);
            setCodigo(c);
            recargar();
          }}
        />
      )}

      {mimar && parcela?.arbol?.confirmado && tablero && (
        <MimarModal
          casilla={parcela}
          tablero={tablero}
          onCerrar={() => setMimar(false)}
          onListo={() => {
            setMimar(false);
            setMimo(
              `El mimamiento quedó anotado en el parte de ${parcela.arbol?.alias || "este árbol"}: ` +
                "sus barras de atención ya subieron.",
            );
            recargar();
          }}
        />
      )}

      {mimo && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-4 z-40 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl border border-hoja bg-bosque px-5 py-4 text-crema shadow-xl"
        >
          <p className="text-sm">{mimo}</p>
          <button type="button" onClick={() => setMimo("")} aria-label="Cerrar aviso" className="shrink-0 text-crema/80 hover:text-crema">
            ✕
          </button>
        </div>
      )}

      {codigo && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-4 z-40 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl border border-bosque bg-bosque px-5 py-4 text-crema shadow-xl"
        >
          <p className="text-sm">
            Tu árbol quedó sembrado en el tablero. Código <strong className="font-mono">{codigo}</strong>
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <a href={`/donaciones/mi-arbol?codigo=${codigo}`} className="text-sm font-semibold underline">
              Ver ficha
            </a>
            <button type="button" onClick={() => setCodigo("")} aria-label="Cerrar aviso" className="text-crema/80 hover:text-crema">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
