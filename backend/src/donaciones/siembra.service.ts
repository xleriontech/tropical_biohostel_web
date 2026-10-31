import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Apadrinamiento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DonacionesService } from './donaciones.service';
import { aplicaMimamiento, estadoDelArbol, nivelesAlDia } from './niveles';

export const CLAVE_CONFIG = 'siembraTablero';

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface ConfigSiembra {
  filas: number;
  columnas: number;
  reservaMinutos: number;
  montoPorArbol: number | null;
  moneda: string | null;
  proyectoSlug: string | null;
}

const CONFIG_BASE: ConfigSiembra = {
  filas: 9,
  columnas: 9,
  reservaMinutos: 30,
  montoPorArbol: null,
  moneda: null,
  proyectoSlug: 'siembra-100-arboles-nativos',
};

const entero = (v: any, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return n;
};

const redondo = (v: number) => Math.round(v * 100) / 100;

@Injectable()
export class SiembraService {
  constructor(
    private prisma: PrismaService,
    private donaciones: DonacionesService,
  ) {}

  private async config(): Promise<ConfigSiembra> {
    const row = await this.prisma.siteConfig.findUnique({ where: { key: CLAVE_CONFIG } });
    const v = ((row?.value || {}) as any) as Partial<ConfigSiembra>;
    return {
      filas: entero(v.filas, 1, 40, CONFIG_BASE.filas),
      columnas: entero(v.columnas, 1, 40, CONFIG_BASE.columnas),
      reservaMinutos: entero(v.reservaMinutos, 5, 240, CONFIG_BASE.reservaMinutos),
      montoPorArbol:
        v.montoPorArbol === null || v.montoPorArbol === undefined || !Number.isFinite(Number(v.montoPorArbol))
          ? null
          : Number(v.montoPorArbol),
      moneda: typeof v.moneda === 'string' && /^[A-Z]{3}$/.test(v.moneda) ? v.moneda : CONFIG_BASE.moneda,
      proyectoSlug:
        typeof v.proyectoSlug === 'string' && v.proyectoSlug.trim() ? v.proyectoSlug.trim() : CONFIG_BASE.proyectoSlug,
    };
  }

  private nuevoCodigo() {
    const bytes = randomBytes(8);
    let out = '';
    for (const b of bytes) out += ALFABETO[b % ALFABETO.length];
    return `TB-${out.slice(0, 4)}-${out.slice(4, 8)}`;
  }

  /** Crea las parcelas que falten según la configuración. Nunca borra ni reordena. */
  private async asegurarTablero(cfg: ConfigSiembra) {
    const celdas: { fila: number; columna: number }[] = [];
    for (let f = 0; f < cfg.filas; f++) {
      for (let c = 0; c < cfg.columnas; c++) celdas.push({ fila: f, columna: c });
    }
    await this.prisma.parcela.createMany({ data: celdas, skipDuplicates: true });
  }

  /** Devuelve al tablero las reservas cuyo pago nunca llegó. */
  private async liberarVencidas() {
    const ahora = new Date();
    const vencidas = await this.prisma.parcela.findMany({
      where: { estado: 'RESERVADA', expiraAt: { lt: ahora } },
      select: { id: true },
    });
    if (!vencidas.length) return 0;
    const ids = vencidas.map((p) => p.id);
    await this.prisma.$transaction([
      this.prisma.apadrinamiento.deleteMany({ where: { parcelaId: { in: ids }, confirmado: false } }),
      this.prisma.parcela.updateMany({
        where: { id: { in: ids } },
        data: { estado: 'LIBRE', expiraAt: null },
      }),
    ]);
    return ids.length;
  }

  /** Lo que el donante ve de un árbol en el tablero: sus niveles de hoy y su semáforo. */
  private describeArbol(arbol: Apadrinamiento, ahora: Date) {
    const niveles = nivelesAlDia(arbol, ahora);
    return {
      especie: arbol.especie,
      etapa: arbol.etapa,
      alias: arbol.confirmado ? arbol.alias : null,
      confirmado: arbol.confirmado,
      niveles,
      estado: estadoDelArbol(niveles),
      ultimoRiego: arbol.ultimoRiego,
      ultimoAbono: arbol.ultimoAbono,
    };
  }

  /** La lista de cuidados que publica la finca; viene vacía si todavía no la llena. */
  private async catalogo() {
    const items = await this.prisma.itemCuidado.findMany({
      where: { activo: true },
      orderBy: [{ orden: 'asc' }, { etiqueta: 'asc' }],
    });
    return items.map((i) => ({
      clave: i.clave,
      etiqueta: i.etiqueta,
      categoria: i.categoria,
      unidad: i.unidad,
      precio: Number(i.precio),
      descripcion: i.descripcion,
      realce: { agua: i.realceAgua, nutrientes: i.realceNutri, salud: i.realceSalud },
    }));
  }

