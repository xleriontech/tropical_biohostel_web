"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MapPicker from "@/components/MapPicker";
import ImageUploader from "@/components/ImageUploader";
import { StarRating, TipoIcon } from "@/components/icons";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ClipboardList,
  Globe,
  MapPin,
  PawPrint,
  Scale,
  ShieldCheck,
} from "lucide-react";

const TIPOS = [
  { value: "hotel", label: "Hotel" },
  { value: "hostal", label: "Hostal" },
  { value: "centro_turistico", label: "Centro Turístico" },
  { value: "glamping", label: "Glamping" },
  { value: "restaurante", label: "Restaurante" },
  { value: "bar", label: "Bar" },
  { value: "finca", label: "Finca" },
  { value: "actividad", label: "Actividad / Tour" },
] as const;
const TABS = [
  { value: "basicos", label: "Básicos", Icon: ClipboardList },
  { value: "contacto", label: "Contacto", Icon: MapPin },
  { value: "servicios", label: "Servicios", Icon: Banknote },
  { value: "extras", label: "Extras", Icon: Scale },
] as const;
const ESTADOS = ["BORRADOR", "PUBLICADO"] as const;

export default function NewPropertyPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("basicos");
  const [form, setForm] = useState({
    nombre: "", tipo: "hotel", descripcion: "", ubicacion: "",
    telefono: "", email: "", whatsapp: "", direccion: "", ciudad: "",
    departamento: "", estrellas: 0, horarioCheckIn: "15:00", horarioCheckOut: "12:00",
    reglamento: "", politicasCancelacion: "", admiteMascotas: false,
    seguroDisponible: false, capacidadMaxima: 1, numeroHabitaciones: 1,
    precioNoche: 0, actividades: "", videos: "", servicioImagenes: "", coordenadas: "", estado: "BORRADOR",
    facebook: "", instagram: "", twitter: "", tiktok: "", youtube: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const token = localStorage.getItem("token");
    const { facebook, instagram, twitter, tiktok, youtube, ...formData } = form;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/properties`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...formData,
        actividades: formData.actividades.split(",").map((a) => a.trim()).filter(Boolean),
        videos: formData.videos.split(",").map((v) => v.trim()).filter(Boolean),
        servicioImagenes: formData.servicioImagenes.split(",").map((s) => s.trim()).filter(Boolean),
        coordenadas: formData.coordenadas ? { lat: parseFloat(formData.coordenadas.split(",")[0]), lng: parseFloat(formData.coordenadas.split(",")[1]) } : undefined,
        redesSociales: Object.fromEntries(
          Object.entries({ facebook, instagram, twitter, tiktok, youtube })
            .filter(([, v]) => v.trim()),
        ),
        capacidadMaxima: Number(formData.capacidadMaxima),
        numeroHabitaciones: Number(formData.numeroHabitaciones),
        precioNoche: Number(formData.precioNoche),
        estrellas: Number(formData.estrellas),
      }),
    });
    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/admin/properties"), 1000);
    } else {
      const err = await res.json().catch(() => ({ message: "Error al guardar" }));
      setError(err.message || "Error al guardar");
    }
    setSaving(false);
  };

  if (success) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-green-800">Propiedad creada exitosamente</h2>
          <p className="text-sm text-green-600">Redirigiendo al listado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <a href="/admin/properties" className="flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver
        </a>
        <h1 className="text-2xl font-bold">Nueva Propiedad</h1>
      </div>

      {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-6 flex gap-1 rounded-xl border bg-secondary/30 p-1">
            {TABS.map((tab) => (
              <button key={tab.value} onClick={() => setActiveTab(tab.value)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.value ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}>
                <tab.Icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {activeTab === "basicos" && (
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="mb-5 flex items-center gap-2 text-base font-semibold">
                  <ClipboardList className="h-5 w-5 text-primary" /> Información Básica
                </h2>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Nombre <span className="text-red-500">*</span></label>
                      <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required placeholder="Ej: Hotel Sierra Verde" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Tipo</label>
                      <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                        className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Descripción</label>
                    <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                      className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[120px] resize-y" placeholder="Describe la propiedad..." />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Capacidad <span className="text-red-500">*</span></label>
                      <input type="number" min={1} value={form.capacidadMaxima} onChange={(e) => setForm({ ...form, capacidadMaxima: +e.target.value })}
                        className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Habitaciones</label>
                      <input type="number" min={0} value={form.numeroHabitaciones} onChange={(e) => setForm({ ...form, numeroHabitaciones: +e.target.value })}
                        className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "contacto" && (
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="mb-5 flex items-center gap-2 text-base font-semibold">
                  <MapPin className="h-5 w-5 text-primary" /> Contacto y Ubicación
                </h2>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Departamento</label>
                      <input value={form.departamento} onChange={(e) => setForm({ ...form, departamento: e.target.value })}
                        className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Cundinamarca" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Ciudad</label>
                      <input value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                        className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ciudad o municipio" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Dirección</label>
                    <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                      className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Calle 3 # 5-40" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Ubicación en el mapa</label>
                    <MapPicker value={form.coordenadas} onChange={(v) => setForm({ ...form, coordenadas: v })} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Teléfono</label>
                      <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                        className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="+57 601 234 5678" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Email</label>
                      <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="correo@ejemplo.com" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">WhatsApp</label>
                      <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                        className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="573001234567" />
                    </div>
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                      <Globe className="h-4 w-4" /> Redes Sociales
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">Facebook (URL)</label>
                        <input value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                          className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="https://facebook.com/..." />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">Instagram (URL)</label>
                        <input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                          className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="https://instagram.com/..." />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">Twitter / X (URL)</label>
                        <input value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })}
                          className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="https://x.com/..." />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">TikTok (URL)</label>
                        <input value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })}
                          className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="https://tiktok.com/..." />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">YouTube (URL)</label>
                        <input value={form.youtube} onChange={(e) => setForm({ ...form, youtube: e.target.value })}
                          className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="https://youtube.com/..." />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "servicios" && (
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="mb-5 flex items-center gap-2 text-base font-semibold">
                  <Banknote className="h-5 w-5 text-primary" /> Servicios y Precios
                </h2>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Precio noche (COP) <span className="text-red-500">*</span></label>
                      <input type="number" min={0} value={form.precioNoche} onChange={(e) => setForm({ ...form, precioNoche: +e.target.value })}
                        className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Estrellas</label>
                      <select value={form.estrellas} onChange={(e) => setForm({ ...form, estrellas: +e.target.value })}
                        className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Estado</label>
                      <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}
                        className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Check-in</label>
                      <input value={form.horarioCheckIn} onChange={(e) => setForm({ ...form, horarioCheckIn: e.target.value })}
                        className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Check-out</label>
                      <input value={form.horarioCheckOut} onChange={(e) => setForm({ ...form, horarioCheckOut: e.target.value })}
                        className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Actividades</label>
                    <input value={form.actividades} onChange={(e) => setForm({ ...form, actividades: e.target.value })}
                      className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="senderismo, yoga, spa" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Videos (URLs)</label>
                    <input value={form.videos} onChange={(e) => setForm({ ...form, videos: e.target.value })}
                      className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="https://youtube.com/embed/..." />
                  </div>
                  <div>
                    <ImageUploader
                      label="Fotos de servicios"
                      multiple
                      carpeta="propiedades"
                      value={form.servicioImagenes ? form.servicioImagenes.split(",").map((s) => s.trim()).filter(Boolean) : []}
                      onChange={(v) => setForm({ ...form, servicioImagenes: (Array.isArray(v) ? v : [v]).join(", ") })}
                    />
                  </div>
                  <div className="flex gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div onClick={() => setForm({ ...form, admiteMascotas: !form.admiteMascotas })}
                        className={`relative h-6 w-11 rounded-full transition-colors ${form.admiteMascotas ? "bg-primary" : "bg-input"}`}>
                        <div className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.admiteMascotas ? "translate-x-5" : ""}`} />
                      </div>
                      <span className="flex items-center gap-1.5 text-sm">
                        <PawPrint className="h-4 w-4 text-primary" /> Admite mascotas
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div onClick={() => setForm({ ...form, seguroDisponible: !form.seguroDisponible })}
                        className={`relative h-6 w-11 rounded-full transition-colors ${form.seguroDisponible ? "bg-primary" : "bg-input"}`}>
                        <div className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.seguroDisponible ? "translate-x-5" : ""}`} />
                      </div>
                      <span className="flex items-center gap-1.5 text-sm">
                        <ShieldCheck className="h-4 w-4 text-primary" /> Seguro disponible
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "extras" && (
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="mb-5 flex items-center gap-2 text-base font-semibold">
                  <Scale className="h-5 w-5 text-primary" /> Reglas y Políticas
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Reglamento</label>
                    <textarea value={form.reglamento} onChange={(e) => setForm({ ...form, reglamento: e.target.value })}
                      className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px] resize-y" placeholder="No fumar en las habitaciones..." />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Políticas de cancelación</label>
                    <textarea value={form.politicasCancelacion} onChange={(e) => setForm({ ...form, politicasCancelacion: e.target.value })}
                      className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px] resize-y" placeholder="Cancelación gratuita hasta 48 horas antes..." />
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center gap-3 rounded-xl border bg-secondary/20 p-4">
              <button type="submit" disabled={saving}
                className="rounded-xl bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creando...
                  </span>
                ) : "Crear Propiedad"}
              </button>
              <a href="/admin/properties" className="rounded-xl border border-input px-6 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</a>
            </div>
          </form>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <div className="sticky top-24">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vista previa</h3>
                <div className="overflow-hidden rounded-xl border">
                  <div className="flex h-32 items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                    <TipoIcon tipo={form.tipo} className="h-12 w-12" />
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-sm truncate">{form.nombre || "Nombre"}</h4>
                    <p className="text-xs text-muted-foreground truncate">{form.ciudad || "Ciudad"}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">${Number(form.precioNoche).toLocaleString("es-CO")}</span>
                      <span className="text-[11px] text-muted-foreground">{form.capacidadMaxima} pers.</span>
                    </div>
                    <div className="mt-1"><StarRating value={form.estrellas || 0} className="h-3 w-3" /></div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
