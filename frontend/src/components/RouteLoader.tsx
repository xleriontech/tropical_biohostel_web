"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Transición entre páginas/secciones: overlay blanco que sube de opacidad
 * al navegar, muestra el favicon (flor) centrado con barra de progreso,
 * y baja la opacidad al llegar a la nueva vista.
 */
export default function RouteLoader() {
  const pathname = usePathname();
  const [fase, setFase] = useState<"idle" | "entrando" | "saliendo">("idle");
  const [progreso, setProgreso] = useState(0);
  const primerRender = useRef(true);
  const ocultarRef = useRef<ReturnType<typeof setTimeout>>();
  const seguroRef = useRef<ReturnType<typeof setTimeout>>();

  // Al completar la navegación: completar barra y desvanecer el fondo
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    setProgreso(100);
    setFase("saliendo");
    if (ocultarRef.current) clearTimeout(ocultarRef.current);
    ocultarRef.current = setTimeout(() => {
      setFase("idle");
      setProgreso(0);
    }, 450);
    return () => {
      if (ocultarRef.current) clearTimeout(ocultarRef.current);
    };
  }, [pathname]);

  // Al hacer clic en un enlace interno: subir el fondo blanco y avanzar al 80%
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="/"]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (!href || href === pathname) return;
      if (a.target === "_blank" || e.ctrlKey || e.metaKey) return;
      setFase("entrando");
      setProgreso(0);
      requestAnimationFrame(() => requestAnimationFrame(() => setProgreso(80)));
      // Seguridad: si la navegación se atasca, ocultar a los 8s
      if (seguroRef.current) clearTimeout(seguroRef.current);
      seguroRef.current = setTimeout(() => {
        setFase("idle");
        setProgreso(0);
      }, 8000);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (seguroRef.current) clearTimeout(seguroRef.current);
    };
  }, [pathname]);

  if (fase === "idle") return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[90] flex flex-col items-center justify-center gap-5 bg-white"
      style={{
        opacity: fase === "entrando" ? 1 : 0,
        transition: "opacity 0.35s ease",
      }}
    >
      <img
        src="/favicon.svg"
        alt=""
        className="h-20 w-20 animate-pulse"
        onError={(e) => { e.currentTarget.src = "/tropical-logo.png"; }}
      />
      <div className="h-1 w-48 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary"
          style={{
            width: `${progreso}%`,
            transition: progreso === 100 ? "width 0.3s ease" : "width 1.2s ease",
          }}
        />
      </div>
    </div>
  );
}
