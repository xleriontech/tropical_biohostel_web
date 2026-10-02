"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "./Toast";
import { AlertTriangle, CalendarX2, CheckCircle2 } from "lucide-react";

/** Traduce mensajes técnicos del validador a español claro. */
function traducirError(msg: string): string {
  if (!msg) return "No se pudo crear la reserva.";
  return msg
    .replace(/identificacion should not be empty/gi, "La identificación es obligatoria")
    .replace(/nombre should not be empty/gi, "El nombre es obligatorio")
    .replace(/telefono should not be empty/gi, "El teléfono es obligatorio")
    .replace(/email must be an email/gi, "El correo electrónico no es válido")
    .replace(/email should not be empty/gi, "El correo es obligatorio")
    .replace(/fechaLlegada must be a valid ISO 8601 date string/gi, "La fecha de llegada no es válida")
    .replace(/fechaSalida must be a valid ISO 8601 date string/gi, "La fecha de salida no es válida");
}

const ESTADO_INICIAL = {  nombre: "",
  email: "",
  telefono: "",
  identificacion: "",
  fechaLlegada: "",
  fechaSalida: "",
  huespedes: 1,
  metodoPago: "EFECTIVO" as "TARJETA" | "EFECTIVO",
  notas: "",
  aceptaTerminos: false,
};

export default function BookingModal({
  propiedadId,
  propiedadSlug,
  capacidadMaxima,
  onClose,
  onSuccess,
}: {
  propiedadId: string;
  propiedadSlug?: string;
  capacidadMaxima: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [disp, setDisp] = useState<{ disponible: boolean; conflictoCon: { desde: string; hasta: string; fuente: string } | null } | null>(null);
  const [checking, setChecking] = useState(false);
  const { showToast } = useToast();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Verifica disponibilidad (nuestras reservas + Airbnb/Booking) al elegir fechas
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDisp(null);
    if (!propiedadSlug || !form.fechaLlegada || !form.fechaSalida) return;
    if (form.fechaSalida <= form.fechaLlegada) return;
    timerRef.current = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/properties/${propiedadSlug}/availability?desde=${form.fechaLlegada}&hasta=${form.fechaSalida}`
        );
        if (res.ok) setDisp(await res.json());
      } catch {}
      finally { setChecking(false); }
    }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [propiedadSlug, form.fechaLlegada, form.fechaSalida]);

  const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = userStr ? JSON.parse(userStr) : null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const minSalida = form.fechaLlegada && form.fechaLlegada > todayStr ? form.fechaLlegada : todayStr;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.aceptaTerminos) {
      setError("Debes aceptar los términos y condiciones.");
      return;
    }

    if (!form.fechaLlegada || !form.fechaSalida) {
      setError("Elige las fechas de llegada y salida.");
      return;
    }
    if (form.fechaLlegada < todayStr) {
      setError("La fecha de llegada no puede ser en el pasado.");
      return;
    }
    if (form.fechaSalida <= form.fechaLlegada) {
      setError("La fecha de salida debe ser posterior a la de llegada.");
      return;
    }

    if (disp && !disp.disponible && disp.conflictoCon) {
      const c = disp.conflictoCon;
      setError(
        `Esas fechas ya están ocupadas (${c.desde} al ${c.hasta} en ${c.fuente === "TROPICAL BIOHOSTEL" ? "nuestra plataforma" : c.fuente}). Elige otras fechas.`
      );
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Debes iniciar sesión para reservar.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reservas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          propiedadId,
          nombre: form.nombre,
          email: form.email,
          telefono: form.telefono,
          identificacion: form.identificacion,
          fechaLlegada: form.fechaLlegada,
          fechaSalida: form.fechaSalida,
          huespedes: form.huespedes,
          metodoPago: form.metodoPago,
          notas: form.notas,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "Error al crear la reserva" }));
        throw new Error(data.message || "Error al crear la reserva");
      }

      showToast({ tipo: "success", titulo: "Reserva creada con éxito", mensaje: "Recibirás confirmación por parte del proveedor." });
      onSuccess();
    } catch (e: any) {
      setError(traducirError(e.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Reservar</h2>
          <button onClick={onClose} className="text-2xl leading-none text-muted-foreground hover:text-foreground">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre completo</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email"
                className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Teléfono</label>
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Identificación</label>
              <input value={form.identificacion} onChange={(e) => setForm({ ...form, identificacion: e.target.value })}
                className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Fecha de llegada</label>
              <input value={form.fechaLlegada} min={todayStr} onChange={(e) => setForm({ ...form, fechaLlegada: e.target.value })} type="date"
                className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Fecha de salida</label>
              <input value={form.fechaSalida} min={minSalida} onChange={(e) => setForm({ ...form, fechaSalida: e.target.value })} type="date"
                className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
          </div>

          {checking && (
            <p className="text-xs text-muted-foreground">Verificando disponibilidad...</p>
          )}
          {disp && !checking && (
            disp.disponible ? (
              <div className="flex items-start gap-2 rounded-lg border border-green-300 bg-green-50 p-3 text-xs text-green-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Fechas disponibles. Se verificó contra nuestras reservas y calendarios externos (Airbnb/Booking).</span>
              </div>
            ) : disp.conflictoCon && (
              <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">
                <CalendarX2 className="h-4 w-4 shrink-0" />
                <span>
                  Ocupado del {disp.conflictoCon.desde} al {disp.conflictoCon.hasta} en{" "}
                  {disp.conflictoCon.fuente === "TROPICAL BIOHOSTEL" ? "nuestra plataforma" : disp.conflictoCon.fuente}.
                  Elige otras fechas.
                </span>
              </div>
            )
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Huéspedes</label>
              <input value={form.huespedes} onChange={(e) => setForm({ ...form, huespedes: Math.max(1, Math.min(capacidadMaxima, parseInt(e.target.value) || 1)) })} type="number" min={1} max={capacidadMaxima}
                className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Método de pago</label>
              <select value={form.metodoPago} onChange={(e) => setForm({ ...form, metodoPago: e.target.value as any })}
                className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="EFECTIVO">Pagar en efectivo al llegar</option>
                <option value="TARJETA">Pagar con tarjeta</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Notas (opcional)</label>
            <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2}
              className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[60px] resize-y" />
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Si no cumples con la llegada y no reportas con máximo 48 horas de anticipación, serás bloqueado por 1 mes.</span>
          </div>

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={form.aceptaTerminos} onChange={(e) => setForm({ ...form, aceptaTerminos: e.target.checked })}
              className="mt-0.5" />
            Acepto los términos y condiciones de reserva
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button type="submit" disabled={submitting}
            className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {submitting ? "Reservando..." : "Confirmar Reserva"}
          </button>
        </form>
      </div>
    </div>
  );
}
