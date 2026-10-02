"use client";

import { useEffect, useState } from "react";
import { absoluteUrl, apiUrl } from "@/lib/api-base";

const FALLBACK = "/tropical-logo.svg";

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

export default function SiteBrand({ className = "h-10 w-auto" }: { className?: string }) {
  const logo = useSiteLogo();
  return (
    <img
      src={logo}
      onError={(e) => { if (e.currentTarget.src !== window.location.origin + FALLBACK) e.currentTarget.src = FALLBACK; }}
      alt="Tropical Biohostel — BIO HOSTEL"
      style={{ filter: "drop-shadow(0 0 1px rgba(243,236,218,.7))" }}
      className={`${className} w-auto max-w-none shrink-0 bg-transparent`}
    />
  );
}
