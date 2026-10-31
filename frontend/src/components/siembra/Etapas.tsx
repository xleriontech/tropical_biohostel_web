import { ETAPAS, type Etapa } from "@/lib/siembra";

const ORDEN: Etapa[] = ["SEMILLA", "BROTE", "JUVENIL", "PRODUCTIVO"];

/** Las cuatro etapas del árbol, como barra. Se comparte entre la ficha y el tablero. */
export default function Etapas({ etapa, compacto = false }: { etapa: Etapa; compacto?: boolean }) {
  const actual = ORDEN.indexOf(etapa);
  return (
    <ol className={`flex items-center gap-1 ${compacto ? "mt-2" : "mt-4"}`} aria-label={`Etapa actual: ${ETAPAS[etapa].label}`}>
      {ORDEN.map((e, i) => (
        <li key={e} className="flex-1">
          <div className={`rounded-full ${i <= actual ? "bg-hoja" : "bg-piedra"} ${compacto ? "h-1" : "h-1.5"}`} aria-hidden />
          <span
            className={`mt-1.5 block ${compacto ? "text-[10px]" : "text-[11px]"} ${
              i === actual ? "font-semibold text-bosque" : "text-muted-foreground"
            }`}
          >
            {ETAPAS[e].label}
          </span>
        </li>
      ))}
    </ol>
  );
}
