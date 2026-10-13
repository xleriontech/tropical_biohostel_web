"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MapPicker from "@/components/MapPicker";
import ImageUploader from "@/components/ImageUploader";

export const runtime = "edge";
import { StarRating, TipoIcon } from "@/components/icons";
import {
  ArrowLeft,
  ArrowLeftRight,
  Banknote,
  CalendarSync,
  Camera,
  Check,
  CheckCircle2,
  Clapperboard,
  ClipboardList,
  Compass,
  Copy,
  Eye,
  Globe,
  Link2,
  MapPin,
  PawPrint,
  RefreshCw,
  Scale,
  ShieldCheck,
  Star,
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
const ESTADOS = ["BORRADOR", "PUBLICADO"] as const;

export default function EditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("basicos");
  // Sincronización Airbnb/Booking (iCal)
  const [icalUrlsText, setIcalUrlsText] = useState("");
  const [icalInfo, setIcalInfo] = useState<any>(null);
  const [icalLoading, setIcalLoading] = useState(false);
  const [icalSaving, setIcalSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [subiendoFotos, setSubiendoFotos] = useState(false);
  const [avisoFotos, setAvisoFotos] = useState("");
  const archivosRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    nombre: "", tipo: "hotel", descripcion: "", ubicacion: "",
    telefono: "", email: "", whatsapp: "", direccion: "", ciudad: "",
    departamento: "", estrellas: 0, horarioCheckIn: "15:00", horarioCheckOut: "12:00",
    reglamento: "", politicasCancelacion: "", admiteMascotas: false,
    seguroDisponible: false, capacidadMaxima: 1, numeroHabitaciones: 1,
    precioNoche: 0, actividades: "", videos: "", servicioImagenes: "", coordenadas: "", estado: "BORRADOR",
    facebook: "", instagram: "", twitter: "", tiktok: "", youtube: "",
  });

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/properties/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setForm({
            nombre: data.nombre || "", tipo: data.tipo || "hotel",
            descripcion: data.descripcion || "", ubicacion: data.ubicacion || "",
            telefono: data.telefono || "", email: data.email || "",
            whatsapp: data.whatsapp || "", direccion: data.direccion || "",
            ciudad: data.ciudad || "", departamento: data.departamento || "",
            estrellas: data.estrellas || 0, horarioCheckIn: data.horarioCheckIn || "15:00",
            horarioCheckOut: data.horarioCheckOut || "12:00", reglamento: data.reglamento || "",
            politicasCancelacion: data.politicasCancelacion || "",
            admiteMascotas: data.admiteMascotas || false,
            seguroDisponible: data.seguroDisponible || false,
            capacidadMaxima: data.capacidadMaxima || 1, numeroHabitaciones: data.numeroHabitaciones || 1,
            precioNoche: data.precioNoche || 0, actividades: (data.actividades || []).join(", "),
            videos: (data.videos || []).join(", "),
            servicioImagenes: (data.servicioImagenes || []).join(", "),
            coordenadas: (typeof data.coordenadas === "object" && data.coordenadas) ? `${data.coordenadas.lat},${data.coordenadas.lng}` : (data.coordenadas || ""),
            facebook: data.redesSociales?.facebook || "",
            instagram: data.redesSociales?.instagram || "",
            twitter: data.redesSociales?.twitter || "",
            tiktok: data.redesSociales?.tiktok || "",
            youtube: data.redesSociales?.youtube || "",
            estado: data.estado || "BORRADOR",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const token = localStorage.getItem("token");
    const url = isNew
      ? `${process.env.NEXT_PUBLIC_API_URL}/admin/properties`
      : `${process.env.NEXT_PUBLIC_API_URL}/admin/properties/${id}`;
    const { facebook, instagram, twitter, tiktok, youtube, ...formData } = form;
    const res = await fetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  useEffect(() => {
    if (id && activeTab === "sincronizacion" && !icalInfo) cargarIcal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id]);

  if (loading) return <FormSkeleton />;
  if (success) return <SuccessBanner />;

  const tabs = [
    { id: "basicos", label: "Información Básica", Icon: ClipboardList },
    { id: "contacto", label: "Contacto y Ubicación", Icon: MapPin },
    { id: "servicios", label: "Servicios y Precios", Icon: Banknote },
    { id: "extras", label: "Reglas y Políticas", Icon: Scale },
    ...(!isNew ? [{ id: "sincronizacion", label: "Sincronización", Icon: CalendarSync }] : []),
  ];

  const cargarIcal = async () => {
    if (!id) return;
    setIcalLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/properties/${id}/ical-info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIcalInfo(data);
        setIcalUrlsText((data.icalImportUrls || []).join("\n"));
      }
    } catch {}
    finally { setIcalLoading(false); }
  };

  const guardarIcal = async () => {
    if (!id) return;
    setIcalSaving(true);
    try {
      const token = localStorage.getItem("token");
      const urls = icalUrlsText.split("\n").map((u) => u.trim()).filter(Boolean);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/properties/${id}/ical`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ icalImportUrls: urls }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "No se pudo guardar");
      await cargarIcal();
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar la sincronización");
    } finally {
      setIcalSaving(false);
    }
  };

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api").replace(/\/api$/, "");
  const exportUrl = icalInfo?.icalToken
    ? `${apiBase}/api/calendar/${icalInfo.slug}--${icalInfo.icalToken}.ics`
    : null;

  const copiarExport = async () => {
    if (!exportUrl) return;
    try {
      await navigator.clipboard.writeText(exportUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const subirFotos = async (files: FileList | null) => {
    if (!files || files.length === 0 || !id) return;
    setSubiendoFotos(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      let ok = 0;
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/properties/${id}/images`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (res.ok) ok++;
      }
      if (ok === 0) throw new Error("No se pudo subir ninguna imagen.");
      setAvisoFotos(`${ok} imagen(es) en la galería. Se ven en el sitio al recargar la ficha.`);
      setTimeout(() => setAvisoFotos(""), 6000);
    } catch (e: any) {
      setError(e?.message || "No se pudo subir.");
    } finally {
      setSubiendoFotos(false);
      if (archivosRef.current) archivosRef.current.value = "";
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <a href="/admin/properties" className="flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Volver
          </a>
          <h1 className="text-2xl font-bold">{isNew ? "Nueva Propiedad" : "Editar Propiedad"}</h1>
          {!isNew && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              form.estado === "PUBLICADO" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
            }`}>
              {form.estado}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="no-scrollbar mb-6 flex gap-1 overflow-x-auto rounded-xl border bg-secondary/30 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.Icon className="h-4 w-4" /> {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tab 1: Basic Info */}
            {activeTab === "basicos" && (
              <SectionCard icon={<ClipboardList className="h-5 w-5 text-primary" />} title="Información Básica">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Nombre de la propiedad" required>
                    <Input value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} placeholder="Ej: Hotel Sierra Verde" />
                  </FormField>
                  <FormField label="Tipo de alojamiento">
                    <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                      className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow">
                      {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </FormField>
                </div>
                <FormField label="Descripción">
                  <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow min-h-[120px] resize-y"
                    placeholder="Describe la propiedad en detalle..." />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Capacidad máxima">
                    <Input type="number" min={1} value={form.capacidadMaxima} onChange={(v) => setForm({ ...form, capacidadMaxima: +v })} />
                  </FormField>
                  <FormField label="Número de habitaciones">
                    <Input type="number" min={0} value={form.numeroHabitaciones} onChange={(v) => setForm({ ...form, numeroHabitaciones: +v })} />
                  </FormField>
                </div>
              </SectionCard>
            )}

            {/* Tab 2: Contact & Location */}
            {activeTab === "contacto" && (
              <SectionCard icon={<MapPin className="h-5 w-5 text-primary" />} title="Contacto y Ubicación">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="País / Departamento">
                    <Input value={form.departamento} onChange={(v) => setForm({ ...form, departamento: v })} placeholder="Cundinamarca" />
                  </FormField>
                  <FormField label="Ciudad">
                    <Input value={form.ciudad} onChange={(v) => setForm({ ...form, ciudad: v })} placeholder="Ciudad o municipio" />
                  </FormField>
                </div>
                <FormField label="Dirección exacta">
                  <Input value={form.direccion} onChange={(v) => setForm({ ...form, direccion: v })} placeholder="Calle 3 # 5-40, Plaza Principal" />
                </FormField>
                <FormField label="Ubicación (zona / vereda)">
                  <Input value={form.ubicacion} onChange={(v) => setForm({ ...form, ubicacion: v })} placeholder="Centro, Vereda El Rodeo..." />
                </FormField>
                <FormField label="Ubicación en el mapa">
                  <MapPicker value={form.coordenadas} onChange={(v) => setForm({ ...form, coordenadas: v })} />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField label="Teléfono">
                    <Input value={form.telefono} onChange={(v) => setForm({ ...form, telefono: v })} placeholder="+57 601 234 5678" />
                  </FormField>
                  <FormField label="Email">
                    <Input value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="correo@ejemplo.com" />
                  </FormField>
                  <FormField label="WhatsApp">
                    <Input value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="573001234567" />
                  </FormField>
                </div>
                <div className="mt-4 border-t pt-4">
                  <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <Globe className="h-4 w-4" /> Redes Sociales
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Facebook (URL)">
                      <Input value={form.facebook} onChange={(v) => setForm({ ...form, facebook: v })} placeholder="https://facebook.com/..." />
                    </FormField>
                    <FormField label="Instagram (URL)">
                      <Input value={form.instagram} onChange={(v) => setForm({ ...form, instagram: v })} placeholder="https://instagram.com/..." />
                    </FormField>
                    <FormField label="Twitter / X (URL)">
                      <Input value={form.twitter} onChange={(v) => setForm({ ...form, twitter: v })} placeholder="https://x.com/..." />
                    </FormField>
                    <FormField label="TikTok (URL)">
                      <Input value={form.tiktok} onChange={(v) => setForm({ ...form, tiktok: v })} placeholder="https://tiktok.com/..." />
                    </FormField>
                    <FormField label="YouTube (URL)">
                      <Input value={form.youtube} onChange={(v) => setForm({ ...form, youtube: v })} placeholder="https://youtube.com/..." />
                    </FormField>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Tab 3: Services & Pricing */}
            {activeTab === "servicios" && (
              <SectionCard icon={<Banknote className="h-5 w-5 text-primary" />} title="Servicios y Precios">
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField label="Precio por noche (COP $)" required>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <input type="number" min={0} value={form.precioNoche} onChange={(e) => setForm({ ...form, precioNoche: +e.target.value })}
                        className="w-full rounded-xl border border-input bg-white pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" required />
                    </div>
                  </FormField>
                  <FormField label="Estrellas">
                    <select value={form.estrellas} onChange={(e) => setForm({ ...form, estrellas: +e.target.value })}
                      className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow">
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Estado">
                    <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}
                      className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow">
                      {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </FormField>
                </div>
                {form.precioNoche > 0 && <PricePreview precioCOP={Number(form.precioNoche)} />}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Check-in">
                    <Input value={form.horarioCheckIn} onChange={(v) => setForm({ ...form, horarioCheckIn: v })} placeholder="15:00" />
                  </FormField>
                  <FormField label="Check-out">
                    <Input value={form.horarioCheckOut} onChange={(v) => setForm({ ...form, horarioCheckOut: v })} placeholder="12:00" />
                  </FormField>
                </div>
                <FormField label="Actividades (separadas por coma)">
                  <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Star className="h-4 w-4" /></span>
                    <input value={form.actividades} onChange={(e) => setForm({ ...form, actividades: e.target.value })}
                      className="w-full rounded-xl border border-input bg-white pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                      placeholder="senderismo, yoga, spa, cabalgatas" />
                  </div>
                </FormField>
                <FormField label="Videos (URLs separadas por coma)">
                  <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Clapperboard className="h-4 w-4" /></span>
                    <input value={form.videos} onChange={(e) => setForm({ ...form, videos: e.target.value })}
                      className="w-full rounded-xl border border-input bg-white pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                      placeholder="https://youtube.com/embed/..." />
                  </div>
                </FormField>
                <FormField label="Fotos de servicios">
                  <ImageUploader
                    multiple
                    carpeta="propiedades"
                    value={form.servicioImagenes ? form.servicioImagenes.split(",").map((s) => s.trim()).filter(Boolean) : []}
                    onChange={(v) => setForm({ ...form, servicioImagenes: (Array.isArray(v) ? v : [v]).join(", ") })}
                  />
                </FormField>
                <div className="flex flex-wrap gap-x-6 gap-y-3 pt-2">
                  <Toggle checked={form.admiteMascotas} onChange={(v) => setForm({ ...form, admiteMascotas: v })} label={<span className="flex items-center gap-1.5 text-sm"><PawPrint className="h-4 w-4 text-primary" /> Admite mascotas</span>} />
                  <Toggle checked={form.seguroDisponible} onChange={(v) => setForm({ ...form, seguroDisponible: v })} label={<span className="flex items-center gap-1.5 text-sm"><ShieldCheck className="h-4 w-4 text-primary" /> Seguro disponible</span>} />
                </div>
              </SectionCard>
            )}

            {/* Tab 4: Rules & Policies */}
            {activeTab === "extras" && (
              <SectionCard icon={<Scale className="h-5 w-5 text-primary" />} title="Reglas y Políticas">
                <FormField label="Reglamento de la propiedad">
                  <textarea value={form.reglamento} onChange={(e) => setForm({ ...form, reglamento: e.target.value })}
                    className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow min-h-[100px] resize-y"
                    placeholder="No fumar en las habitaciones. Silencio después de las 22:00..." />
                </FormField>
                <FormField label="Políticas de cancelación">
                  <textarea value={form.politicasCancelacion} onChange={(e) => setForm({ ...form, politicasCancelacion: e.target.value })}
                    className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow min-h-[100px] resize-y"
                    placeholder="Cancelación gratuita hasta 48 horas antes..." />
                </FormField>
              </SectionCard>
            )}

            {/* Tab 5: Sincronización Airbnb/Booking */}
            {activeTab === "sincronizacion" && !isNew && (
              <div className="space-y-6">
                <SectionCard icon={<CalendarSync className="h-5 w-5 text-primary" />} title="Calendarios externos (Airbnb / Booking)">
                  <p className="text-sm text-muted-foreground">
                    Pega aquí la URL iCal de este alojamiento en Airbnb
                    (Anfitrión → Calendario → Disponibilidad → Exportar calendario) o Booking
                    (Propiedad → Calendario y precios → Sincronizar calendarios → Exportar).
                    Las fechas ocupadas allá bloquearán reservas aquí automáticamente.
                  </p>
                  <FormField label="URLs iCal (una por línea)">
                    <textarea
                      value={icalUrlsText}
                      onChange={(e) => setIcalUrlsText(e.target.value)}
                      rows={3}
                      placeholder={"https://www.airbnb.com/calendar/ical/xxxx.ics\nhttps://ical.booking.com/v1/export?t=yyyy"}
                      className="w-full rounded-xl border border-input bg-white px-4 py-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-shadow min-h-[80px] resize-y"
                    />
                  </FormField>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={guardarIcal}
                      disabled={icalSaving}
                      className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${icalSaving ? "animate-spin" : ""}`} />
                      {icalSaving ? "Sincronizando..." : "Guardar y sincronizar"}
                    </button>
                    {icalInfo?.lastIcalSyncAt && (
                      <span className="text-xs text-muted-foreground">
                        Sincronizado: {new Date(icalInfo.lastIcalSyncAt).toLocaleString("es-CO")}
                      </span>
                    )}
                  </div>
                  {icalLoading && <p className="text-sm text-muted-foreground">Cargando calendarios...</p>}
                  {(icalInfo?.bloqueos?.length || 0) > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">
                        Fechas ocupadas afuera ({icalInfo.eventosExternos}):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {icalInfo.bloqueos.slice(0, 20).map((b: any, i: number) => (
                          <span key={i} className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-700">
                            {b.desde} → {b.hasta} · {b.fuente}
                          </span>
                        ))}
                        {icalInfo.bloqueos.length > 20 && (
                          <span className="text-[11px] text-muted-foreground">+{icalInfo.bloqueos.length - 20} más</span>
                        )}
                      </div>
                    </div>
                  )}
                </SectionCard>

                <SectionCard icon={<Link2 className="h-5 w-5 text-primary" />} title="Exportar a Airbnb / Booking">
                  <p className="text-sm text-muted-foreground">
                    Copia esta URL y pégala como <strong>“Importar calendario”</strong> en Airbnb/Booking.
                    Nuestras reservas bloquearán esas fechas allá. No incluye datos de tus huéspedes.
                  </p>
                  {exportUrl ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={exportUrl}
                        readOnly
                        className="flex-1 rounded-xl border border-input bg-secondary/30 px-4 py-2.5 font-mono text-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={copiarExport}
                        className="flex items-center gap-1.5 rounded-xl border border-input px-4 py-2.5 text-sm hover:bg-muted"
                      >
                        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        {copied ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Guarda al menos una URL iCal arriba para generar tu enlace de exportación.
                    </p>
                  )}
                </SectionCard>
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center gap-3 rounded-xl border bg-secondary/20 p-4">
              <button type="submit" disabled={saving}
                className="rounded-xl bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Guardando...
                  </span>
                ) : isNew ? "Crear Propiedad" : "Guardar Cambios"}
              </button>
              <a href="/admin/properties" className="rounded-xl border border-input px-6 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cancelar
              </a>
            </div>
          </form>
        </div>

        {/* Preview Sidebar */}
        <div className="space-y-4">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vista previa</h3>
              <div className="overflow-hidden rounded-xl border">
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                  <TipoIcon tipo={form.tipo} className="h-12 w-12" />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-sm truncate">{form.nombre || "Nombre de la propiedad"}</h4>
                  <p className="text-xs text-muted-foreground truncate">{form.ciudad || "Ciudad"}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">${Number(form.precioNoche).toLocaleString("es-CO")}</span>
                    <span className="text-[11px] text-muted-foreground">{form.capacidadMaxima} pers.</span>
                  </div>
                  <div className="mt-1"><StarRating value={form.estrellas || 0} className="h-3 w-3" /></div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acciones rápidas</h3>
              <div className="space-y-2">
                <a href={`/property/${form.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} target="_blank"
                  className="flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Eye className="h-3.5 w-3.5" /> Ver en frontend
                </a>
                <a href="/admin/properties" className="flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ClipboardList className="h-3.5 w-3.5" /> Volver al listado
                </a>
                <input
                  ref={archivosRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => subirFotos(e.target.files)}
                />
                <button
                  onClick={() => archivosRef.current?.click()}
                  disabled={subiendoFotos}
                  className="w-full flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5" /> {subiendoFotos ? "Subiendo..." : "Subir imágenes"}
                </button>
                {avisoFotos && <p className="text-[11px] text-green-700">{avisoFotos}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Subcomponents ── */

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-base font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, ...props }: { value: string | number; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
      {...props}
    />
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-primary" : "bg-input"}`}
      >
        <div className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : ""}`} />
      </div>
      <span className="text-sm">{label}</span>
    </label>
  );
}

function PricePreview({ precioCOP }: { precioCOP: number }) {
  const [rates, setRates] = useState<Record<string, number>>({});
  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/COP")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.rates) setRates(data.rates); })
      .catch(() => {});
  }, []);
  const usd = precioCOP * (rates.USD || 0.000321);
  const eur = precioCOP * (rates.EUR || 0.000278);
  if (!usd) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
      <ArrowLeftRight className="h-4 w-4 shrink-0" />
      <span>{precioCOP.toLocaleString("es-CO")} COP ≈ ${usd.toFixed(2)} USD · €{eur.toFixed(2)} EUR</span>
      <span className="block text-blue-500/70">Tasa de cambio del día</span>
    </div>
  );
}

function SuccessBanner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-green-800">Propiedad guardada exitosamente</h2>
        <p className="text-sm text-green-600">Redirigiendo al listado...</p>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-6">
      <div className="h-8 w-64 rounded bg-muted" />
      <div className="h-12 w-full rounded-xl bg-muted" />
      <div className="h-96 w-full rounded-xl bg-muted" />
    </div>
  );
}
