"use client";

import { useState } from "react";
import { Property, Review } from "@/types";
import Gallery from "@/components/Gallery";
import ServiceGallery from "@/components/ServiceGallery";
import CurrencyConverter from "@/components/CurrencyConverter";
import AdCarousel from "@/components/AdCarousel";
import BookingModal from "@/components/BookingModal";
import { useToast } from "@/components/Toast";
import { ActividadIcon, StarRating, TipoIcon, categoriaSlug, tipoLabel, unidadPrecio } from "@/components/icons";
import {
  ArrowUpRight,
  BadgeCheck,
  BedDouble,
  Check,
  Clock,
  Facebook,
  Instagram,
  Mail,
  MessageCircle,
  Music2,
  PawPrint,
  Phone,
  Play,
  ScrollText,
  ShieldCheck,
  Star,
  Users,
  X,
} from "lucide-react";

function ReviewForm({ slug, onCreated }: { slug: string; onCreated: () => void }) {
  const [form, setForm] = useState({ autorNombre: "", autorEmail: "", calificacion: 5, comentario: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/properties/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm({ autorNombre: "", autorEmail: "", calificacion: 5, comentario: "" });
      onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold">Deja tu reseña</h3>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={form.autorNombre} onChange={(e) => setForm({ ...form, autorNombre: e.target.value })}
            placeholder="Tu nombre" required
            className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <input value={form.autorEmail} onChange={(e) => setForm({ ...form, autorEmail: e.target.value })}
            placeholder="Tu email (opcional)" type="email"
            className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Calificación</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setForm({ ...form, calificacion: n })}
                className="transition-colors">
                <Star className={`h-7 w-7 ${n <= form.calificacion ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
              </button>
            ))}
          </div>
        </div>
        <textarea value={form.comentario} onChange={(e) => setForm({ ...form, comentario: e.target.value })}
          placeholder="Comparte tu experiencia..." rows={3}
          className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-y" />
        <button type="submit" disabled={submitting}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
          {submitting ? "Enviando..." : "Enviar Reseña"}
        </button>
      </div>
    </form>
  );
}

export default function PropertyDetailClient({ property }: { property: Property }) {
  const precioCOP = property.precioNoche;
  const [showBooking, setShowBooking] = useState(false);
  const { showToast } = useToast();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground">Inicio</a>
        <span className="mx-2">/</span>
        <a href={`/categoria/${categoriaSlug(property.tipo)}`}
          className="hover:text-foreground capitalize">
          {tipoLabel(property.tipo)}
        </a>
        <span className="mx-2">/</span>
        <span className="text-foreground">{property.nombre}</span>
      </nav>

      {/* Gallery */}
      <Gallery images={property.images || []} />

      {/* Service Gallery (rotating carousel of service photos) */}
      {property.servicioImagenes && property.servicioImagenes.length > 0 && (
        <div className="mt-2">
          <ServiceGallery images={property.servicioImagenes} />
        </div>
      )}

      {/* Header Info */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TipoIcon tipo={property.tipo} className="h-5 w-5" />
            </span>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{property.nombre}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{property.ciudad}{property.departamento ? `, ${property.departamento}` : ""}</span>
            {(property.estrellas || 0) > 0 && <StarRating value={property.estrellas || 0} />}
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs capitalize">{property.tipo.replace("_", " ")}</span>
            {property.verificado && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-700" title={property.ultimaVerificacion ? `Verificado el ${new Date(property.ultimaVerificacion).toLocaleDateString("es-CO")}` : "Datos verificados"}>
                <BadgeCheck className="h-4 w-4" /> Verificado
              </span>
            )}
            {property.ratingExterno ? (
              <span className="text-xs">Google: {property.ratingExterno}★ ({property.resenasExternas || 0})</span>
            ) : null}
          </div>
          {property.horarioTexto && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {property.horarioTexto}
            </p>
          )}
        </div>
        <div className="text-right">
          <CurrencyConverter precioCOP={precioCOP} sufijo={unidadPrecio(property.tipo)} />
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Descripción</h2>
            <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
              {property.descripcion || "Sin descripción disponible."}
            </p>
          </section>

          {/* Video */}
          {property.videos && property.videos.length > 0 && (
            <section className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold">Video</h2>
              <div className="aspect-video overflow-hidden rounded-xl">
                <iframe src={property.videos[0]} className="h-full w-full" allowFullScreen />
              </div>
            </section>
          )}

          {/* Amenities */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Servicios y Características</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Amenity icon={<Users className="h-4 w-4 text-primary" />} label={`Hasta ${property.capacidadMaxima} huéspedes`} />
              {property.numeroHabitaciones && <Amenity icon={<BedDouble className="h-4 w-4 text-primary" />} label={`${property.numeroHabitaciones} habitaciones`} />}
              <Amenity icon={<Clock className="h-4 w-4 text-primary" />} label={property.horarioCheckIn ? `Check-in: ${property.horarioCheckIn}` : "Check-in: 15:00"} />
              <Amenity icon={<Clock className="h-4 w-4 text-primary" />} label={property.horarioCheckOut ? `Check-out: ${property.horarioCheckOut}` : "Check-out: 12:00"} />
              {property.admiteMascotas && <Amenity icon={<PawPrint className="h-4 w-4 text-primary" />} label="Pet-friendly" />}
              {property.seguroDisponible && <Amenity icon={<ShieldCheck className="h-4 w-4 text-primary" />} label="Seguro disponible" />}
            </div>
          </section>

          {/* Activities */}
          {property.actividades && property.actividades.length > 0 && (
            <section className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Actividades</h2>
              <div className="flex flex-wrap gap-2">
                {property.actividades.map((act) => (
                  <span key={act} className="flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-sm text-purple-800 border border-purple-100">
                    <ActividadIcon actividad={act} className="h-4 w-4" /> {act}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Location */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Ubicación</h2>
            {property.direccion ? (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{property.direccion}</p>
                <p>{property.ciudad}{property.departamento ? `, ${property.departamento}` : ""}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{property.ubicacion || "No especificada"}</p>
            )}
            {(() => {
              const c: any = property.coordenadas;
              const q = c && typeof c.lat === "number" && typeof c.lng === "number"
                ? `${c.lat},${c.lng}`
                : typeof c === "string" && c
                  ? c
                  : [property.direccion, property.ciudad, property.departamento].filter(Boolean).join(", ") || property.ubicacion;
              if (!q) return null;
              return (
                <div className="mt-3 space-y-2">
                  <div className="aspect-video overflow-hidden rounded-xl">
                    <iframe
                      title={`Mapa de ${property.nombre}`}
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`}
                      className="h-full w-full border-0"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    Ver en Google Maps <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              );
            })()}
          </section>

          {/* Certificates */}
          {property.certificados && property.certificados.length > 0 && (
            <section className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Certificaciones</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {property.certificados.map((cert) => (
                    <div key={cert.id} className="flex items-start gap-3 rounded-lg border border-green-100 bg-green-50 p-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
                        <ScrollText className="h-5 w-5" />
                      </span>
                    <div>
                      <p className="font-medium text-sm">{cert.tipo}</p>
                      {cert.fechaEmision && (
                        <p className="text-xs text-muted-foreground">Emisión: {new Date(cert.fechaEmision).toLocaleDateString()}</p>
                      )}
                      {cert.fechaVencimiento && (
                        <p className="text-xs text-muted-foreground">Vence: {new Date(cert.fechaVencimiento).toLocaleDateString()}</p>
                      )}
                      {cert.archivoUrl && (
                        <a href={cert.archivoUrl} target="_blank" className="mt-1 inline-block text-xs text-primary hover:underline">Ver documento</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Rules */}
          {property.reglamento && property.reglamento !== "No aplica" && (
            <section className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold">Reglamento</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{property.reglamento}</p>
            </section>
          )}

          {/* Cancellation Policy */}
          {property.politicasCancelacion && (
            <section className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold">Políticas de Cancelación</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{property.politicasCancelacion}</p>
            </section>
          )}

          {/* Reviews */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Reseñas {property.reviews && property.reviews.length > 0 && (
                  <span className="text-muted-foreground font-normal">
                    ({property.reviews.length})
                  </span>
                )}
              </h2>
              {property.reviews && property.reviews.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <StarRating value={5} />
                  <span className="font-medium">
                    {(property.reviews.reduce((s, r) => s + r.calificacion, 0) / property.reviews.length).toFixed(1)}
                  </span>
                </div>
              )}
            </div>

            {property.reviews && property.reviews.length > 0 && (
              <div className="space-y-3">
                {property.reviews.map((review) => (
                  <div key={review.id} className="rounded-xl border bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{review.autorNombre}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-0.5">
                        <StarRating value={review.calificacion} className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    {review.comentario && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{review.comentario}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <ReviewForm slug={property.slug} onCreated={() => window.location.reload()} />
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="sticky top-24 space-y-4">
            {/* Booking Card */}
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="mb-4 pb-4 border-b">
                <CurrencyConverter precioCOP={precioCOP} sufijo={unidadPrecio(property.tipo)} />
              </div>

              <div className="mb-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Check-in</span>
                  <span className="font-medium">{property.horarioCheckIn || "15:00"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Check-out</span>
                  <span className="font-medium">{property.horarioCheckOut || "12:00"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Capacidad</span>
                  <span className="font-medium">{property.capacidadMaxima} personas</span>
                </div>
              </div>

              <button onClick={() => setShowBooking(true)}
                className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                Reservar Ahora
              </button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                No se requiere pago ahora
              </p>
            </div>

            {showBooking && (
              <BookingModal
                propiedadId={property.id}
                propiedadSlug={property.slug}
                capacidadMaxima={property.capacidadMaxima}
                onClose={() => setShowBooking(false)}
                onSuccess={() => {
                  setShowBooking(false);
                  showToast({ tipo: "success", titulo: "Reserva creada con éxito", mensaje: "Recibirás confirmación por parte del proveedor." });
                }}
              />
            )}

            {/* Contact Card */}
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">Contacto</h3>
              <div className="space-y-2.5">
                {property.telefono && (
                  <a href={`tel:${property.telefono}`} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Phone className="h-4 w-4" /></span>
                    {property.telefono}
                  </a>
                )}
                {property.email && (
                  <a href={`mailto:${property.email}`} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Mail className="h-4 w-4" /></span>
                    {property.email}
                  </a>
                )}
                {property.whatsapp && (
                  <a
                    href={`https://wa.me/${property.whatsapp}`}
                    target="_blank"
                    className="flex items-center gap-2.5 text-sm text-green-600 hover:text-green-700"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600"><MessageCircle className="h-4 w-4" /></span>
                    WhatsApp
                  </a>
                )}
              </div>
            </div>

            {/* Social Media */}
            {property.redesSociales && Object.keys(property.redesSociales).length > 0 && (
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold">Redes Sociales</h3>
                <div className="flex flex-wrap gap-3">
                  {property.redesSociales.facebook && (
                    <a href={property.redesSociales.facebook} target="_blank" className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors" title="Facebook"><Facebook className="h-5 w-5" /></a>
                  )}
                  {property.redesSociales.instagram && (
                    <a href={property.redesSociales.instagram} target="_blank" className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-600 text-white hover:bg-pink-700 transition-colors" title="Instagram"><Instagram className="h-5 w-5" /></a>
                  )}
                  {property.redesSociales.twitter && (
                    <a href={property.redesSociales.twitter} target="_blank" className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-white hover:bg-gray-900 transition-colors" title="Twitter / X"><span className="text-sm font-black">X</span></a>
                  )}
                  {property.redesSociales.tiktok && (
                    <a href={property.redesSociales.tiktok} target="_blank" className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white hover:bg-gray-900 transition-colors" title="TikTok"><Music2 className="h-5 w-5" /></a>
                  )}
                  {property.redesSociales.youtube && (
                    <a href={property.redesSociales.youtube} target="_blank" className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors" title="YouTube"><Play className="h-5 w-5 fill-current" /></a>
                  )}
                </div>
              </div>
            )}

            {/* Rating Summary */}
            {property.reviews && property.reviews.length > 0 && (
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold">Calificación</h3>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-yellow-500">
                    {(property.reviews.reduce((s, r) => s + r.calificacion, 0) / property.reviews.length).toFixed(1)}
                  </span>
                  <div>
                    <div className="flex gap-0.5">
                      <StarRating value={5} />
                    </div>
                    <p className="text-xs text-muted-foreground">{property.reviews.length} reseñas</p>
                  </div>
                </div>
              </div>
            )}

            {/* Property Detail Ad */}
            <AdCarousel placement="PROPERTY_DETAIL" />
            <AdCarousel placement="SEARCH_RESULTS_SIDEBAR" />

            {/* Quick Info */}
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">Información Rápida</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="font-medium capitalize">{property.tipo.replace("_", " ")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Mascotas</span>
                  <span className={`flex items-center gap-1.5 font-medium ${property.admiteMascotas ? "text-green-600" : "text-muted-foreground"}`}>
                    {property.admiteMascotas ? <><Check className="h-4 w-4" /> Permitidas</> : <><X className="h-4 w-4" /> No</>}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Seguro</span>
                  <span className={`flex items-center gap-1.5 font-medium ${property.seguroDisponible ? "text-green-600" : "text-muted-foreground"}`}>
                    {property.seguroDisponible ? <><Check className="h-4 w-4" /> Incluido</> : <><X className="h-4 w-4" /> No</>}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Actividades</span>
                  <span className="font-medium">{property.actividades?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Amenity({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-input bg-secondary/20 p-3 text-sm">
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}
