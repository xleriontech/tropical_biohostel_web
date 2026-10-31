import { Droplet, Leaf, Sprout } from "lucide-react";
import type { EstadoArbol, Niveles } from "@/lib/siembra";

const DIA = 86_400_000;

/** Cuántos días atrás: el donante quiere saber de cuándo habla la finca. */
function haceDias(fecha: string | null): string {
  if (!fecha) return "sin registro";
  const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / DIA);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;
  return `hace ${Math.floor(dias / 30)} ${Math.floor(dias / 30) === 1 ? "mes" : "meses"}`;
}

const BARRAS: { clave: keyof Niveles; label: string; Icon: typeof Droplet; color: string }[] = [
  { clave: "agua", label: "Agua", Icon: Droplet, color: "bg-bosque" },
  { clave: "nutrientes", label: "Nutrientes", Icon: Sprout, color: "bg-cascara" },
  { clave: "salud", label: "Salud", Icon: Leaf, color: "bg-hoja" },
];

const SEMAFORO: Record<EstadoArbol["clave"], string> = {
  OPTIMO: "border-hoja/50 bg-[#7FA65A]/15 text-bosque",
  ATENCIÓN: "border-sol/60 bg-[#E8A94A]/15 text-[#8A5A12]",
  CRITICO: "border-destructive/40 bg-destructive/10 text-destructive",
};

/**
 * El parte de atención del árbol: tres barras que bajan solas con los días y
 * suben cuando alguien paga un mimamiento.
 */
export default function AtencionArbol({
  niveles,
  estado,
  ultimoRiego,
  ultimoAbono,
}: {
  niveles: Niveles;
  estado: EstadoArbol;
  ultimoRiego: string | null;
  ultimoAbono: string | null;
}) {
  return (
    <div className="mt-3">
      <p
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${SEMAFORO[estado.clave]}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
        {estado.etiqueta}
      </p>
      <ul className="mt-3 grid gap-2.5 sm:grid-cols-3">
        {BARRAS.map(({ clave, label, Icon, color }) => {
          const v = niveles[clave];
          return (
            <li key={clave}>
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Icon className="h-3.5 w-3.5 text-tierra" aria-hidden />
                  {label}
                </span>
                <span className="font-mono text-tierra">{v}%</span>
              </div>
              <div
                role="progressbar"
                aria-label={label}
                aria-valuenow={v}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-piedra"
              >
                <div className={`h-full rounded-full ${color} transition-[width] duration-700`} style={{ width: `${v}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Último riego {haceDias(ultimoRiego)} · último abono {haceDias(ultimoAbono)}.
      </p>
    </div>
  );
}
