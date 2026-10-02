import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Bloqueo, parseIcs, fusionarRangos, rangosSeTraslapan, etiquetaFuente, toDayKey } from './ical.util';
import { randomBytes } from 'crypto';

export interface Disponibilidad {
  disponible: boolean;
  desde: string;
  hasta: string;
  bloqueos: Bloqueo[];
  conflictoCon: Bloqueo | null;
}

@Injectable()
export class CalendarioService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /** Bloqueos propios (reservas PENDIENTE/CONFIRMADA, sin datos personales). */
  async bloqueosPropios(propiedadId: string): Promise<Bloqueo[]> {
    const reservas = await this.prisma.reserva.findMany({
      where: { propiedadId, estado: { in: ['PENDIENTE', 'CONFIRMADA'] } },
      select: { fechaLlegada: true, fechaSalida: true },
    });
    return fusionarRangos(
      reservas.map((r) => ({
        desde: toDayKey(new Date(r.fechaLlegada)),
        hasta: toDayKey(new Date(r.fechaSalida)),
        fuente: 'TROPICAL BIOHOSTEL',
      })),
    );
  }

  /** Bloqueos externos (Airbnb/Booking/...) con caché de 1 hora. */
  async bloqueosExternos(propiedadId: string, forzar = false): Promise<{ bloqueos: Bloqueo[]; sincronizadoEn: string | null }> {
    const prop = await this.prisma.propiedad.findUnique({
      where: { id: propiedadId },
      select: { icalImportUrls: true, lastIcalSyncAt: true },
    });
    if (!prop || !prop.icalImportUrls || prop.icalImportUrls.length === 0) {
      return { bloqueos: [], sincronizadoEn: prop?.lastIcalSyncAt?.toISOString() || null };
    }
    const cacheKey = `ical:${propiedadId}`;
    if (!forzar) {
      const cached = await this.redis.get<Bloqueo[]>(cacheKey);
      if (cached) return { bloqueos: cached, sincronizadoEn: prop.lastIcalSyncAt?.toISOString() || null };
    }
    const todos: Bloqueo[] = [];
    for (const [i, url] of prop.icalImportUrls.entries()) {
      if (!url || !/^https?:\/\//i.test(url)) continue;
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'TROPICAL BIOHOSTEL-Turismo/1.0' },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) continue;
        const text = (await res.text()).slice(0, 2000000);
        todos.push(...parseIcs(text, etiquetaFuente(url, i)));
      } catch {
        // un calendario caído no bloquea a los demás
      }
    }
    const merged = fusionarRangos(todos);
    await this.redis.set(cacheKey, merged, 3600);
    const now = new Date();
    await this.prisma.propiedad.update({
      where: { id: propiedadId },
      data: { lastIcalSyncAt: now },
    });
    return { bloqueos: merged, sincronizadoEn: now.toISOString() };
  }

  /** Disponibilidad combinada para un rango [desde, hasta). */
  async disponibilidadPorSlug(slug: string, desde: string, hasta: string): Promise<Disponibilidad> {
    const prop = await this.prisma.propiedad.findUnique({ where: { slug } });
    if (!prop) throw new Error('Propiedad no encontrada');
    return this.disponibilidad(prop.id, desde, hasta);
  }

  async disponibilidad(propiedadId: string, desde: string, hasta: string): Promise<Disponibilidad> {
    const propios = await this.bloqueosPropios(propiedadId);
    const { bloqueos: externos } = await this.bloqueosExternos(propiedadId);
    const todos = fusionarRangos([...propios, ...externos]);
    const conflicto = todos.find((b) => rangosSeTraslapan(desde, hasta, b.desde, b.hasta)) || null;
    return { disponible: !conflicto, desde, hasta, bloqueos: todos, conflictoCon: conflicto };
  }

  /** Guarda URLs de importación (crea token de exportación si no existe). */
  async guardarImportUrls(propiedadId: string, urls: string[]) {
    const limpias = [...new Set((urls || []).map((u) => String(u || '').trim()).filter((u) => /^https?:\/\//i.test(u)))].slice(0, 5);
    const prop = await this.prisma.propiedad.findUnique({ where: { id: propiedadId }, select: { icalToken: true } });
    const data: any = { icalImportUrls: limpias };
    if (!prop?.icalToken) data.icalToken = randomBytes(16).toString('hex');
    const updated = await this.prisma.propiedad.update({ where: { id: propiedadId }, data });
    // Invalidar caché y sincronizar de una vez
    await this.redis.del(`ical:${propiedadId}`);
    const { bloqueos } = await this.bloqueosExternos(propiedadId, true);
    return { icalImportUrls: updated.icalImportUrls, icalToken: updated.icalToken, eventosExternos: bloqueos.length };
  }
}