  async tablero() {
    const cfg = await this.config();
    await this.asegurarTablero(cfg);
    await this.liberarVencidas();

    const ahora = new Date();
    const parcelas = await this.prisma.parcela.findMany({
      orderBy: [{ fila: 'asc' }, { columna: 'asc' }],
      include: { arbol: true },
    });

    const [paypal, proyecto, cuidados] = await Promise.all([
      this.donaciones.configPublica(),
      cfg.proyectoSlug
        ? this.prisma.proyectoDonacion.findUnique({ where: { slug: cfg.proyectoSlug } })
        : Promise.resolve(null),
      this.catalogo(),
    ]);
    const moneda = proyecto?.moneda || cfg.moneda || paypal.currency || 'USD';

    const ocupadas = parcelas.filter((p) => p.estado === 'OCUPADA');
    const cafe = ocupadas.filter((p) => p.arbol?.especie === 'CAFE').length;

    return {
      filas: cfg.filas,
      columnas: cfg.columnas,
      montoPorArbol: cfg.montoPorArbol,
      moneda,
      reservaMinutos: cfg.reservaMinutos,
      estadisticas: {
        total: parcelas.length,
        libres: parcelas.filter((p) => p.estado === 'LIBRE').length,
        reservadas: parcelas.filter((p) => p.estado === 'RESERVADA').length,
        ocupadas: ocupadas.length,
        cafe,
        cacao: ocupadas.length - cafe,
      },
      // El muro público muestra el alias que el donante eligió; nunca nombre ni correo.
      donantes: ocupadas
        .filter((p) => p.arbol?.alias)
        .slice(0, 24)
        .map((p) => ({ alias: p.arbol!.alias, especie: p.arbol!.especie, etapa: p.arbol!.etapa })),
      pagoHabilitado: (paypal.configurado || this.donaciones.pagoSimulado) && !!proyecto && proyecto.estado === 'ACTIVO',
      // La simulación de desarrollo no es PayPal: la interfaz debe decirlo.
      pagoSimulado: this.donaciones.pagoSimulado && !paypal.configurado,
      proyecto: proyecto
        ? { slug: proyecto.slug, titulo: proyecto.titulo, meta: Number(proyecto.meta || 0), estado: proyecto.estado }
        : null,
      parcelas: parcelas.map((p) => ({
        fila: p.fila,
        columna: p.columna,
        estado: p.estado,
        arbol: p.arbol ? this.describeArbol(p.arbol, ahora) : null,
      })),
      // El catálogo lo pone la finca: si viene vacío, la interfaz no ofrece cuidados.
      cuidados,
    };
  }

