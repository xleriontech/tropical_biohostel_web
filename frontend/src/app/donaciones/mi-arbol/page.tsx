import { Suspense } from "react";
import ConsultaArbol from "@/components/siembra/ConsultaArbol";

export const metadata = {
  title: "Mi árbol apadrinado · Tropical Biohostel",
  description:
    "Consulta con tu código en qué etapa va el árbol de café o cacao que apadrinaste en la finca de Nocaima.",
};

export default function MiArbolPage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-16 text-sm text-muted-foreground">Cargando…</div>}>
      <Buscador searchParams={searchParams} />
    </Suspense>
  );
}

async function Buscador({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const { codigo } = await searchParams;
  return <ConsultaArbol codigoInicial={codigo || ""} />;
}
