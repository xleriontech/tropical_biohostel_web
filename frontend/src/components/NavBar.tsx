"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSearch } from "@/lib/SearchContext";
import { Brain, BookOpen, ChevronDown, Coffee, Compass, Flower2, HeartHandshake, Leaf, Menu, MoonStar, UtensilsCrossed, X } from "lucide-react";
import ThemePicker from "./ThemePicker";
import SiteBrand from "./SiteBrand";

const EXPLORAR_LINKS = [
  { href: "/cosmic-bungalo", label: "Cosmic Bungalow", Icon: MoonStar },
  { href: "/territorio", label: "Territorio", Icon: Leaf },
  { href: "/gastronomia", label: "Gastronomía", Icon: UtensilsCrossed },
  { href: "/comidas", label: "Menús y Comidas", Icon: UtensilsCrossed },
  { href: "/experiencias", label: "Experiencias", Icon: Compass },
  { href: "/rutas", label: "Rutas del café", Icon: Coffee },
  { href: "/fical-y-el-cafe", label: "Fical y el café", Icon: BookOpen },
  { href: "/bienestar", label: "Bienestar", Icon: Flower2 },
  { href: "/donaciones", label: "Donar 🌳", Icon: HeartHandshake },
  { href: "/en", label: "English", Icon: Compass },
];

export default function NavBar() {
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { setOpenSearch } = useSearch();
  const [menuOpen, setMenuOpen] = useState(false);

  const checkUser = () => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setUser(JSON.parse(stored)); return; } catch {}
    }
    setUser(null);
  };

  useEffect(() => {
    setMounted(true);
    checkUser();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "user") checkUser();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth-change", checkUser);

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpenSearch(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-change", checkUser);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Re-check cuando cambia la ruta y cerrar el menú móvil
  useEffect(() => {
    if (mounted) checkUser();
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/");
    router.refresh();
  };

  if (!mounted) return null;

  return (
    <nav className="themed-nav sticky top-0 z-50 border-b bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <a href="/" className="no-dark nav-logo flex shrink-0 items-center gap-2 text-xl font-black tracking-tight text-primary">
            <SiteBrand />
          </a>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 mr-4 border-r pr-4 nav-divide">
              <a href="/busqueda-inteligente" title="Zemisqua · Buscador ancestral" className="flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--menu))] hover:opacity-85">
                <Brain className="h-4 w-4" />
                Zemisqua
              </a>
              <a href="/cosmic-bungalo" className="nav-link text-sm font-semibold">
                Cosmic Bungalow
              </a>
              <a href="/categoria/hostales" className="nav-link text-sm">
                Hospedaje
              </a>
              <a href="/categoria/actividades" className="nav-link text-sm">
                Experiencias
              </a>
              <div className="group relative">
                <button className="nav-link flex items-center gap-1 text-sm">
                  Explorar <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
                </button>
                <div className="invisible absolute left-0 top-full z-50 w-52 translate-y-1 pt-2 opacity-0 transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="themed-drop overflow-hidden rounded-xl border bg-white shadow-lg">
                    {EXPLORAR_LINKS.map((l) => (
                      <a
                        key={l.href}
                        href={l.href}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <l.Icon className="h-4 w-4" />
                        {l.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <ThemePicker />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="nav-box rounded-lg border p-2 transition-colors md:hidden"
              title="Menú"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <button onClick={() => setOpenSearch(true)} className="nav-box flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1.5 text-sm transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <span className="hidden sm:inline">Buscar</span>
              <kbd className="hidden md:inline-flex ml-1 items-center gap-0.5 rounded border border-input bg-white px-1.5 text-[10px] text-muted-foreground">Ctrl+K</kbd>
            </button>
            {user ? (
              <div className="hidden items-center gap-4 sm:flex">
                {(user.role === "admin" || user.role === "propietario") && (
                  <a href="/admin" className="text-sm font-medium text-[hsl(var(--menu))] hover:opacity-85">
                    Admin
                  </a>
                )}
                <span className="nav-link max-w-32 truncate text-sm">{user.nombre || user.email}</span>
                <button
                  onClick={handleLogout}
                  className="nav-link text-sm"
                >
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <a href="/auth/login" className="nav-link hidden text-sm sm:inline">
                Iniciar Sesión
              </a>
            )}
          </div>
        </div>

        {/* Menú móvil */}
        {menuOpen && (
          <div className="border-t px-4 py-3 md:hidden">
            <div className="grid gap-1">
              <a href="/busqueda-inteligente" className="m-active flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium">
                <Brain className="h-4 w-4" /> Zemisqua · Buscador ancestral
              </a>
              {[
                { href: "/cosmic-bungalo", label: "Cosmic Bungalow" },
                { href: "/categoria/hostales", label: "Hospedaje" },
                ...EXPLORAR_LINKS.filter(
                  (l) => l.href !== "/cosmic-bungalo" && l.href !== "/categoria/actividades"
                ).map((l) => ({ href: l.href, label: l.label })),
                { href: "/categoria/actividades", label: "Actividades y tours" },
              ].map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="m-link rounded-lg px-3 py-2.5 text-sm"
                >
                  {l.label}
                </a>
              ))}
              {user ? (
                <>
                  {(user.role === "admin" || user.role === "propietario") && (
                    <a href="/admin" className="rounded-lg px-3 py-2.5 text-sm font-medium text-[hsl(var(--menu))]">
                      Admin
                    </a>
                  )}
                  <button
                    onClick={handleLogout}
                    className="m-link rounded-lg px-3 py-2.5 text-left text-sm"
                  >
                    Cerrar Sesión ({user.nombre || user.email})
                  </button>
                </>
              ) : (
                <a href="/auth/login" className="m-link rounded-lg px-3 py-2.5 text-sm">
                  Iniciar Sesión
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
