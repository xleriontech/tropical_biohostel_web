"use client";

import { useEffect, useRef, useState } from "react";
import { absoluteUrl, apiUrl } from "@/lib/api-base";

import { LOGO, LOGO_CLARO } from "@/lib/brand";

const FALLBACK = LOGO;

/** Logo del sitio: lee /api/config/site-branding (admin lo cambia). */
export function useSiteLogo(): string {
  const [logo, setLogo] = useState<string>(FALLBACK);

  useEffect(() => {
    let vivo = true;
    fetch(`${apiUrl()}/config/site-branding`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vivo && d?.logoUrl) setLogo(absoluteUrl(d.logoUrl));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  return logo;
}

/**
 * ¿El fondo real sobre el que se pinta el logo es claro?
 *
 * Recorre los ancestros hasta encontrar el primer color de fondo opaco y
 * calcula su luminosidad percibida (0–255). Así sirve sin ajustes tanto para
 * la barra de navegación (fondo `--nav-bg`) como para el pie de página
 * (fondo `--background`), sin duplicar aquí el conocimiento de los temas.
 */
function fondoEsClaro(el: HTMLElement): boolean {
  let node: HTMLElement | null = el;
  while (node) {
    const { backgroundColor } = getComputedStyle(node);
    const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/.exec(
      backgroundColor
    );
    if (m) {
      const alfa = m[4] === undefined ? 1 : parseFloat(m[4]);
      if (alfa > 0.5) {
        const [r, g, b] = [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
        return 0.299 * r + 0.587 * g + 0.114 * b > 150;
      }
    }
    node = node.parentElement;
  }
  return false; // sin fondo opaco: se asume oscuro (como :root)
}

/**
 * Logo del sitio.
 *
 * - **Proporción**: el logotipo horizontal mide 3405×1127 (≈3:1), así que la
 *   altura manda y el ancho se calcula (`h-9 xl:h-12 w-auto` + `object-contain`);
 *   nunca se fuerza un cuadrado, porque lo aplastaría. El nav solo admite
 *   ~109 px de logo sin que "Cosmic Bungalow" salte de línea; a partir de
 *   xl (1280 px) sí cabe el tamaño completo.
 * - **Color**: sobre fondos oscuros se sirve la variante clara
 *   (`LOGO_CLARO`, texto en crema) y sobre fondos claros la original
 *   (texto en bosque), según la luminosidad del fondo real del ancestro.
 */
export default function SiteBrand({ className = "h-9 xl:h-12 w-auto" }: { className?: string }) {
  const logo = useSiteLogo();
  const ref = useRef<HTMLImageElement>(null);
  const [fondoClaro, setFondoClaro] = useState(false);

  useEffect(() => {
    const img = ref.current;
    if (!img) return;
    const calcular = () => setFondoClaro(fondoEsClaro(img));
    calcular();
    // El fondo cambia al cambiar de tema o de modo (data-theme / clase .dark)
    const obs = new MutationObserver(calcular);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => obs.disconnect();
  }, []);

  // Fondo claro → logotipo original (bosque); fondo oscuro → variante clara.
  const porDefecto = fondoClaro ? FALLBACK : LOGO_CLARO;
  const src = logo === FALLBACK ? porDefecto : logo;

  return (
    <img
      ref={ref}
      src={src}
      onError={(e) => {
        if (e.currentTarget.src !== window.location.origin + porDefecto)
          e.currentTarget.src = porDefecto;
      }}
      alt="Tropical Biohostel — BIO HOSTEL"
      className={`${className} max-w-none shrink-0 bg-transparent object-contain`}
    />
  );
}
