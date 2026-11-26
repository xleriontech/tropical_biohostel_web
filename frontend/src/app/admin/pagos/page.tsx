"use client";

import { useEffect, useState } from "react";
import { ExternalLink, KeyRound, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { apiUrl } from "@/lib/api-base";

type Provider = {
  id: string; name: string; category: "nacional" | "internacional"; enabled: boolean; mode: "sandbox" | "live";
  public_key: string; secret_key?: string; has_secret?: boolean; secret_masked?: string;
  webhook_url: string; extra: Record<string, string>; keyUrl?: string; docUrl?: string; note?: string;
};

export default function AdminPagosPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`${apiUrl()}/admin/payment-config`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "No se pudo cargar");
      setProviders(Array.isArray(data.providers) ? data.providers : []);
    } catch (e: any) { setErr(e.message || "Error cargando configuración"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const update = (id: string, patch: Partial<Provider>) => setProviders((ps) => ps.map((p) => p.id === id ? { ...p, ...patch } : p));

  const save = async () => {
    setSaving(true); setMsg(null); setErr(null);
    try {
      const res = await fetch(`${apiUrl()}/admin/payment-config`, { method: "PUT", headers, body: JSON.stringify({ providers }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "No se pudo guardar");
      setMsg("Configuración de pagos guardada.");
      load();
    } catch (e: any) { setErr(e.message || "Error al guardar"); }
    finally { setSaving(false); }
  };

  const test = async (p: Provider) => {
    setTesting(p.id);
    try {
      const res = await fetch(`${apiUrl()}/admin/payment-test`, { method: "POST", headers, body: JSON.stringify({ id: p.id, mode: p.mode, public_key: p.public_key, secret_key: p.secret_key || "" }) });
      const data = await res.json().catch(() => ({}));
      setResults((r) => ({ ...r, [p.id]: data }));
    } catch (e: any) { setResults((r) => ({ ...r, [p.id]: { ok: false, message: e.message || "Error" } })); }
    finally { setTesting(null); }
  };

  const renderGroup = (title: string, cat: "nacional" | "internacional") => {
    const items = providers.filter((p) => p.category === cat);
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {items.map((p) => {
          const r = results[p.id];
          return (
            <div key={p.id} className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{p.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>{p.enabled ? "Activo" : "Inactivo"}</span>
                  </div>
                  {p.note && <p className="text-xs text-muted-foreground mt-1">{p.note}</p>}
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    {p.keyUrl && <a href={p.keyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-4 w-4" /> Obtener API keys</a>}
                    {p.docUrl && <a href={p.docUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:underline"><ExternalLink className="h-4 w-4" /> Docs</a>}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.enabled} onChange={(e) => update(p.id, { enabled: e.target.checked })} /> Habilitar</label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Modo</label>
                  <select value={p.mode} onChange={(e) => update(p.id, { mode: e.target.value as any })} className="w-full rounded-xl border border-input bg-white px-3 py-2.5 text-sm">
                    <option value="sandbox">Sandbox / Pruebas</option>
                    <option value="live">Producción</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Llave pública / Client ID</label>
                  <input value={p.public_key} onChange={(e) => update(p.id, { public_key: e.target.value })} className="w-full rounded-xl border border-input bg-white px-3 py-2.5 text-sm" placeholder="Public key / client id" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1"><KeyRound className="h-4 w-4" /> Llave secreta / Secret</label>
                  <input type="password" value={p.secret_key || ""} onChange={(e) => update(p.id, { secret_key: e.target.value })} className="w-full rounded-xl border border-input bg-white px-3 py-2.5 text-sm" placeholder={p.has_secret ? `Guardada (${p.secret_masked || "••••"}) - pega para reemplazar` : "Secret key / token"} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Webhook URL (opcional)</label>
                <input value={p.webhook_url || ""} onChange={(e) => update(p.id, { webhook_url: e.target.value })} className="w-full rounded-xl border border-input bg-white px-3 py-2.5 text-sm" placeholder="https://..." />
              </div>

              {r && (
                <div className={`rounded-lg border p-3 text-sm ${r.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                  <strong>{r.ok ? "Conexión OK." : "Error."}</strong> {r.message || r.error} {r.ms ? `· ${r.ms} ms` : ""}
                </div>
              )}

              <button onClick={() => test(p)} disabled={testing === p.id} className="inline-flex items-center gap-2 rounded-xl border border-input bg-white px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${testing === p.id ? "animate-spin" : ""}`} /> {testing === p.id ? "Probando..." : "Probar conexión"}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Métodos de pago</h1>
        <p className="text-sm text-muted-foreground mt-1">Configura pasarelas nacionales e internacionales. Las claves se guardan en el servidor.</p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 mt-0.5" /><p>Usa modo <strong>Sandbox/Pruebas</strong> primero. Activa <strong>Producción</strong> solo cuando hayas validado cobros reales. No pegues claves en el frontend público.</p></div>
      </div>

      {loading ? <p className="text-muted-foreground">Cargando...</p> : (
        <>
          {renderGroup("Pagos nacionales (Colombia)", "nacional")}
          {renderGroup("Pagos internacionales", "internacional")}
          {msg && <p className="text-sm text-green-700">{msg}</p>}
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Guardar configuración de pagos"}
          </button>
        </>
      )}
    </div>
  );
}
