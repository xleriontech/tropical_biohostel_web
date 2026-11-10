"use client";

import { useEffect, useState } from "react";
import { absoluteUrl, apiUrl } from "@/lib/api-base";

import { LOGO } from "@/lib/brand";

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
 * Logo del sitio. La marca nueva es cuadrada (1:1), así que siempre se pide
 * alto y ancho iguales: `w-auto` sobre una imagen cuadrada funciona, pero se
 * deja explícito para que nadie reintroduzca una proporción vieja (3.94:1).
 */
export default function SiteBrand({ className = "h-12 w-12" }: { className?: string }) {
  const logo = useSiteLogo();
  return (
    <img
      src={logo}
      onError={(e) => { if (e.currentTarget.src !== window.location.origin + FALLBACK) e.currentTarget.src = FALLBACK; }}
      alt="Tropical Biohostel — BIO HOSTEL"
      className={`${className} max-w-none shrink-0 bg-transparent`}
    />
  );
}
