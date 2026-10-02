"use client";

import { useEffect, useState } from "react";
import { Reserva } from "@/types";
import { Banknote, CreditCard } from "lucide-react";

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMADA: "bg-green-100 text-green-800 border-green-200",
  CANCELADA: "bg-gray-100 text-gray-500 border-gray-200",
  NO_SHOW: "bg-red-100 text-red-800 border-red-200",
};

export default function AdminReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReservas = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reservas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al cargar reservas");
      setReservas(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReservas(); }, []);

  const handleNoShow = async (id: string) => {
    if (!confirm("¿Marcar como No Show? El usuario será bloqueado por 1 mes.")) return;
    const token = localStorage.getItem("token");
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reservas/${id}/no-show`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
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
        <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Proveedor</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 font-medium">Llegada</th>
                <th className="px-4 py-3 font-medium">Salida</th>
                <th className="px-4 py-3 font-medium">Huéspedes</th>
                <th className="px-4 py-3 font-medium">Pago</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reservas.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/20">
                  <td className="px-4 py-3 font-mono text-xs">{r.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 font-medium">{r.propiedad.nombre}</td>
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
                    <span className="flex items-center gap-1.5">
                      {r.metodoPago === "TARJETA" ? <><CreditCard className="h-4 w-4" /> Tarjeta</> : <><Banknote className="h-4 w-4" /> Efectivo</>}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">${r.total?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${ESTADO_BADGE[r.estado]}`}>
                      {r.estado.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.estado === "PENDIENTE" && (
                      <button onClick={() => handleNoShow(r.id)}
                        className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors">
                        No Show
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
