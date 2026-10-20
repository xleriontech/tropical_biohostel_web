import Link from "next/link";
import { Coffee, Home, RefreshCw } from "lucide-react";

export const metadata = {
  title: "Sin conexión · Tropical Biohostel",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <img
        src="/icons/icon-192.png"
        alt=""
        width={92}
        height={92}
        className="h-[92px] w-[92px] rounded-2xl shadow-sm"
      />
      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
        Sin conexión
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
        Estás sin conexión
      </h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        No pudimos alcanzar el servidor. Las páginas que ya visitaste siguen disponibles, y en
        cuanto vuelva la internet podrás continuar con tu reserva.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Home className="h-4 w-4" />
          Ir al inicio
        </Link>
        <Link
          href="/rutas"
          className="inline-flex items-center gap-2 rounded-full border border-input px-6 py-2.5 text-sm font-medium hover:bg-secondary"
        >
          <Coffee className="h-4 w-4" />
          Ver las rutas del café
        </Link>
        {/* Enlace plano (no Link) para forzar una recarga completa de la página. */}
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </a>
      </div>
    </div>
  );
}
