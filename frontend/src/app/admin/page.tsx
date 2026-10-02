"use client";

import { useEffect, useState, type ReactNode } from "react";
import { TipoIcon } from "@/components/icons";
import {
  Banknote,
  Building2,
  HeartHandshake,
  Megaphone,
  Settings,
  Users,
} from "lucide-react";

interface DashboardStats {
  totalPropiedades: number;
  propiedadesPublicadas: number;
  propiedadesBorrador: number;
  totalSponsors: number;
  anunciosActivos: number;
  totalUsuarios: number;
  ingresosPotenciales: number;
  propiedadesPorTipo: { tipo: string; total: number }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setStats(await res.json());
        else setError("Error al cargar estadísticas");
      } catch {
        setError("Error de conexión");
      }
    };
    fetchDashboard();
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!stats) return <DashboardSkeleton />;

  const total = stats.totalPropiedades || 1;

  const barData = [
    { label: "Publicadas", value: stats.propiedadesPublicadas, max: total, color: "bg-green-500" },
    { label: "Borradores", value: stats.propiedadesBorrador, max: total, color: "bg-yellow-500" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen general de la plataforma</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Building2 className="h-7 w-7 text-primary" />}
          label="Total Propiedades"
          value={stats.totalPropiedades}
          sub={`${stats.propiedadesPublicadas} publicadas, ${stats.propiedadesBorrador} borradores`}
          trend="+3"
        />
        <StatCard
          icon={<Megaphone className="h-7 w-7 text-primary" />}
          label="Anuncios Activos"
          value={stats.anunciosActivos}
          sub={`${stats.totalSponsors} patrocinadores`}
        />
        <StatCard
          icon={<Users className="h-7 w-7 text-primary" />}
          label="Usuarios"
          value={stats.totalUsuarios}
          sub="registrados en la plataforma"
        />
        <StatCard
          icon={<Banknote className="h-7 w-7 text-primary" />}
          label="Ingreso Potencial/día"
          value={`$${Number(stats.ingresosPotenciales).toLocaleString("es-CO")} COP`}
          sub="suma de precios por noche"
          large
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Estado de Propiedades</h2>
          <div className="space-y-3">
            {barData.map((bar) => (
              <div key={bar.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{bar.label}</span>
                  <span className="font-medium">{bar.value}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${bar.color}`}
                    style={{ width: `${(bar.value / bar.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-2">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Archivadas</span>
                <span className="font-medium">{stats.totalPropiedades - stats.propiedadesPublicadas - stats.propiedadesBorrador}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Propiedades por Tipo</h2>
          <div className="space-y-4">
            {stats.propiedadesPorTipo.map((item) => {
              const pct = ((item.total / total) * 100).toFixed(1);
              return (
                <div key={item.tipo} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <TipoIcon tipo={item.tipo} className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">{item.tipo.replace("_", " ")}</span>
                      <span className="text-muted-foreground">{item.total} ({pct}%)</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Distribución General</h2>
          <div className="flex items-center justify-center py-6">
            <div className="relative flex h-48 w-48 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#22c55e" strokeWidth="3"
                  strokeDasharray={`${(stats.propiedadesPublicadas / total) * 100} ${100 - (stats.propiedadesPublicadas / total) * 100}`}
                  strokeLinecap="round" />
                <circle cx="18" cy="18" r="12.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                <circle cx="18" cy="18" r="12.5" fill="none" stroke="#eab308" strokeWidth="3"
                  strokeDasharray={`${(stats.propiedadesBorrador / total) * 100} ${100 - (stats.propiedadesBorrador / total) * 100}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute text-center">
                <p className="text-2xl font-bold">{stats.totalPropiedades}</p>
                <p className="text-[11px] text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Publicadas ({stats.propiedadesPublicadas})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">Borrador ({stats.propiedadesBorrador})</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Acciones Rápidas</h2>
          <div className="space-y-3">
            <a href="/admin/properties/new"
              className="flex items-center gap-3 rounded-lg border border-input p-3 transition-colors hover:bg-secondary/50">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-medium">Nueva Propiedad</p>
                <p className="text-xs text-muted-foreground">Agregar un alojamiento al catálogo</p>
              </div>
            </a>
            <a href="/admin/sponsors"
              className="flex items-center gap-3 rounded-lg border border-input p-3 transition-colors hover:bg-secondary/50">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><HeartHandshake className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-medium">Gestionar Patrocinadores</p>
                <p className="text-xs text-muted-foreground">Administrar sponsors y anuncios</p>
              </div>
            </a>
            <a href="/admin/config"
              className="flex items-center gap-3 rounded-lg border border-input p-3 transition-colors hover:bg-secondary/50">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Settings className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-medium">Configuración</p>
                <p className="text-xs text-muted-foreground">Ajustar imágenes del carrusel y más</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, trend, large }: {
  icon: ReactNode; label: string; value: string | number; sub: string; trend?: string; large?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <span>{icon}</span>
        {trend && (
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
            {trend}
          </span>
        )}
      </div>
      <p className={`font-bold ${large ? "text-2xl" : "text-3xl"}`}>{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
