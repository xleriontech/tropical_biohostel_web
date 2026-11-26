"use client";

import { useEffect, useState } from "react";
import { HeartHandshake, Settings2, Wallet } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

function auth(extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${localStorage.getItem("token")}`, ...extra };
}

const CATS = [
  { v: "ARBOLES", l: "Siembra de árboles" },
  { v: "CARBONO", l: "Huella de carbono" },
  { v: "GENERAL", l: "General" },
];

export default function AdminDonacionesPage() {
  const [resumen, setResumen] = useState<any[]>([]);
  const [dons, setDons] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ titulo: "", descripcion: "", categoria: "ARBOLES", meta: "", moneda: "USD", imagenUrl: "", paypalLink: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [media, setMedia] = useState<{ tipo: string; url: string }[]>([]);
  const [mediaTipo, setMediaTipo] = useState("imagen");
  const [mediaUrl, setMediaUrl] = useState("");
  const [manual, setManual] = useState({ proyectoId: "", monto: "", nombre: "", email: "", mensaje: "" });
  const [pp, setPp] = useState({ clientId: "", mode: "sandbox", currency: "USD", paypalMe: "" });
  const [ppSecret, setPpSecret] = useState("");

  const cargar = async () => {
    const [r, d, c] = await Promise.all([
      fetch(`${API}/admin/donaciones/resumen`, { headers: auth() }).then((x) => x.json()),
      fetch(`${API}/admin/donaciones`, { headers: auth() }).then((x) => x.json()),
      fetch(`${API}/donaciones/paypal-public`).then((x) => x.json()).catch(() => ({})),
    ]);
    setResumen(r);
    setDons(d);
    if (c?.clientId !== undefined) {
      setPp({ clientId: c.clientId || "", mode: c.mode || "sandbox", currency: c.currency || "USD", paypalMe: c.paypalMe || "" });
    }
  };

  useEffect(() => {
    cargar().catch((e) => setMsg("Error: " + e.message));
  }, []);

  const total = resumen.reduce((s, p) => s + Number(p.recaudado || 0), 0);
  const donantes = resumen.reduce((s, p) => s + Number(p.donantes || 0), 0);

  const empezarEditar = (p: any) => {
    setEditingId(p.id);
    setForm({
      titulo: p.titulo || "",
      descripcion: p.descripcion || "",
      categoria: p.categoria || "GENERAL",
      meta: p.meta != null ? String(p.meta) : "",
      moneda: p.moneda || "USD",
      imagenUrl: p.imagenUrl || "",
      paypalLink: p.paypalLink || "",
    });
    setMedia(Array.isArray(p.media) ? p.media : []);
    setMediaTipo("imagen");
    setMediaUrl("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelarEditar = () => {
    setEditingId(null);
    setForm({ titulo: "", descripcion: "", categoria: "ARBOLES", meta: "", moneda: "USD", imagenUrl: "", paypalLink: "" });
    setMedia([]);
    setMediaUrl("");
  };

  const agregarMedia = () => {
    const url = mediaUrl.trim();
    if (!url || media.length >= 12) return;
    setMedia([...media, { tipo: mediaTipo, url }]);
    setMediaUrl("");
  };

  const moverMedia = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= media.length) return;
    const copia = [...media];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setMedia(copia);
  };

  function ytId(url: string): string | null {
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : null;
  }

  const crear = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.titulo.trim() || !form.descripcion.trim()) return;
    setBusy(true);
    try {
      const url = editingId
        ? `${API}/admin/donaciones/proyectos/${editingId}`
        : `${API}/admin/donaciones/proyectos`;
      const r = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: auth({ "Content-Type": "application/json" }),
        body: JSON.stringify({ ...form, meta: form.meta ? Number(form.meta) : null, media }),
      });
      if (!r.ok) throw new Error((await r.json()).message || "No se pudo guardar");
      cancelarEditar();
      setMsg(editingId ? "Proyecto actualizado." : "Proyecto creado.");
      cargar();
    } catch (e: any) {
      setMsg("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const cambiarEstado = async (id: string, estado: string) => {
    await fetch(`${API}/admin/donaciones/proyectos/${id}`, {
      method: "PUT",
      headers: auth({ "Content-Type": "application/json" }),
      body: JSON.stringify({ estado }),
    });
    cargar();
  };

  const eliminar = async (id: string, titulo: string) => {
    if (!confirm(`¿Eliminar "${titulo}" y sus donaciones?`)) return;
    await fetch(`${API}/admin/donaciones/proyectos/${id}`, { method: "DELETE", headers: auth() });
    cargar();
  };

  const guardarManual = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!manual.proyectoId || !manual.monto) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/admin/donaciones/manual`, {
        method: "POST",
        headers: auth({ "Content-Type": "application/json" }),
        body: JSON.stringify({ ...manual, monto: Number(manual.monto) }),
      });
      if (!r.ok) throw new Error((await r.json()).message || "No se pudo registrar");
      setManual({ proyectoId: "", monto: "", nombre: "", email: "", mensaje: "" });
      setMsg("Donación manual registrada.");
      cargar();
    } catch (e: any) {
      setMsg("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const guardarPaypal = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    try {
      const r1 = await fetch(`${API}/config/paypal-public`, {
        method: "PUT",
        headers: auth({ "Content-Type": "application/json" }),
        body: JSON.stringify(pp),
      });
      if (!r1.ok) throw new Error("No se pudo guardar la config pública");
      if (ppSecret.trim()) {
        const r2 = await fetch(`${API}/admin/claves/paypal_secret`, {
          method: "PUT",
          headers: auth({ "Content-Type": "application/json" }),
          body: JSON.stringify({ nombre: "PayPal Secret", descripcion: "Client Secret de la app PayPal (fondos del proyecto)", valor: ppSecret.trim() }),
        });
        if (!r2.ok) throw new Error("No se pudo guardar el Secret");
        setPpSecret("");
      }
      setMsg("Cuenta PayPal vinculada. El dinero llega directo a tu cuenta PayPal.");
      cargar();
    } catch (e: any) {
      setMsg("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const inp = "w-full rounded-xl border border-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <HeartHandshake className="h-6 w-6 text-primary" /> Donaciones
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Proyectos, aportes y cuenta PayPal donde llegan los fondos.
        </p>
      </div>
      {msg && <div className="rounded-xl border border-input bg-white px-4 py-3 text-sm shadow-sm">{msg}</div>}

      {/* Resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { v: `$${total.toLocaleString("es-CO")}`, l: "recaudado total" },
          { v: donantes, l: "aportes" },
          { v: resumen.filter((p) => p.estado === "ACTIVO").length, l: "proyectos activos" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border bg-white p-4 text-center shadow-sm">
            <p className="font-display text-xl font-semibold text-primary">{s.v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      {/* PayPal */}
      <form onSubmit={guardarPaypal} className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold">
          <Settings2 className="h-5 w-5 text-primary" /> Cuenta PayPal (destino de los fondos)
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea tu app en <a href="https://developer.paypal.com/dashboard/applications" target="_blank" className="text-primary hover:underline">developer.paypal.com</a> (usa Sandbox para probar y Live para recibir de verdad).
          El dinero entra directo a tu cuenta PayPal; aquí solo se registra.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input value={pp.clientId} onChange={(e) => setPp({ ...pp, clientId: e.target.value })} placeholder="Client ID de PayPal" className={inp} />
          <input value={ppSecret} onChange={(e) => setPpSecret(e.target.value)} type="password" placeholder="Client Secret (se guarda cifrado, solo si cambia)" className={inp} />
          <select value={pp.mode} onChange={(e) => setPp({ ...pp, mode: e.target.value })} className={inp}>
            <option value="sandbox">Sandbox (pruebas)</option>
            <option value="live">Live (dinero real)</option>
          </select>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input value={pp.currency} onChange={(e) => setPp({ ...pp, currency: e.target.value.toUpperCase() })} placeholder="Moneda (USD)" className={inp} />
            <input value={pp.paypalMe} onChange={(e) => setPp({ ...pp, paypalMe: e.target.value })} placeholder="paypal.me/tu-cuenta (respaldo)" className={inp} />
          </div>
        </div>
        <button disabled={busy} className="mt-3 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          Vincular cuenta
        </button>
      </form>

      {/* Crear / editar proyecto */}
      <form onSubmit={crear} className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">{editingId ? "Editar proyecto" : "Nuevo proyecto"}</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Título (ej: Siembra 100 árboles nativos)" className={inp} />
          <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className={inp}>
            {CATS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
          </select>
          <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción: en qué se usará el dinero…" rows={3} className={`${inp} sm:col-span-2`} />
          <input value={form.meta} onChange={(e) => setForm({ ...form, meta: e.target.value.replace(/[^0-9]/g, "") })} placeholder="Meta (opcional, ej: 500)" inputMode="numeric" className={inp} />
          <input value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value.toUpperCase() })} placeholder="Moneda (USD)" className={inp} />
          <input value={form.imagenUrl} onChange={(e) => setForm({ ...form, imagenUrl: e.target.value })} placeholder="URL imagen portada (opcional, si no hay galería)" className={inp} />
          <input value={form.paypalLink} onChange={(e) => setForm({ ...form, paypalLink: e.target.value })} placeholder="Link paypal.me directo (opcional)" className={inp} />
        </div>

        {/* Galería multimedia */}
        <div className="mt-3 rounded-xl border border-input p-3">
          <p className="text-sm font-medium">Galería: imágenes y videos (máx 12)</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Pega URLs de imagen (.jpg/.png) o video (mp4 o YouTube). El collage se ajusta solo.</p>
          <div className="mt-2 flex gap-2">
            <select value={mediaTipo} onChange={(e) => setMediaTipo(e.target.value)} className="rounded-xl border border-input bg-white px-3 py-2 text-sm">
              <option value="imagen">Imagen</option>
              <option value="video">Video</option>
            </select>
            <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://…"
              className="flex-1 rounded-xl border border-input px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <button type="button" onClick={agregarMedia} className="rounded-xl border border-input px-4 py-2 text-sm hover:bg-secondary">
              Agregar
            </button>
          </div>
          {media.length > 0 && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {media.map((m, i) => {
                const yt = m.tipo === "video" ? ytId(m.url) : null;
                const thumb = m.tipo === "imagen" ? m.url : yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : null;
                return (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-input bg-white p-2">
                    {thumb ? (
                      <img src={thumb} alt="" className="h-12 w-16 shrink-0 rounded-md object-cover" />
                    ) : (
                      <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-purple-100 text-xs font-bold text-purple-800">
                        ▶ MP4
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.tipo === "video" ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"}`}>
                        {i + 1} · {m.tipo}
                      </span>
                      <p className="truncate text-[11px] text-muted-foreground">{m.url}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <div className="flex gap-1">
                        <button type="button" disabled={i === 0} onClick={() => moverMedia(i, -1)} title="Subir"
                          className="rounded border border-input px-1.5 text-xs disabled:opacity-30">↑</button>
                        <button type="button" disabled={i === media.length - 1} onClick={() => moverMedia(i, 1)} title="Bajar"
                          className="rounded border border-input px-1.5 text-xs disabled:opacity-30">↓</button>
                      </div>
                      <button type="button" onClick={() => setMedia(media.filter((_, j) => j !== i))}
                        className="rounded border border-input px-1.5 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                        Quitar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <button disabled={busy} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {editingId ? "Guardar cambios" : "Crear proyecto"}
          </button>
          {editingId && (
            <button type="button" onClick={cancelarEditar} className="rounded-xl border border-input px-5 py-2.5 text-sm hover:bg-secondary">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Proyectos */}
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Proyecto</th>
              <th className="px-4 py-3">Recaudado</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {resumen.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-secondary/20">
                <td className="px-4 py-3">
                  <p className="font-medium">{p.titulo}</p>
                  <p className="text-xs text-muted-foreground">/{p.slug} · {p.categoria} · meta {p.meta ? `$${Number(p.meta).toLocaleString()}` : "—"}{Array.isArray(p.media) && p.media.length > 0 ? ` · 📷${p.media.length}` : ""}</p>
                </td>
                <td className="px-4 py-3 font-semibold text-primary">${Number(p.recaudado).toLocaleString()} <span className="font-normal text-muted-foreground">({p.donantes})</span></td>
                <td className="px-4 py-3">
                  <select value={p.estado} onChange={(e) => cambiarEstado(p.id, e.target.value)}
                    className="rounded-lg border border-input bg-white px-2 py-1 text-xs">
                    {["ACTIVO", "PAUSADO", "COMPLETADO"].map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => empezarEditar(p)} className="rounded-lg border border-input px-3 py-1.5 text-xs hover:bg-secondary">
                      Editar
                    </button>
                    <button onClick={() => eliminar(p.id, p.titulo)} className="rounded-lg border border-input px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {resumen.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Sin proyectos todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Donación manual + listado */}
      <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <form onSubmit={guardarManual} className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold"><Wallet className="h-5 w-5 text-primary" /> Aporte manual</h2>
          <p className="mt-1 text-xs text-muted-foreground">Efectivo, consignación, Nequi… Suma al recaudado.</p>
          <select value={manual.proyectoId} onChange={(e) => setManual({ ...manual, proyectoId: e.target.value })} className={`${inp} mt-3`}>
            <option value="">Proyecto…</option>
            {resumen.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
          </select>
          <input value={manual.monto} onChange={(e) => setManual({ ...manual, monto: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="Monto" inputMode="decimal" className={`${inp} mt-2`} />
          <input value={manual.nombre} onChange={(e) => setManual({ ...manual, nombre: e.target.value })} placeholder="Nombre del donante (opcional)" className={`${inp} mt-2`} />
          <input value={manual.mensaje} onChange={(e) => setManual({ ...manual, mensaje: e.target.value })} placeholder="Nota (opcional)" className={`${inp} mt-2`} />
          <button disabled={busy} className="mt-3 w-full rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            Registrar aporte
          </button>
        </form>
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Proyecto</th><th className="px-4 py-3">Monto</th><th className="px-4 py-3">Vía</th></tr>
              </thead>
              <tbody>
                {dons.map((d) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString("es-CO")}</td>
                    <td className="px-4 py-2">{d.proyecto?.titulo}<p className="text-xs text-muted-foreground">{d.nombre || "Anónimo"}{d.estado !== "APROBADA" ? ` · ${d.estado}` : ""}</p></td>
                    <td className="px-4 py-2 font-semibold">${Number(d.monto).toLocaleString()} {d.moneda}</td>
                    <td className="px-4 py-2 text-xs">{d.esManual ? "Manual" : "PayPal"}</td>
                  </tr>
                ))}
                {dons.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Sin donaciones aún.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
