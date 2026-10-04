"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { User } from "@/types";
import NotificationBell from "@/components/NotificationBell";
import { useToast } from "@/components/Toast";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/properties", label: "Propiedades" },
  { href: "/admin/alimentacion", label: "Alimentación de datos" },
  { href: "/admin/sponsors", label: "Patrocinadores" },
  { href: "/admin/ads", label: "Anuncios" },
  { href: "/admin/ai-providers", label: "Proveedores IA" },
  { href: "/admin/rag", label: "Base de conocimiento" },
  { href: "/admin/interesados", label: "Interesados" },
  { href: "/admin/repo", label: "Publicar cambios" },
  { href: "/admin/donaciones", label: "Donaciones" },
  { href: "/admin/claves", label: "Claves API" },
  { href: "/admin/reservas", label: "Reservas" },
  { href: "/admin/config", label: "Configuración" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastCountRef = useRef(0);
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        localStorage.removeItem("token");
        router.push("/auth/login");
        return;
      }

      const userData = await res.json();
      if (userData.role !== "admin" && userData.role !== "propietario") {
        router.push("/");
        return;
      }

      setUser(userData);
      setLoading(false);
    };

    checkAuth();
  }, []);

  const shownNotifsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const poll = async () => {
      try {
        const [countRes, notifsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/notificaciones/count`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/notificaciones?soloNoLeidas=true`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }),
        ]);
        if (countRes.ok && notifsRes.ok) {
          const { count } = await countRes.json();
          const notifs = await notifsRes.json();
          for (const n of notifs) {
            if (!shownNotifsRef.current.has(n.id)) {
              shownNotifsRef.current.add(n.id);
              showToast({ tipo: n.tipo || "info", titulo: n.titulo, mensaje: n.mensaje });
            }
          }
          lastCountRef.current = count;
        }
      } catch {}
    };
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Barra móvil/tablet */}
      <div className="themed-nav sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 lg:hidden">
        <span className="nav-logo text-sm font-bold">Admin Panel</span>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="nav-box rounded-lg border p-2 transition-colors"
            title="Menú"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`themed-nav fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r p-4 transition-transform duration-200 ${menuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="nav-logo text-lg font-bold">Admin Panel</h2>
          <div className="hidden lg:block">
            <NotificationBell />
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="nav-box rounded-lg border p-2 lg:hidden"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {ADMIN_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              data-active={pathname === l.href}
              onClick={() => setMenuOpen(false)}
              className="side-link no-dark block rounded px-3 py-2 text-sm transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-8 lg:ml-64">{children}</main>
    </div>
  );
}
