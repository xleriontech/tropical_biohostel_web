"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ConsultaArbol from "@/components/siembra/ConsultaArbol";

function Buscador() {
  const searchParams = useSearchParams();
  const codigo = searchParams.get("codigo") || "";
  return <ConsultaArbol codigoInicial={codigo} />;
}

export default function MiArbolClient() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-16 text-sm text-muted-foreground">Cargando…</div>}>
      <Buscador />
    </Suspense>
  );
}
