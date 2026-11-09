"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Coffee,
  Droplets,
  HeartHandshake,
  Leaf,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Save,
  Settings2,
  Sprout,
  Table2,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  actualizarArbol,
  borrarSesion,
  cambiarClave,
  cargaArboles,
  cargaDonaciones,
  cargaResumen,
  DemasiadosIntentos,
  guardarConfig,
  guardarSesion,
  iniciarSesion,
  leerToken,
  leerUsuario,
  liberarCasilla,
  marcarSembrado,
  SesionVencida,
  type ArbolAdmin,
  type ConfigTablero,
  type DonacionAdmin,
  type Especie,
  type Etapa,
  type Resumen,
} from "@/lib/siembraAdmin";

type Pestana = "resumen" | "arboles" | "donaciones" | "ajustes";

const ETAPAS: { valor: Etapa; etiqueta: string }[] = [
  { valor: "SEMILLA", etiqueta: "Semilla" },
  { valor: "BROTE", etiqueta: "Brote" },
  { valor: "JUVENIL", etiqueta: "Juvenil" },
  { valor: "PRODUCTIVO", etiqueta: "Productivo" },
];

const campo =
  "w-full rounded-xl border border-piedra bg-card px-3 py-2 text-sm text-carbon outline-none transition focus:border-sol focus:ring-2 focus:ring-sol/30";

const botonSol =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-sol px-4 py-2 text-sm font-semibold text-carbon transition hover:bg-sol/85 disabled:cursor-not-allowed disabled:opacity-50";

const botonSuave =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-piedra bg-card px-3 py-2 text-sm font-medium text-tierra transition hover:border-cascara hover:text-cascara disabled:opacity-50";

function dinero(monto: number | string, moneda = "USD") {
  const n = typeof monto === "string" ? Number(monto) : monto;
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: moneda || "USD",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${moneda}`;
  }
}

function fecha(valor: string | null) {
  if (!valor) return "—";
  const d = new Date(valor.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Barra({ etiqueta, valor, color }: { etiqueta: string; valor: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
        <span>{etiqueta}</span>
        <span className="font-semibold text-tierra">{valor}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-piedra/60">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, valor))}%` }} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- login */

