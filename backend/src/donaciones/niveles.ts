/**
 * Los niveles de atención de un árbol no los guarda nadie a propósito: suben
 * cuando alguien paga un mimamiento y bajan solos con los días. Para no atar
 * esto a una tarea programada, el decaimiento se calcula al leer y se
 * materializa al escribir.
 */

export interface NivelesArbol {
  agua: number;
  nutrientes: number;
  salud: number;
}

/** Puntos que se pierden por día sin que la finca lo atienda. */
const DECAIMIENTO: NivelesArbol = { agua: 4, nutrientes: 1.2, salud: 0.4 };

/** Ningún árbol de la finca se muestra muerto: el piso deja margen para regar. */
const PISO = 12;

const tope = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function nivelesAlDia(
  guardados: { aguaNivel: number; nutrienteNivel: number; saludNivel: number; nivelesEn: Date | null; updatedAt: Date },
  ahora: Date = new Date(),
): NivelesArbol {
  const desde = guardados.nivelesEn || guardados.updatedAt;
  const dias = Math.max(0, (ahora.getTime() - new Date(desde).getTime()) / 86_400_000);
  const baja = (valor: number, ritmo: number) => tope(Math.max(PISO, valor - ritmo * dias));
  return {
    agua: baja(guardados.aguaNivel, DECAIMIENTO.agua),
    nutrientes: baja(guardados.nutrienteNivel, DECAIMIENTO.nutrientes),
    salud: baja(guardados.saludNivel, DECAIMIENTO.salud),
  };
}

export interface Realce {
  realceAgua: number;
  realceNutri: number;
  realceSalud: number;
}

/** Lo que queda del árbol después de aplicarle una cantidad de un item. */
export function aplicaMimamiento(hoy: NivelesArbol, realce: Realce, cantidad: number): NivelesArbol {
  return {
    agua: tope(hoy.agua + realce.realceAgua * cantidad),
    nutrientes: tope(hoy.nutrientes + realce.realceNutri * cantidad),
    salud: tope(hoy.salud + realce.realceSalud * cantidad),
  };
}

export type EstadoArbol = { clave: 'OPTIMO' | 'ATENCIÓN' | 'CRITICO'; etiqueta: string };

/** El semáforo que ve el donante: primero manda lo que más duele. */
export function estadoDelArbol(n: NivelesArbol): EstadoArbol {
  const minimo = Math.min(n.agua, n.nutrientes);
  if (minimo < 35 || n.salud < 60) return { clave: 'CRITICO', etiqueta: 'Necesita atención esta semana' };
  if (minimo < 60 || n.salud < 82) return { clave: 'ATENCIÓN', etiqueta: 'Está bien, pero se le agradece un mimo' };
  return { clave: 'OPTIMO', etiqueta: 'Sano y bien atendido' };
}
