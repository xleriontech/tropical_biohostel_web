import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

/** Bóveda central de API keys (Google Places y futuras integraciones). */
@Injectable()
export class IntegracionesService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
  ) {}

  /** Lista sin exponer valores (solo últimos 4). */
  async listar() {
    const claves = await this.prisma.claveApi.findMany({ orderBy: { nombre: 'asc' } });
    return claves.map((c) => ({
      id: c.id,
      clave: c.clave,
      nombre: c.nombre,
      descripcion: c.descripcion,
      webUrl: c.webUrl,
      configurada: c.valor.length > 0,
      pista: c.valor.length > 0 ? `••••${this.cola(c.valor)}` : null,
      updatedAt: c.updatedAt,
    }));
  }

  private cola(valorCifrado: string): string {
    try {
      const plano = this.ai.decrypt(valorCifrado);
      return plano.slice(-4);
    } catch {
      return '••••';
    }
  }

  async guardar(clave: string, dto: { nombre?: string; descripcion?: string; webUrl?: string; valor?: string }) {
    const data: any = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion || null;
    if (dto.webUrl !== undefined) data.webUrl = dto.webUrl || null;
    if (dto.valor !== undefined) data.valor = dto.valor ? this.ai.encrypt(dto.valor) : '';
    const existente = await this.prisma.claveApi.findUnique({ where: { clave } });
    if (existente) {
      await this.prisma.claveApi.update({ where: { clave }, data });
    } else {
      await this.prisma.claveApi.create({
        data: {
          clave,
          nombre: dto.nombre || clave,
          descripcion: dto.descripcion || null,
          webUrl: dto.webUrl || null,
          valor: data.valor || '',
        },
      });
    }
    return this.listar();
  }

  async eliminar(clave: string) {
    await this.prisma.claveApi.deleteMany({ where: { clave } });
    return this.listar();
  }

  /** Valor descifrado, solo uso interno del servidor. Nunca exponer por API. */
  async valorInterno(clave: string): Promise<string | null> {
    const c = await this.prisma.claveApi.findUnique({ where: { clave } });
    if (!c || !c.valor) return null;
    try {
      return this.ai.decrypt(c.valor);
    } catch {
      return null;
    }
  }

  /** Estado público: qué integraciones tienen key (sin valores). */
  async estado() {
    const claves = await this.prisma.claveApi.findMany({ select: { clave: true, valor: true } });
    const out: Record<string, boolean> = {};
    for (const c of claves) out[c.clave] = c.valor.length > 0;
    return out;
  }

  /**
   * Prueba una clave guardada contra su API real (sin exponer el valor).
   * Devuelve { ok, mensaje } para mostrar en el panel.
   */
  async probar(clave: string): Promise<{ ok: boolean; mensaje: string }> {
    const valor = await this.valorInterno(clave);
    if (!valor) return { ok: false, mensaje: 'No hay key guardada para probar.' };
    try {
      if (clave === 'google_places') return await this.probarGooglePlaces(valor);
      if (clave === 'google_maps') return await this.probarGoogleMaps(valor);
      return { ok: true, mensaje: 'Key guardada. Esta integración no tiene prueba automática.' };
    } catch (e: any) {
      return { ok: false, mensaje: e?.message || 'Falló la prueba.' };
    }
  }

  private async probarGooglePlaces(key: string) {
    // Places API (New): búsqueda mínima de texto
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id',
      },
      body: JSON.stringify({ textQuery: 'Nocaima Cundinamarca', maxResultCount: 1 }),
      signal: AbortSignal.timeout(20000),
    });
    const data = (await res.json().catch(() => null)) as any;
    if (res.ok) {
      return { ok: true, mensaje: 'Places API (New) responde. Key válida.' };
    }
    return { ok: false, mensaje: `Google: ${this.mensajeErrorGoogle(data)}` };
  }

  private async probarGoogleMaps(key: string) {
    // Geocoding sigue en la API clásica (no migrada a New)
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent('Nocaima,Cundinamarca,Colombia')}&key=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const data = (await res.json().catch(() => null)) as any;
    const status = data?.status;
    if (status === 'OK' || status === 'ZERO_RESULTS') {
      return { ok: true, mensaje: `Google responde (status: ${status}). Key con acceso a APIs de mapas.` };
    }
    if (status === 'REQUEST_DENIED') {
      return { ok: false, mensaje: `Google rechazó la key: ${data?.error_message || 'revísala en la consola.'}` };
    }
    return { ok: false, mensaje: `Respuesta inesperada de Google: ${status || 'sin respuesta'}.` };
  }

  /** Mensaje legible para errores de Places API (New). */
  private mensajeErrorGoogle(data: any): string {
    const err = data?.error;
    if (!err) return 'sin respuesta.';
    const msg = err.message || '';
    if (/API key not valid|API_KEY_INVALID/i.test(msg)) return 'la API key no es válida.';
    if (/has not been used|is disabled|SERVICE_DISABLED|PERMISSION_DENIED/i.test(msg + JSON.stringify(data))) {
      return 'habilita "Places API (New)" en tu proyecto: console.cloud.google.com/apis/library/places-backend.googleapis.com';
    }
    if (/BILLING|billing/i.test(msg)) return 'activa facturación en el proyecto de Google Cloud.';
    if (/quota|RESOURCE_EXHAUSTED/i.test(msg)) return 'sin cuota disponible.';
    return msg.slice(0, 180) || 'error desconocido.';
  }
}
