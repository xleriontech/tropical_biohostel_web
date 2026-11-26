"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, KeyRound, Save } from "lucide-react";
import { apiUrl } from "@/lib/api-base";

type ProviderPreset = {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  keyUrl: string;
  note?: string;
};

const PRESETS: ProviderPreset[] = [
  { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", keyUrl: "https://platform.openai.com/api-keys" },
  { id: "groq", name: "Groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.1-8b-instant", keyUrl: "https://console.groq.com/keys", note: "Compatible con formato OpenAI." },
  { id: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini", keyUrl: "https://openrouter.ai/settings/keys", note: "Usa el ID de modelo de OpenRouter." },
  { id: "gemini", name: "Google Gemini (OpenAI compatible)", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash", keyUrl: "https://aistudio.google.com/app/apikey", note: "Usa endpoint compatible OpenAI." },
  { id: "custom", name: "Otro (compatible OpenAI)", baseUrl: "", model: "", keyUrl: "", note: "Debe exponer /chat/completions compatible con OpenAI." },
];

type ChatAiConfig = {
  enabled: boolean;
  provider: string;
  base_url: string;
  model: string;
  system_prompt: string;
  has_key: boolean;
  key_masked: string;
};

export default function AdminAIProvidersPage() {
  const [cfg, setCfg] = useState<ChatAiConfig>({
    enabled: false, provider: "openai", base_url: PRESETS[0].baseUrl, model: PRESETS[0].model,
    system_prompt: "", has_key: false, key_masked: "",
  });
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const preset = useMemo(() => PRESETS.find((p) => p.id === cfg.provider) || PRESETS[PRESETS.length - 1], [cfg.provider]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiUrl()}/admin/chat-ai-config`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setCfg((c) => ({ ...c, ...data }));
        } else {
          setErr("No se pudo cargar la configuración. Verifica que el backend PHP esté actualizado.");
        }
      } catch {
        setErr("No se pudo cargar la configuración del chat.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const onPresetChange = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    setCfg((c) => ({
      ...c,
      provider: id,
      base_url: p && p.baseUrl ? p.baseUrl : c.base_url,
      model: p && p.model ? p.model : c.model,
    }));
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
      setMsg("Configuración guardada. El chat usará esta IA cuando esté habilitado.");
      setCfg((c) => ({ ...c, has_key: !!data.has_key, key_masked: apiKey ? `••••${apiKey.slice(-4)}` : c.key_masked }));
      setApiKey("");
    } catch (e: any) {
      setErr(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">IA del Chat (Nati)</h1>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-semibold">Configuración simple (backend PHP)</p>
        <p className="mt-1">Elige un proveedor compatible con OpenAI, pega tu API key y guarda. La key se guarda en el servidor (BD/config), no en el frontend.</p>
      </div>

      {loading ? <p className="text-muted-foreground">Cargando...</p> : (
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} />
            Habilitar IA para el chat
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Proveedor</label>
              <select value={cfg.provider} onChange={(e) => onPresetChange(e.target.value)} className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm">
                {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {preset.keyUrl ? (
                <a href={preset.keyUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <ExternalLink className="h-4 w-4" /> Crear / ver API key en {preset.name}
                </a>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Usa la consola de tu proveedor para crear la API key.</p>
              )}
              {preset.note && <p className="mt-1 text-xs text-muted-foreground">{preset.note}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Modelo</label>
              <input value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm" placeholder="gpt-4o-mini" />
            </div>
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
            <label className="block text-sm font-medium mb-1">Prompt del sistema (opcional)</label>
            <textarea value={cfg.system_prompt} onChange={(e) => setCfg({ ...cfg, system_prompt: e.target.value })} rows={5} className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm" />
          </div>

          {msg && <p className="text-sm text-green-700">{msg}</p>}
          {err && <p className="text-sm text-red-600">{err}</p>}

          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Guardar configuración"}
          </button>
        </div>
      )}
    </div>
  );
}
