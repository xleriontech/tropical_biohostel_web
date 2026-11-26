"use client";

import { useEffect, useState } from "react";
import { Reserva } from "@/types";
import { Banknote, CreditCard, Trash2, Wallet } from "lucide-react";

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMADA: "bg-green-100 text-green-800 border-green-200",
  CANCELADA: "bg-gray-100 text-gray-500 border-gray-200",
  NO_SHOW: "bg-red-100 text-red-800 border-red-200",
  COMPLETADA: "bg-blue-100 text-blue-800 border-blue-200",
};

const ESTADOS = ["PENDIENTE", "CONFIRMADA", "COMPLETADA", "CANCELADA", "NO_SHOW"] as const;

function pagoLabel(metodo?: string) {
  const m = (metodo || "").toUpperCase();
  if (m === "TARJETA") return { icon: <CreditCard className="h-4 w-4" />, text: "Tarjeta" };
  if (m === "EFECTIVO") return { icon: <Banknote className="h-4 w-4" />, text: "Efectivo" };
  if (m === "PAYPAL") return { icon: <Wallet className="h-4 w-4" />, text: "PayPal" };
  if (m === "WOMPI") return { icon: <Wallet className="h-4 w-4" />, text: "Wompi" };
  if (m === "STRIPE") return { icon: <CreditCard className="h-4 w-4" />, text: "Stripe" };
  if (m === "MERCADOPAGO") return { icon: <Wallet className="h-4 w-4" />, text: "Mercado Pago" };
  return { icon: <Wallet className="h-4 w-4" />, text: metodo || "—" };
}

export default function AdminReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
  const token = () => localStorage.getItem("token");

  const fetchReservas = async () => {
    try {
      const res = await fetch(`${API}/reservas`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error("Error al cargar reservas");
      setReservas(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReservas(); }, []); // eslint-disable-line

  const cambiarEstado = async (id: string, estado: string) => {
    await fetch(`${API}/reservas/${id}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ estado }),
    });
    fetchReservas();
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta reserva? Esta acción no se puede deshacer.")) return;
    await fetch(`${API}/reservas/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    fetchReservas();
  };

  if (loading) return <p className="text-muted-foreground">Cargando reservas...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Reservas</h1>
      {reservas.length === 0 ? (
        <p className="text-muted-foreground">No hay reservas registradas.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Propiedad</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 font-medium">Llegada</th>
                <th className="px-4 py-3 font-medium">Salida</th>
                <th className="px-4 py-3 font-medium">Huésp.</th>
                <th className="px-4 py-3 font-medium">Pago</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reservas.map((r) => {
                const pago = pagoLabel((r as any).metodoPago);
                return (
                  <tr key={r.id} className="hover:bg-secondary/20">
                    <td className="px-4 py-3 font-mono text-xs">{r.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-medium">{r.propiedad?.nombre}</td>
                    <td className="px-4 py-3">{r.nombre}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5 text-xs">
                        <div>{r.email}</div>
                        <div>{r.telefono}</div>
                        <div className="text-[10px] text-muted-foreground">ID: {r.identificacion}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{new Date(r.fechaLlegada).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{new Date(r.fechaSalida).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{r.huespedes}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">{pago.icon} {pago.text}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">${r.total?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${ESTADO_BADGE[r.estado] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {r.estado.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={r.estado}
                          onChange={(e) => cambiarEstado(r.id, e.target.value)}
                          className="rounded border border-input bg-white px-2 py-1 text-xs"
                        >
                          {ESTADOS.map((e) => <option key={e} value={e}>{e.replace("_", " ")}</option>)}
                        </select>
                        <button onClick={() => eliminar(r.id)} className="rounded bg-red-50 p-1.5 text-red-700 hover:bg-red-100" title="Eliminar reserva">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