  async reservar(input: {
    fila: number;
    columna: number;
    especie: 'CAFE' | 'CACAO';
    monto?: number;
    alias?: string;
    nombre?: string;
    email?: string;
    pais?: string;
    mensaje?: string;
  }) {
    const cfg = await this.config();
    await this.asegurarTablero(cfg);
    await this.liberarVencidas();

    const parcela = await this.prisma.parcela.findUnique({
      where: { fila_columna: { fila: input.fila, columna: input.columna } },
    });
    if (!parcela) throw new NotFoundException('Esa parcela no existe en el tablero.');

    const monto = cfg.montoPorArbol ?? Number(input.monto);
    if (!Number.isFinite(monto) || monto <= 0 || monto > 100000) {
      throw new BadRequestException('Define un monto válido para el árbol.');
    }

    const expiraAt = new Date(Date.now() + cfg.reservaMinutos * 60_000);
    const ahora = new Date();

    // La reserva es atómica: dos donantes sobre la misma casilla y uno pierde.
    const created = await this.prisma.$transaction(async (tx) => {
      const tomados = await tx.parcela.updateMany({
        where: {
          id: parcela.id,
          OR: [{ estado: 'LIBRE' }, { estado: 'RESERVADA', expiraAt: { lt: ahora } }],
        },
        data: { estado: 'RESERVADA', expiraAt },
      });
      if (tomados.count === 0) return null;

      const arbol = await tx.apadrinamiento.create({
        data: {
          codigo: this.nuevoCodigo(),
          parcelaId: parcela.id,
          especie: input.especie,
          alias: input.alias?.trim().slice(0, 40) || null,
          padrino: input.nombre?.trim().slice(0, 120) || null,
          pais: input.pais?.trim().slice(0, 60) || null,
          mensaje: input.mensaje?.trim().slice(0, 500) || null,
        },
      });
      return arbol;
    });
    if (!created) throw new ConflictException('Esa parcela acaba de reservarse. Elige otra casilla del tablero.');

    // De aquí en adelante cualquier fallo (proyecto inactivo, PayPal caído)
    // devuelve la casilla al tablero: la reserva no puede quedar colgando.
    const liberar = () =>
      this.prisma.$transaction([
        this.prisma.apadrinamiento.delete({ where: { id: created.id } }),
        this.prisma.parcela.update({ where: { id: parcela.id }, data: { estado: 'LIBRE', expiraAt: null } }),
      ]);
    try {
      const [paypal, proyecto] = await Promise.all([
        this.donaciones.configPublica(),
        cfg.proyectoSlug
          ? this.prisma.proyectoDonacion.findUnique({ where: { slug: cfg.proyectoSlug } })
          : Promise.resolve(null),
      ]);
      if (!proyecto || proyecto.estado !== 'ACTIVO') {
        throw new BadRequestException('La finca aún no activó el proyecto de apadrinamiento.');
      }
      if (!paypal.configurado && !this.donaciones.pagoSimulado) {
        throw new BadRequestException('PayPal no está configurado para recibir el aporte.');
      }
      const moneda = proyecto.moneda || cfg.moneda || paypal.currency || 'USD';
      const orden = await this.donaciones.crearOrdenParaArbol({
        codigoApadrinamiento: created.codigo,
        proyectoId: proyecto.id,
        monto,
        moneda,
        datos: { nombre: input.nombre, email: input.email, mensaje: input.mensaje },
      });
      return { orderId: orden.orderId, donacionId: orden.donacionId, codigo: created.codigo, expiraAt };
    } catch (e) {
      await liberar();
      throw e;
    }
  }

  /**
   * Comprar cuidados para el árbol de una casilla: todas las líneas viajan en
   * una sola orden y cada mimamiento queda pendiente hasta que se capture el pago.
   */
  async comprarCuidado(input: {
    fila: number;
    columna: number;
    lineas: { clave: string; cantidad: number }[];
  }) {
    const cfg = await this.config();
    const parcela = await this.prisma.parcela.findUnique({
      where: { fila_columna: { fila: input.fila, columna: input.columna } },
      include: { arbol: true },
    });
    if (!parcela) throw new NotFoundException('Esa parcela no existe en el tablero.');
    const arbol = parcela.arbol;
    if (!arbol || !arbol.confirmado) {
      throw new BadRequestException('Esa casilla todavía no tiene un árbol sembrado que atender.');
    }

    const pedidas = input.lineas || [];
    if (!pedidas.length) throw new BadRequestException('Elige al menos un cuidado para tu árbol.');
    if (pedidas.length > 8) throw new BadRequestException('Un mimamiento admite como mucho 8 cuidados.');

    const items = await this.prisma.itemCuidado.findMany({ where: { activo: true } });
    const porClave = new Map(items.map((i) => [i.clave.toUpperCase(), i]));
    const seleccionadas: { item: (typeof items)[number]; cantidad: number }[] = [];
    const vistas = new Set<string>();
    for (const l of pedidas) {
      const item = porClave.get(String(l.clave).trim().toUpperCase());
      if (!item) throw new BadRequestException('Ese cuidado ya no está en la lista de la finca.');
      if (vistas.has(item.id)) throw new BadRequestException(`${item.etiqueta} está repetido en el pedido.`);
      vistas.add(item.id);
      const cantidad = Math.round(Number(l.cantidad));
      if (!Number.isFinite(cantidad) || cantidad < 1 || cantidad > 20) {
        throw new BadRequestException(`De ${item.etiqueta} se pide entre 1 y 20 ${item.unidad}.`);
      }
      seleccionadas.push({ item, cantidad });
    }

    const costoLinea = (l: { item: (typeof items)[number]; cantidad: number }) =>
      redondo(Number(l.item.precio) * l.cantidad);
    const total = redondo(seleccionadas.reduce((s, l) => s + costoLinea(l), 0));
    if (total <= 0 || total > 100000) throw new BadRequestException('El total del mimamiento no es válido.');

    const [paypal, proyecto] = await Promise.all([
      this.donaciones.configPublica(),
      cfg.proyectoSlug
        ? this.prisma.proyectoDonacion.findUnique({ where: { slug: cfg.proyectoSlug } })
        : Promise.resolve(null),
    ]);
    if (!proyecto || proyecto.estado !== 'ACTIVO') {
      throw new BadRequestException('La finca aún no activó el proyecto de apadrinamiento.');
    }
    if (!paypal.configurado && !this.donaciones.pagoSimulado) {
      throw new BadRequestException('PayPal no está configurado para recibir el aporte.');
    }
    const moneda = proyecto.moneda || cfg.moneda || paypal.currency || 'USD';

    const orden = await this.donaciones.crearOrdenParaCuidado({
      arbolId: arbol.id,
      proyectoId: proyecto.id,
      monto: total,
      moneda,
      descripcion: `Mimamiento para el árbol ${arbol.codigo}`,
    });
    await this.prisma.cuidadoAplicado.createMany({
      data: seleccionadas.map((l) => ({
        arbolId: arbol.id,
        itemId: l.item.id,
        donacionId: orden.donacionId,
        etiqueta: l.item.etiqueta,
        unidad: l.item.unidad,
        cantidad: l.cantidad,
        costo: costoLinea(l),
        moneda,
      })),
    });
    return { orderId: orden.orderId, donacionId: orden.donacionId, total, moneda };
  }

