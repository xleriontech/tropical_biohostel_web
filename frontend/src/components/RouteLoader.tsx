"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LOGO } from "@/lib/brand";

/**
 * Loader de marca Tropical · Biohostel.
 *
 * Muestra el logotipo nuevo (`LOGO` de lib/brand) sobre fondo crema de la
 * paleta de marca, con vida continua mientras la página carga o al cambiar
 * de sección:
 *
 *  - entrada suave del logo (escala + desenfoque + desplazamiento)
 *  - flotación sutil permanente del logotipo
 *  - dos anillos en órbita: puntos verdes con satélites girando en sentido
 *    horario y arcos ámbar girando en sentido antihorario
 *  - resplandor radial que respira detrás del logo
 *  - barrido de luz (shimmer) enmascarado a la forma exacta del logotipo
 *  - barra de progreso con degradado de la paleta de marca
 *  - leyenda con frases rotativas de la marca
 *
 * Tiempos mínimos: 2,2 s en la carga inicial y 0,9 s al navegar entre
 * secciones. Usa las keyframes `tl-*` definidas en globals.css.
 */

const MINIMO_INICIAL = 2200; // ms visibles en la primera carga
const MINIMO_RUTA = 900; // ms visibles al navegar entre secciones
const OCULTAR = 450; // ms de la animación de salida
const SEGURIDAD = 8000; // ms máximos si la navegación se atasca

const FRASES = [
  "Preparando tu escape verde",
  "Recolectando hojas de agua",
  "Encendiendo el sol de Nocaima",
  "Sembrando buen vivir",
];

type Fase = "idle" | "entrando" | "saliendo";

