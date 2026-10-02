"use client";

import { useEffect, useState } from "react";
import { HeartHandshake, Megaphone, Pin } from "lucide-react";
import ImageUploader from "@/components/ImageUploader";
import { absoluteUrl } from "@/lib/api-base";

interface Sponsor {
  id: string;
  nombre: string;
  logoUrl?: string;
  sitioWeb?: string;
  contacto?: string;
  anuncios?: any[];
  sponsoredListings?: any[];
  createdAt: string;
}

export default function AdminSponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Sponsor | null>(null);
  const [nombre, setNombre] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [sitioWeb, setSitioWeb] = useState("");
  const [contacto, setContacto] = useState("");

  const fetchSponsors = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/sponsors`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (res.ok) setSponsors(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchSponsors(); }, []);

  const openCreate = () => {
    setEditing(null);
    setNombre(""); setLogoUrl(""); setSitioWeb(""); setContacto("");
    setShowForm(true);
  };

  const openEdit = (s: Sponsor) => {
    setEditing(s);
    setNombre(s.nombre);
    setLogoUrl(s.logoUrl || "");
    setSitioWeb(s.sitioWeb || "");
    setContacto(s.contacto || "");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const body = { nombre, logoUrl: logoUrl || undefined, sitioWeb: sitioWeb || undefined, contacto: contacto || undefined };

    if (editing) {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/sponsors/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
    } else {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/sponsors`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
    }

    setShowForm(false);
    setEditing(null);
    fetchSponsors();
  };

  const deleteSponsor = async (id: string) => {
    if (!confirm("¿Eliminar patrocinador?")) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/sponsors/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    fetchSponsors();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Patrocinadores</h1>
          <p className="text-sm text-muted-foreground">{sponsors.length} patrocinadores registrados</p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          + Nuevo Patrocinador
        </button>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-white p-6 shadow-xl">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{editing ? "Editar Patrocinador" : "Nuevo Patrocinador"}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Nombre <span className="text-red-500">*</span></label>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required
                  className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Nombre del patrocinador" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Logo</label>
                <ImageUploader value={logoUrl} onChange={(v) => setLogoUrl(v as string)} carpeta="sponsors" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Sitio Web</label>
                <input value={sitioWeb} onChange={(e) => setSitioWeb(e.target.value)}
                  className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="https://ejemplo.com" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Contacto</label>
                <input value={contacto} onChange={(e) => setContacto(e.target.value)}
                  className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Nombre o teléfono de contacto" />
              </div>
              {logoUrl && (
                <div className="flex items-center gap-3 rounded-lg border bg-secondary/20 p-3">
                  <img src={absoluteUrl(logoUrl)} alt="" className="h-10 w-10 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <span className="text-xs text-muted-foreground truncate">Vista previa del logo</span>
                </div>
              )}
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  {editing ? "Guardar Cambios" : "Crear Patrocinador"}
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

      {/* Loading */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : sponsors.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-muted">
          <div className="text-center">
            <p className="flex justify-center text-muted-foreground/40"><HeartHandshake className="h-10 w-10" /></p>
            <p className="mt-2 text-muted-foreground">No hay patrocinadores todavía</p>
            <button onClick={openCreate} className="mt-3 text-sm font-medium text-primary hover:underline">
              Agregar primer patrocinador
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sponsors.map((s) => (
            <div key={s.id} className="group overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md">
              <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/30">
                {s.logoUrl ? (
                  <img src={s.logoUrl} alt={s.nombre} className="h-full w-full object-contain p-8 transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground/30">
                    <HeartHandshake className="h-12 w-12" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="mb-1 font-semibold text-foreground">{s.nombre}</h3>
                {s.contacto && (
                  <p className="mb-2 text-sm text-muted-foreground truncate">{s.contacto}</p>
                )}
                {s.sitioWeb && (
                  <a href={s.sitioWeb} target="_blank" className="mb-3 block text-sm text-primary hover:underline truncate">
                    {s.sitioWeb}
                  </a>
                )}
                <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Megaphone className="h-3.5 w-3.5" /> {(s.anuncios || []).length} anuncios</span>
                  <span className="flex items-center gap-1"><Pin className="h-3.5 w-3.5" /> {(s.sponsoredListings || []).length} listados</span>
                </div>
                <div className="flex gap-2 border-t pt-3">
                  <button onClick={() => openEdit(s)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors">
                    Editar
                  </button>
                  <button onClick={() => deleteSponsor(s.id)}
                    className="flex items-center justify-center rounded-lg border border-input px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors">
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
