"use client";

import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";

interface Props extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> {
  src?: string | null;
  alt?: string;
}

/**
 * Imagen que nunca rompe el diseño: si la URL falla (404, 403,
 * hotlink bloqueado), muestra un placeholder elegante en su lugar
 * en vez de un icono roto y errores en consola ajenos.
 */
export default function SafeImage({ src, alt = "", ...rest }: Props) {
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    setFallo(false);
  }, [src]);

  if (!src || fallo) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-muted-foreground/50 ${rest.className || ""}`}
        aria-label={alt}
      >
        <ImageOff className="h-8 w-8" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      {...rest}
      onError={() => setFallo(true)}
    />
  );
}
