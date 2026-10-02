import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegracionesService } from '../integraciones/integraciones.service';

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

  async crearOrden(proyectoId: string, monto: number, datos?: { nombre?: string; email?: string; mensaje?: string }) {
    if (!monto || monto <= 0 || monto > 100000) throw new BadRequestException('Monto inválido.');
    const proyecto = await this.prisma.proyectoDonacion.findUnique({ where: { id: proyectoId } });
    if (!proyecto || proyecto.estado !== 'ACTIVO') throw new BadRequestException('Proyecto no disponible.');
    const { clientId, secret, mode, currency } = await this.credenciales();
    const base = basePaypal(mode);
    const token = await this.tokenPaypal(base, clientId, secret);
    const r = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            custom_id: proyecto.id,
            description: `Donación: ${proyecto.titulo}`.slice(0, 120),
            amount: { currency_code: proyecto.moneda || currency, value: monto.toFixed(2) },
          },
        ],
      }),
    });
    if (!r.ok) throw new BadRequestException('PayPal no pudo crear la orden.');
    const order = await r.json();
    await this.prisma.donacion.create({
      data: {
        proyectoId: proyecto.id,
        monto,
        moneda: proyecto.moneda || currency,
        nombre: datos?.nombre?.slice(0, 120),
        email: datos?.email?.slice(0, 160),
        mensaje: datos?.mensaje?.slice(0, 500),
        paypalOrderId: order.id,
        estado: 'PENDIENTE',
      },
    });
    return { orderId: order.id };
  }

  async capturarOrden(orderId: string) {
    const don = await this.prisma.donacion.findUnique({ where: { paypalOrderId: orderId } });
    if (!don) throw new BadRequestException('Orden no encontrada.');
    if (don.estado === 'APROBADA') return { estado: don.estado, donacionId: don.id };
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
    const updated = await this.prisma.donacion.update({
      where: { id: don.id },
      data: { estado: 'APROBADA', paypalCaptureId: captureId },
      include: { proyecto: { select: { titulo: true } } },
    });
    return { estado: updated.estado, donacionId: updated.id, proyecto: updated.proyecto.titulo };
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
