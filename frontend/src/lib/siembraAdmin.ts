/**
 * Cliente del panel de administración de la finca.
 *
 * Habla con el PHP del cPanel (`admin_api.php`), no con NestJS: este panel es
 * independiente del login del admin general, así la finca puede entrar con su
 * propia cuenta aunque el backend NestJS esté caído o sin datos.
 *
 *   NEXT_PUBLIC_SIEMBRA_API_URL=https://xlerion.com.co/siembra
 *
 * El token (12 h) se guarda en sessionStorage: se pierde al cerrar la pestaña,
 * que es lo deseable en un equipo compartido.
 */

const API = (
  process.env.NEXT_PUBLIC_SIEMBRA_API_URL || "https://xlerion.com.co/siembra"
).replace(/\/+$/, "");

const CLAVE_TOKEN = "siembraAdminToken";
const CLAVE_USUARIO = "siembraAdminUsuario";

export class SesionVencida extends Error {
  constructor() {
    super("Tu sesión venció. Vuelve a entrar.");
    this.name = "SesionVencida";
  }
}

/** El servidor bloqueó esta IP por demasiados intentos fallidos. */
export class DemasiadosIntentos extends Error {
  segundos: number;

  constructor(mensaje: string, segundos: number) {
    super(mensaje);
    this.name = "DemasiadosIntentos";
    this.segundos = segundos;
  }
}

export function guardarSesion(token: string, usuario: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CLAVE_TOKEN, token);
  sessionStorage.setItem(CLAVE_USUARIO, usuario);
}

export function leerToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(CLAVE_TOKEN);
}

export function leerUsuario(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(CLAVE_USUARIO) || "";
}

export function borrarSesion() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CLAVE_TOKEN);
  sessionStorage.removeItem(CLAVE_USUARIO);
}

async function pedir<T>(
  accion: string,
  opciones: {
    metodo?: "GET" | "POST";
    cuerpo?: unknown;
    conToken?: boolean;
    parametros?: Record<string, string | number>;
  } = {}
): Promise<T> {
  const { metodo = "GET", cuerpo, conToken = true, parametros } = opciones;

  const query = new URLSearchParams({ accion });
  if (parametros) {
    for (const [k, v] of Object.entries(parametros)) {
      query.set(k, String(v));
    }
  }

  const cabeceras: Record<string, string> = { "Content-Type": "application/json" };
  if (conToken) {
    const token = leerToken();
    if (!token) throw new SesionVencida();
    cabeceras.Authorization = `Bearer ${token}`;
  }

  let r: Response;
  try {
    r = await fetch(`${API}/admin_api.php?${query.toString()}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new Error("No pudimos contactar el servidor de la finca. Revisa tu conexión.");
  }

  const datos = await r.json().catch(() => null);

  if (r.status === 401) {
    borrarSesion();
    throw new SesionVencida();
  }
  if (r.status === 429) {
    throw new DemasiadosIntentos(
      datos?.error || "Demasiados intentos. Espera unos minutos.",
      Number(datos?.reintentarEnSegundos) || 60
    );
  }
  if (!r.ok || (datos && datos.success === false)) {
    throw new Error(
      datos?.error || datos?.message || `El servidor respondió ${r.status}.`
    );
  }
  return datos as T;
}

/* ------------------------------------------------------------------- tipos */

export type Especie = "CAFE" | "CACAO";
export type Etapa = "SEMILLA" | "BROTE" | "JUVENIL" | "PRODUCTIVO";

export interface Niveles {
  agua: number;
  nutrientes: number;
  salud: number;
}

export interface ArbolAdmin {
  id: string;
  codigo: string;
  parcelaId: string;
  fila: number | null;
  columna: number | null;
  parcelaEstado: string | null;
  expiraAt: string | null;
  especie: Especie;
  etapa: Etapa;
  alias: string | null;
  padrino: string | null;
  pais: string | null;
  mensaje: string | null;
  notasFinca: string | null;
  confirmado: boolean;
  fechaSiembra: string | null;
  niveles: Niveles;
  ultimoRiego: string | null;
  ultimoAbono: string | null;
  createdAt: string;
  donacion: {
    id: string;
    monto: number;
    moneda: string;
    estado: string;
    nombre: string | null;
    email: string | null;
  } | null;
}

export interface DonacionAdmin {
  id: string;
  proyectoId: string;
  monto: string | number;
  moneda: string;
  nombre: string | null;
  email: string | null;
  mensaje: string | null;
  paypalOrderId: string | null;
  estado: string;
  esManual: number | boolean;
  createdAt: string;
  proyecto: string | null;
  arbolCodigo: string | null;
}

export interface ConfigTablero {
  filas: number;
  columnas: number;
  reservaMinutos: number;
  montoPorArbol: number | null;
  moneda: string;
  proyectoSlug: string;
}

export interface Resumen {
  success: true;
  usuario: string;
  parcelas: { total: number; libres: number; reservadas: number; ocupadas: number };
  arboles: { total: number; confirmados: number; pendientes: number };
  dinero: { recaudado: number; donaciones: number; pendientes: number };
  cuidados: { total: number; costo: number };
  config: ConfigTablero;
  proyecto: {
    slug: string;
    titulo: string;
    meta: number;
    moneda: string;
    estado: string;
  } | null;
  ultimas: {
    id: string;
    monto: string | number;
    moneda: string;
    nombre: string | null;
    email: string | null;
    estado: string;
    createdAt: string;
    arbolCodigo: string | null;
  }[];
}

/* -------------------------------------------------------------------- API */

export function iniciarSesion(usuario: string, clave: string) {
  return pedir<{ success: true; token: string; usuario: string; expiraEnHoras: number }>(
    "login",
    { metodo: "POST", cuerpo: { usuario, clave }, conToken: false }
  );
}

export const cargaResumen = () => pedir<Resumen>("resumen");

export const cargaArboles = (estado: "todos" | "sembrados" | "pendientes" = "todos") =>
  pedir<{ success: true; arboles: ArbolAdmin[] }>("arboles", { parametros: { estado } });

export const cargaDonaciones = () =>
  pedir<{
    success: true;
    donaciones: DonacionAdmin[];
    totales: Record<string, number>;
    totalRegistros: number;
  }>("donaciones");

export const cargaConfig = () =>
  pedir<{ success: true; config: ConfigTablero; moneda: string }>("config");

export const marcarSembrado = (codigo: string) =>
  pedir<{ success: true; mensaje: string }>("confirmar", {
    metodo: "POST",
    cuerpo: { codigo },
  });

export const liberarCasilla = (codigo: string) =>
  pedir<{ success: true; mensaje: string }>("liberar", {
    metodo: "POST",
    cuerpo: { codigo },
  });

export function actualizarArbol(
  codigo: string,
  cambios: {
    especie?: Especie;
    etapa?: Etapa;
    alias?: string;
    pais?: string;
    mensaje?: string;
    notasFinca?: string;
  }
) {
  return pedir<{ success: true; mensaje: string }>("actualizar", {
    metodo: "POST",
    cuerpo: { codigo, ...cambios },
  });
}

export function guardarConfig(cambios: {
  montoPorArbol?: number | null;
  reservaMinutos?: number;
  proyectoSlug?: string;
}) {
  return pedir<{ success: true; mensaje: string; config: ConfigTablero }>(
    "config_guardar",
    { metodo: "POST", cuerpo: cambios }
  );
}

export function cambiarClave(actual: string, nueva: string) {
  return pedir<{ success: true; mensaje: string }>("clave", {
    metodo: "POST",
    cuerpo: { actual, nueva },
  });
}
