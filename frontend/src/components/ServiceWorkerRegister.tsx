"use client";

import { useEffect } from "react";

/**
 * Registra el service worker (PWA).
 *
 * Solo se registra en HTTPS o en localhost: los navegadores bloquean el
 * registro en HTTP por razones de seguridad (salvo localhost).
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const esLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    if (window.location.protocol !== "https:" && !esLocal) return;

    let cancelado = false;

    const registrar = async () => {
      if (cancelado) return;
      try {
        const registro = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // Cuando hay una versión nueva instalada, se avisa al usuario para que
        // recargue y así tomar la versión nueva.
        registro.addEventListener("updatefound", () => {
          const nuevo = registro.installing;
          if (!nuevo) return;
          nuevo.addEventListener("statechange", () => {
            if (nuevo.state === "installed" && navigator.serviceWorker.controller) {
              nuevo.postMessage("SKIP_WAITING");
            }
          });
        });
      } catch {
        // Si el registro falla (por ejemplo, sin HTTPS) el sitio sigue igual.
      }
    };

    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar);

    return () => {
      cancelado = true;
      window.removeEventListener("load", registrar);
    };
  }, []);

  return null;
}
