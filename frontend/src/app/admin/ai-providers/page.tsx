"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, KeyRound, RefreshCw, Save } from "lucide-react";
import { apiUrl } from "@/lib/api-base";

type ProviderPreset = { id: string; name: string; baseUrl: string; model: string; keyUrl: string; note?: string };
const PRESETS: ProviderPreset[] = [
  { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", keyUrl: "https://platform.openai.com/api-keys" },
  { id: "groq", name: "Groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.1-8b-instant", keyUrl: "https://console.groq.com/keys", note: "Compatible con formato OpenAI." },
  { id: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini", keyUrl: "https://openrouter.ai/settings/keys", note: "Usa el ID de modelo de OpenRouter." },
  { id: "gemini", name: "Google Gemini (OpenAI compatible)", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash", keyUrl: "https://aistudio.google.com/app/apikey", note: "Endpoint compatible OpenAI." },
  { id: "custom", name: "Otro (compatible OpenAI)", baseUrl: "", model: "", keyUrl: "", note: "Debe exponer /chat/completions compatible con OpenAI." },
];

type ChatAiConfig = { enabled: boolean; provider: string; base_url: string; model: string; system_prompt: string; has_key: boolean; key_masked: string };

export default function AdminAIProvidersPage() {
  const [cfg, setCfg] = useState<ChatAiConfig>({ enabled: false, provider: "openai", base_url: PRESETS[0].baseUrl, model: PRESETS[0].model, system_prompt: "", has_key: false, key_masked: "" });
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const preset = useMemo(() => PRESETS.find((p) => p.id === cfg.provider) || PRESETS[PRESETS.length - 1], [cfg.provider]);

  const loadModels = async (baseUrl: string, key: string, hasSavedKey: boolean) => {
    if (!baseUrl || (!key && !hasSavedKey)) { setModels([]); return; }
    setLoadingModels(true);
    try {
      const res = await fetch(`${apiUrl()}/admin/chat-ai-models`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ base_url: baseUrl, api_key: key }),
      });
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data.models) ? data.models.map((m: any) => String(m.id)).filter(Boolean) : [];
      setModels(list);
      if (!res.ok || data.message) setErr(String(data.message || "No se pudieron cargar modelos"));
      else setErr(null);
    } catch {
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiUrl()}/admin/chat-ai-config`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (res.ok) {
          const data = await res.json();
          setCfg((c) => ({ ...c, ...data }));
          if (data.base_url && data.has_key) loadModels(data.base_url, "", true);
        } else setErr("No se pudo cargar la configuración. Verifica que subiste el backend PHP actualizado.");
      } catch { setErr("No se pudo cargar la configuración del chat."); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onPresetChange = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    setCfg((c) => ({ ...c, provider: id, base_url: p?.baseUrl || c.base_url, model: p?.model || c.model }));
    setModels([]);
  };

  const save = async () => {
    setSaving(true); setMsg(null); setErr(null);
    try {
      const res = await fetch(`${apiUrl()}/admin/chat-ai-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ...cfg, api_key: apiKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "No se pudo guardar");
      setMsg("Configuración guardada.");
      setCfg((c) => ({ ...c, has_key: !!data.has_key, key_masked: apiKey ? `••••${apiKey.slice(-4)}` : c.key_masked }));
      if (apiKey) { loadModels(cfg.base_url, apiKey, true); setApiKey(""); }
    } catch (e: any) { setErr(e.message || "Error al guardar"); }
    finally { setSaving(false); }
  };

  const testAi = async () => {
    setTesting(true); setTestResult(null); setErr(null);
    try {
      const res = await fetch(`${apiUrl()}/admin/chat-ai-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ base_url: cfg.base_url, model: cfg.model, api_key: apiKey }),
      });
      const data = await res.json().catch(() => ({}));
      setTestResult(data);
      if (!res.ok && !data.error) setTestResult({ ok: false, error: data.message || "No se pudo probar" });
    } catch (e: any) {
      setTestResult({ ok: false, error: e.message || "Error de conexión" });
    } finally { setTesting(false); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">IA del Chat (Nati)</h1>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-semibold">Configuración del chat IA</p>
        <p className="mt-1">Elige proveedor, crea/pega tu API key, carga modelos y selecciona uno. La key se guarda en el servidor.</p>
      </div>

      {loading ? <p className="text-muted-foreground">Cargando...</p> : (
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} />
            Habilitar IA para el chat
          </label>

          <div>
            <label className="block text-sm font-medium mb-1">Proveedor</label>
            <select value={cfg.provider} onChange={(e) => onPresetChange(e.target.value)} className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm">
              {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {preset.keyUrl ? (
              <a href={preset.keyUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20">
                <ExternalLink className="h-4 w-4" /> Crear / ver API key en {preset.name}
              </a>
            ) : <p className="mt-2 text-xs text-muted-foreground">Usa la consola de tu proveedor para crear la API key.</p>}
            {preset.note && <p className="mt-1 text-xs text-muted-foreground">{preset.note}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Base URL (compatible OpenAI)</label>
            <input value={cfg.base_url} onChange={(e) => setCfg({ ...cfg, base_url: e.target.value })} className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm" placeholder="https://api.openai.com/v1" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-2"><KeyRound className="h-4 w-4" /> API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm" placeholder={cfg.has_key ? `Key guardada (${cfg.key_masked}). Pega una nueva para reemplazarla` : "Pega tu API key"} />
            {cfg.has_key && <p className="mt-1 text-xs text-muted-foreground">Ya hay una key guardada. Deja vacío para conservarla.</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">Modelo</label>
              <button type="button" onClick={() => loadModels(cfg.base_url, apiKey, cfg.has_key)} disabled={loadingModels} className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-60">
                <RefreshCw className={`h-3.5 w-3.5 ${loadingModels ? "animate-spin" : ""}`} /> {loadingModels ? "Cargando..." : "Cargar modelos"}
              </button>
            </div>
            {models.length > 0 ? (
              <select value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm">
                {!models.includes(cfg.model) && cfg.model && <option value={cfg.model}>{cfg.model} (actual)</option>}
                {models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <input value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm" placeholder="Carga modelos o escribe el ID del modelo" />
            )}
            <p className="mt-1 text-xs text-muted-foreground">Si ya guardaste la key, pulsa “Cargar modelos”. Si acabas de pegarla, también puedes cargar antes de guardar.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Prompt del sistema (opcional)</label>
            <textarea value={cfg.system_prompt} onChange={(e) => setCfg({ ...cfg, system_prompt: e.target.value })} rows={4} className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm" />
          </div>

          {msg && <p className="text-sm text-green-700">{msg}</p>}
          {err && <p className="text-sm text-red-600">{err}</p>}
          {testResult && (
            <div className={`rounded-lg border p-3 text-sm ${testResult.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>
              {testResult.ok ? (
                <p><strong>IA funcionando.</strong> Modelo: {testResult.model} · {testResult.ms} ms · Respuesta: “{testResult.reply}”</p>
              ) : (
                <p><strong>No funcionó.</strong> {testResult.error || "Error desconocido"} {testResult.model ? `· Modelo: ${testResult.model}` : ""}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={testAi} disabled={testing} className="inline-flex items-center gap-2 rounded-xl border border-input bg-white px-6 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${testing ? "animate-spin" : ""}`} /> {testing ? "Probando..." : "Probar IA"}
            </button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Guardar configuración"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
