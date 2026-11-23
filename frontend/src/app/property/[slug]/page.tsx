import { api } from "@/lib/api";
import { Property } from "@/types";
import PropertyDetailClient from "./PropertyDetailClient";

export const runtime = "edge";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let property: Property;
  try {
    property = await api.getProperty(slug);
  } catch {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-foreground">No se pudo cargar esta propiedad</h1>
        <p className="mt-4 text-muted-foreground">
          En este momento no podemos mostrar la información de reserva. Puedes volver a intentarlo en unos minutos o contactarnos directamente.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href={slug === "cosmic-bungalow" ? "/cosmic-bungalow" : "/"} className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            {slug === "cosmic-bungalow" ? "Volver a Cosmic Bungalow" : "Volver al inicio"}
          </a>
          <a href="https://wa.me/573209079174" target="_blank" rel="noopener noreferrer" className="rounded-full border border-input px-6 py-3 text-sm font-semibold text-foreground hover:bg-secondary">
            Contactar por WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return <PropertyDetailClient property={property} />;
}
