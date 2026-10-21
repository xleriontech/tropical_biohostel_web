"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Transición entre páginas/secciones.
 *
 * Al navegar sube un overlay blanco con el **mandala de marca armándose junto
 * a las letras del logo** (TROPICAL · BIO · mandala · HOSTEL): cada pieza entra
 * escalonada y con un movimiento fluido, y al terminar reconstruyen el
 * logotipo exacto. Mientras carga, el mandala sigue girando suavemente.
 */

const ANCHO_MAX = 560; // px del logo compuesto en el cargador
const RELACION = 3.936; // proporcion del logo (2200 x 559)

export default function RouteLoader() {
  const pathname = usePathname();
  // Arranca visible: en la primera carga el logo se arma mientras la pagina
  // termina de cargar (asi viene en el HTML del servidor, sin parpadeo).
  const [fase, setFase] = useState<"idle" | "entrando" | "saliendo">("entrando");
  const [progreso, setProgreso] = useState(0);
  const primerRender = useRef(true);
  const cargaInicial = useRef(true);
  const ocultarRef = useRef<ReturnType<typeof setTimeout>>();
  const seguroRef = useRef<ReturnType<typeof setTimeout>>();

  // Primera carga: el overlay se retira cuando la pagina esta lista y el
  // ensamblaje del logo ha terminado (minimo 1,6 s).
  useEffect(() => {
    if (!cargaInicial.current) return;
    cargaInicial.current = false;

    const inicio = Date.now();
    const MINIMO = 1600;
    const cerrar = () => {
      const restante = Math.max(0, MINIMO - (Date.now() - inicio));
      setTimeout(() => {
        setProgreso(100);
        setFase("saliendo");
        if (ocultarRef.current) clearTimeout(ocultarRef.current);
        ocultarRef.current = setTimeout(() => {
          setFase("idle");
          setProgreso(0);
        }, 450);
      }, restante);
    };

    // La barra avanza sola mientras carga
    requestAnimationFrame(() => requestAnimationFrame(() => setProgreso(88)));

    if (document.readyState === "complete") cerrar();
    else window.addEventListener("load", cerrar, { once: true });

    return () => {
      window.removeEventListener("load", cerrar);
      if (ocultarRef.current) clearTimeout(ocultarRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      className="pointer-events-none fixed inset-0 z-[90] flex flex-col items-center justify-center gap-7 bg-white"
      style={{
        opacity: fase === "entrando" ? 1 : 0,
        transition: "opacity 0.35s ease",
      }}
    >
      {/* El logotipo armándose: la clave fuerza el reinicio de la animacion */}
      <div
        key={pathname}
        className="relative w-full max-w-[560px] px-4"
        style={{ aspectRatio: String(RELACION) }}
      >
        {/* TROPICAL */}
        <img
          src="/loader/loader-tropical.png"
          alt=""
          className="tl-tropical absolute select-none"
          style={{ left: "0.27%", top: "0.89%", width: "28.41%" }}
        />

        {/* Filetes naranjas */}
        <div
          className="tl-linea absolute left-[0.59%] top-[27.5%] h-[1.5px] w-[42%]"
          style={{ background: "linear-gradient(90deg,#ea9400,#f0b429)" }}
        />
        <div
          className="tl-linea tl-linea-der absolute right-[1.5%] top-[27.5%] h-[1.5px] w-[40%]"
          style={{ background: "linear-gradient(270deg,#ea9400,#f0b429)" }}
        />

        {/* BIO */}
        <img
          src="/loader/loader-bio.png"
          alt=""
          className="tl-bio absolute select-none"
          style={{ left: "0.59%", top: "30.23%", width: "42.05%" }}
        />

        {/* El mandala: entra girando y sigue vivo mientras carga */}
        <div
          className="tl-mandala absolute select-none"
          style={{ left: "43.91%", top: "33.81%", width: "15.05%" }}
        >
          <img
            src="/loader/loader-mandala.png"
            alt=""
            className="tl-mandala-viva w-full"
          />
        </div>

        {/* HOSTEL */}
        <img
          src="/loader/loader-hostel.png"
          alt=""
          className="tl-hostel absolute select-none"
          style={{ left: "59.5%", top: "33.81%", width: "39.55%" }}
        />
      </div>

      {/* Barra de progreso */}
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
