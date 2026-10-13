"use client";

import { useState } from "react";
import { HeartHandshake, X } from "lucide-react";

/** Pestaña flotante al borde derecho: abre el botón de donar, se puede ocultar. */
export default function DonarFloat() {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="fixed right-0 top-1/3 z-40 flex items-start">
      {abierto && (
        <div className="mr-2 w-52 animate-slide-up rounded-2xl border border-input bg-white p-4 shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <HeartHandshake className="h-4 w-4 text-primary" /> Apoya el territorio
            </p>
            <button
              onClick={() => setAbierto(false)}
              aria-label="Ocultar donar"
              className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Siembra árboles nativos y compensa tu huella de carbono.
          </p>
          <a
            href="/donaciones"
            className="mt-3 block rounded-full bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Donar 🌳
          </a>
        </div>
      )}
      <button
        onClick={() => setAbierto(!abierto)}
        aria-label={abierto ? "Ocultar donar" : "Donar"}
        title="Donar"
        className="flex flex-col items-center gap-1 rounded-l-xl bg-primary px-2 py-3 text-primary-foreground shadow-lg hover:bg-primary/90"
      >
        <HeartHandshake className="h-5 w-5" />
        <span className="text-[11px] font-bold uppercase tracking-wider [writing-mode:vertical-rl]">
          Donar
        </span>
      </button>
    </div>
  );
}
