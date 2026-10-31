"use client";

import { useRef, useState } from "react";
import { Droplet, Leaf, Loader2, Minus, Plus, Scissors, ShieldCheck, Sprout, X } from "lucide-react";
import { capturaPago, compraCuidados, type CategoriaCuidado, type ParcelaTablero, type Tablero } from "@/lib/siembra";
import { usarCajaModal } from "./usarCajaModal";
import { usarPagoPaypal } from "./usarPagoPaypal";

const ICONO: Record<CategoriaCuidado, typeof Droplet> = {
  AGUA: Droplet,
  ABONO: Sprout,
  SUSTRATO: Leaf,
  CUIDADO: Scissors,
};

const MAX_POR_LINEA = 20;

const money = (v: number, moneda: string) =>
  `$${v.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`;

const tope = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/**
 * Mimar un árbol ya sembrado: se eligen las unidades de cada cuidado de la
 * finca, se ve el total y se paga en el mismo flujo del apadrinamiento.
 */
export default function MimarModal({
  casilla,
  tablero,
  onCerrar,
  onListo,
}: {
  casilla: ParcelaTablero;
  tablero: Tablero;
  onCerrar: () => void;
  onListo: () => void;
}) {
  const arbol = casilla.arbol!;
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [estado, setEstado] = useState<"listo" | "pagando">("listo");
  const panel = useRef<HTMLDivElement>(null);

  const lineas = tablero.cuidados
    .filter((i) => (cantidades[i.clave] || 0) > 0)
    .map((i) => ({ item: i, cantidad: cantidades[i.clave] }));
  const total = Math.round(lineas.reduce((s, l) => s + l.item.precio * l.cantidad, 0) * 100) / 100;

  // Cómo amanecería el árbol mañana si la finca recibe este pedido hoy.
  const proyeccion = lineas.reduce(
    (n, l) => ({
      agua: tope(n.agua + l.item.realce.agua * l.cantidad),
      nutrientes: tope(n.nutrientes + l.item.realce.nutrientes * l.cantidad),
      salud: tope(n.salud + l.item.realce.salud * l.cantidad),
    }),
    { ...arbol.niveles },
  );

  const mover = (clave: string, delta: number) =>
    setCantidades((c) => {
      const siguiente = Math.max(0, Math.min(MAX_POR_LINEA, (c[clave] || 0) + delta));
      if (siguiente === 0) {
        const { [clave]: _omitida, ...resto } = c;
        return resto;
      }
      return { ...c, [clave]: siguiente };
    });

  usarCajaModal(panel, onCerrar);

  const comprar = async () => {
    setError("");
    setEstado("pagando");
    try {
      const r = await compraCuidados({
        fila: casilla.fila,
        columna: casilla.columna,
        lineas: lineas.map((l) => ({ clave: l.item.clave, cantidad: l.cantidad })),
      });
      return r;
    } catch (e: any) {
      setEstado("listo");
      setError(e.message || "No pudimos armar el pedido para este árbol.");
      throw e;
    }
  };

  const confirmar = async (orderId: string) => {
    try {
      await capturaPago(orderId);
      onListo();
    } catch (e: any) {
      setEstado("listo");
      setError(e.message || "El pago no se alcanzó a confirmar.");
    }
  };

  const { boton, clientId, sinBoton, reintentar } = usarPagoPaypal({
    moneda: tablero.moneda,
    clave: `${casilla.fila}-${casilla.columna}|${lineas.map((l) => `${l.item.clave}:${l.cantidad}`).join(",")}`,
    crearOrden: async () => (await comprar()).orderId,
    alAprobar: confirmar,
    alCancelar: () => setEstado("listo"),
    alError: () => {
      setEstado("listo");
      setError("PayPal no respondió. Intenta de nuevo o escríbenos por el chat.");
    },
  });

  const mimarSimulado = async () => {
    try {
      const r = await comprar();
      await confirmar(r.orderId);
    } catch {
      // `comprar` ya dejó el aviso en pantalla.
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#2A241E]/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mimar-titulo"
        tabIndex={-1}
        className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-3xl border border-piedra bg-crema shadow-2xl outline-none sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-piedra p-6 pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cascara">
              Fila {casilla.fila + 1} · Columna {casilla.columna + 1}
            </p>
            <h2 id="mimar-titulo" className="mt-1 font-display text-2xl font-semibold text-bosque">
              {arbol.alias ? `Mima a ${arbol.alias}` : "Mima este árbol"}
            </h2>
            <p className="mt-1 text-sm text-tierra">
              {arbol.estado.etiqueta.toLowerCase()} · agua {arbol.niveles.agua}% · nutrientes{" "}
              {arbol.niveles.nutrientes}% · salud {arbol.niveles.salud}%
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-full border border-input p-2 text-tierra hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {tablero.cuidados.length === 0 ? (
          <div className="p-6">
            <p className="rounded-xl border border-piedra bg-secondary/60 p-4 text-sm text-tierra">
              La finca todavía no publica su lista de cuidados. En cuanto la tenga escrita, aquí podrás
              regalarle riego, abono o una poda a este árbol.
            </p>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-6 py-4">
              {tablero.cuidados.map((i) => {
                const Icono = ICONO[i.categoria];
                const n = cantidades[i.clave] || 0;
                return (
                  <li
                    key={i.clave}
                    className={`flex items-center gap-3 border-b border-piedra/70 py-3 last:border-0 ${
                      n ? "" : "opacity-90"
                    }`}
                  >
                    <Icono className={`h-5 w-5 shrink-0 ${n ? "text-bosque" : "text-cascara"}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-bosque">
                        {i.etiqueta}
                        <span className="text-xs font-normal text-muted-foreground">
                          {money(i.precio, tablero.moneda)} por {i.unidad}
                        </span>
                      </p>
                      {i.descripcion && (
                        <p className="mt-0.5 text-xs leading-relaxed text-tierra">{i.descripcion}</p>
                      )}
                      <p className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                        {[
                          i.realce.agua ? `+${i.realce.agua} agua` : "",
                          i.realce.nutrientes ? `+${i.realce.nutrientes} nutrientes` : "",
                          i.realce.salud ? `+${i.realce.salud} salud` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => mover(i.clave, -1)}
                        disabled={!n}
                        aria-label={`Quitar una unidad de ${i.etiqueta}`}
                        className="rounded-full border border-input p-1.5 text-tierra hover:bg-secondary disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span
                        aria-live="polite"
                        className="w-8 text-center font-mono text-sm text-bosque"
                      >
                        {n}
                      </span>
                      <button
                        type="button"
                        onClick={() => mover(i.clave, 1)}
                        disabled={n >= MAX_POR_LINEA}
                        aria-label={`Agregar una unidad de ${i.etiqueta}`}
                        className="rounded-full border border-bosque bg-bosque p-1.5 text-crema hover:opacity-90 disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-piedra bg-card/60 p-6">
              {lineas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Suma al menos un cuidado para ver el total y pagar. Nada se cobra antes de que confirmes.
                </p>
              ) : (
                <>
                  <div className="flex items-end justify-between gap-4">
                    <p className="text-sm text-tierra">
                      El árbol amanecería con agua {proyeccion.agua}%, nutrientes {proyeccion.nutrientes}% y
                      salud {proyeccion.salud}%.
                    </p>
                    <p className="font-display text-2xl font-semibold text-bosque">
                      {money(total, tablero.moneda)}
                    </p>
                  </div>

                  <div className="mt-4">
                    {!tablero.pagoHabilitado ? (
                      <p className="rounded-xl border border-piedra bg-secondary/60 p-4 text-sm text-tierra">
                        La finca está terminando de conectar el pago. Puedes contarle a tu árbol lo que
                        quieres regalarle por el chat y lo dejamos anotado.
                      </p>
                    ) : tablero.pagoSimulado ? (
                      <div className="rounded-xl border border-sol/70 bg-[#E8A94A]/15 p-4">
                        <p className="text-sm text-tierra">
                          <strong>Entorno de pruebas:</strong> el pago se simula en local. No se cobra nada.
                        </p>
                        <button
                          type="button"
                          onClick={mimarSimulado}
                          disabled={estado === "pagando"}
                          className="btn-sol mt-3 w-full rounded-full px-6 py-2.5 text-sm shadow-sm transition-transform hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70"
                        >
                          {estado === "pagando" ? "Aplicando el mimo…" : "Confirmar mimamiento (pago simulado)"}
                        </button>
                      </div>
                    ) : sinBoton ? (
                      <div className="rounded-xl border border-piedra bg-secondary/60 p-4 text-sm text-tierra">
                        <p>
                          No pudimos traer el botón seguro de PayPal. Si sigue sin aparecer, escríbenos por el
                          chat y acordamos el mimamiento de este árbol.
                        </p>
                        <button
                          type="button"
                          onClick={reintentar}
                          className="mt-3 rounded-xl border border-bosque px-4 py-2 text-sm font-semibold text-bosque hover:bg-secondary"
                        >
                          Volver a intentar
                        </button>
                      </div>
                    ) : !clientId ? (
                      <p className="flex items-center gap-2 rounded-xl border border-piedra bg-secondary/60 p-4 text-sm text-tierra">
                        <Loader2 className="h-4 w-4 animate-spin" /> Cargando el pago seguro de PayPal…
                      </p>
                    ) : (
                      <div ref={boton} className="min-h-[52px]" />
                    )}
                  </div>

                  {estado === "pagando" && (
                    <p className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Reservando el pedido en la finca…
                    </p>
                  )}
                </>
              )}
              {error && (
                <p role="alert" className="mt-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}
              <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                {lineas.length > 0 && <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cascara" />}
                {lineas.length > 0
                  ? "El pago viaja cifrado por PayPal y se suma a la donación del proyecto de siembra. La finca aplica el cuidado y queda en el parte del árbol."
                  : ""}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
