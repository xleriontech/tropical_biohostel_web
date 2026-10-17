"use client";

import { useEffect, useState } from "react";
import { UtensilsCrossed, Plus, Pencil, Trash2, X, ChefHat, Soup, Upload, Film } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

function auth(extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${localStorage.getItem("token")}`, ...extra };
}

const TIPOS = [
  { v: "DESAYUNO", l: "Desayuno" },
  { v: "ALMUERZO", l: "Almuerzo" },
  { v: "CENA", l: "Cena" },
  { v: "MERIENDA", l: "Merienda" },
  { v: "CAFETERIA", l: "Cafetería" },
  { v: "OTRO", l: "Otro" },
];

const CATEGORIAS = ["", "entrada", "principal", "postre", "bebida", "extra"];

const inp =
  "w-full rounded-xl border border-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const btn =
  "rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors";
const btnSec =
  "rounded-xl border border-input px-5 py-2.5 text-sm hover:bg-secondary transition-colors";
const btnSm =
  "rounded-lg border border-input px-3 py-1.5 text-xs hover:bg-secondary transition-colors";

interface Plato {
  id: string;
  nombre: string;
  descripcion?: string | null;
  categoria?: string | null;
  precio?: number | null;
  etiquetas?: string[];
  imagenUrl?: string | null;
  orden?: number;
}

interface Menu {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  videoUrl?: string | null;
  horario?: string | null;
  activo: boolean;
  orden: number;
  platos: Plato[];
}

const menuVacio = {
  titulo: "",
  tipo: "OTRO",
  descripcion: "",
  imagenUrl: "",
  videoUrl: "",
  horario: "",
  orden: 0,
  activo: true,
};

const platoVacio = {
  nombre: "",
  descripcion: "",
  categoria: "principal",
  precio: "",
  etiquetas: "",
  imagenUrl: "",
};

export default function AdminComidasPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(menuVacio);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [platoMenuId, setPlatoMenuId] = useState<string | null>(null);
  const [platoForm, setPlatoForm] = useState(platoVacio);
  const [platoEdit, setPlatoEdit] = useState<{ menuId: string; id: string } | null>(null);

  const cargar = async () => {
    try {
      const r = await fetch(`${API}/admin/menus`, { headers: auth() });
      if (r.ok) setMenus(await r.json());
    } catch {}
  };

  useEffect(() => {
    cargar();
  }, []);

  const cancelarEditar = () => {
    setEditingId(null);
    setForm(menuVacio);
  };

  const guardarMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const url = editingId ? `${API}/admin/menus/${editingId}` : `${API}/admin/menus`;
      const r = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: auth({ "Content-Type": "application/json" }),
        body: JSON.stringify({ ...form, orden: Number(form.orden) || 0 }),
      });
      if (!r.ok) throw new Error((await r.json()).message || "No se pudo guardar");
      setMsg(editingId ? "Menú actualizado." : "Menú creado.");
      cancelarEditar();
      cargar();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const editarMenu = (m: Menu) => {
    setEditingId(m.id);
    setForm({
      titulo: m.titulo,
      tipo: m.tipo,
      descripcion: m.descripcion || "",
      imagenUrl: m.imagenUrl || "",
      videoUrl: m.videoUrl || "",
      horario: m.horario || "",
      orden: m.orden,
      activo: m.activo,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminarMenu = async (m: Menu) => {
    if (!confirm(`¿Eliminar el menú "${m.titulo}"?`)) return;
    setBusy(true);
    try {
      await fetch(`${API}/admin/menus/${m.id}`, { method: "DELETE", headers: auth() });
      setMsg("Menú eliminado.");
      cargar();
    } finally {
      setBusy(false);
    }
  };

  const toggleActivo = async (m: Menu) => {
    await fetch(`${API}/admin/menus/${m.id}`, {
      method: "PUT",
      headers: auth({ "Content-Type": "application/json" }),
      body: JSON.stringify({ activo: !m.activo }),
    });
    cargar();
  };

  const subirArchivoMenu = async (menuId: string, tipo: "image" | "video") => {
    const input = document.getElementById(`file-menu-${tipo}-${menuId}`) as HTMLInputElement | null;
    if (!input?.files?.[0]) { setMsg("Selecciona un archivo."); return; }
    const file = input.files[0];
    if (tipo === "image" && !file.type.startsWith("image/")) { setMsg("Solo imágenes."); return; }
    if (tipo === "video" && !file.type.startsWith("video/")) { setMsg("Solo videos."); return; }
    setBusy(true); setMsg("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await fetch(`${API}/admin/menus/${menuId}/${tipo}`, { method: "POST", headers: auth(), body: fd });
      if (!r.ok) throw new Error((await r.json()).message || `Error subiendo ${tipo}`);
      setMsg(`${tipo === "image" ? "Imagen" : "Video"} subido.`);
      input.value = "";
      cargar();
    } catch (err) { setMsg((err as Error).message); } finally { setBusy(false); }
  };

  const abrirPlatos = (menuId: string) => {
    setPlatoMenuId(menuId);
    setPlatoEdit(null);
    setPlatoForm(platoVacio);
  };

  const editarPlato = (menuId: string, p: Plato) => {
    setPlatoMenuId(menuId);
    setPlatoEdit({ menuId, id: p.id });
    setPlatoForm({
      nombre: p.nombre,
      descripcion: p.descripcion || "",
      categoria: p.categoria || "principal",
      precio: p.precio != null ? String(p.precio) : "",
      etiquetas: (p.etiquetas || []).join(", "),
      imagenUrl: p.imagenUrl || "",
    });
  };

  const subirImagenPlato = async (menuId: string) => {
    const input = document.getElementById(`file-plato-img-${menuId}`) as HTMLInputElement | null;
    if (!input?.files?.[0]) { setMsg("Selecciona una imagen."); return; }
    const file = input.files[0];
    if (!file.type.startsWith("image/")) { setMsg("Solo imágenes."); return; }
    setBusy(true); setMsg("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await fetch(`${API}/admin/menus/${menuId}/image`, { method: "POST", headers: auth(), body: fd });
      if (!r.ok) throw new Error((await r.json()).message || "Error subiendo imagen");
      const data = await r.json();
      setPlatoForm({ ...platoForm, imagenUrl: data.url });
      setMsg("Imagen del plato subida.");
      input.value = "";
    } catch (err) { setMsg((err as Error).message); } finally { setBusy(false); }
  };

  const guardarPlato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platoMenuId) return;
    setBusy(true); setMsg("");
    try {
      const payload = {
        nombre: platoForm.nombre,
        descripcion: platoForm.descripcion || null,
        categoria: platoForm.categoria || null,
        precio: platoForm.precio === "" ? null : Number(platoForm.precio),
        etiquetas: platoForm.etiquetas.split(",").map(s => s.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean),
        imagenUrl: platoForm.imagenUrl || null,
      };
      const url = platoEdit ? `${API}/admin/menus/${platoMenuId}/platos/${platoEdit.id}` : `${API}/admin/menus/${platoMenuId}/platos`;
      const r = await fetch(url, { method: platoEdit ? "PUT" : "POST", headers: auth({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
      if (!r.ok) throw new Error((await r.json()).message || "No se pudo guardar el plato");
      setMsg(platoEdit ? "Plato actualizado." : "Plato agregado.");
      setPlatoEdit(null); setPlatoForm(platoVacio); cargar();
    } catch (err) { setMsg((err as Error).message); } finally { setBusy(false); }
  };

  const eliminarPlato = async (menuId: string, p: Plato) => {
    if (!confirm(`¿Eliminar el plato "${p.nombre}"?`)) return;
    await fetch(`${API}/admin/menus/${menuId}/platos/${p.id}`, { method: "DELETE", headers: auth() });
    setMsg("Plato eliminado."); cargar();
  };

  const totalPlatos = menus.reduce((s, m) => s + m.platos.length, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><UtensilsCrossed className="h-6 w-6 text-primary" /> Comidas y Menús</h1>
          <p className="mt-1 text-sm text-muted-foreground">Crea menús personalizados con imágenes y videos.</p>
        </div>
        <button onClick={() => { cancelarEditar(); setPlatoMenuId(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={btn}>
          <Plus className="h-4 w-4" /> Nuevo menú
        </button>
      </div>

      {msg && <div className="rounded-xl border border-input bg-white px-4 py-3 text-sm shadow-sm">{msg}</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-wider text-muted-foreground">Menús</p><p className="text-2xl font-bold">{menus.length}</p></div>
        <div className="rounded-xl border bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-wider text-muted-foreground">Activos</p><p className="text-2xl font-bold text-green-600">{menus.filter(m => m.activo).length}</p></div>
        <div className="rounded-xl border bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-wider text-muted-foreground">Platos</p><p className="text-2xl font-bold">{totalPlatos}</p></div>
      </div>

      <form onSubmit={guardarMenu} className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><ChefHat className="h-5 w-5 text-primary" /> {editingId ? "Editar menú" : "Nuevo menú"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="mb-1.5 block text-sm font-medium">Título *</label><input className={inp} value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Menú del Finquero" required /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Tipo</label><select className={inp} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>{TIPOS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
          <div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-medium">Descripción</label><textarea className={inp} rows={2} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Productos de la finca..." /></div>
          <div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-medium">URL de imagen</label><input className={inp} value={form.imagenUrl} onChange={e => setForm({ ...form, imagenUrl: e.target.value })} placeholder="https://..." /></div>
          <div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-medium">URL de video</label><input className={inp} value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://www.youtube.com/..." /></div>
          <div className="flex items-end gap-3 sm:col-span-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} /> Visible en el sitio</label></div>
          <div><label className="mb-1.5 block text-sm font-medium">Horario</label><input className={inp} value={form.horario} onChange={e => setForm({ ...form, horario: e.target.value })} placeholder="Todos los días 7:00 - 10:00" /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Orden</label><input type="number" className={inp} value={form.orden} onChange={e => setForm({ ...form, orden: Number(e.target.value) })} /></div>
        </div>
        <div className="mt-4 flex gap-3">
          <button type="submit" disabled={busy} className={btn}>{busy ? "Guardando..." : editingId ? "Guardar cambios" : "Crear menú"}</button>
          {editingId && <button type="button" onClick={cancelarEditar} className={btnSec}>Cancelar</button>}
        </div>
      </form>

      {editingId && (
        <div className="rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Upload className="h-4 w-4 text-primary" /> Subir archivos desde PC</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border p-3">
              <p className="text-sm font-medium mb-2">Imagen del menú</p>
              <input id={`file-menu-image-${editingId}`} type="file" accept="image/*" className="block w-full text-sm text-muted-foreground" />
              <button onClick={() => subirArchivoMenu(editingId, "image")} disabled={busy} className={`w-full ${btnSec} mt-2`}>Subir imagen desde PC</button>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-sm font-medium mb-2">Video del menú</p>
              <input id={`file-menu-video-${editingId}`} type="file" accept="video/*" className="block w-full text-sm text-muted-foreground" />
              <button onClick={() => subirArchivoMenu(editingId, "video")} disabled={busy} className={`w-full ${btnSec} mt-2`}>Subir video desde PC</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {menus.length === 0 && <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">Aún no hay menús.</div>}
        {menus.map(m => (
          <div key={m.id} className="rounded-xl border bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
              <div>
                <div className="flex items-center gap-2"><h3 className="font-semibold">{m.titulo}</h3><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{TIPOS.find(t => t.v === m.tipo)?.l || m.tipo}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${m.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{m.activo ? "Activo" : "Oculto"}</span></div>
                {m.descripcion && <p className="mt-1 text-sm text-muted-foreground">{m.descripcion}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{m.horario ? `🕐 ${m.horario} · ` : ""}{m.platos.length} plato · /{m.slug}{m.imagenUrl ? " · 🖼️" : ""}{m.videoUrl ? " · 🎬" : ""}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => toggleActivo(m)} className={btnSm}>{m.activo ? "Ocultar" : "Publicar"}</button>
                <button onClick={() => editarMenu(m)} className={btnSm}><span className="flex items-center gap-1"><Pencil className="h-3.5 w-3.5" /> Editar</span></button>
                <button onClick={() => eliminarMenu(m)} className={`${btnSm} text-red-600 hover:bg-red-50`}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="p-4">
              {m.platos.length > 0 && (
                <div className="mb-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="pb-2 pr-3">Plato</th><th className="pb-2 pr-3">Categoría</th><th className="pb-2 pr-3">Precio</th><th className="pb-2"></th></tr></thead>
                    <tbody>
                      {m.platos.map(p => (
                        <tr key={p.id} className="border-t"><td className="py-2 pr-3 font-medium">{p.nombre}</td><td className="py-2 pr-3 text-muted-foreground">{p.categoria || "—"}</td><td className="py-2 pr-3">{p.precio != null ? `$${Number(p.precio).toLocaleString("es-CO")}` : "—"}</td><td className="py-2 text-right"><button onClick={() => editarPlato(m.id, p)} className="mr-2 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => eliminarPlato(m.id, p)} className="text-red-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></button></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {platoMenuId === m.id ? (
                <form onSubmit={guardarPlato} className="rounded-xl border border-dashed p-4">
                  <div className="mb-3 flex items-center justify-between"><h4 className="flex items-center gap-2 text-sm font-semibold"><Soup className="h-4 w-4 text-primary" /> {platoEdit ? "Editar plato" : "Agregar plato"}</h4><button type="button" onClick={() => { setPlatoMenuId(null); setPlatoEdit(null); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><label className="mb-1 block text-xs font-medium">Nombre *</label><input className={inp} value={platoForm.nombre} onChange={e => setPlatoForm({ ...platoForm, nombre: e.target.value })} placeholder="Arepa de maíz con queso" required /></div>
                    <div><label className="mb-1 block text-xs font-medium">Categoría</label><select className={inp} value={platoForm.categoria} onChange={e => setPlatoForm({ ...platoForm, categoria: e.target.value })}>{CATEGORIAS.map(c => <option key={c} value={c}>{c || "Sin categoría"}</option>)}</select></div>
                    <div className="sm:col-span-2"><label className="mb-1 block text-xs font-medium">Descripción</label><input className={inp} value={platoForm.descripcion} onChange={e => setPlatoForm({ ...platoForm, descripcion: e.target.value })} placeholder="Hecha con maíz de la finca..." /></div>
                    <div><label className="mb-1 block text-xs font-medium">Precio COP</label><input type="number" min="0" className={inp} value={platoForm.precio} onChange={e => setPlatoForm({ ...platoForm, precio: e.target.value })} placeholder="15000" /></div>
                    <div className="sm:col-span-2"><label className="mb-1 block text-xs font-medium">URL de imagen del plato</label><input className={inp} value={platoForm.imagenUrl} onChange={e => setPlatoForm({ ...platoForm, imagenUrl: e.target.value })} placeholder="https://..." /></div>
                    <div className="sm:col-span-2"><label className="mb-1 block text-xs font-medium">Etiquetas (coma)</label><input className={inp} value={platoForm.etiquetas} onChange={e => setPlatoForm({ ...platoForm, etiquetas: e.target.value })} placeholder="vegetariano, sin gluten" /></div>
                    <div className="flex items-end gap-3 sm:col-span-2"><label className="flex items-center gap-2 text-sm"><input id={`file-plato-img-${m.id}`} type="file" accept="image/*" className="block w-full text-sm text-muted-foreground" /><button onClick={() => subirImagenPlato(m.id)} disabled={busy} className={`w-full ${btnSec} mt-2`}>Subir imagen del plato</button></label></div>
                  </div>
                  <button type="submit" disabled={busy} className={`${btn} mt-3`}>{busy ? "Guardando..." : platoEdit ? "Guardar plato" : "Agregar plato"}</button>
                </form>
              ) : (
                <button onClick={() => abrirPlatos(m.id)} className={btnSec}><span className="flex items-center gap-2"><Plus className="h-4 w-4" /> Agregar plato</span></button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
