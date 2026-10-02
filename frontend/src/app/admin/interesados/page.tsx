"use client";

import { useEffect, useState } from "react";
import { Search, Trash2, Users } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface Lead {
  id: string;
  nombre?: string | null;
  email?: string | null;
  telefono?: string | null;
  ip?: string | null;
  mensajesTotal: number;
  primeraPregunta?: string | null;
  ultimaPregunta?: string | null;
  prefs?: any;
  temas: string[];
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  conNombre: number;
  conContacto: number;
  mensajesTotal: number;
  activos7d: number;
  topTemas: { tema: string; total: number }[];
  topTipos: { tema: string; total: number }[];
}

function auth(extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${localStorage.getItem("token")}`, ...extra };
}

function resumenPrefs(p: any): string {
  if (!p) return "—";
  const partes: string[] = [];
  if (p.tipo) partes.push(p.tipo);
  if (p.huespedes) partes.push(`${p.huespedes} pers.`);
  if (p.presupuestoMax) partes.push(`hasta $${Number(p.presupuestoMax).toLocaleString("es-CO")}`);
  if (p.mascotas) partes.push("🐶");
  if (p.actividad) partes.push(p.actividad);
  return partes.length ? partes.join(" · ") : "explorando";
}

export default function InteresadosPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [q, setQ] = useState("");
  const [soloNombres, setSoloNombres] = useState(false);
  const [ver, setVer] = useState<any>(null);
  const [msg, setMsg] = useState("");

  const cargar = async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (soloNombres) params.set("conNombre", "si");
    const [s, l] = await Promise.all([
      fetch(`${API}/admin/leads/stats`, { headers: auth() }).then((r) => r.json()),
      fetch(`${API}/admin/leads?${params}`, { headers: auth() }).then((r) => r.json()),
    ]);
    setStats(s);
    setLeads(l);
  };

  useEffect(() => {
    cargar().catch((e) => setMsg("Error: " + e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buscar = (ev: React.FormEvent) => {
    ev.preventDefault();
    cargar().catch((e) => setMsg("Error: " + e.message));
  };

  const verDetalle = async (id: string) => {
    const d = await fetch(`${API}/admin/leads/${id}`, { headers: auth() }).then((r) => r.json());
    setVer(d);
  };

  const eliminar = async (id: string, nombre?: string | null) => {
    if (!confirm(`¿Eliminar el registro de ${nombre || "este visitante"}? (habeas data)`)) return;
    await fetch(`${API}/admin/leads/${id}`, { method: "DELETE", headers: auth() });
    setVer(null);
    cargar();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <Users className="h-6 w-6 text-primary" /> Interesados
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quiénes hablan con Nati, qué averiguan y qué datos dejan. Úsalo para decidir precios, contenidos y campañas.
        </p>
      </div>
      {msg && <div className="rounded-xl border border-input bg-white px-4 py-3 text-sm shadow-sm">{msg}</div>}

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { v: stats?.total ?? "…", l: "visitantes" },
          { v: stats?.conNombre ?? "…", l: "con nombre" },
          { v: stats?.conContacto ?? "…", l: "con contacto" },
          { v: stats?.mensajesTotal ?? "…", l: "mensajes" },
          { v: stats?.activos7d ?? "…", l: "activos 7 días" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border bg-white p-4 text-center shadow-sm">
            <p className="font-display text-xl font-semibold text-primary">{s.v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Top temas */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Lo que más averiguan</h2>
          <div className="mt-3 space-y-2">
            {(stats?.topTemas || []).map((t) => (
              <div key={t.tema} className="flex items-center gap-2 text-sm">
                <span className="w-40 truncate">{t.tema}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round((100 * t.total) / Math.max(1, stats?.total || 1))}%` }}
                  />
                </div>
                <span className="w-8 text-right font-semibold">{t.total}</span>
              </div>
            ))}
            {(stats?.topTemas || []).length === 0 && (
              <p className="text-sm text-muted-foreground">Aún sin datos.</p>
            )}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Tipos de sitio más buscados</h2>
          <div className="mt-3 space-y-2">
            {(stats?.topTipos || []).map((t) => (
              <div key={t.tema} className="flex items-center gap-2 text-sm">
                <span className="w-40 truncate capitalize">{t.tema.replace("_", " ")}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round((100 * t.total) / Math.max(1, stats?.total || 1))}%` }}
                  />
                </div>
                <span className="w-8 text-right font-semibold">{t.total}</span>
              </div>
            ))}
            {(stats?.topTipos || []).length === 0 && (
              <p className="text-sm text-muted-foreground">Aún sin datos.</p>
            )}
          </div>
        </div>
      </div>

      {/* Buscador */}
      <form onSubmit={buscar} className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, email o pregunta…"
            className="w-full rounded-xl border border-input bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <label className="flex items-center gap-1.5 rounded-xl border border-input bg-white px-4 py-2.5 text-sm">
          <input type="checkbox" checked={soloNombres} onChange={(e) => setSoloNombres(e.target.checked)} />
          Solo con nombre
        </label>
        <button className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Buscar
        </button>
      </form>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Visitante</th>
              <th className="px-4 py-3">Interés</th>
              <th className="px-4 py-3">Temas</th>
              <th className="px-4 py-3">Msgs</th>
              <th className="px-4 py-3">Última actividad</th>
              <th className="px-4 py-3 text-right">Ver</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-b last:border-0 hover:bg-secondary/20">
                <td className="px-4 py-3">
                  <p className="font-semibold">{l.nombre || <span className="font-normal text-muted-foreground">Anónimo</span>}</p>
                  <p className="text-xs text-muted-foreground">{[l.email, l.telefono].filter(Boolean).join(" · ") || "sin contacto"}</p>
                  {l.ip && <p className="font-mono text-[11px] text-muted-foreground">IP {l.ip}</p>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{resumenPrefs(l.prefs)}</td>
                <td className="px-4 py-3">
                  <div className="flex max-w-[220px] flex-wrap gap-1">
                    {l.temas.slice(0, 4).map((t) => (
                      <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">{t}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">{l.mensajesTotal}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(l.updatedAt).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => verDetalle(l.id)} className="rounded-lg border border-input px-3 py-1.5 text-xs hover:bg-secondary">
                    Abrir
                  </button>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Sin registros todavía. Aparecen cuando alguien converse con Nati.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detalle */}
      {ver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setVer(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold">{ver.nombre || "Anónimo"}</h2>
                <p className="text-sm text-muted-foreground">{[ver.email, ver.telefono].filter(Boolean).join(" · ") || "sin contacto"}</p>
                {(ver.ip || ver.userAgent) && (
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {[ver.ip ? `IP ${ver.ip}` : null, ver.userAgent].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <button onClick={() => setVer(null)} className="text-2xl leading-none text-muted-foreground hover:text-foreground">×</button>
            </div>
            <p className="text-sm"><strong>Interés:</strong> {resumenPrefs(ver.prefs)}</p>
            <p className="mt-1 text-sm"><strong>Primera pregunta:</strong> {ver.primeraPregunta || "—"}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {(ver.temas || []).map((t: string) => (
                <span key={t} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{t}</span>
              ))}
            </div>
            <h3 className="mb-2 mt-4 font-semibold">Conversación</h3>
            <div className="space-y-2">
              {(Array.isArray(ver.transcript) ? ver.transcript : []).map((t: any, i: number) => (
                <div key={i} className={`flex ${t.rol === "usuario" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${t.rol === "usuario" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                    {t.texto}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => eliminar(ver.id, ver.nombre)}
              className="mt-5 flex items-center gap-1.5 rounded-xl border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Eliminar registro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
