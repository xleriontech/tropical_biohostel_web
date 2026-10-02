"use client";

import { useEffect, useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import {
  Banknote,
  Calendar,
  Eye,
  HeartHandshake,
  Lock,
  LockOpen,
  MapPin,
  Megaphone,
} from "lucide-react";

const PLACEMENTS = [
  { value: "HOME_BANNER", label: "Banner Principal" },
  { value: "SEARCH_RESULTS_TOP", label: "Resultados de Búsqueda (Top)" },
  { value: "SEARCH_RESULTS_SIDEBAR", label: "Resultados de Búsqueda (Sidebar)" },
  { value: "PROPERTY_DETAIL", label: "Detalle de Propiedad" },
];

export default function AdminAdsPage() {
  const [ads, setAds] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    titulo: "", imagenUrl: "", linkUrl: "", placement: "HOME_BANNER",
    sponsorId: "", fechaInicio: "", fechaFin: "", prioridad: 0, pagoTotal: 0,
  });

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    const [adsRes, spRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/advertisements`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/sponsors`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);
    if (adsRes.ok) setAds(await adsRes.json());
    if (spRes.ok) setSponsors(await spRes.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditing(null);
    const today = new Date().toISOString().split("T")[0];
    setForm({ titulo: "", imagenUrl: "", linkUrl: "", placement: "HOME_BANNER", sponsorId: "", fechaInicio: today, fechaFin: "", prioridad: 0, pagoTotal: 0 });
    setShowForm(true);
  };

  const openEdit = (ad: any) => {
    setEditing(ad);
    setForm({
      titulo: ad.titulo || "",
      imagenUrl: ad.imagenUrl || "",
      linkUrl: ad.linkUrl || "",
      placement: ad.placement || "HOME_BANNER",
      sponsorId: ad.sponsorId || "",
      fechaInicio: ad.fechaInicio?.split("T")[0] || "",
      fechaFin: ad.fechaFin?.split("T")[0] || "",
      prioridad: ad.prioridad || 0,
      pagoTotal: ad.pagoTotal || 0,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const body = {
      ...form,
      prioridad: Number(form.prioridad),
      fechaInicio: form.fechaInicio ? new Date(form.fechaInicio).toISOString() : undefined,
      fechaFin: form.fechaFin ? new Date(form.fechaFin).toISOString() : undefined,
    };

    if (editing) {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/advertisements/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
    } else {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/advertisements`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
    }

    setShowForm(false);
    setEditing(null);
    fetchData();
  };

  const toggleActive = async (id: string, current: boolean) => {
    const token = localStorage.getItem("token");
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/advertisements/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ activo: !current }),
    });
    fetchData();
  };

  const deleteAd = async (id: string) => {
    if (!confirm("¿Eliminar anuncio?")) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/advertisements/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    fetchData();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Anuncios</h1>
          <p className="text-sm text-muted-foreground">{ads.length} anuncios registrados</p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          + Nuevo Anuncio
        </button>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{editing ? "Editar Anuncio" : "Nuevo Anuncio"}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Título</label>
                  <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Título del anuncio" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Ubicación</label>
                  <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })}
                    className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {PLACEMENTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Imagen del anuncio</label>
                  <ImageUploader value={form.imagenUrl} onChange={(v) => setForm({ ...form, imagenUrl: v as string })} carpeta="ads" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">URL Destino</label>
                  <input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                    className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="https://ejemplo.com" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Patrocinador</label>
                  <select value={form.sponsorId} onChange={(e) => setForm({ ...form, sponsorId: e.target.value })}
                    className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Sin patrocinador</option>
                    {sponsors.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Inicio</label>
                  <input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                    className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Fin</label>
                  <input type="date" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                    className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Prioridad</label>
                <input type="number" min={0} value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: +e.target.value })}
                  className="w-32 rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Pago Total (COP)</label>
                <input type="number" min={0} step="1000" value={form.pagoTotal} onChange={(e) => setForm({ ...form, pagoTotal: +e.target.value })}
                  className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="50000" />
                <p className="mt-1 text-[11px] text-muted-foreground">$50.000 = básico (5s, skippeable) | $100.000+ = premium (10s, no skippeable)</p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  {editing ? "Guardar Cambios" : "Crear Anuncio"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
                  className="rounded-xl border border-input px-6 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : ads.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-muted">
          <div className="text-center">
            <p className="flex justify-center text-muted-foreground/40"><Megaphone className="h-10 w-10" /></p>
            <p className="mt-2 text-muted-foreground">No hay anuncios todavía</p>
            <button onClick={openCreate} className="mt-3 text-sm font-medium text-primary hover:underline">
              Crear primer anuncio
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => {
            const isActive = ad.activo && new Date(ad.fechaFin) > new Date();
            return (
              <div key={ad.id} className="group overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md">
                <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                  {ad.imagenUrl ? (
                    <img src={ad.imagenUrl} alt={ad.titulo || ""} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/40">
                      <Megaphone className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="mb-1 font-semibold text-foreground truncate">{ad.titulo || "Sin título"}</h3>
                  <div className="mb-2 space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5 truncate">
                      {ad.sponsor?.nombre ? <><HeartHandshake className="h-3.5 w-3.5 shrink-0" /> {ad.sponsor.nombre}</> : <><Megaphone className="h-3.5 w-3.5 shrink-0" /> Sin patrocinador</>}
                    </p>
                    <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" /> {PLACEMENTS.find((p) => p.value === ad.placement)?.label || ad.placement}</p>
                    <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0" /> {formatDate(ad.fechaInicio)} - {formatDate(ad.fechaFin)}</p>
                    <p className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 shrink-0" /> {ad.impresiones} impresiones · {ad.clicks} clicks</p>
                    <p className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5 shrink-0" /> ${Number(ad.pagoTotal || 0).toLocaleString("es-CO")} COP · {ad.pagoTotal >= 100000 ? <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Premium</span> : ad.pagoTotal >= 50000 ? <span className="flex items-center gap-1"><LockOpen className="h-3.5 w-3.5" /> Básico</span> : "Sin pago"}</p>
                  </div>
                  <div className="flex gap-2 border-t pt-3">
                    <button onClick={() => openEdit(ad)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors">
                      Editar
                    </button>
                    <button onClick={() => toggleActive(ad.id, ad.activo)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${ad.activo ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                      {ad.activo ? "Desactivar" : "Activar"}
                    </button>
                    <button onClick={() => deleteAd(ad.id)}
                      className="flex items-center justify-center rounded-lg border border-input px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors">
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
