"use client";

import { usePathname } from "next/navigation";
import { Compass, Heart, Search, User } from "lucide-react";
import { useWishlist } from "@/lib/wishlist";

export default function MobileNav() {
  const pathname = usePathname();
  const guardados = useWishlist();

  // Fuera del sitio público (admin, auth) no se muestra
  if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return null;

  const items = [
    { href: "/", label: "Explorar", Icon: Compass, active: pathname === "/" },
    { href: "/busqueda-inteligente", label: "Buscar", Icon: Search, active: pathname.startsWith("/busqueda-inteligente") },
    { href: "/guardados", label: "Guardados", Icon: Heart, active: pathname.startsWith("/guardados"), badge: guardados.length },
    { href: "/auth/login", label: "Perfil", Icon: User, active: pathname.startsWith("/auth") },
  ];

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-input bg-white/95 backdrop-blur md:hidden" aria-label="Móvil">
        <div className="grid grid-cols-4 px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-1">
          {items.map((item) => (
            <a
              key={item.href + item.label}
              href={item.href}
              className={`relative flex flex-col items-center gap-1 py-2 text-[10px] ${item.active ? "font-semibold text-primary" : "text-muted-foreground"}`}
            >
              <item.Icon className="h-5 w-5" />
              {item.label}
              {!!item.badge && (
                <span className="absolute right-1/2 top-0 grid h-4 min-w-4 translate-x-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {item.badge}
                </span>
              )}
            </a>
          ))}
        </div>
      </nav>
      <div className="h-[72px] md:hidden" />
    </>
  );
}
