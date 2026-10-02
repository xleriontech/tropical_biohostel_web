import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatRange, guestLabel } from "@/lib";
import { useNido } from "@/store";
import { cn } from "@/utils/cn";
import { Avatar, Icon, Logo, paths } from "./ui";

const links = [
  { id: "explore" as const, label: "Explorar" },
  { id: "feed" as const, label: "Feed" },
  { id: "trips" as const, label: "Viajes" },
];

export function Header() {
  const nido = useNido();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setMenu(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu]);

  const go = (view: typeof nido.view) => {
    setMenu(false);
    nido.setView(view);
  };

  return (
    <header className={cn("sticky top-0 z-40 border-b transition", scrolled ? "border-line bg-paper/85 backdrop-blur-md" : "border-transparent bg-paper/70 backdrop-blur-sm")}>
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-4 px-4 md:px-6">
        <button type="button" onClick={() => go("explore")} className="flex items-center gap-2.5" aria-label="Nido, inicio">
          <Logo />
          <span className="leading-none">
            <span className="block text-sm font-semibold tracking-[0.22em]">NIDO</span>
            <span className="mt-1 hidden text-[10px] uppercase tracking-[0.18em] text-muted sm:block">Estancias</span>
          </span>
        </button>

        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Principal">
          {links.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => go(link.id)}
              className={cn("relative px-3 py-2 text-sm text-muted", nido.view === link.id && "font-medium text-ink")}
            >
              {link.label}
              {nido.view === link.id && <span className="absolute inset-x-3 -bottom-0.5 h-px bg-clay" />}
            </button>
          ))}
        </nav>

        {nido.view !== "explore" && (
          <button
            type="button"
            onClick={() => go("explore")}
            className="mx-auto hidden min-w-0 items-center gap-3 rounded-full border border-line bg-card px-4 py-2 text-sm shadow-sm md:flex"
          >
            <span className="max-w-[140px] truncate">{nido.search.where || "Cualquier lugar"}</span>
            <span className="h-4 w-px bg-line" />
            <span className="text-muted">{formatRange(nido.search.checkIn, nido.search.checkOut)}</span>
            <span className="hidden text-muted xl:inline">{guestLabel(nido.search)}</span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-clay text-white">
              <Icon d={paths.search} className="h-3.5 w-3.5" />
            </span>
          </button>
        )}

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button type="button" onClick={() => go("publish")} className="hidden rounded-full px-3 py-2 text-sm font-medium hover:bg-sand sm:inline">
            Anunciar
          </button>
          <IconButton label="Guardados" onClick={() => go("wishlist")} badge={nido.favorites.length}>
            <Icon d={paths.heart} className="h-5 w-5" />
          </IconButton>
          <IconButton label="Mensajes" onClick={() => go("messages")} badge={nido.unreadCount}>
            <Icon d={paths.message} className="h-5 w-5" />
          </IconButton>
          <div className="relative" ref={ref}>
            <button
              type="button"
              onClick={() => setMenu((open) => !open)}
              className="ml-1 flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-1.5 shadow-sm"
              aria-expanded={menu}
              aria-label="Menú de cuenta"
            >
              <Avatar src={nido.me.avatar} name={nido.me.name} className="h-8 w-8 rounded-full" />
            </button>
            {menu && (
              <div className="absolute right-0 top-12 w-60 overflow-hidden rounded-2xl border border-line bg-card py-2 shadow-xl">
                <p className="px-4 py-2 text-xs uppercase tracking-[0.16em] text-muted">{nido.me.name}</p>
                <MenuItem label="Perfil" onClick={() => { setMenu(false); nido.openProfile(nido.me.id); }} />
                <MenuItem label="Viajes" onClick={() => go("trips")} />
                <MenuItem label="Mensajes" onClick={() => go("messages")} />
                <MenuItem label="Guardados" onClick={() => go("wishlist")} />
                <MenuItem label="Anunciar un espacio" onClick={() => go("publish")} />
                <MenuItem label="Feed" onClick={() => go("feed")} />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function IconButton({
  label,
  onClick,
  badge,
  children,
}: {
  label: string;
  onClick: () => void;
  badge?: number;
  children: ReactNode;
}) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-sand">
      {children}
      {!!badge && (
        <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-clay px-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-sand">
      {label}
    </button>
  );
}

export function MobileNav() {
  const { view, setView, openProfile, me } = useNido();
  const items = [
    { id: "explore" as const, label: "Explorar", icon: paths.search },
    { id: "feed" as const, label: "Feed", icon: paths.spark },
    { id: "trips" as const, label: "Viajes", icon: paths.home },
    { id: "wishlist" as const, label: "Guardados", icon: paths.heart },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur md:hidden" aria-label="Móvil">
      <div className="grid grid-cols-5 px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-1">
        {items.map((item) => (
          <button key={item.id} type="button" onClick={() => setView(item.id)} className={cn("flex flex-col items-center gap-1 py-2 text-[10px]", view === item.id ? "text-ink" : "text-muted")}>
            <Icon d={item.icon} className="h-5 w-5" />
            {item.label}
          </button>
        ))}
        <button type="button" onClick={() => openProfile(me.id)} className={cn("flex flex-col items-center gap-1 py-2 text-[10px]", view === "profile" ? "text-ink" : "text-muted")}>
          <Avatar src={me.avatar} name={me.name} className="h-5 w-5 rounded-full" />
          Perfil
        </button>
      </div>
    </nav>
  );
}

export function Footer() {
  const { setView } = useNido();
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.2fr_1fr_1fr] md:px-6">
        <div>
          <div className="flex items-center gap-2">
            <Logo className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-[0.22em]">NIDO</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            Casas con luz, mesa y silencio. Una interfaz para explorar estancias, seguir anfitriones y reservar con claridad.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Recorrer</p>
          <div className="mt-3 flex flex-col items-start gap-2 text-sm">
            <button type="button" onClick={() => setView("explore")} className="hover:underline">Explorar</button>
            <button type="button" onClick={() => setView("feed")} className="hover:underline">Feed</button>
            <button type="button" onClick={() => setView("publish")} className="hover:underline">Anunciar un espacio</button>
            <button type="button" onClick={() => setView("wishlist")} className="hover:underline">Guardados</button>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Antes de reservar</p>
          <div className="mt-3 space-y-2 text-sm text-muted">
            <details className="rounded-2xl border border-line bg-card px-4 py-3">
              <summary className="cursor-pointer font-medium text-ink">¿La reserva es real?</summary>
              <p className="mt-2 leading-relaxed">No. Nido es un prototipo de interfaz. Confirmar una estancia no genera ningún cargo.</p>
            </details>
            <details className="rounded-2xl border border-line bg-card px-4 py-3">
              <summary className="cursor-pointer font-medium text-ink">¿Dónde veo el total?</summary>
              <p className="mt-2 leading-relaxed">Al elegir fechas, el precio de la ficha pasa a total: noches, limpieza y comisión de Nido.</p>
            </details>
          </div>
        </div>
      </div>
      <div className="border-t border-line px-4 py-4 text-center text-xs text-muted md:px-6">
        Nido · prototipo de estancias · las reservas no generan cargos reales
      </div>
    </footer>
  );
}