  async arbolPorCodigo(codigo: string) {
    const arbol = await this.prisma.apadrinamiento.findUnique({
      where: { codigo: codigo.trim().toUpperCase() },
      include: {
        parcela: true,
        donacion: { select: { estado: true, monto: true, moneda: true, createdAt: true } },
        cuidados: { where: { estado: 'PAGADO' }, orderBy: { createdAt: 'desc' }, take: 24 },
      },
    });
    if (!arbol) throw new NotFoundException('No encontramos ese árbol con ese código.');
    const niveles = nivelesAlDia(arbol);
    return {
      codigo: arbol.codigo,
      especie: arbol.especie,
      etapa: arbol.etapa,
      alias: arbol.alias,
      pais: arbol.pais,
      mensaje: arbol.mensaje,
      notasFinca: arbol.notasFinca,
      confirmado: arbol.confirmado,
      fechaSiembra: arbol.fechaSiembra,
      niveles,
      estado: estadoDelArbol(niveles),
      ultimoRiego: arbol.ultimoRiego,
      ultimoAbono: arbol.ultimoAbono,
      cuidados: arbol.cuidados.map((c) => ({
        etiqueta: c.etiqueta,
        unidad: c.unidad,
        cantidad: Number(c.cantidad),
        costo: Number(c.costo),
        moneda: c.moneda,
        fecha: c.createdAt,
      })),
      parcela: { fila: arbol.parcela.fila, columna: arbol.parcela.columna, estado: arbol.parcela.estado },
      pago: arbol.donacion
        ? { estado: arbol.donacion.estado, monto: Number(arbol.donacion.monto), moneda: arbol.donacion.moneda }
        : null,
    };
  }

  // ---------- admin ----------

  listarArboles() {
    return this.prisma.apadrinamiento.findMany({
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: {
        parcela: { select: { fila: true, columna: true, estado: true } },
        donacion: { select: { estado: true, monto: true, moneda: true } },
      },
    });
  }

  async actualizarArbol(
    id: string,
    data: { etapa?: string; notasFinca?: string; fechaSiembra?: string; confirmado?: boolean },
  ) {
    const patch: any = {};
    if (data.etapa) patch.etapa = data.etapa;
    if (data.notasFinca !== undefined) patch.notasFinca = data.notasFinca?.slice(0, 2000) || null;
    if (data.fechaSiembra) {
      const d = new Date(data.fechaSiembra);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('Fecha de siembra inválida.');
      patch.fechaSiembra = d;
    }
    if (data.confirmado !== undefined) patch.confirmado = !!data.confirmado;
    const arbol = await this.prisma.apadrinamiento.update({ where: { id }, data: patch });
    if (arbol.confirmado) {
      await this.prisma.parcela.update({
        where: { id: arbol.parcelaId },
        data: { estado: 'OCUPADA', expiraAt: null },
      });
    }
    return arbol;
  }

  /** El admin devuelve una casilla al tablero (elimina la reserva sin pago). */
  async liberarParcela(id: string) {
    const parcela = await this.prisma.parcela.findUnique({ where: { id }, include: { arbol: true } });
    if (!parcela) throw new NotFoundException('Parcela no encontrada.');
    if (parcela.arbol?.confirmado) throw new BadRequestException('El árbol ya está sembrado; no se puede liberar.');
    if (parcela.arbol) await this.prisma.apadrinamiento.delete({ where: { id: parcela.arbol.id } });
    await this.prisma.parcela.update({ where: { id }, data: { estado: 'LIBRE', expiraAt: null } });
    return { id, estado: 'LIBRE' };
  }
}
