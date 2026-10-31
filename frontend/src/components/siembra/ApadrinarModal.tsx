"use client";

import { useRef, useState } from "react";
import { Coffee, Leaf, Loader2, ShieldCheck, Sprout, X } from "lucide-react";
import { capturaPago, reservaArbol, type Especie, type ParcelaTablero, type Tablero } from "@/lib/siembra";
import { usarCajaModal } from "./usarCajaModal";
import { usarPagoPaypal } from "./usarPagoPaypal";

const etiqueta = (p: ParcelaTablero) => `Fila ${p.fila + 1} · Columna ${p.columna + 1}`;

export default function ApadrinarModal({
  casilla,
  tablero,
  onCerrar,
  onListo,
}: {
  casilla: ParcelaTablero;
  tablero: Tablero;
  onCerrar: () => void;
  onListo: (codigo: string) => void;
}) {
  const [especie, setEspecie] = useState<Especie>("CAFE");
  const [alias, setAlias] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [pais, setPais] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [montoLibre, setMontoLibre] = useState("");
  const [error, setError] = useState("");
  const [estado, setEstado] = useState<"listo" | "pagando">("listo");
  const panel = useRef<HTMLDivElement>(null);
  // PayPal llama a createOrder cuando el donante pulsa el botón: los datos se leen
  // en ese instante, así que el formulario no tiene que re-pintar el botón.
  const datos = useRef({ especie, alias, nombre, email, pais, mensaje, montoLibre });
  datos.current = { especie, alias, nombre, email, pais, mensaje, montoLibre };
  const vivos = useRef({ casilla, tablero, onListo });
  vivos.current = { casilla, tablero, onListo };

  const monto = tablero.montoPorArbol ?? Number(montoLibre);
  const montoValido = Number.isFinite(monto) && monto > 0;

  /** Aparta la casilla en el backend; se llama en el instante del pago, no al montar el botón. */
  const apartarCasilla = async () => {
    const { casilla: caja, tablero: tab } = vivos.current;
    const d = datos.current;
    return reservaArbol({
      fila: caja.fila,
      columna: caja.columna,
      especie: d.especie,
      monto: tab.montoPorArbol ?? (d.montoLibre ? Number(d.montoLibre) : undefined),
      alias: d.alias || undefined,
      nombre: d.nombre || undefined,
      email: d.email || undefined,
      pais: d.pais || undefined,
      mensaje: d.mensaje || undefined,
    });
  };

  // El entorno de pruebas se salta PayPal: reserva y captura la orden simulada.
  const sembrarSimulado = async () => {
    setError("");
    setEstado("pagando");
    try {
      const r = await apartarCasilla();
      const c = await capturaPago(r.orderId);
      vivos.current.onListo(c.codigo || "");
    } catch (e: any) {
      setEstado("listo");
      setError(e.message || "No pudimos sembrar tu árbol en esa casilla.");
    }
  };

  usarCajaModal(panel, onCerrar);

  // El botón se remonta si cambia la casilla; los callbacks leen `vivos`/`datos`,
  // siempre vigentes, para no repintar con cada tecleo.
  const { boton, clientId, sinBoton, reintentar } = usarPagoPaypal({
    moneda: tablero.moneda,
    clave: `${casilla.fila}-${casilla.columna}`,
    crearOrden: async () => {
      setError("");
      setEstado("pagando");
      try {
        const r = await apartarCasilla();
        return r.orderId;
      } catch (e: any) {
        setEstado("listo");
        setError(e.message || "No pudimos apartar esa casilla.");
        throw e;
      }
    },
    alAprobar: async (orderId) => {
      try {
        const r = await capturaPago(orderId);
        vivos.current.onListo(r.codigo || "");
      } catch (e: any) {
        setEstado("listo");
        setError(e.message || "El pago no se alcanzó a confirmar.");
      }
    },
    alCancelar: () => setEstado("listo"),
    alError: () => {
      setEstado("listo");
      setError("PayPal no respondió. Intenta de nuevo o escríbenos por el chat.");
    },
  });

  const campo =
    "w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
        aria-labelledby="apadrinar-titulo"
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-piedra bg-crema p-6 shadow-2xl outline-none sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cascara">{etiqueta(casilla)}</p>
            <h2 id="apadrinar-titulo" className="mt-1 font-display text-2xl font-semibold text-bosque">
              Apadrina un árbol de la finca
            </h2>
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

        <fieldset className="mt-5">
          <legend className="text-sm font-medium">¿Qué plantas en esta casilla?</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(
              [
                { v: "CAFE" as Especie, Icon: Coffee, titulo: "Café", nota: "Variedad de ladera, recogida a mano." },
                { v: "CACAO" as Especie, Icon: Leaf, titulo: "Cacao", nota: "Árbol de sombra, crece bajo el dosel." },
              ]
            ).map(({ v, Icon, titulo, nota }) => (
              <label
                key={v}
                className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors ${
                  especie === v ? "border-bosque bg-card shadow-sm" : "border-input hover:bg-secondary/60"
                }`}
              >
                <input
                  type="radio"
                  name="especie"
                  value={v}
                  checked={especie === v}
                  onChange={() => setEspecie(v)}
                  className="sr-only"
                />
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${especie === v ? "text-bosque" : "text-muted-foreground"}`} />
                <span>
                  <span className="block text-sm font-semibold">{titulo}</span>
                  <span className="block text-xs text-muted-foreground">{nota}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Cómo lo bautizas (opcional)</span>
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value.slice(0, 40))}
              placeholder="Ej. «El abuelo»"
              className={campo}
            />
          </label>
          {tablero.montoPorArbol === null && (
            <label className="text-sm">
              <span className="mb-1 block font-medium">Tu aporte ({tablero.moneda})</span>
              <input
                value={montoLibre}
                onChange={(e) => setMontoLibre(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                placeholder="Ej. 25"
                className={campo}
              />
            </label>
          )}
          <label className="text-sm">
            <span className="mb-1 block font-medium">Tu nombre (para tu diploma)</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value.slice(0, 120))} className={campo} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Email (para el parte de la finca)</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value.slice(0, 160))} className={campo} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">País (opcional)</span>
            <input value={pais} onChange={(e) => setPais(e.target.value.slice(0, 60))} className={campo} />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Mensaje para la finca (opcional)</span>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value.slice(0, 500))}
              rows={2}
              className={`${campo} resize-none`}
            />
          </label>
        </div>

        {tablero.montoPorArbol !== null && (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-secondary/70 px-4 py-3 text-sm">
            <Sprout className="h-4 w-4 text-bosque" />
            Cada árbol apadrinado es <strong>${Number(tablero.montoPorArbol).toLocaleString("es-CO")} {tablero.moneda}</strong>,
            y cubre la plántula, el hoyado, el tutor y el año de mantenimiento.
          </p>
        )}

        <div className="mt-5">
          {!montoValido ? (
            <div className="rounded-xl border border-piedra bg-secondary/60 p-4 text-sm text-tierra">
              Escribe un aporte para continuar. La finca publica el costo de cada árbol; si prefieres
              definirlo tú, pon la cifra que quieras regalar.
            </div>
          ) : tablero.pagoSimulado ? (
            <div className="rounded-xl border border-sol/70 bg-[#E8A94A]/15 p-4">
              <p className="text-sm text-tierra">
                <strong>Entorno de pruebas:</strong> el pago se simula en local para que puedas ver el
                flujo completo. No se cobra nada ni entra dinero real.
              </p>
              <button
                type="button"
                onClick={sembrarSimulado}
                disabled={estado === "pagando"}
                className="btn-sol mt-3 w-full rounded-full px-6 py-2.5 text-sm shadow-sm transition-transform hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70"
              >
                {estado === "pagando" ? "Sembrando tu árbol…" : "Confirmar siembra (pago simulado)"}
              </button>
            </div>
          ) : sinBoton ? (
            <div className="rounded-xl border border-piedra bg-secondary/60 p-4 text-sm text-tierra">
              <p>
                No pudimos traer el botón seguro de PayPal. Suele ser la conexión o que la finca todavía
                no configura su cuenta. Si sigue sin aparecer, escríbenos por el chat y acordamos la
                siembra de esta casilla.
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
            <div className="flex items-center gap-2 rounded-xl border border-piedra bg-secondary/60 p-4 text-sm text-tierra">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando el pago seguro de PayPal…
            </div>
          ) : (
            <div ref={boton} className="min-h-[52px]">
              <p className="py-4 text-center text-sm text-muted-foreground">Cargando botón de PayPal…</p>
            </div>
          )}
        </div>

        {estado === "pagando" && (
          <p className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Apartando tu casilla en el tablero…
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cascara" />
          El pago viaja cifrado por PayPal; la finca nunca ve tu tarjeta. Al confirmar te damos un código
          para volver por aquí y ver tu árbol crecer en el tablero. Si cierras PayPal sin pagar, la casilla
          queda apartada {tablero.reservaMinutos} minutos y después vuelve a estar libre.
        </p>
      </div>
    </div>
  );
}
