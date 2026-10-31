import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { IntegracionesService } from '../integraciones/integraciones.service';
import { aplicaMimamiento, nivelesAlDia } from './niveles';

export interface PaypalPublic {
  clientId: string;
  mode: 'sandbox' | 'live';
  currency: string;
  paypalMe: string;
}

const basePaypal = (mode: string) =>
  mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

function slugify(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

@Injectable()
export class DonacionesService {
  private readonly logger = new Logger(DonacionesService.name);

  constructor(
    private prisma: PrismaService,
    private claves: IntegracionesService,
  ) {}

  // ---------- configuración PayPal ----------

  async configPublica(): Promise<PaypalPublic & { configurado: boolean }> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'paypal-public' } });
    const v = ((cfg?.value || {}) as unknown) as Partial<PaypalPublic>;
    return {
      clientId: v.clientId || '',
      mode: v.mode === 'live' ? 'live' : 'sandbox',
      currency: v.currency || 'USD',
      paypalMe: v.paypalMe || '',
      configurado: !!v.clientId,
    };
  }

  /**
   * Pago simulado para probar el flujo de siembra sin credenciales de PayPal.
   * Se activa con SIEMBRA_PAGO_SIMULADO=1 y solo fuera de producción: sin las
   * dos cosas, el aporte pasa por PayPal como siempre.
   */
  get pagoSimulado(): boolean {
    return process.env.SIEMBRA_PAGO_SIMULADO === '1' && process.env.NODE_ENV !== 'production';
  }

  private async credenciales() {
    const pub = await this.configPublica();
    if (!pub.clientId) throw new BadRequestException('PayPal no configurado (falta Client ID).');
    let secret = '';
    try {
      secret = (await this.claves.valorInterno('paypal_secret')) || '';
    } catch {
      secret = '';
    }
    if (!secret) throw new BadRequestException('PayPal no configurado (falta Client Secret en Claves API).');
    return { ...pub, secret };
  }

  private async tokenPaypal(base: string, clientId: string, secret: string): Promise<string> {
    const r = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${secret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!r.ok) throw new BadRequestException('PayPal rechazó las credenciales. Revisa Client ID/Secret y el modo.');
    const data = await r.json();
    return data.access_token;
  }

  // ---------- flujo público: crear orden y capturar ----------

  private async ordenPaypal(monto: number, moneda: string, descripcion: string, customId: string) {
    const { clientId, secret, mode } = await this.credenciales();
    const base = basePaypal(mode);
    const token = await this.tokenPaypal(base, clientId, secret);
    const r = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            custom_id: customId,
            description: descripcion.slice(0, 120),
            amount: { currency_code: moneda, value: monto.toFixed(2) },
          },
        ],
      }),
    });
    if (!r.ok) throw new BadRequestException('PayPal no pudo crear la orden.');
    const order = await r.json();
    return order.id as string;
  }

  async crearOrden(proyectoId: string, monto: number, datos?: { nombre?: string; email?: string; mensaje?: string }) {
    if (!monto || monto <= 0 || monto > 100000) throw new BadRequestException('Monto inválido.');
    const proyecto = await this.prisma.proyectoDonacion.findUnique({ where: { id: proyectoId } });
    if (!proyecto || proyecto.estado !== 'ACTIVO') throw new BadRequestException('Proyecto no disponible.');
    const orderId = await this.ordenPaypal(monto, proyecto.moneda, `Donación: ${proyecto.titulo}`, proyecto.id);
    await this.prisma.donacion.create({
      data: {
        proyectoId: proyecto.id,
        monto,
        moneda: proyecto.moneda,
        nombre: datos?.nombre?.slice(0, 120),
        email: datos?.email?.slice(0, 160),
        mensaje: datos?.mensaje?.slice(0, 500),
        paypalOrderId: orderId,
        estado: 'PENDIENTE',
      },
    });
    return { orderId };
  }

  /** Orden de PayPal vinculada a un árbol ya reservado en el tablero de siembra. */
  async crearOrdenParaArbol(opts: {
    codigoApadrinamiento: string;
    proyectoId: string;
    monto: number;
    moneda: string;
    datos?: { nombre?: string; email?: string; mensaje?: string };
  }) {
    if (!opts.monto || opts.monto <= 0 || opts.monto > 100000) throw new BadRequestException('Monto inválido.');
    const arbol = await this.prisma.apadrinamiento.findUnique({ where: { codigo: opts.codigoApadrinamiento } });
    if (!arbol || arbol.confirmado) throw new BadRequestException('La reserva de ese árbol ya no está activa.');
    const orderId = this.pagoSimulado
      ? `SIM-${randomBytes(8).toString('hex').toUpperCase()}`
      : await this.ordenPaypal(
          opts.monto,
          opts.moneda,
          `Apadrinamiento árbol ${opts.codigoApadrinamiento}`,
          arbol.id,
        );
    const don = await this.prisma.donacion.create({
      data: {
        proyectoId: opts.proyectoId,
        monto: opts.monto,
        moneda: opts.moneda,
        nombre: opts.datos?.nombre?.slice(0, 120),
        email: opts.datos?.email?.slice(0, 160),
        mensaje: opts.datos?.mensaje?.slice(0, 500),
        paypalOrderId: orderId,
        estado: 'PENDIENTE',
      },
    });
    await this.prisma.apadrinamiento.update({ where: { id: arbol.id }, data: { donacionId: don.id } });
    return { orderId, donacionId: don.id };
  }

  /**
   * Orden de PayPal para mimar un árbol ya sembrado: riego, abono, sustrato o
   * jornal. Las líneas ya las resolvió SiembraService contra el catálogo.
   */
  async crearOrdenParaCuidado(opts: {
    arbolId: string;
    proyectoId: string;
    monto: number;
    moneda: string;
    descripcion: string;
  }) {
    if (!opts.monto || opts.monto <= 0 || opts.monto > 100000) throw new BadRequestException('Monto inválido.');
    const orderId = this.pagoSimulado
      ? `SIM-${randomBytes(8).toString('hex').toUpperCase()}`
      : await this.ordenPaypal(opts.monto, opts.moneda, opts.descripcion, opts.arbolId);
    const don = await this.prisma.donacion.create({
      data: {
        proyectoId: opts.proyectoId,
        monto: opts.monto,
        moneda: opts.moneda,
        paypalOrderId: orderId,
        estado: 'PENDIENTE',
      },
    });
    return { orderId, donacionId: don.id };
  }

  async capturarOrden(orderId: string) {
    const don = await this.prisma.donacion.findUnique({ where: { paypalOrderId: orderId } });
    if (!don) throw new BadRequestException('Orden no encontrada.');
    if (don.estado === 'APROBADA') return { estado: don.estado, donacionId: don.id };
    if (orderId.startsWith('SIM-')) {
      if (!this.pagoSimulado) throw new BadRequestException('Esa orden es de prueba y aquí no se cobra.');
      return this.confirmaPago(don.id, null);
    }
    const { clientId, secret, mode } = await this.credenciales();
    const base = basePaypal(mode);
    const token = await this.tokenPaypal(base, clientId, secret);
    const r = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data.status !== 'COMPLETED') {
      await this.prisma.donacion.update({
        where: { id: don.id },
        data: { estado: 'CANCELADA' },
      });
      throw new BadRequestException('El pago no se completó en PayPal.');
    }
    const captureId =
      data.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;
    return this.confirmaPago(don.id, captureId);
  }

  /**
   * Un pago confirmado —de PayPal o de la simulación de desarrollo— siembra el
   * árbol en el tablero: la reserva pasa a casilla ocupada con su fecha.
   */
  private async confirmaPago(donacionId: string, captureId: string | null) {
    const updated = await this.prisma.donacion.update({
      where: { id: donacionId },
      data: { estado: 'APROBADA', paypalCaptureId: captureId },
      include: { proyecto: { select: { titulo: true } }, apadrinamiento: true },
    });

    if (updated.apadrinamiento) {
      const arbol = updated.apadrinamiento;
      await this.prisma.$transaction([
        this.prisma.apadrinamiento.update({
          where: { id: arbol.id },
          data: { confirmado: true, fechaSiembra: arbol.fechaSiembra || new Date() },
        }),
        this.prisma.parcela.update({
          where: { id: arbol.parcelaId },
          data: { estado: 'OCUPADA', expiraAt: null },
        }),
      ]);
    }

    const cuidados = await this.aplicarCuidados(updated.id);

    return {
      estado: updated.estado,
      donacionId: updated.id,
      proyecto: updated.proyecto.titulo,
      codigo: updated.apadrinamiento?.codigo || null,
      cuidados,
    };
  }

  /**
   * Los mimamientos pagados se aplican al árbol: las barras suben lo que diga
   * el catálogo y el parte de la finca queda con la fecha del riego o del abono.
   */
  private async aplicarCuidados(donacionId: string) {
    const compras = await this.prisma.cuidadoAplicado.findMany({
      where: { donacionId, estado: 'PENDIENTE' },
      include: { item: true },
    });
    if (!compras.length) return 0;
    const ahora = new Date();

    // Una orden puede atender varios árboles; se agrupa para no leerlos dos veces.
    const porArbol = new Map<string, typeof compras>();
    for (const c of compras) {
      const prev = porArbol.get(c.arbolId) || [];
      prev.push(c);
      porArbol.set(c.arbolId, prev);
    }

    for (const [arbolId, lineas] of porArbol) {
      const arbol = await this.prisma.apadrinamiento.findUnique({ where: { id: arbolId } });
      if (!arbol) continue;
      let niveles = nivelesAlDia(arbol, ahora);
      for (const l of lineas) niveles = aplicaMimamiento(niveles, l.item, Number(l.cantidad));
      const rego = lineas.some((l) => l.item.categoria === 'AGUA');
      const fertilizo = lineas.some((l) => l.item.categoria === 'ABONO' || l.item.categoria === 'SUSTRATO');
      await this.prisma.apadrinamiento.update({
        where: { id: arbolId },
        data: {
          aguaNivel: niveles.agua,
          nutrienteNivel: niveles.nutrientes,
          saludNivel: niveles.salud,
          nivelesEn: ahora,
          ...(rego ? { ultimoRiego: ahora } : {}),
          ...(fertilizo ? { ultimoAbono: ahora } : {}),
        },
      });
    }

    await this.prisma.cuidadoAplicado.updateMany({
      where: { id: { in: compras.map((c) => c.id) } },
      data: { estado: 'PAGADO' },
    });
    return compras.length;
  }

  // ---------- consulta pública ----------

  private async conRecaudado(where: any) {
    const proyectos = await this.prisma.proyectoDonacion.findMany({
      where,
      orderBy: [{ orden: 'asc' }, { createdAt: 'desc' }],
    });
    const sums = await this.prisma.donacion.groupBy({
      by: ['proyectoId'],
      where: { estado: 'APROBADA' },
      _sum: { monto: true },
      _count: { _all: true },
    });
    const mapa = new Map(sums.map((s) => [s.proyectoId, s]));
    return proyectos.map((p) => ({
      ...p,
      recaudado: mapa.get(p.id)?._sum.monto || 0,
      donantes: mapa.get(p.id)?._count._all || 0,
    }));
  }

  proyectosActivos() {
    return this.conRecaudado({ estado: 'ACTIVO' });
  }

  async proyectoPorSlug(slug: string) {
    const list = await this.conRecaudado({ slug });
    const p = list[0];
    if (!p) throw new BadRequestException('Proyecto no encontrado.');
    const recientes = await this.prisma.donacion.findMany({
      where: { proyectoId: p.id, estado: 'APROBADA' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { nombre: true, monto: true, moneda: true, mensaje: true, createdAt: true, esManual: true },
    });
    return { ...p, recientes };
  }

  // ---------- admin ----------

  resumen() {
    return this.conRecaudado({});
  }

  crearProyecto(data: {
    titulo: string;
    descripcion: string;
    categoria?: string;
    meta?: number | null;
    moneda?: string;
    imagenUrl?: string;
    media?: { tipo: string; url: string }[];
    paypalLink?: string;
  }) {
    let slug = slugify(data.titulo);
    if (!slug) throw new BadRequestException('Título inválido.');
    const media = (data.media || [])
      .filter((m) => m && (m.tipo === 'imagen' || m.tipo === 'video') && typeof m.url === 'string' && m.url.trim())
      .slice(0, 12)
      .map((m) => ({ tipo: m.tipo, url: m.url.trim().slice(0, 500) }));
    return this.prisma.proyectoDonacion
      .create({
        data: {
          titulo: data.titulo,
          slug,
          descripcion: data.descripcion,
          categoria: (data.categoria || 'GENERAL') as any,
          meta: data.meta || null,
          moneda: data.moneda || 'USD',
          imagenUrl: data.imagenUrl || null,
          media,
          paypalLink: data.paypalLink || null,
        },
      })
      .catch(() => {
        // slug duplicado: agrega sufijo
        slug = `${slug}-${Date.now().toString(36)}`;
        return this.prisma.proyectoDonacion.create({
          data: {
            titulo: data.titulo,
            slug,
            descripcion: data.descripcion,
            categoria: (data.categoria || 'GENERAL') as any,
            meta: data.meta || null,
            moneda: data.moneda || 'USD',
            imagenUrl: data.imagenUrl || null,
            media,
            paypalLink: data.paypalLink || null,
          },
        });
      });
  }

  actualizarProyecto(
    id: string,
    data: Partial<{
      titulo: string;
      descripcion: string;
      categoria: string;
      meta: number | null;
      moneda: string;
      imagenUrl: string | null;
      media: { tipo: string; url: string }[];
      paypalLink: string | null;
      estado: string;
      orden: number;
    }>,
  ) {
    const patch: any = { ...data };
    if (patch.meta === 0) patch.meta = null;
    if (patch.media !== undefined) {
      patch.media = (Array.isArray(patch.media) ? patch.media : [])
        .filter((m: any) => m && (m.tipo === 'imagen' || m.tipo === 'video') && typeof m.url === 'string' && m.url.trim())
        .slice(0, 12)
        .map((m: any) => ({ tipo: m.tipo, url: m.url.trim().slice(0, 500) }));
    }
    return this.prisma.proyectoDonacion.update({ where: { id }, data: patch });
  }

  eliminarProyecto(id: string) {
    return this.prisma.proyectoDonacion.delete({ where: { id } });
  }

  listarDonaciones(proyectoId?: string) {
    return this.prisma.donacion.findMany({
      where: proyectoId ? { proyectoId } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { proyecto: { select: { titulo: true } } },
    });
  }

  registrarManual(data: {
    proyectoId: string;
    monto: number;
    moneda?: string;
    nombre?: string;
    email?: string;
    mensaje?: string;
  }) {
    if (!data.monto || data.monto <= 0) throw new BadRequestException('Monto inválido.');
    return this.prisma.donacion.create({
      data: {
        proyectoId: data.proyectoId,
        monto: data.monto,
        moneda: data.moneda || 'USD',
        nombre: data.nombre,
        email: data.email,
        mensaje: data.mensaje,
        estado: 'APROBADA',
        esManual: true,
      },
    });
  }
}