function Login({ alEntrar }: { alEntrar: (usuario: string) => void }) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [bloqueo, setBloqueo] = useState(0);

  // Cuenta atrás mientras el servidor tiene la IP bloqueada.
  useEffect(() => {
    if (bloqueo <= 0) return;
    const id = window.setTimeout(() => setBloqueo((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [bloqueo]);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bloqueo > 0) return;
    setError("");
    setCargando(true);
    try {
      const r = await iniciarSesion(usuario.trim(), clave);
      guardarSesion(r.token, r.usuario);
      alEntrar(r.usuario);
    } catch (err: any) {
      if (err instanceof DemasiadosIntentos) {
        setBloqueo(err.segundos);
      }
      setError(err?.message || "No pudimos entrar.");
    } finally {
      setCargando(false);
    }
  };

  const espera = `${Math.floor(bloqueo / 60)}:${String(bloqueo % 60).padStart(2, "0")}`;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-3xl border border-piedra bg-card p-6 shadow-sm sm:p-8">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-bosque text-crema">
          <Lock className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold text-bosque">Panel de la finca</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Entra para marcar siembras, dejar notas y revisar las donaciones de los árboles.
        </p>

        <form onSubmit={entrar} className="mt-6 space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-tierra">Usuario</span>
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              className={campo}
              placeholder="finca"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-tierra">Clave</span>
            <input
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete="current-password"
              className={campo}
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {bloqueo > 0 && (
            <p className="rounded-xl border border-sol/70 bg-sol/15 px-3 py-2 text-sm text-tierra">
              Por seguridad, espera <strong className="font-semibold tabular-nums">{espera}</strong> antes de
              volver a intentar.
            </p>
          )}

          <button
            type="submit"
            disabled={cargando || !usuario || !clave || bloqueo > 0}
            className={`${botonSol} w-full`}
          >
            {cargando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Leaf className="h-4 w-4" aria-hidden />}
            {bloqueo > 0 ? `Bloqueado (${espera})` : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/donaciones/siembra" className="underline decoration-piedra underline-offset-4 hover:text-cascara">
            Ir al tablero público
          </Link>
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- resumen */

function Tarjeta({ icono, valor, etiqueta }: { icono: React.ReactNode; valor: string; etiqueta: string }) {
  return (
    <div className="rounded-2xl border border-piedra bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icono}
        <span className="text-[11px] font-medium uppercase tracking-wider">{etiqueta}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-bosque">{valor}</p>
    </div>
  );
}

function VistaResumen({ datos }: { datos: Resumen }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta icono={<Table2 className="h-4 w-4" aria-hidden />} valor={`${datos.parcelas.libres} / ${datos.parcelas.total}`} etiqueta="Casillas libres" />
        <Tarjeta icono={<Sprout className="h-4 w-4" aria-hidden />} valor={String(datos.arboles.confirmados)} etiqueta="Árboles sembrados" />
        <Tarjeta icono={<Wallet className="h-4 w-4" aria-hidden />} valor={dinero(datos.dinero.recaudado, datos.config.moneda)} etiqueta="Recaudado" />
        <Tarjeta icono={<Droplets className="h-4 w-4" aria-hidden />} valor={String(datos.cuidados.total)} etiqueta="Mimos aplicados" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-piedra bg-card p-5">
          <h2 className="font-display text-lg font-semibold text-bosque">Estado de la finca</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {[
              ["Casillas ocupadas", String(datos.parcelas.ocupadas)],
              ["Casillas apartadas", String(datos.parcelas.reservadas)],
              ["Árboles pendientes de sembrar", String(datos.arboles.pendientes)],
              ["Donaciones registradas", String(datos.dinero.donaciones)],
              ["Costo de mimos", dinero(datos.cuidados.costo, datos.config.moneda)],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 border-b border-piedra/50 pb-2 last:border-0 last:pb-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-semibold text-tierra">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-2xl border border-piedra bg-card p-5">
          <h2 className="font-display text-lg font-semibold text-bosque">Últimas donaciones</h2>
          {datos.ultimas.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Todavía no hay donaciones registradas.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {datos.ultimas.map((d) => (
                <li key={d.id} className="flex items-baseline justify-between gap-3 border-b border-piedra/50 pb-2 last:border-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-tierra">{d.nombre || "Donante anónimo"}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {fecha(d.createdAt)}
                      {d.arbolCodigo ? ` · ${d.arbolCodigo}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold text-bosque">{dinero(d.monto, d.moneda)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {datos.proyecto && (
        <p className="rounded-2xl border border-piedra bg-secondary/40 p-4 text-sm text-tierra">
          Proyecto activo: <strong>{datos.proyecto.titulo}</strong> · estado {datos.proyecto.estado.toLowerCase()} · meta{" "}
          {dinero(datos.proyecto.meta, datos.proyecto.moneda)}
        </p>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- árboles */

function FichaArbol({
  arbol,
  alActualizar,
  avisar,
}: {
  arbol: ArbolAdmin;
  alActualizar: () => Promise<void> | void;
  avisar: (texto: string, tipo?: "ok" | "error") => void;
}) {
  const [editando, setEditando] = useState(false);
  const [busy, setBusy] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>(arbol.etapa);
  const [especie, setEspecie] = useState<Especie>(arbol.especie);
  const [alias, setAlias] = useState(arbol.alias || "");
  const [pais, setPais] = useState(arbol.pais || "");
  const [notas, setNotas] = useState(arbol.notasFinca || "");

  const guardar = async () => {
    setBusy(true);
    try {
      await actualizarArbol(arbol.codigo, { etapa, especie, alias, pais, notasFinca: notas });
      avisar(`Ficha de ${arbol.codigo} guardada.`);
      setEditando(false);
      await alActualizar();
    } catch (e: any) {
      avisar(e.message || "No pudimos guardar los cambios.", "error");
    } finally {
      setBusy(false);
    }
  };

  const sembrar = async () => {
    setBusy(true);
    try {
      const r = await marcarSembrado(arbol.codigo);
      avisar(r.mensaje);
      await alActualizar();
    } catch (e: any) {
      avisar(e.message || "No pudimos marcar el árbol.", "error");
    } finally {
      setBusy(false);
    }
  };

  const liberar = async () => {
    if (!window.confirm(`¿Liberar la casilla de ${arbol.codigo}? Se borra el árbol y su historial de mimos. La donación queda en el histórico.`)) {
      return;
    }
    setBusy(true);
    try {
      const r = await liberarCasilla(arbol.codigo);
      avisar(r.mensaje);
      await alActualizar();
    } catch (e: any) {
      avisar(e.message || "No pudimos liberar la casilla.", "error");
    } finally {
      setBusy(false);
    }
  };

  const casilla =
    arbol.fila !== null && arbol.columna !== null
      ? `Fila ${arbol.fila + 1} · Columna ${arbol.columna + 1}`
      : arbol.parcelaId;

  return (
    <article className="rounded-2xl border border-piedra bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-bosque">{arbol.codigo}</p>
          <p className="text-xs text-muted-foreground">
            {casilla} · {arbol.especie === "CAFE" ? "Café" : "Cacao"} ·{" "}
            {ETAPAS.find((e) => e.valor === arbol.etapa)?.etiqueta || arbol.etapa}
          </p>
          {(arbol.alias || arbol.padrino) && (
            <p className="mt-1 truncate text-sm text-tierra">
              {arbol.alias || "Sin alias"}
              {arbol.padrino ? ` · ${arbol.padrino}` : ""}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
            arbol.confirmado ? "bg-hoja/30 text-bosque" : "bg-sol/25 text-cascara"
          }`}
        >
          {arbol.confirmado ? "Sembrado" : "Pendiente"}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Barra etiqueta="Agua" valor={arbol.niveles.agua} color="bg-[#7FB3D5]" />
        <Barra etiqueta="Nutrientes" valor={arbol.niveles.nutrientes} color="bg-cascara" />
        <Barra etiqueta="Salud" valor={arbol.niveles.salud} color="bg-hoja" />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Sembrado el {fecha(arbol.fechaSiembra)} · último riego {fecha(arbol.ultimoRiego)} · último abono{" "}
        {fecha(arbol.ultimoAbono)}
        {arbol.donacion ? ` · aporte ${dinero(arbol.donacion.monto, arbol.donacion.moneda)}` : ""}
      </p>

      {arbol.notasFinca && !editando && (
        <p className="mt-2 rounded-xl bg-secondary/50 p-3 text-sm text-tierra">
          <strong className="font-medium">Nota de la finca:</strong> {arbol.notasFinca}
        </p>
      )}

      {editando && (
        <div className="mt-3 space-y-3 rounded-xl border border-piedra bg-secondary/30 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-medium text-tierra">
              Especie
              <select value={especie} onChange={(e) => setEspecie(e.target.value as Especie)} className={`${campo} mt-1`}>
                <option value="CAFE">Café</option>
                <option value="CACAO">Cacao</option>
              </select>
            </label>
            <label className="text-xs font-medium text-tierra">
              Etapa
              <select value={etapa} onChange={(e) => setEtapa(e.target.value as Etapa)} className={`${campo} mt-1`}>
                {ETAPAS.map((e) => (
                  <option key={e.valor} value={e.valor}>
                    {e.etiqueta}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-tierra">
              Alias del padrino
              <input value={alias} onChange={(e) => setAlias(e.target.value.slice(0, 40))} className={`${campo} mt-1`} />
            </label>
            <label className="text-xs font-medium text-tierra">
              País
              <input value={pais} onChange={(e) => setPais(e.target.value.slice(0, 60))} className={`${campo} mt-1`} />
            </label>
          </div>
          <label className="block text-xs font-medium text-tierra">
            Nota pública de la finca (se ve en la ficha del árbol)
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value.slice(0, 4000))}
              rows={3}
              className={`${campo} mt-1 resize-y`}
              placeholder="Ej. Sembrado junto al sendero de café, con sombra de guamo."
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={guardar} disabled={busy} className={botonSol}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
              Guardar
            </button>
            <button type="button" onClick={() => setEditando(false)} disabled={busy} className={botonSuave}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!editando && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditando(true)} disabled={busy} className={botonSuave}>
            <Settings2 className="h-4 w-4" aria-hidden />
            Editar ficha
          </button>
          {!arbol.confirmado && (
            <button type="button" onClick={sembrar} disabled={busy} className={botonSol}>
              <Sprout className="h-4 w-4" aria-hidden />
              Marcar sembrado
            </button>
          )}
          <button type="button" onClick={liberar} disabled={busy} className={`${botonSuave} hover:border-destructive hover:text-destructive`}>
            <Trash2 className="h-4 w-4" aria-hidden />
            Liberar casilla
          </button>
        </div>
      )}
    </article>
  );
}

function VistaArboles({ avisar }: { avisar: (texto: string, tipo?: "ok" | "error") => void }) {
  const [filtro, setFiltro] = useState<"todos" | "sembrados" | "pendientes">("todos");
  const [arboles, setArboles] = useState<ArbolAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const r = await cargaArboles(filtro);
      setArboles(r.arboles);
    } catch (e: any) {
      if (e instanceof SesionVencida) return;
      setError(e.message || "No pudimos cargar los árboles.");
    } finally {
      setCargando(false);
    }
  }, [filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-piedra bg-card p-1" role="group" aria-label="Filtrar árboles">
          {(["todos", "sembrados", "pendientes"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              className={`rounded-full px-3 py-1.5 text-sm capitalize transition ${
                filtro === f ? "bg-bosque text-crema" : "text-tierra hover:bg-secondary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button type="button" onClick={cargar} disabled={cargando} className={botonSuave}>
          <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} aria-hidden />
          Actualizar
        </button>
      </div>

      {error && <p className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

      {cargando && arboles.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando árboles…
        </p>
      ) : arboles.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-piedra bg-card p-8 text-center text-sm text-muted-foreground">
          No hay árboles en esta lista.
        </p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {arboles.map((a) => (
            <FichaArbol key={a.id} arbol={a} alActualizar={cargar} avisar={avisar} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ donaciones */

function VistaDonaciones() {
  const [donaciones, setDonaciones] = useState<DonacionAdmin[]>([]);
  const [totales, setTotales] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await cargaDonaciones();
        if (!vivo) return;
        setDonaciones(r.donaciones);
        setTotales(r.totales);
      } catch (e: any) {
        if (vivo && !(e instanceof SesionVencida)) setError(e.message || "No pudimos cargar las donaciones.");
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const resumenMonedas = useMemo(
    () => Object.entries(totales).map(([m, v]) => `${dinero(v, m)} ${m}`).join(" · ") || "—",
    [totales]
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-piedra bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <HeartHandshake className="h-4 w-4" aria-hidden />
          <span className="text-[11px] font-medium uppercase tracking-wider">Aprobado por moneda</span>
        </div>
        <p className="mt-1 font-display text-xl font-semibold text-bosque">{resumenMonedas}</p>
        <p className="text-xs text-muted-foreground">{donaciones.length} registros</p>
      </div>

      {error && <p className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

      {cargando ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando donaciones…
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-piedra bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-secondary/60 text-[11px] uppercase tracking-wider text-tierra">
              <tr>
                <th scope="col" className="px-3 py-2">Fecha</th>
                <th scope="col" className="px-3 py-2">Donante</th>
                <th scope="col" className="px-3 py-2">Árbol</th>
                <th scope="col" className="px-3 py-2">Proyecto</th>
                <th scope="col" className="px-3 py-2">Origen</th>
                <th scope="col" className="px-3 py-2">Estado</th>
                <th scope="col" className="px-3 py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {donaciones.map((d) => (
                <tr key={d.id} className="border-t border-piedra/60">
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{fecha(d.createdAt)}</td>
                  <td className="px-3 py-2">
                    <span className="block font-medium text-tierra">{d.nombre || "Anónimo"}</span>
                    {d.email && <span className="block text-xs text-muted-foreground">{d.email}</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{d.arbolCodigo || "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{d.proyecto || "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{d.esManual ? "Manual" : "Pasarela"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                        d.estado === "APROBADA" ? "bg-hoja/30 text-bosque" : "bg-sol/25 text-cascara"
                      }`}
                    >
                      {d.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-bosque whitespace-nowrap">
                    {dinero(d.monto, d.moneda)}
                  </td>
                </tr>
              ))}
              {donaciones.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    Todavía no hay donaciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- ajustes */

function VistaAjustes({
  avisar,
  configInicial,
  alCambiarConfig,
}: {
  avisar: (texto: string, tipo?: "ok" | "error") => void;
  configInicial: ConfigTablero | null;
  alCambiarConfig: (c: ConfigTablero) => void;
}) {
  const [config, setConfig] = useState<ConfigTablero | null>(configInicial);
  const [monto, setMonto] = useState(configInicial?.montoPorArbol != null ? String(configInicial.montoPorArbol) : "");
  const [minutos, setMinutos] = useState(String(configInicial?.reservaMinutos ?? 30));
  const [slug, setSlug] = useState(configInicial?.proyectoSlug ?? "");
  const [busy, setBusy] = useState(false);

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [busyClave, setBusyClave] = useState(false);

  useEffect(() => {
    if (configInicial) {
      setConfig(configInicial);
      setMonto(configInicial.montoPorArbol != null ? String(configInicial.montoPorArbol) : "");
      setMinutos(String(configInicial.reservaMinutos));
      setSlug(configInicial.proyectoSlug);
    }
  }, [configInicial]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await guardarConfig({
        montoPorArbol: monto.trim() === "" ? null : Number(monto),
        reservaMinutos: Number(minutos),
        proyectoSlug: slug.trim() || undefined,
      });
      setConfig(r.config);
      alCambiarConfig(r.config);
      avisar(r.mensaje || "Configuración guardada.");
    } catch (err: any) {
      avisar(err.message || "No pudimos guardar la configuración.", "error");
    } finally {
      setBusy(false);
    }
  };

  const cambiar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nueva !== repetir) {
      avisar("La clave nueva y su repetición no coinciden.", "error");
      return;
    }
    if (nueva.length < 8) {
      avisar("La clave nueva debe tener al menos 8 caracteres.", "error");
      return;
    }
    setBusyClave(true);
    try {
      const r = await cambiarClave(actual, nueva);
      setActual("");
      setNueva("");
      setRepetir("");
      avisar(r.mensaje || "Clave actualizada.");
    } catch (err: any) {
      avisar(err.message || "No pudimos cambiar la clave.", "error");
    } finally {
      setBusyClave(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-piedra bg-card p-5">
        <h2 className="font-display text-lg font-semibold text-bosque">Tablero y aportes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Si dejas el monto vacío, cada padrino define su propio aporte.
        </p>
        <form onSubmit={guardar} className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-tierra">Monto por árbol ({config?.moneda || "USD"})</span>
            <input
              value={monto}
              onChange={(e) => setMonto(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="Vacío = aporte libre"
              className={campo}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-tierra">Minutos que dura una casilla apartada</span>
            <input
              value={minutos}
              onChange={(e) => setMinutos(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              className={campo}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-tierra">Slug del proyecto</span>
            <input value={slug} onChange={(e) => setSlug(e.target.value.slice(0, 120))} className={campo} />
          </label>
          <button type="submit" disabled={busy} className={botonSol}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
            Guardar configuración
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-piedra bg-card p-5">
        <h2 className="font-display text-lg font-semibold text-bosque">Clave del panel</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cambia la clave inicial por una propia. Mínimo 8 caracteres.
        </p>
        <form onSubmit={cambiar} className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-tierra">Clave actual</span>
            <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" className={campo} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-tierra">Clave nueva</span>
            <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" className={campo} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-tierra">Repetir clave nueva</span>
            <input type="password" value={repetir} onChange={(e) => setRepetir(e.target.value)} autoComplete="new-password" className={campo} />
          </label>
          <button type="submit" disabled={busyClave || !actual || !nueva} className={botonSol}>
            {busyClave ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
            Cambiar clave
          </button>
        </form>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ panel */

export default function FincaPage() {
  const [usuario, setUsuario] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [pestana, setPestana] = useState<Pestana>("resumen");
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [errorResumen, setErrorResumen] = useState("");
  const [aviso, setAviso] = useState<{ texto: string; tipo: "ok" | "error" } | null>(null);

  const avisar = useCallback((texto: string, tipo: "ok" | "error" = "ok") => {
    setAviso({ texto, tipo });
  }, []);

  const salir = useCallback(() => {
    borrarSesion();
    setUsuario(null);
    setResumen(null);
  }, []);

  const cargarResumen = useCallback(async () => {
    setErrorResumen("");
    try {
      setResumen(await cargaResumen());
    } catch (e: any) {
      if (e instanceof SesionVencida) {
        setUsuario(null);
        return;
      }
      setErrorResumen(e.message || "No pudimos cargar el resumen.");
    }
  }, []);

  useEffect(() => {
    if (!leerToken()) {
      setListo(true);
      return;
    }
    setUsuario(leerUsuario() || "finca");
    setListo(true);
    cargarResumen();
  }, [cargarResumen]);

  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(null), 5000);
    return () => window.clearTimeout(t);
  }, [aviso]);

  if (!listo) {
    return (
      <div data-seccion="siembra" className="min-h-screen bg-crema text-carbon">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Abriendo el panel…
          </p>
        </div>
      </div>
    );
  }

  const PESTANAS: { clave: Pestana; etiqueta: string; icono: React.ReactNode }[] = [
    { clave: "resumen", etiqueta: "Resumen", icono: <Table2 className="h-4 w-4" aria-hidden /> },
    { clave: "arboles", etiqueta: "Árboles", icono: <Sprout className="h-4 w-4" aria-hidden /> },
    { clave: "donaciones", etiqueta: "Donaciones", icono: <HeartHandshake className="h-4 w-4" aria-hidden /> },
    { clave: "ajustes", etiqueta: "Ajustes", icono: <Settings2 className="h-4 w-4" aria-hidden /> },
  ];

  return (
    <div data-seccion="siembra" className="min-h-screen bg-crema text-carbon">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/donaciones/siembra"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-cascara"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Tablero público
            </Link>
            <h1 className="mt-1 font-display text-3xl font-semibold text-bosque">Panel de la finca</h1>
            <p className="text-sm text-muted-foreground">
              Marca siembras, publica notas y revisa las donaciones de cada árbol.
            </p>
          </div>
          {usuario && (
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-full border border-piedra bg-card px-3 py-1.5 text-tierra">
                <Coffee className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                {usuario}
              </span>
              <button type="button" onClick={salir} className={botonSuave}>
                <LogOut className="h-4 w-4" aria-hidden />
                Salir
              </button>
            </div>
          )}
        </header>

        {aviso && (
          <p
            role="status"
            className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
              aviso.tipo === "ok"
                ? "border-hoja/60 bg-hoja/15 text-bosque"
                : "border-destructive/40 bg-destructive/5 text-destructive"
            }`}
          >
            {aviso.texto}
          </p>
        )}

        {!usuario ? (
          <Login alEntrar={(u) => { setUsuario(u); cargarResumen(); }} />
        ) : (
          <>
            <nav className="mt-6 flex flex-wrap gap-1 rounded-full border border-piedra bg-card p-1" aria-label="Secciones del panel">
              {PESTANAS.map((p) => (
                <button
                  key={p.clave}
                  type="button"
                  onClick={() => setPestana(p.clave)}
                  aria-current={pestana === p.clave ? "page" : undefined}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    pestana === p.clave ? "bg-bosque text-crema" : "text-tierra hover:bg-secondary"
                  }`}
                >
                  {p.icono}
                  {p.etiqueta}
                </button>
              ))}
            </nav>

            <div className="mt-6">
              {pestana === "resumen" && (
                <>
                  {errorResumen && (
                    <p className="mb-3 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      {errorResumen}
                    </p>
                  )}
                  {resumen ? (
                    <VistaResumen datos={resumen} />
                  ) : (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando resumen…
                    </p>
                  )}
                </>
              )}
              {pestana === "arboles" && <VistaArboles avisar={avisar} />}
              {pestana === "donaciones" && <VistaDonaciones />}
              {pestana === "ajustes" && (
                <VistaAjustes
                  avisar={avisar}
                  configInicial={resumen?.config ?? null}
                  alCambiarConfig={(c) => setResumen((r) => (r ? { ...r, config: c } : r))}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
