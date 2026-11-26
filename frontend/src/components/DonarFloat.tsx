"use client";

import { useState } from "react";
import { HeartHandshake, X } from "lucide-react";

/** Pestaña flotante al borde derecho: abre el botón de donar, se puede ocultar. */
export default function DonarFloat() {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="fixed right-0 top-1/3 z-40 flex items-start">
      {abierto && (
        <div className="mr-2 w-56 animate-slide-up rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
              <HeartHandshake className="h-4 w-4 text-emerald-600" /> Apoya el territorio
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
            href="/donaciones/"
            className="mt-3 block rounded-full bg-gradient-to-r from-emerald-600 to-green-700 px-4 py-2.5 text-center text-sm font-bold text-white shadow-lg hover:from-emerald-500 hover:to-green-600"
          >
            Donar 🌳
          </a>
        </div>
      )}
      <button
        onClick={() => setAbierto(!abierto)}
        aria-label={abierto ? "Ocultar donar" : "Donar"}
        title="Donar · Siembra y carbono 🌳"
        className="flex animate-pulse-slow flex-col items-center gap-1.5 rounded-l-2xl bg-gradient-to-b from-emerald-500 to-green-700 px-3 py-4 text-white transition-all hover:from-emerald-400 hover:to-green-600 hover:px-4"
      >
        <HeartHandshake className="h-6 w-6" />
        <span className="text-xs font-black uppercase tracking-widest [writing-mode:vertical-rl]">
          Donar 🌳
        </span>
      </button>
    </div>
  );
}
