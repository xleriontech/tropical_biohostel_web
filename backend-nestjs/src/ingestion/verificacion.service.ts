import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IngestionService, slugify } from './ingestion.service';

function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/** Distancia aproximada en metros (suficiente para matching local). */
function distanciaM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const kx = 111320 * Math.cos(((aLat + bLat) / 2) * (Math.PI / 180));
  const ky = 110540;
  return Math.sqrt(Math.pow((aLng - bLng) * kx, 2) + Math.pow((aLat - bLat) * ky, 2));
}

function nombresParecidos(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const min = Math.min(na.length, nb.length);
  if (min < 5) return false;
  return na.includes(nb) || nb.includes(na);
}

@Injectable()
export class VerificacionService implements OnModuleInit {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaService,
    private ingestion: IngestionService,
  ) {}

  onModuleInit() {
    // Primera pasada 2 min después del arranque y luego cada 24h
    setTimeout(() => this.verificacionProgramada().catch(() => {}), 120000);
    this.timer = setInterval(() => this.verificacionProgramada().catch(() => {}), 24 * 3600 * 1000);
    if ((this.timer as any)?.unref) (this.timer as any).unref();
  }

  private async verificacionProgramada() {
    // Municipios con sitios importados de OSM (si no hay, Nocaima por defecto)
    const municipios = await this.prisma.propiedad.findMany({
      where: { fuenteDatos: 'osm', ciudad: { not: null } },
      select: { ciudad: true, departamento: true },
      distinct: ['ciudad'],
      take: 10,
    });
    const targets = municipios.length > 0
      ? municipios.map((m) => ({ municipio: m.ciudad as string, departamento: m.departamento || 'Cundinamarca' }))
      : [{ municipio: 'Nocaima', departamento: 'Cundinamarca' }];
    for (const t of targets) {
      try {
        await this.verificarMunicipio(t.municipio, t.departamento);
      } catch {
        // un municipio fallido no frena a los demás
      }
    }
  }

  /**
   * Re-scrapea el municipio y concilia con la BD:
   * - coincide → actualiza datos seguros + marca verificado
   * - nuevo en OSM → crea en BORRADOR para revisión
   * - estaba con fuente OSM y desapareció → posible cierre (revisión humana)
   */
  async verificarMunicipio(municipio: string, departamento = 'Cundinamarca') {
    const scrape = await this.ingestion.scrapeMunicipio(municipio, departamento);
    const frescos = scrape.rows.map((r: any) => r.datos).filter((d: any) => d?.nombre);

    const enDb = await this.prisma.propiedad.findMany({
      select: {
        id: true, nombre: true, slug: true, tipo: true, ciudad: true,
        telefono: true, coordenadas: true, fuenteDatos: true,
        redesSociales: true, horarioTexto: true,
      },
    });

    let verificados = 0;
    let actualizados = 0;
    let nuevos = 0;
    const vistos = new Set<string>();
    // Slugs ya reportados como nuevos: no recrear en cada pasada
    const reportados = new Set(
      (
        await this.prisma.registroActualizacion.findMany({
          where: { tipo: 'nuevo' },
          select: { detalle: true },
          take: 500,
        })
      )
        .map((r: any) => r.detalle?.slug)
        .filter(Boolean),
    );
    const creadosEnEstaPasada: Array<{ nombre: string; lat?: number; lng?: number }> = [];

    const esDuplicadoEnLote = (nombre: string, coords?: { lat: number; lng: number }) => {
      return creadosEnEstaPasada.some((c) => {
        if (!nombresParecidos(c.nombre, nombre)) return false;
        if (coords && c.lat !== undefined && distanciaM(c.lat, c.lng!, coords.lat, coords.lng) < 400) return true;
        // Sin coordenadas: mismo nombre normalizado exacto
        return !coords && norm(c.nombre) === norm(nombre);
      });
    };

    for (const f of frescos) {
      const match = enDb.find((p) => {
        if (p.slug === slugify(f.nombre)) return true;
        if (p.tipo !== f.tipo) return false;
        if (!nombresParecidos(p.nombre, f.nombre)) return false;
        const pc: any = p.coordenadas;
        if (pc?.lat && f.coordenadas && distanciaM(pc.lat, pc.lng, f.coordenadas.lat, f.coordenadas.lng) > 400) return false;
        return true;
      });
      if (!match) {
        // Evitar duplicados dentro del mismo lote (p. ej. nodo+vía del mismo sitio)
        const coords = (f as any).coordenadas;
        if (esDuplicadoEnLote(f.nombre, coords)) continue;
        const slugBase = slugify(f.nombre);
        if (reportados.has(slugBase)) continue; // ya reportado antes, no recrear
        // Nuevo en el mapa → borrador para revisión humana
        let slug = slugBase;
        let n = 2;
        while (await this.prisma.propiedad.findUnique({ where: { slug } })) slug = `${slugBase}-${n++}`;
        const creado = await this.prisma.propiedad.create({
          data: {
            nombre: f.nombre,
            slug,
            tipo: f.tipo as any,
            descripcion: f.descripcion || null,
            direccion: f.direccion || null,
            ubicacion: f.ubicacion || f.ciudad || municipio,
            ciudad: f.ciudad || municipio,
            departamento: f.departamento || departamento,
            telefono: f.telefono || null,
            precioNoche: 0,
            capacidadMaxima: 4,
            actividades: f.actividades || [],
            coordenadas: f.coordenadas || undefined,
            redesSociales: f.website ? { sitio_web: f.website } : undefined,
            horarioTexto: (f as any).horario || null,
            estado: 'BORRADOR',
            fuenteDatos: 'osm',
            ultimaVerificacion: new Date(),
            verificado: false,
          },
        });
        nuevos++;
        const fc: any = f.coordenadas;
        creadosEnEstaPasada.push({ nombre: f.nombre, lat: fc?.lat, lng: fc?.lng });
        await this.log('nuevo', municipio, `Nuevo en el mapa: ${f.nombre}`, { slug, tipo: f.tipo }, creado.id);
        continue;
      }
      vistos.add(match.id);
      // Actualizar solo datos seguros (contacto/ubicación/horario), jamás precios ni estado
      const patch: any = { ultimaVerificacion: new Date(), verificado: true, fuenteDatos: match.fuenteDatos || 'osm' };
      const cambios: string[] = [];
      if (f.telefono && f.telefono !== match.telefono) {
        patch.telefono = f.telefono;
        cambios.push(`teléfono ${match.telefono || '—'} → ${f.telefono}`);
      }
      const web = (f as any).website;
      const redes: any = (match.redesSociales as any) || {};
      if (web && !redes.sitio_web) {
        patch.redesSociales = { ...redes, sitio_web: web };
        cambios.push('web agregada');
      }
      if (f.coordenadas && !(match.coordenadas as any)?.lat) {
        patch.coordenadas = f.coordenadas;
        cambios.push('GPS agregado');
      }
      const hor = (f as any).horario;
      if (hor && hor !== match.horarioTexto) {
        patch.horarioTexto = hor;
        cambios.push('horario actualizado');
      }
      await this.prisma.propiedad.update({ where: { id: match.id }, data: patch });
      verificados++;
      if (cambios.length > 0) {
        actualizados++;
        await this.log('cambio', municipio, `${match.nombre}: ${cambios.join('; ')}`, { cambios }, match.id);
      }
    }

    // Los que venían de OSM y ya no aparecen → posible cierre (NO se borra solo)
    let posiblesCierres = 0;
    for (const p of enDb) {
      if (p.fuenteDatos !== 'osm' || vistos.has(p.id)) continue;
      await this.prisma.propiedad.update({ where: { id: p.id }, data: { verificado: false } });
      await this.log(
        'posible_cierre',
        municipio,
        `${p.nombre} ya no aparece en el mapa: ¿cerró? Revisar antes de archivar.`,
        { slug: p.slug },
        p.id,
      );
      posiblesCierres++;
    }

    await this.log(
      'verificacion',
      municipio,
      `Verificación de ${municipio}: ${verificados} verificados, ${actualizados} con cambios, ${nuevos} nuevos, ${posiblesCierres} posibles cierres.`,
      { verificados, actualizados, nuevos, posiblesCierres },
    );
    return { verificados, actualizados, nuevos, posiblesCierres };
  }

  /** Enriquecimiento con Google Places API (New). Key de sesión o guardada. */
  async enriquecerGoogle(rows: Array<{ datos: any }>, apiKey: string) {
    if (!apiKey || apiKey.length < 10) {
      throw new Error('Falta una API key válida de Google Places (habilita "Places API (New)" en tu proyecto).');
    }
    const H = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
    };
    const out: Array<{ datos: any; agregado: string[] }> = [];
    let enriquecidos = 0;
    for (const row of rows || []) {
      const datos = { ...(row?.datos || {}) };
      const agregado: string[] = [];
      try {
        // 1. Buscar el lugar
        const s = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: { ...H, 'X-Goog-FieldMask': 'places.id,places.displayName' },
          body: JSON.stringify({ textQuery: `${datos.nombre || ''} ${datos.ciudad || ''}`.trim(), maxResultCount: 1 }),
          signal: AbortSignal.timeout(20000),
        });
        const sj: any = await s.json().catch(() => null);
        const placeId = sj?.places?.[0]?.id;
        if (!s.ok || !placeId) {
          if (s.status === 400 || s.status === 403) {
            throw new Error('Google rechazó la key. Habilita "Places API (New)" y revisa restricciones.');
          }
          out.push({ datos, agregado });
          continue;
        }
        // 2. Detalle
        const d = await fetch(`https://places.googleapis.com/v1/${placeId}`, {
          headers: {
            ...H,
            'X-Goog-FieldMask':
              'displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,rating,userRatingCount,priceLevel,regularOpeningHours,editorialSummary',
          },
          signal: AbortSignal.timeout(20000),
        });
        const r: any = await d.json().catch(() => null);
        if (!d.ok || !r) {
          out.push({ datos, agregado });
          continue;
        }
        const tel = r.nationalPhoneNumber || r.internationalPhoneNumber;
        if (tel && !datos.telefono) {
          datos.telefono = String(tel).slice(0, 30);
          agregado.push('teléfono');
        }
        if (r.websiteUri && !datos.website) {
          datos.website = r.websiteUri;
          agregado.push('web');
        }
        if (r.formattedAddress && !datos.direccion) {
          datos.direccion = r.formattedAddress;
          agregado.push('dirección');
        }
        const descs = r.regularOpeningHours?.weekdayDescriptions;
        if (descs && !datos.horario) {
          datos.horario = (Array.isArray(descs) ? descs : [descs]).join(' | ');
          agregado.push('horario Google');
        }
        const summary = r.editorialSummary?.text;
        if (summary && summary.length > 40 && !datos.descripcion) {
          datos.descripcion = String(summary).slice(0, 600);
          agregado.push('descripción');
        }
        if (typeof r.rating === 'number') {
          datos.ratingGoogle = r.rating;
          datos.resenasGoogle = r.userRatingCount || 0;
          agregado.push(`rating ${r.rating} (${r.userRatingCount || 0})`);
        }
        if (r.priceLevel && !datos.precioNoche) {
          const etiquetas: Record<string, string> = {
            PRICE_LEVEL_FREE: 'gratis',
            PRICE_LEVEL_INEXPENSIVE: 'económico',
            PRICE_LEVEL_MODERATE: 'precio medio',
            PRICE_LEVEL_EXPENSIVE: 'costoso',
            PRICE_LEVEL_VERY_EXPENSIVE: 'muy costoso',
          };
          agregado.push(`Google lo marca: ${etiquetas[r.priceLevel] || r.priceLevel} (confirma el precio real)`);
        }
      } catch (e: any) {
        if (/rechazó la key/.test(e?.message || '')) throw e;
        // un sitio fallido no frena a los demás
      }
      if (agregado.length > 0) enriquecidos++;
      out.push({ datos, agregado });
    }
    return { total: rows?.length || 0, enriquecidos, rows: out };
  }

  private log(tipo: string, municipio: string, titulo: string, detalle: any, propiedadId?: string) {
    return this.prisma.registroActualizacion.create({
      data: { tipo, municipio, titulo, detalle: detalle || {}, propiedadId: propiedadId || null },
    });
  }

  async historial(estado?: string, take = 50) {
    return this.prisma.registroActualizacion.findMany({
      where: estado ? { estado } : {},
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 100),
      include: { propiedad: { select: { nombre: true, slug: true, estado: true } } },
    });
  }

  async sinVerificar(dias = 90) {
    const corte = new Date(Date.now() - dias * 86400000);
    const count = await this.prisma.propiedad.count({
      where: {
        estado: 'PUBLICADO',
        OR: [{ ultimaVerificacion: null }, { ultimaVerificacion: { lt: corte } }],
      },
    });
    return { dias, sinVerificar: count };
  }

  async resolver(id: string, accion: 'aplicado' | 'descartado' | 'archivar') {
    const reg = await this.prisma.registroActualizacion.findUnique({ where: { id } });
    if (!reg) throw new Error('Registro no encontrado');
    if (accion === 'archivar' && reg.propiedadId) {
      await this.prisma.propiedad.update({ where: { id: reg.propiedadId }, data: { estado: 'ARCHIVADO' } });
    }
    if (accion === 'descartado' && reg.propiedadId && reg.tipo === 'posible_cierre') {
      await this.prisma.propiedad.update({ where: { id: reg.propiedadId }, data: { verificado: true, ultimaVerificacion: new Date() } });
    }
    return this.prisma.registroActualizacion.update({ where: { id }, data: { estado: accion === 'aplicado' ? 'aplicado' : 'descartado' } });
  }
}
