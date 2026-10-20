"use client";

import { useEffect, useState } from "react";
import { BookOpen, Brain, FileUp, FlaskConical, RefreshCw, Search, Trash2, Upload } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface Doc {
  id: string;
  titulo: string;
  fuente: string;
  tipo: string;
  estado: string;
  error?: string | null;
  totalChunks: number;
  modeloEmb?: string | null;
  updatedAt: string;
}

interface Estado {
  documentos: number;
  chunks: number;
  chunksConEmbedding: number;
  modelos: string[];
  embeddingsDisponibles: boolean;
  proveedorChat?: string | null;
  motor?: { providerId: string | null; modelo?: string | null };
  motorNombre?: string | null;
}

interface Proveedor {
  id: string;
  name: string;
  isActive: boolean;
  paraChat: boolean;
  tieneKey: boolean;
  soportaEmbeddings: boolean;
}

interface Frag {
  documentoTitulo: string;
  contenido: string;
  score: number;
  metodo: string;
}

function authHeaders(extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${localStorage.getItem("token")}`, ...extra };
}

export default function RagPage() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [frags, setFrags] = useState<Frag[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [provs, setProvs] = useState<Proveedor[]>([]);
  const [motorId, setMotorId] = useState<string>("");
  const [motorModelo, setMotorModelo] = useState("");
  const [pruebaMotor, setPruebaMotor] = useState<any>(null);

  const cargar = async () => {
    const [e, d, p] = await Promise.all([
      fetch(`${API}/admin/rag/estado`, { headers: authHeaders() }).then((r) => r.json()),
      fetch(`${API}/admin/rag/documentos`, { headers: authHeaders() }).then((r) => r.json()),
      fetch(`${API}/admin/rag/proveedores`, { headers: authHeaders() }).then((r) => r.json()),
    ]);
    setEstado(e);
    setDocs(d);
    setProvs(p);
    setMotorId(e.motor?.providerId || "");
    setMotorModelo(e.motor?.modelo || "");
  };

  useEffect(() => {
    cargar().catch((e) => setMsg("Error cargando: " + e.message));
  }, []);

  const importarDocs = async () => {
    setBusy(true);
    setMsg("Importando docs/…");
    try {
      const r = await fetch(`${API}/admin/rag/documentos/desde-docs`, {
        method: "POST",
        headers: authHeaders(),
      }).then((r) => r.json());
      const ok = r.archivos?.filter((a: any) => a.estado === "importado" || a.estado === "reindexado").length || 0;
      setMsg(`Listo: ${ok} documentos procesados desde ${r.carpeta}`);
      cargar();
    } catch (e: any) {
      setMsg("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const crear = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!titulo.trim() || (!editingId && !contenido.trim())) return;
    setBusy(true);
    try {
      const url = editingId
        ? `${API}/admin/rag/documentos/${editingId}`
        : `${API}/admin/rag/documentos`;
      const r = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: editingId
          ? JSON.stringify({ titulo: titulo.trim(), contenido })
          : JSON.stringify({ titulo: titulo.trim(), contenido }),
      });
      if (!r.ok) throw new Error((await r.json()).message || "No se pudo guardar");
      setTitulo("");
      setContenido("");
      setEditingId(null);
      setMsg(editingId ? "Documento actualizado y reindexado." : "Documento indexado.");
      cargar();
    } catch (e: any) {
      setMsg("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const empezarEditar = async (id: string) => {
    setMsg("Cargando documento…");
    try {
      const det = await fetch(`${API}/admin/rag/documentos/${id}`, { headers: authHeaders() });
      if (!det.ok) throw new Error("No se pudo leer el documento");
      const full = await det.json();
      setEditingId(id);
      setTitulo(full.titulo || "");
      setContenido(full.contenido || "");
      setMsg("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setMsg("Error: " + e.message);
    }
  };

  const cancelarEditar = () => {
    setEditingId(null);
    setTitulo("");
    setContenido("");
  };

  const subirArchivo = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch(`${API}/admin/rag/documentos/upload`, {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      if (!r.ok) throw new Error((await r.json()).message || "No se pudo subir");
      setMsg(`Archivo "${f.name}" indexado.`);
      cargar();
    } catch (e: any) {
      setMsg("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const reindexar = async (id: string) => {
    setBusy(true);
    try {
      await fetch(`${API}/admin/rag/documentos/${id}/reindexar`, {
        method: "POST",
        headers: authHeaders(),
      });
      setMsg("Reindexado.");
      cargar();
    } catch (e: any) {
      setMsg("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const eliminar = async (id: string, titulo: string) => {
    if (!confirm(`¿Eliminar "${titulo}" y sus fragmentos?`)) return;
    await fetch(`${API}/admin/rag/documentos/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    cargar();
  };

  const guardarMotor = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    try {
      const r = await fetch(`${API}/admin/rag/motor`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ providerId: motorId || null, modelo: motorModelo.trim() || null }),
      });
      if (!r.ok) throw new Error((await r.json()).message || "No se pudo guardar");
      setMsg("Motor actualizado. Reindexa los documentos para aplicar el cambio.");
      cargar();
    } catch (e: any) {
      setMsg("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const probarMotor = async () => {
    setBusy(true);
    setPruebaMotor(null);
    try {
      const r = await fetch(`${API}/admin/ai-providers/probar`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ providerId: motorId || null }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Falló la prueba");
      setPruebaMotor(data);
    } catch (e: any) {
      setPruebaMotor({ error: e.message });
    } finally {
      setBusy(false);
    }
  };

  const probar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!q.trim()) return;
    const r = await fetch(`${API}/admin/rag/buscar?q=${encodeURIComponent(q)}&k=4`, {
      headers: authHeaders(),
    }).then((r) => r.json());
    setFrags(r);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <Brain className="h-6 w-6 text-primary" /> Base de conocimiento de Nati
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Documentos del RAG: Nati los consulta para responder con datos exactos. Funciona con o sin proveedor de IA (sin IA usa búsqueda de texto).
          </p>
        </div>
        <button
          onClick={importarDocs}
          disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" /> {busy ? "Procesando…" : "Importar docs/ del proyecto"}
        </button>
      </div>

      {msg && (
        <div className="rounded-xl border border-input bg-white px-4 py-3 text-sm shadow-sm">{msg}</div>
      )}

      {/* Estado */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { v: estado?.documentos ?? "…", l: "documentos" },
          { v: estado?.chunks ?? "…", l: "fragmentos" },
          { v: estado?.chunksConEmbedding ?? "…", l: "con embeddings" },
          { v: estado?.proveedorChat || "sin IA (FTS)", l: "motor" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border bg-white p-4 text-center shadow-sm">
            <p className="truncate font-display text-xl font-semibold text-primary">{s.v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
      {estado && !estado.embeddingsDisponibles && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Sin proveedor de IA con embeddings: los documentos se indexan igual y Nati los consulta por texto. Para búsqueda
          semántica configura una key en Proveedores IA (Gemini u OpenAI) y reindexa.
        </p>
      )}

      {/* Motor de embeddings */}
      <form onSubmit={guardarMotor} className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold">
          <Brain className="h-5 w-5 text-primary" /> Motor del RAG
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Quién genera los embeddings (búsqueda semántica). Solo Gemini y OpenAI tienen API de
          embeddings; DeepSeek, Groq y Claude usan búsqueda de texto.
          {estado?.motorNombre ? (
            <> Actual: <strong>{estado.motorNombre}</strong>.</>
          ) : (
            <> Actual: <strong>automático</strong> (proveedor de Nati / activo).</>
          )}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <select
            value={motorId}
            onChange={(e) => setMotorId(e.target.value)}
            className="rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Automático (Nati / activo)</option>
            {provs.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.tieneKey}>
                {p.name}{!p.tieneKey ? " (sin key)" : ""}{p.tieneKey && !p.soportaEmbeddings ? " (solo texto)" : ""}
              </option>
            ))}
          </select>
          <input
            value={motorModelo}
            onChange={(e) => setMotorModelo(e.target.value)}
            placeholder="Modelo (opcional, ej: text-embedding-3-small)"
            className="rounded-xl border border-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Guardar motor
          </button>
          <button
            type="button"
            onClick={probarMotor}
            disabled={busy}
            className="rounded-xl border border-input px-5 py-2.5 text-sm font-medium hover:bg-secondary disabled:opacity-50 sm:col-span-1"
            title="Prueba real del motor configurado (o automático)"
          >
            Probar motor
          </button>
        </div>
        {pruebaMotor && (
          <div className="mt-3 rounded-lg bg-secondary/40 p-3 text-xs leading-relaxed">
            {pruebaMotor.error ? (
              <p className="font-semibold text-red-600">✗ {pruebaMotor.error}</p>
            ) : (
              <>
                <p>
                  <span className="font-semibold">Motor: {pruebaMotor.proveedor}.</span>{" "}
                  {pruebaMotor.chat.ok ? (
                    <span className="font-semibold text-green-700">Chat ✓ ({pruebaMotor.chat.ms} ms).</span>
                  ) : (
                    <span className="font-semibold text-red-600">Chat ✗: {pruebaMotor.chat.error}</span>
                  )}
                </p>
                <p>
                  {pruebaMotor.embeddings.ok ? (
                    <span className="font-semibold text-green-700">
                      Embeddings ✓ ({pruebaMotor.embeddings.dimensiones} dims, {pruebaMotor.embeddings.modelo}): el RAG será semántico tras Reindexar.
                    </span>
                  ) : (
                    <span className="font-semibold text-amber-700">
                      Embeddings ✗: {pruebaMotor.embeddings.error} El RAG usará búsqueda de texto.
                    </span>
                  )}
                </p>
              </>
            )}
          </div>
        )}
      </form>

      {/* Probar búsqueda */}
      <form onSubmit={probar} className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold">
          <FlaskConical className="h-5 w-5 text-primary" /> Probar lo que respondería Nati
        </h2>
        <div className="mt-3 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ej: ¿qué incluye Cosmic Bungalow? ¿cuántas plantas de café hay?"
            className="flex-1 rounded-xl border border-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="submit" className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Search className="h-4 w-4" /> Buscar
          </button>
        </div>
        {frags.length > 0 && (
          <div className="mt-4 space-y-3">
            {frags.map((f, i) => (
              <div key={i} className="rounded-lg border border-input bg-secondary/30 p-3 text-sm">
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-primary">
                  <BookOpen className="h-3.5 w-3.5" /> {f.documentoTitulo}
                  <span className="rounded-full bg-white px-2 py-0.5 font-normal text-muted-foreground">
                    {f.metodo} · {Number(f.score).toFixed(2)}
                  </span>
                </p>
                <p className="leading-relaxed text-muted-foreground">{f.contenido.slice(0, 400)}{f.contenido.length > 400 ? "…" : ""}</p>
              </div>
            ))}
          </div>
        )}
      </form>

      {/* Agregar */}
      <div className="grid gap-4 md:grid-cols-2">
        <form onSubmit={crear} className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">{editingId ? "Editar documento" : "Agregar texto"}</h2>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título (ej: Reglamento de reservas)"
            className="mt-3 w-full rounded-xl border border-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            placeholder="Pega aquí el contenido…"
            rows={6}
            className="mt-2 w-full rounded-xl border border-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="mt-2 rounded-lg bg-secondary/40 p-2.5 text-xs leading-relaxed text-muted-foreground">
            Para enlazar secciones usa <strong>rutas relativas</strong> que funcionan en cualquier servidor:{" "}
            <code>[donar](/donaciones)</code>, <code>[Cosmic](/cosmic-bungalo)</code>. Si necesitas la URL
            completa usa el token <code>{"{{baseUrl}}"}</code> (ej: <code>{"{{baseUrl}}"}/donaciones</code>) y se
            reemplaza solo al responder.
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[
                ["Donaciones", "/donaciones"],
                ["Cosmic", "/cosmic-bungalo"],
                ["Territorio", "/territorio"],
                ["Gastronomía", "/gastronomia"],
                ["Experiencias", "/experiencias"],
                ["Bienestar", "/bienestar"],
              ].map(([label, ruta]) => (
                <button
                  key={ruta}
                  type="button"
                  onClick={() => setContenido((c) => `${c}[${label}](${ruta}) `)}
                  className="rounded-full border border-input bg-white px-2.5 py-1 text-[11px] hover:bg-secondary"
                >
                  + {label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-3 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {editingId ? "Guardar cambios" : "Indexar documento"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelarEditar}
              className="ml-2 mt-3 rounded-xl border border-input px-5 py-2.5 text-sm hover:bg-secondary"
            >
              Cancelar
            </button>
          )}
        </form>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold">
            <FileUp className="h-5 w-5 text-primary" /> Subir archivo
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">.md, .txt o .html, máx 2 MB. A futuro: PDF y Word.</p>
          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input px-4 py-8 text-sm text-muted-foreground hover:border-primary hover:text-foreground">
            <Upload className="h-5 w-5" /> Elegir archivo…
            <input
              type="file"
              accept=".md,.markdown,.txt,.html,.htm"
              className="hidden"
              onChange={(e) => subirArchivo(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      {/* Listado */}
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Fuente</th>
              <th className="px-4 py-3">Frags</th>
              <th className="px-4 py-3">Embed</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-b last:border-0 hover:bg-secondary/20">
                <td className="px-4 py-3 font-medium">
                  {d.titulo}
                  {d.error && <p className="text-xs font-normal text-red-600">{d.error}</p>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{d.fuente}</td>
                <td className="px-4 py-3">{d.totalChunks}</td>
                <td className="px-4 py-3 text-muted-foreground">{d.modeloEmb || "solo texto"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${d.estado === "LISTO" ? "bg-green-100 text-green-800" : d.estado === "ERROR" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                    {d.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => empezarEditar(d.id)} title="Editar" className="rounded-lg border border-input px-2.5 py-2 text-xs hover:bg-secondary">
                      Editar
                    </button>
                    <button onClick={() => reindexar(d.id)} title="Reindexar" className="rounded-lg border border-input p-2 hover:bg-secondary">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button onClick={() => eliminar(d.id, d.titulo)} title="Eliminar" className="rounded-lg border border-input p-2 text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Sin documentos. Usa “Importar docs/ del proyecto” para empezar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
