"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const CLAVE = "tb-pwa-instalar-descartado";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Aviso para instalar la app (PWA).
 *
 * Solo aparece cuando el navegador confirma que la app es instalable
 * (evento beforeinstallprompt). Se descarta solo con "Ahora no" y la
 * preferencia se guarda en localStorage para no molestar de nuevo.
 */
export default function InstallPrompt() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return; // ya instalada
    if (localStorage.getItem(CLAVE)) return;

    const alSolicitar = (e: Event) => {
      e.preventDefault();
      setEvento(e as BeforeInstallPromptEvent);
      // Se muestra un poco después para no competir con la carga de la página.
      setTimeout(() => setVisible(true), 2500);
    };

    window.addEventListener("beforeinstallprompt", alSolicitar);
    return () => window.removeEventListener("beforeinstallprompt", alSolicitar);
  }, []);

  const descartar = () => {
    localStorage.setItem(CLAVE, "1");
    setVisible(false);
  };

  const instalar = async () => {
    setVisible(false);
    if (!evento) return;
    try {
      await evento.prompt();
      await evento.userChoice;
    } catch {
      // el usuario cerró el diálogo
    }
  };

  if (!visible || !evento) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[95] flex justify-center px-4 md:bottom-6">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border bg-white p-3 shadow-xl">
        <img
          src="/icons/icon-192.png"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Instala la app de Tropical</p>
          <p className="text-xs text-muted-foreground">
            Acceso rápido, sin conexión y con avisos de tus reservas.
          </p>
        </div>
        <button
          onClick={instalar}
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Download className="mr-1 inline h-3.5 w-3.5" />
          Instalar
        </button>
        <button
          onClick={descartar}
          aria-label="Cerrar aviso de instalación"
          className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
