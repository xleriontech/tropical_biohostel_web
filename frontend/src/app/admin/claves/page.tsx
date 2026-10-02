"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, FlaskConical, KeyRound, Pencil, Plus, Trash2, XCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface Clave {
  id: string;
  clave: string;
  nombre: string;
  descripcion?: string | null;
  webUrl?: string | null;
  configurada: boolean;
  pista?: string | null;
}

export default function ClavesPage() {
  const [claves, setClaves] = useState<Clave[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [nueva, setNueva] = useState({ clave: "", nombre: "", webUrl: "", valor: "" });
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [probando, setProbando] = useState<string | null>(null);
  const [pruebas, setPruebas] = useState<Record<string, { ok: boolean; mensaje: string }>>({});

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("token") || "" : "");
  const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/claves`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setClaves(await res.json());
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async (clave: string, valorNuevo: string) => {
    if (!valorNuevo.trim()) return;
    await fetch(`${API}/admin/claves/${clave}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ valor: valorNuevo.trim() }),
    });
    setEditando(null);
    setValor("");
    cargar();
  };

  const crear = async () => {
    const claveNorm = nueva.clave.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
    if (!claveNorm || !nueva.valor.trim()) return;
    await fetch(`${API}/admin/claves/${claveNorm}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ nombre: nueva.nombre.trim() || claveNorm, webUrl: nueva.webUrl.trim() || undefined, valor: nueva.valor.trim() }),
    });
    setNueva({ clave: "", nombre: "", webUrl: "", valor: "" });
    setMostrarNueva(false);
    cargar();
  };

  const eliminar = async (clave: string) => {
    if (!confirm(`¿Eliminar la clave "${clave}"?`)) return;
    await fetch(`${API}/admin/claves/${clave}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    cargar();
  };

  const probar = async (clave: string) => {
    setProbando(clave);
    try {
      const res = await fetch(`${API}/admin/claves/${clave}/probar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json().catch(() => null);
      setPruebas((p) => ({ ...p, [clave]: data || { ok: false, mensaje: "Sin respuesta" } }));
    } catch {
      setPruebas((p) => ({ ...p, [clave]: { ok: false, mensaje: "No se pudo probar" } }));
    } finally {
      setProbando(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <KeyRound className="h-6 w-6 text-primary" /> Claves API
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bóveda central de claves para integraciones (Google Places y las que vengan).
          Se guardan cifradas y nunca se muestran completas.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : (
        <div className="space-y-4">
          {claves.map((c) => (
            <div key={c.clave} className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{c.nombre}</h3>
                  <p className="font-mono text-xs text-muted-foreground">{c.clave}</p>
                  {c.descripcion && <p className="mt-1 text-sm text-muted-foreground">{c.descripcion}</p>}
                  {c.webUrl && (
                    <a href={c.webUrl} target="_blank" className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> Dónde generar esta key
                    </a>
                  )}
                  <p className="mt-2 text-sm">
                    {c.configurada ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                        Configurada ({c.pista})
                      </span>
                    ) : (
                      <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
                        Sin configurar
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => probar(c.clave)}
                    disabled={!c.configurada || probando === c.clave}
                    title="Probar contra la API real"
                    className="flex items-center gap-1 rounded-lg border border-input px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                  >
                    <FlaskConical className="h-4 w-4" />
                    {probando === c.clave ? "Probando..." : "Probar"}
                  </button>
                  <button
                    onClick={() => { setEditando(editando === c.clave ? null : c.clave); setValor(""); }}
                    title="Pegar nueva key"
                    className="rounded-lg border border-input p-2 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => eliminar(c.clave)}
                    title="Eliminar"
                    className="rounded-lg border border-input p-2 text-muted-foreground hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {pruebas[c.clave] && (
                <div className={`mt-3 flex items-start gap-2 rounded-lg border p-3 text-xs ${
                  pruebas[c.clave].ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"
                }`}>
                  {pruebas[c.clave].ok
                    ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                    : <XCircle className="h-4 w-4 shrink-0" />}
                  <span>{pruebas[c.clave].mensaje}</span>
                </div>
              )}
              {editando === c.clave && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="password"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="Pega la nueva key"
                    className="flex-1 rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={() => guardar(c.clave, valor)}
                    disabled={!valor.trim()}
                    className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              )}
            </div>
          ))}

          {!mostrarNueva ? (
            <button
              onClick={() => setMostrarNueva(true)}
              className="flex items-center gap-2 rounded-xl border border-dashed border-input px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" /> Agregar otra integración
            </button>
          ) : (
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-semibold">Nueva integración</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={nueva.clave} onChange={(e) => setNueva({ ...nueva, clave: e.target.value })} placeholder="clave (ej: sendgrid)" className="rounded-xl border border-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} placeholder="Nombre visible" className="rounded-xl border border-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input value={nueva.webUrl} onChange={(e) => setNueva({ ...nueva, webUrl: e.target.value })} placeholder="URL donde generarla (opcional)" className="rounded-xl border border-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:col-span-2" />
                <input value={nueva.valor} onChange={(e) => setNueva({ ...nueva, valor: e.target.value })} type="password" placeholder="Pega la key" className="rounded-xl border border-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:col-span-2" />
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setMostrarNueva(false)} className="rounded-xl border px-4 py-2 text-sm">Cancelar</button>
                <button onClick={crear} disabled={!nueva.clave.trim() || !nueva.valor.trim()} className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Guardar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
