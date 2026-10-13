"use client";

import { useEffect, useState } from "react";
import { GitBranch, RefreshCw, UploadCloud } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface Estado {
  disponible?: boolean;
  motivo?: string;
  rama: string;
  remoto: string;
  cambios: { estado: string; archivo: string }[];
  pendientesPush: number;
  ultimosCommits: string[];
}

function auth(extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${localStorage.getItem("token")}`, ...extra };
}

export default function RepoPage() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [token, setToken] = useState("");
  const [resultado, setResultado] = useState("");
  const [busy, setBusy] = useState(false);

  const cargar = async () => {
    const r = await fetch(`${API}/admin/repo/estado`, { headers: auth() }).then((x) => x.json());
    setEstado(r);
  };

  useEffect(() => {
    cargar().catch((e) => setResultado("Error: " + e.message));
  }, []);

  const publicar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!mensaje.trim()) return;
    setBusy(true);
    setResultado("Publicando… (add + commit + push)");
    try {
      const r = await fetch(`${API}/admin/repo/publicar`, {
        method: "POST",
        headers: auth({ "Content-Type": "application/json" }),
        body: JSON.stringify({ mensaje: mensaje.trim(), token: token.trim() || undefined }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Falló la publicación");
      setResultado(`✓ ${data.detalle}${data.log ? "\n" + data.log.join("\n") : ""}`);
      setMensaje("");
      cargar();
    } catch (e: any) {
      setResultado("✗ " + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <UploadCloud className="h-6 w-6 text-primary" /> Publicar cambios
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube lo editado en local al repositorio (rama <strong>{estado?.rama || "…"}</strong> → {estado?.remoto || "origin"}).
        </p>
      </div>

      {/* Estado */}
      {estado && estado.disponible === false ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800 shadow-sm">
          {estado.motivo || "Publicar no disponible en este servidor."}
        </div>
      ) : (
      <div className="grid grid-cols-3 gap-4">
        {[
          { v: estado ? estado.cambios.length : "…", l: "archivos cambiados" },
          { v: estado ? estado.pendientesPush : "…", l: "commits por subir" },
          { v: estado ? estado.ultimosCommits.length : "…", l: "últimos commits" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border bg-white p-4 text-center shadow-sm">
            <p className="font-display text-xl font-semibold text-primary">{s.v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
      )}

      {estado && estado.cambios.length > 0 && (
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Cambios pendientes</h2>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto font-mono text-xs">
            {estado.cambios.map((c) => (
              <li key={c.archivo} className="flex gap-2">
                <span className="w-10 shrink-0 font-bold text-primary">{c.estado}</span>
                <span className="truncate">{c.archivo}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {estado && estado.ultimosCommits.length > 0 && (
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Historial reciente</h2>
          <ul className="mt-2 space-y-1 font-mono text-xs text-muted-foreground">
            {estado.ultimosCommits.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Publicar */}
      <form onSubmit={publicar} className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold">
          <GitBranch className="h-5 w-5 text-primary" /> Nuevo commit + push
        </h2>
        <input
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Mensaje del commit (ej: Ajuste de precios Cosmic)"
          maxLength={200}
          className="mt-3 w-full rounded-xl border border-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          type="password"
          placeholder="Token GitHub (solo si el push lo pide, no se guarda)"
          className="mt-2 w-full rounded-xl border border-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            disabled={busy || !mensaje.trim() || estado?.disponible === false}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "Publicando…" : "Publicar cambios"}
          </button>
          <button
            type="button"
            onClick={() => cargar()}
            className="flex items-center gap-1.5 rounded-xl border border-input px-4 py-2.5 text-sm hover:bg-secondary"
          >
            <RefreshCw className="h-4 w-4" /> Actualizar
          </button>
        </div>
      </form>

      {resultado && (
        <div className="whitespace-pre-line rounded-xl border border-input bg-white px-4 py-3 text-sm shadow-sm">
          {resultado}
        </div>
      )}
    </div>
  );
}