export default function RouteLoader() {
  const pathname = usePathname();
  // Arranca visible: en la primera carga el logo entra mientras la página
  // termina de cargar (sin parpadeo en el HTML del servidor).
  const [fase, setFase] = useState<Fase>("entrando");
  const [progreso, setProgreso] = useState(0);
  const [frase, setFrase] = useState(0);

  // Espejo síncrono de `fase` para que los temporizadores programados
  // (load, navegación, seguridad) no reabran el loader cuando ya cerró.
  const faseRef = useRef<Fase>("entrando");
  const cambiarFase = (f: Fase) => {
    faseRef.current = f;
    setFase(f);
  };

  const rutaRef = useRef(pathname); // última ruta manejada
  const mostradoRef = useRef(Date.now());
  const ocultarRef = useRef<ReturnType<typeof setTimeout>>();
  const seguroRef = useRef<ReturnType<typeof setTimeout>>();

  /** Cierra el overlay respetando un tiempo mínimo de visible. */
  const cerrar = (minimo: number) => {
    const restante = Math.max(0, minimo - (Date.now() - mostradoRef.current));
    if (ocultarRef.current) clearTimeout(ocultarRef.current);
    ocultarRef.current = setTimeout(() => {
      if (faseRef.current !== "entrando") return; // ya se cerró antes
      setProgreso(100);
      cambiarFase("saliendo");
      ocultarRef.current = setTimeout(() => {
        if (faseRef.current !== "saliendo") return;
        cambiarFase("idle");
        setProgreso(0);
      }, OCULTAR);
    }, restante);
  };

  // Primera carga: el overlay se retira cuando la página está lista,
  // con un mínimo de 2,2 s para alcanzar a ver la animación completa.
  // El listener se (re)registra en cada montaje para sobrevivir al
  // montaje/desmontaje doble de StrictMode en desarrollo.
  useEffect(() => {
    const alListo = () => cerrar(MINIMO_INICIAL);
    if (document.readyState === "complete") alListo();
    else window.addEventListener("load", alListo, { once: true });

    return () => {
      window.removeEventListener("load", alListo);
      if (ocultarRef.current) clearTimeout(ocultarRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al completar la navegación: cerrar respetando el mínimo de la sección.
  // Sin cleanup: el cierre programado siempre debe ejecutarse (si llega otra
  // navegación, el propio `cerrar` o el click la reprograman).
  useEffect(() => {
    if (pathname === rutaRef.current) return; // sin navegación real
    rutaRef.current = pathname;
    if (faseRef.current !== "entrando") return;
    cerrar(MINIMO_RUTA);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Al hacer clic en un enlace interno: abrir el loader de inmediato.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.(
        'a[href^="/"]'
      ) as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (!href || href === pathname) return;
      if (a.target === "_blank" || e.ctrlKey || e.metaKey) return;
      if (ocultarRef.current) clearTimeout(ocultarRef.current);
      if (seguroRef.current) clearTimeout(seguroRef.current);
      mostradoRef.current = Date.now();
      setProgreso(0);
      setFrase(0);
      cambiarFase("entrando");
      // Seguridad: si la navegación se atasca, se retira a los 8 s.
      seguroRef.current = setTimeout(() => {
        if (faseRef.current !== "entrando") return;
        cambiarFase("idle");
        setProgreso(0);
      }, SEGURIDAD);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (seguroRef.current) clearTimeout(seguroRef.current);
    };
  }, [pathname]);

  // Progreso simulado mientras el loader está visible (se detiene en 90 %
  // y se completa al cerrar).
  useEffect(() => {
    if (fase !== "entrando") return;
    const id = setInterval(() => {
      setProgreso((p) => (p < 90 ? Math.min(90, p + 2 + Math.random() * 8) : p));
    }, 150);
    return () => clearInterval(id);
  }, [fase]);

  // Frases rotativas de la leyenda.
  useEffect(() => {
    if (fase === "idle") return;
    const id = setInterval(
      () => setFrase((f) => (f + 1) % FRASES.length),
      1800
    );
    return () => clearInterval(id);
  }, [fase]);

  if (fase === "idle") return null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-[#F5EFE0] ${
        fase === "saliendo" ? "tl-saliendo" : "tl-entrando"
      }`}
    >
      {/* Resplandor radial que respira detrás del logo */}
      <div className="tl-resplandor" />

      {/* Escena: se reinicia con cada ruta para repetir la entrada */}
      <div
        key={pathname}
        className="relative flex w-full flex-col items-center px-6"
      >
        <div className="tl-escena">
          {/* Anillo de puntos verdes con satélites (gira en sentido horario) */}
          <svg
            className="tl-anillo"
            viewBox="0 0 400 400"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="200"
              cy="200"
              r="190"
              stroke="#8FB573"
              strokeWidth="6"
              strokeDasharray="1 11"
              strokeLinecap="round"
              opacity="0.9"
            />
            <circle cx="200" cy="10" r="13" fill="#E8A94A" opacity="0.25" />
            <circle cx="200" cy="10" r="6" fill="#E8A94A" />
            <circle cx="200" cy="390" r="9" fill="#8FB573" opacity="0.3" />
            <circle cx="200" cy="390" r="4.5" fill="#8FB573" />
          </svg>

          {/* Arcos ámbar en órbita contraria (antihorario) */}
          <svg
            className="tl-anillo2"
            viewBox="0 0 400 400"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="200"
              cy="200"
              r="176"
              stroke="#E8A94A"
              strokeWidth="3.5"
              strokeDasharray="185 920"
              strokeLinecap="round"
              opacity="0.85"
            />
            <circle
              cx="200"
              cy="200"
              r="176"
              stroke="#E8A94A"
              strokeWidth="3.5"
              strokeDasharray="185 920"
              strokeDashoffset="553"
              strokeLinecap="round"
              opacity="0.45"
            />
          </svg>

          {/* Logotipo nuevo con entrada, flotación y barrido de luz */}
          <div className="tl-logo">
            <img
              src={LOGO}
              alt=""
              draggable={false}
              className="tl-logo-img"
            />
            <div className="tl-brillo" />
          </div>
        </div>

        {/* Barra de progreso con degradado de marca */}
        <div className="tl-barra">
          <div
            className="tl-barra-avance"
            style={{ width: `${Math.round(progreso)}%` }}
          />
        </div>

        {/* Leyenda rotativa */}
        <p className="tl-leyenda" key={frase}>
          {FRASES[frase]}
        </p>
      </div>
    </div>
  );
}
