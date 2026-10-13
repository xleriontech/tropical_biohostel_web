"use client";

import { useEffect, useState } from "react";
import { FlaskConical, KeyRound } from "lucide-react";

interface Prueba {
  proveedor: string;
  chat: { ok: boolean; ms?: number; error?: string };
  embeddings: { ok: boolean; dimensiones?: number; modelo?: string; error?: string };
}

function capacidades(nombre: string): string {
  return /deepseek|groq|anthropic|claude/i.test(nombre || "")
    ? "Solo chat (sin embeddings)"
    : "Chat + embeddings";
}

export default function AdminAIProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState({ providerId: "", key: "" });
  const [pruebas, setPruebas] = useState<Record<string, Prueba>>({});
  const [probando, setProbando] = useState<string | null>(null);

  const getToken = () => localStorage.getItem("token");

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/ai-providers`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) {
      const data = await res.json();
      setProviders(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  };

  const addKey = async () => {
    if (!newKey.providerId || !newKey.key) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/ai-providers/${newKey.providerId}/keys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ key: newKey.key }),
    });
    setNewKey({ providerId: "", key: "" });
    fetchProviders();
  };

  const toggleProvider = async (id: string, isActive: boolean) => {    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/ai-providers/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchProviders();
  };

  const toggleKey = async (keyId: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/ai-providers/keys/${keyId}/toggle`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    fetchProviders();
  };

  const removeKey = async (keyId: string) => {
    if (!confirm("¿Borrar esta API key?")) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/ai-providers/keys/${keyId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    fetchProviders();
  };

  const setParaChat = async (id: string) => {    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/ai-providers/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ paraChat: true }),
    });
    fetchProviders();
  };

  const probar = async (id: string) => {
    setProbando(id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/ai-providers/probar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ providerId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Falló la prueba");
      setPruebas((p) => ({ ...p, [id]: data }));
    } catch (e: any) {
      setPruebas((p) => ({
        ...p,
        [id]: {
          proveedor: "",
          chat: { ok: false, error: e.message },
          embeddings: { ok: false, error: "No se pudo probar" },
        },
      }));
    } finally {
      setProbando(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Proveedores de IA</h1>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
        <p className="font-semibold">🪷 Nati, la asistente del chat</p>
        <p className="mt-1">
          Marca un proveedor como <strong>“Nati”</strong> y agrégale su API key: ese modelo será su
          cerebro para conversar. Solo puede haber uno a la vez. Si ninguno está marcado (o no tiene
          key), Nati responde con su motor local usando tus datos.
        </p>
      </div>

      {/* Agregar API Key */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <KeyRound className="h-5 w-5 text-primary" /> Agregar API Key
        </h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={newKey.providerId}
            onChange={(e) => setNewKey({ ...newKey, providerId: e.target.value })}
            className="rounded-xl border border-input bg-white px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Seleccionar proveedor</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="password"
            value={newKey.key}
            onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
            placeholder="API Key"
            className="min-w-[200px] flex-1 rounded-xl border border-input bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={addKey}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Agregar
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : (
        <div className="space-y-4">
          {providers.map((provider) => (
            <div key={provider.id} className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{provider.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground break-all">{provider.apiEndpoint}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {provider.apiKeys.length} key(s) configurada(s) · {capacidades(provider.name)}
                  </p>
                  {provider.apiKeys.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {provider.apiKeys.map((k: any) => (
                        <div key={k.id} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-xs">
                          <span className="font-mono text-muted-foreground">
                            agregada {new Date(k.createdAt).toLocaleDateString("es-CO")}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 font-semibold ${k.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                            {k.isActive ? "activa" : "inactiva"}
                          </span>
                          <button
                            onClick={() => toggleKey(k.id)}
                            className="ml-auto rounded px-2 py-0.5 font-medium text-primary hover:underline"
                          >
                            {k.isActive ? "Desactivar" : "Activar"}
                          </button>
                          <button
                            onClick={() => removeKey(k.id)}
                            className="rounded px-2 py-0.5 font-medium text-red-600 hover:underline"
                          >
                            Borrar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {pruebas[provider.id] && (
                    <div className="mt-2 space-y-1 rounded-lg bg-muted/50 p-3 text-xs">
                      <p>
                        <span className="font-semibold">Chat:</span>{" "}
                        {pruebas[provider.id].chat.ok ? (
                          <span className="font-semibold text-green-700">
                            ✓ funciona ({pruebas[provider.id].chat.ms} ms)
                          </span>
                        ) : (
                          <span className="font-semibold text-red-600">
                            ✗ {pruebas[provider.id].chat.error}
                          </span>
                        )}
                      </p>
                      <p>
                        <span className="font-semibold">Embeddings (RAG):</span>{" "}
                        {pruebas[provider.id].embeddings.ok ? (
                          <span className="font-semibold text-green-700">
                            ✓ {pruebas[provider.id].embeddings.dimensiones} dims ({pruebas[provider.id].embeddings.modelo})
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-700">
                            ✗ {pruebas[provider.id].embeddings.error}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => probar(provider.id)}
                    disabled={probando === provider.id}
                    title="Probar key real contra el proveedor"
                    className="flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                    {probando === provider.id ? "Probando…" : "Probar"}
                  </button>
                  <button
                    onClick={() => setParaChat(provider.id)}
                    title="Usar este proveedor como cerebro de Nati (chat)"
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      provider.paraChat
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {provider.paraChat ? "🪷 Nati" : "Usar para Nati"}
                  </button>
                  <button
                    onClick={() => toggleProvider(provider.id, provider.isActive)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      provider.isActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {provider.isActive ? "Activo" : "Inactivo"}
                  </button>
                </div>
              </div>
              {provider.websiteUrl && (
                <div className="mt-3 rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    Generar API key:{' '}
                    <a
                      href={provider.websiteUrl}
                      target="_blank"
                      className="text-primary hover:underline font-medium"
                    >
                      {provider.websiteUrl}
                    </a>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
