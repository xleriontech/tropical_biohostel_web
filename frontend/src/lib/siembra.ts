export type Especie = "CAFE" | "CACAO";
export type Etapa = "SEMILLA" | "BROTE" | "JUVENIL" | "PRODUCTIVO";
export type EstadoCasilla = "LIBRE" | "RESERVADA" | "OCUPADA";
export type CategoriaCuidado = "AGUA" | "ABONO" | "SUSTRATO" | "CUIDADO";

/** Cómo está de atendido un árbol hoy: lo calcula el backend al leer la fila. */
export interface Niveles {
  agua: number;
  nutrientes: number;
  salud: number;
}

export interface EstadoArbol {
  clave: "OPTIMO" | "ATENCIÓN" | "CRITICO";
  etiqueta: string;
}

/** Lo que la finca publica que cuesta atender un árbol. */
export interface ItemCuidado {
  clave: string;
  etiqueta: string;
  categoria: CategoriaCuidado;
  unidad: string;
  precio: number;
  descripcion: string | null;
  realce: { agua: number; nutrientes: number; salud: number };
}

export interface Mimamiento {
  etiqueta: string;
  unidad: string;
  cantidad: number;
  costo: number;
  moneda: string;
  fecha: string;
}

export interface ArbolTablero {
  especie: Especie;
  etapa: Etapa;
  alias: string | null;
  confirmado: boolean;
  niveles: Niveles;
  estado: EstadoArbol;
  ultimoRiego: string | null;
  ultimoAbono: string | null;
}

export interface ParcelaTablero {
  fila: number;
  columna: number;
  estado: EstadoCasilla;
  arbol: ArbolTablero | null;
}

export interface Tablero {
  filas: number;
  columnas: number;
  montoPorArbol: number | null;
  moneda: string;
  reservaMinutos: number;
  estadisticas: {
    total: number;
    libres: number;
    reservadas: number;
    ocupadas: number;
    cafe: number;
    cacao: number;
  };
  donantes: { alias: string; especie: Especie; etapa: Etapa }[];
  pagoHabilitado: boolean;
  /** El entorno de pruebas simula el pago: no hay PayPal configurado. */
  pagoSimulado: boolean;
  proyecto: { slug: string; titulo: string; meta: number; estado: string } | null;
  parcelas: ParcelaTablero[];
  /** La lista de cuidados; vacía hasta que la finca la publique. */
  cuidados: ItemCuidado[];
}

export interface Ficha {
  codigo: string;
  especie: Especie;
  etapa: Etapa;
  alias: string | null;
  pais: string | null;
  mensaje: string | null;
  notasFinca: string | null;
  confirmado: boolean;
  fechaSiembra: string | null;
  niveles: Niveles;
  estado: EstadoArbol;
  ultimoRiego: string | null;
  ultimoAbono: string | null;
  cuidados: Mimamiento[];
  parcela: { fila: number; columna: number; estado: EstadoCasilla };
  pago: { estado: string; monto: number; moneda: string } | null;
}

export interface Reserva {
  /** Sin pasarela de pago configurada viene null: el árbol ya quedó confirmado. */
  orderId: string | null;
  donacionId: string;
  codigo: string;
  expiraAt: string | null;
  confirmado: boolean;
}

export interface OrdenCuidado {
  /** Sin pasarela de pago configurada viene null: el mimo ya quedó aplicado. */
  orderId: string | null;
  donacionId: string;
  total: number;
  moneda: string;
}

/**
 * Base del API de siembra, que vive en el cPanel (PHP + MariaDB).
 * Se configura aparte de NEXT_PUBLIC_API_URL porque el resto del sitio sigue
 * hablando con el backend NestJS.
 *
 *   NEXT_PUBLIC_SIEMBRA_API_URL=https://xlerion.com.co/siembra
 *
 * Los archivos PHP son frontend/src/app/donaciones/siembra/*.php y se publican
 * en public_html/siembra/ del cPanel.
 */
const API = (
  process.env.NEXT_PUBLIC_SIEMBRA_API_URL || "https://xlerion.com.co/siembra"
).replace(/\/+$/, "");

const url = (p: string) => `${API}${p}`;

async function leer<T>(ruta: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url(ruta), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || (data && data.success === false)) {
    throw new Error(data?.error || data?.message || `No se pudo cargar ${ruta}`);
  }
  return data as T;
}

export const cargaTablero = () => leer<Tablero>("/tablero.php");

export const cargaFicha = (codigo: string) =>
  leer<Ficha>(`/arbol.php?codigo=${encodeURIComponent(codigo)}`);

export function reservaArbol(input: {
  fila: number;
  columna: number;
  especie: Especie;
  monto?: number;
  alias?: string;
  nombre?: string;
  email?: string;
  pais?: string;
  mensaje?: string;
}) {
  return leer<Reserva>("/reserva.php", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Comprar riego, abono, sustrato o jornal para el árbol de una casilla. */
export function compraCuidados(input: {
  fila: number;
  columna: number;
  lineas: { clave: string; cantidad: number }[];
}) {
  return leer<OrdenCuidado>("/cuidado.php", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Confirma el pago de una orden. Con el flujo simulado no hay orden externa
 * (orderId null): el backend PHP ya confirmó la siembra o el mimamiento.
 */
export async function capturaPago(orderId: string | null) {
  if (!orderId) {
    return { estado: "APROBADA", codigo: null };
  }
  return leer<{ estado: string; codigo: string | null; cuidados?: number }>("/capturar.php", {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
}

export const ETAPAS: Record<Etapa, { label: string; descripcion: string }> = {
  SEMILLA: { label: "Semilla", descripcion: "El árbol acaba de nacer en el vivero." },
  BROTE: { label: "Brote", descripcion: "Ya está en la tierra y asoma sus primeras hojas." },
  JUVENIL: { label: "Juvenil", descripcion: "Prende fuerza entre la sombra del bosque." },
  PRODUCTIVO: { label: "Productivo", descripcion: "Da fruto: café o cacao para la finca." },
};

export const ESPECIES: Record<Especie, { label: string; nota: string }> = {
  CAFE: { label: "Café", nota: "Variedad de ladera, recogida a mano." },
  CACAO: { label: "Cacao", nota: "Árbol de sombra, crece bajo el dosel." },
};
