import { Prisma } from '@prisma/client';

/**
 * Prisma entrega los campos de dinero como Decimal (decimal.js), no como number.
 * Comparaciones tipo `typeof x === 'number'` o `x === 120000` fallan en silencio
 * con ese tipo, así que el dinero se convierte aquí antes de formatear o comparar.
 */
export function aNumero(valor: Prisma.Decimal | number | null | undefined): number | null {
  if (valor === null || valor === undefined) return null;
  return valor instanceof Prisma.Decimal ? valor.toNumber() : valor;
}

/**
 * Convierte cada Decimal de un árbol de datos en number, dejándolo por lo demás
 * intacto. Se usa en dos bordes de salida: el JSON de la API (interceptor) y el
 * JSON que se guarda en caché, porque `Decimal.toJSON()` devuelve un string y
 * `JSON.stringify` lo aplica antes que cualquier replacer.
 */
export function decimalesANumero(valor: unknown): unknown {
  if (valor instanceof Prisma.Decimal) return valor.toNumber();
  if (Array.isArray(valor)) return valor.map(decimalesANumero);
  if (
    valor === null ||
    typeof valor !== 'object' ||
    valor instanceof Date ||
    valor instanceof Buffer ||
    valor instanceof RegExp ||
    valor instanceof Map ||
    valor instanceof Set
  ) {
    return valor;
  }
  return Object.fromEntries(
    Object.entries(valor as Record<string, unknown>).map(([k, v]) => [k, decimalesANumero(v)]),
  );
}
