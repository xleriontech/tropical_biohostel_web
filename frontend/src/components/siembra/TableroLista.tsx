"use client";

import { ETAPAS, ESPECIES, type ParcelaTablero } from "@/lib/siembra";

/**
 * La misma finca, en tabla: para quien navega con teclado, con lector de pantalla
 * o sin WebGL. No es un adorno del 3D: aquí se elige la casilla igual.
 */
export default function TableroLista({
  parcelas,
  filas,
  columnas,
  seleccion,
  onSelect,
}: {
  parcelas: ParcelaTablero[];
  filas: number;
  columnas: number;
  seleccion: { fila: number; columna: number } | null;
  onSelect: (p: ParcelaTablero) => void;
}) {
  const porFila = new Map<number, ParcelaTablero[]>();
  for (const p of parcelas) {
    const fila = porFila.get(p.fila) || [];
    fila.push(p);
    porFila.set(p.fila, fila);
  }

  return (
    <div className="overflow-x-auto rounded-3xl border bg-card p-3">
      <table className="w-full border-collapse text-sm">
        <caption className="pb-3 text-left text-xs text-muted-foreground">
          Tablero de la finca: {filas} filas × {columnas} columnas. Las casillas libres se pueden
          apadrinar; las demás ya tienen árbol o están apartadas.
        </caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Fila</th>
            <th scope="col">Casillas</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: filas }, (_, fila) => (
            <tr key={fila}>
              <th
                scope="row"
                className="whitespace-nowrap py-1 pr-3 text-right align-middle text-xs font-medium text-muted-foreground"
              >
                Fila {fila + 1}
              </th>
              <td>
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(2.4rem, 1fr))` }}>
                  {(porFila.get(fila) || []).map((p) => {
                    const activa = seleccion?.fila === p.fila && seleccion?.columna === p.columna;
                    const titulo = `Fila ${p.fila + 1}, columna ${p.columna + 1}`;
                    const detalle =
                      p.estado === "LIBRE"
                        ? "casilla libre, apadrina un árbol aquí"
                        : p.estado === "RESERVADA"
                          ? "apartada mientras se completa un pago"
                          : `${ESPECIES[p.arbol!.especie].label} en etapa ${ETAPAS[p.arbol!.etapa].label.toLowerCase()}${
                              p.arbol!.alias ? `, ${p.arbol!.alias}` : ""
                            }`;
                    return (
                      <button
                        key={titulo}
                        type="button"
                        onClick={() => onSelect(p)}
                        aria-pressed={activa}
                        aria-label={`${titulo}: ${detalle}`}
                        title={`${titulo}: ${detalle}`}
                        className={`flex aspect-square items-center justify-center rounded-lg border text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          p.estado === "OCUPADA"
                            ? "border-transparent bg-accent text-accent-foreground hover:brightness-105"
                            : p.estado === "RESERVADA"
                              ? "border-dashed border-sol bg-[#E8A94A]/25 text-secondary-foreground hover:bg-[#E8A94A]/40"
                              : "border-input bg-secondary/50 text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
                        } ${activa ? "scale-105 border-bosque bg-bosque text-crema ring-2 ring-sol ring-offset-1 ring-offset-crema" : ""}`}
                      >
                        {p.estado === "LIBRE" ? p.columna + 1 : p.estado === "RESERVADA" ? "·" : p.arbol!.especie === "CAFE" ? "☕" : "🌰"}
                      </button>
                    );
                  })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
