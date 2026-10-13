"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, HeartHandshake } from "lucide-react";
import DonacionMedia from "@/components/DonacionMedia";

export const runtime = "edge";

declare global {
  interface Window {
    paypal?: any;
  }
}

const MONTOS = [5, 10, 25, 50, 100];

export default function DonarProyectoPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [proyecto, setProyecto] = useState<any>(null);
  const [pub, setPub] = useState<any>(null);
  const [monto, setMonto] = useState(10);
  const [custom, setCustom] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [estado, setEstado] = useState<"idle" | "pagando" | "ok" | "error">("idle");
  const [detalle, setDetalle] = useState("");
  const botonesRef = useRef<HTMLDivElement>(null);
  const sdkOk = useRef(false);
  const datosRef = useRef({ monto: 10, nombre: "", email: "", mensaje: "" });

  const montoFinal = custom ? Number(custom) : monto;
  datosRef.current = { monto: montoFinal, nombre, email, mensaje };

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/donaciones/proyectos/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setProyecto)
      .catch(() => {});
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/donaciones/paypal-public`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setPub)
      .catch(() => {});
  }, [slug]);

  // Carga el SDK de PayPal y pinta los botones
  useEffect(() => {
    if (!proyecto || !pub?.clientId || sdkOk.current) return;
    sdkOk.current = true;
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${pub.clientId}&currency=${proyecto.moneda || pub.currency || "USD"}&intent=capture`;
    s.onload = () => {
      if (!window.paypal || !botonesRef.current) return;
      botonesRef.current.innerHTML = "";
      window.paypal
        .Buttons({
          style: { layout: "vertical", color: "gold", shape: "pill", label: "donate" },
          createOrder: async () => {
            setEstado("pagando");
            const d = datosRef.current;
            const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/donaciones/orden`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                proyectoId: proyecto.id,
                monto: d.monto,
                nombre: d.nombre || undefined,
                email: d.email || undefined,
                mensaje: d.mensaje || undefined,
              }),
            });
            if (!r.ok) {
              const e = await r.json().catch(() => ({}));
              throw new Error(e.message || "No se pudo crear la orden");
            }
            return (await r.json()).orderId;
          },
          onApprove: async (data: any) => {
            try {
              const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/donaciones/capturar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: data.orderID }),
              });
              if (!r.ok) throw new Error("No se pudo confirmar el pago");
              setEstado("ok");
            } catch (e: any) {
              setEstado("error");
              setDetalle(e.message);
            }
          },
          onCancel: () => setEstado("idle"),
          onError: (e: any) => {
            setEstado("error");
            setDetalle(e?.message || "PayPal no respondió");
          },
        })
        .render(botonesRef.current);
    };
    s.onerror = () => setEstado("error");
    document.body.appendChild(s);
  }, [proyecto, pub]);

  // Los callbacks de PayPal leen datosRef (siempre vigente): no re-pintar al cambiar el monto.

  if (!proyecto) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Cargando proyecto…</div>;
  }

  const pct = proyecto.meta ? Math.min(100, Math.round((100 * proyecto.recaudado) / proyecto.meta)) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <nav className="mb-4 text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground">Inicio</a>
        <span className="mx-2">/</span>
        <a href="/donaciones" className="hover:text-foreground">Donaciones</a>
        <span className="mx-2">/</span>
        <span className="text-foreground">{proyecto.titulo}</span>
      </nav>

      <h1 className="font-display text-3xl font-semibold sm:text-4xl">{proyecto.titulo}</h1>
      {(Array.isArray(proyecto.media) && proyecto.media.length > 0) || proyecto.imagenUrl ? (
        <div className="mt-5">
          <DonacionMedia
            items={
              Array.isArray(proyecto.media) && proyecto.media.length > 0
                ? proyecto.media
                : [{ tipo: "imagen", url: proyecto.imagenUrl }]
            }
          />
        </div>
      ) : null}
      <p className="mt-4 leading-relaxed text-muted-foreground whitespace-pre-line">{proyecto.descripcion}</p>

      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-primary">
            ${Number(proyecto.recaudado).toLocaleString("es-CO")} {proyecto.moneda} recaudados
          </span>
          {proyecto.meta ? (
            <span className="text-muted-foreground">meta ${Number(proyecto.meta).toLocaleString("es-CO")}</span>
          ) : (
            <span className="text-muted-foreground">{proyecto.donantes} aportes</span>
          )}
        </div>
        {pct !== null && (
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      {estado === "ok" ? (
        <div className="mt-6 rounded-2xl border border-green-300 bg-green-50 p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
          <h2 className="mt-3 font-display text-2xl font-semibold">¡Gracias por tu aporte! 🌳</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu donación de ${montoFinal} {proyecto.moneda} quedó registrada para “{proyecto.titulo}”.
          </p>
          <a href="/donaciones" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Ver otros proyectos →
          </a>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
            <HeartHandshake className="h-6 w-6 text-primary" /> Donar vía PayPal
          </h2>

          <p className="mb-2 mt-4 text-sm font-medium">Elige el monto ({proyecto.moneda})</p>
          <div className="flex flex-wrap gap-2">
            {MONTOS.map((m) => (
              <button
                key={m}
                onClick={() => { setMonto(m); setCustom(""); }}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                  !custom && monto === m ? "bg-primary text-primary-foreground" : "border border-input hover:bg-secondary"
                }`}
              >
                ${m}
              </button>
            ))}
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="Otro monto"
              inputMode="decimal"
              className="w-32 rounded-full border border-input px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre (opcional)"
              className="rounded-xl border border-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Tu email (opcional)"
              className="rounded-xl border border-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <input value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Mensaje de apoyo (opcional)"
            className="mt-2 w-full rounded-xl border border-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />

          <div className="mt-5">
            {!pub?.clientId ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                Estamos conectando PayPal. Mientras tanto puedes aportar por{" "}
                {proyecto.paypalLink ? (
                  <a href={proyecto.paypalLink} target="_blank" className="font-semibold text-primary hover:underline">
                    este enlace de PayPal →
                  </a>
                ) : (
                  "nuestros canales directos (escríbenos por el chat)."
                )}
              </div>
            ) : (
              <div ref={botonesRef} className="min-h-[120px]">
                <p className="py-8 text-center text-sm text-muted-foreground">Cargando botón seguro de PayPal…</p>
              </div>
            )}
            {estado === "pagando" && <p className="mt-2 text-center text-sm text-muted-foreground">Procesando con PayPal…</p>}
            {estado === "error" && <p className="mt-2 text-center text-sm text-red-600">No se pudo completar: {detalle}</p>}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Pago cifrado por PayPal. Puedes usar tu cuenta o tarjeta sin crear cuenta.
          </p>
        </div>
      )}

      {proyecto.recientes?.length > 0 && (
        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Aportes recientes</h2>
          <div className="mt-3 space-y-2">
            {proyecto.recientes.map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                <span className="truncate">
                  <strong>{d.nombre || "Anónimo"}</strong>
                  {d.mensaje && <span className="text-muted-foreground"> · {d.mensaje}</span>}
                </span>
                <span className="shrink-0 font-semibold text-primary">${Number(d.monto).toLocaleString("es-CO")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
