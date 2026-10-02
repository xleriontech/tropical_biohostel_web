import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Prisma } from '@prisma/client';
import { normalize, accentVariants } from './search.service';
import { RagService } from '../rag/rag.service';
import { AiService } from '../ai/ai.service';

export type PlanViaje =
  | 'descanso'
  | 'aventura'
  | 'romance'
  | 'familia'
  | 'naturaleza'
  | 'cafe';

export type ExtraDeseado =
  | 'piscina'
  | 'wifi'
  | 'cocina'
  | 'parqueadero'
  | 'desayuno'
  | 'chimenea'
  | 'jacuzzi'
  | 'vista'
  | 'seguro';

export interface SmartSearchInput {
  adultos: number;
  ninos: number;
  llevaMascotas: boolean;
  habitacionesMin: number;
  banosMin: number;
  tipo: 'hotel' | 'hostal' | 'centro_turistico' | 'glamping' | 'restaurante' | 'bar' | 'finca' | 'actividad' | null;
  presupuestoMax: number | null;
  planes: PlanViaje[];
  extras: ExtraDeseado[];
}

export interface SmartMatch {
  propiedad: any;
  compatibilidad: number;
  motivos: string[];
  ratingPromedio: number;
  totalReviews: number;
}

/** Cada plan del viaje aporta actividades y descriptores al perfil. */
const PLANES: Record<PlanViaje, { actividades: string[]; keywords: string[]; label: string }> = {
  descanso: {
    actividades: ['lectura', 'meditación', 'yoga', 'spa'],
    keywords: ['tranquilo'],
    label: 'descanso',
  },
  aventura: {
    actividades: ['canopy', 'rappel', 'senderismo', 'natación'],
    keywords: ['aventura'],
    label: 'aventura',
  },
  romance: {
    actividades: ['spa'],
    keywords: ['romantico'],
    label: 'romance',
  },
  familia: {
    actividades: ['natación'],
    keywords: ['familiar'],
    label: 'familia',
  },
  naturaleza: {
    actividades: ['senderismo', 'avistamiento de aves'],
    keywords: ['bosque', 'ecologica'],
    label: 'naturaleza',
  },
  cafe: {
    actividades: ['gastronomía rural', 'permacultura'],
    keywords: ['cafetal'],
    label: 'cultura cafetera',
  },
};

/** Cada extra deseado se traduce a campo estructurado, actividad o descriptor. */
const EXTRAS: Record<
  ExtraDeseado,
  { field?: 'tieneWifi' | 'tieneCocina' | 'tieneParqueadero' | 'seguroDisponible'; actividades: string[]; keywords: string[]; label: string }
> = {
  piscina: { actividades: ['natación'], keywords: ['piscina'], label: 'piscina' },
  wifi: { field: 'tieneWifi', actividades: [], keywords: [], label: 'wifi' },
  cocina: { field: 'tieneCocina', actividades: [], keywords: [], label: 'cocina equipada' },
  parqueadero: { field: 'tieneParqueadero', actividades: [], keywords: [], label: 'parqueadero' },
  desayuno: { actividades: [], keywords: ['desayuno'], label: 'desayuno incluido' },
  chimenea: { actividades: [], keywords: ['chimenea'], label: 'chimenea' },
  jacuzzi: { actividades: ['spa'], keywords: ['jacuzzi'], label: 'jacuzzi' },
  vista: { actividades: [], keywords: ['vista'], label: 'vista panorámica' },
  seguro: { field: 'seguroDisponible', actividades: [], keywords: [], label: 'seguro de viaje' },
};

@Injectable()
export class SmartSearchService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private rag: RagService,
    private ai: AiService,
  ) {}

  /**
   * Facetas vivas del catálogo para armar el cuestionario.
   * Todo sale de la base: si mañana hay más tipos, actividades o precios, aparecen solos.
   */
  async opciones() {
    const [tipos, precios, props] = await Promise.all([
      this.prisma.propiedad.groupBy({
        by: ['tipo'],
        where: { estado: 'PUBLICADO' },
        _count: { _all: true },
      }),
      this.prisma.propiedad.aggregate({
        where: { estado: 'PUBLICADO' },
        _min: { precioNoche: true },
        _max: { precioNoche: true },
      }),
      this.prisma.propiedad.findMany({
        where: { estado: 'PUBLICADO' },
        select: { actividades: true },
      }),
    ]);
    const cuentaActs = new Map<string, number>();
    for (const p of props) {
      for (const a of p.actividades || []) {
        cuentaActs.set(a, (cuentaActs.get(a) || 0) + 1);
      }
    }
    const actividades = [...cuentaActs.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([actividad, total]) => ({ actividad, total }));
    return {
      tipos: tipos
        .map((t) => ({ tipo: t.tipo, total: t._count._all }))
        .sort((a, b) => b.total - a.total),
      precioMin: precios._min.precioNoche || 0,
      precioMax: precios._max.precioNoche || 0,
      actividades,
      total: tipos.reduce((s, t) => s + t._count._all, 0),
    };
  }

  /**
   * Zemisqua: la búsqueda clásica + texto libre contra el RAG.
   * Devuelve resultados, mensaje explicativo y fuentes documentales.
   */
  async buscarAncestral(input: SmartSearchInput & { textoLibre?: string }) {
    const base = await this.search(input);
    const texto = (input.textoLibre || '').trim().slice(0, 400);
    if (!texto) return { ...base, mensaje: null, fuentes: [] as string[] };

    let frags: { documentoTitulo: string; contenido: string }[] = [];
    try {
      frags = await this.rag.buscar(texto, 3);
    } catch {}
    const fuentes = [...new Set(frags.map((f) => f.documentoTitulo))];

    // Bonus por coincidir con palabras de la descripción del visitante
    const terms = texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .split(/[^a-z]+/)
      .filter((w) => w.length > 3)
      .slice(0, 10);
    for (const r of base.results) {
      const prop = r.propiedad || {};
      const hay = terms.filter((t) => matchesAnyKeyword(prop, [t]));
      if (hay.length) {
        r.compatibilidad = Math.min(100, r.compatibilidad + Math.min(12, hay.length * 4));
        r.motivos.push(`Coincide con tu descripción: ${hay.slice(0, 3).join(', ')}`);
        r.motivos = r.motivos.slice(0, 6);
      }
    }
    base.results.sort((a, b) => b.compatibilidad - a.compatibilidad);

    const top = base.results[0];
    let mensaje: string | null = null;
    const contextoRag = frags.length
      ? '\n\nFragmentos de la base de conocimiento:\n' +
        frags.map((f, i) => `[${i + 1}] (${f.documentoTitulo}): ${f.contenido.slice(0, 500)}`).join('\n')
      : '';
    if (this.ai.isChatAvailable() || this.ai.isAvailable()) {
      try {
        mensaje = (
          await this.ai.chatWith(
            'Eres Zemisqua, el buscador ancestral de Tropical Biohostel. Explica en 2-3 frases cálidas por qué estos resultados encajan con lo que busca el visitante, usando los fragmentos si aportan. Sin inventar datos. Los precios válidos son los de la base (si un fragmento trae otro precio, ignóralo).',
            `Búsqueda: "${texto}". Mejor resultado: ${top ? `${top.propiedad.nombre} (${top.propiedad.tipo}, $${Number(top.propiedad.precioNoche).toLocaleString('es-CO')}) compatibilidad ${top.compatibilidad}%` : 'sin resultados'}.${contextoRag}`,
          )
        ).trim().slice(0, 600);
      } catch {}
    }
    if (!mensaje) {
      mensaje = top
        ? `Según tu descripción, ${top.propiedad.nombre} es lo que mejor encaja (${top.compatibilidad}% de compatibilidad).`
        : 'Con esa descripción no encontré coincidencias; prueba con menos filtros.';
    }
    return { ...base, mensaje, fuentes };
  }

  async search(input: SmartSearchInput) {
    const cacheKey = `smart:${JSON.stringify(input)}`;
    const cached = await this.redis.get<{ total: number; results: SmartMatch[] }>(cacheKey);
    if (cached) return cached;

    const viajeros = Math.max(1, input.adultos + input.ninos);

    // ---------- Filtros duros (requisitos) ----------
    const where: Prisma.PropiedadWhereInput = { estado: 'PUBLICADO' };
    if (viajeros > 0) where.capacidadMaxima = { gte: viajeros };
    if (input.tipo) where.tipo = input.tipo;
    if (input.presupuestoMax) where.precioNoche = { lte: input.presupuestoMax };
    if (input.habitacionesMin > 0) where.numeroHabitaciones = { gte: input.habitacionesMin };
    if (input.banosMin > 0) {
      where.OR = [
        { numeroBanos: { gte: input.banosMin } },
        // Sin dato de baños se asume 1 baño estándar
        ...(input.banosMin <= 1 ? [{ numeroBanos: null }] : []),
      ];
    }
    if (input.llevaMascotas) where.admiteMascotas = true;

    const candidates = await this.prisma.propiedad.findMany({
      where,
      include: {
        images: { take: 3, orderBy: { orden: 'asc' } },
        reviews: { take: 50 },
      },
      take: 30,
    });

    // ---------- Perfil deseado (actividades + descriptores) ----------
    const wantedActs = new Set<string>();
    const wantedKw = new Set<string>();
    for (const plan of input.planes || []) {
      const p = PLANES[plan];
      if (!p) continue;
      p.actividades.forEach((a) => wantedActs.add(a));
      p.keywords.forEach((k) => wantedKw.add(k));
    }
    if (input.ninos > 0) wantedKw.add('familiar');
    const wantedFields: Array<{ field: 'tieneWifi' | 'tieneCocina' | 'tieneParqueadero' | 'seguroDisponible'; label: string }> = [];
    for (const extra of input.extras || []) {
      const e = EXTRAS[extra];
      if (!e) continue;
      e.actividades.forEach((a) => wantedActs.add(a));
      e.keywords.forEach((k) => wantedKw.add(k));
      if (e.field) wantedFields.push({ field: e.field, label: e.label });
    }

    // ---------- Puntuación 0-100 + motivos ----------
    const results: SmartMatch[] = candidates.map((prop: any) => {
      let score = 30; // base: cumple todos los requisitos duros
      const motivos: string[] = [];

      // Ajuste de capacidad: ni muy grande ni muy justo
      if (prop.capacidadMaxima === viajeros) {
        score += 8;
        motivos.push(`Capacidad exacta para ${viajeros} ${viajeros === 1 ? 'persona' : 'personas'}`);
      } else if (prop.capacidadMaxima <= viajeros + 2) {
        score += 5;
        motivos.push(`Espacio ideal para tu grupo de ${viajeros}`);
      }

      if (input.habitacionesMin > 0 && (prop.numeroHabitaciones || 0) >= input.habitacionesMin) {
        score += 5;
        motivos.push(`Tiene ${prop.numeroHabitaciones} habitaciones`);
      }
      if (input.banosMin > 0) {
        const banos = prop.numeroBanos || 1;
        score += 5;
        motivos.push(banos > 1 ? `${banos} baños` : 'Baño privado');
      }

      if (input.llevaMascotas && prop.admiteMascotas) {
        score += 4;
        motivos.push('Acepta mascotas');
      }
      if (input.ninos > 0 && matchesAnyKeyword(prop, ['familiar'])) {
        score += 6;
        motivos.push('Ambiente familiar, apto para niños');
      }

      // Actividades del plan
      const propActs: string[] = prop.actividades || [];
      const matchedActs = [...wantedActs].filter((a) =>
        propActs.some((pa) => normalize(pa) === normalize(a)),
      );
      if (matchedActs.length > 0) {
        score += Math.min(20, matchedActs.length * 4);
        motivos.push(`Actividades: ${matchedActs.slice(0, 4).join(', ')}`);
      }

      // Descriptores (texto libre)
      const matchedKw = [...wantedKw].filter((k) => matchesAnyKeyword(prop, [k]));
      if (matchedKw.length > 0) {
        score += Math.min(20, matchedKw.length * 4);
        motivos.push(`Es ${prettyKeywords(matchedKw)}`);
      }

      // Extras estructurados
      for (const f of wantedFields) {
        if ((prop as any)[f.field]) {
          score += 5;
          motivos.push(`Cuenta con ${f.label}`);
        }
      }

      // Reputación
      const reviews: any[] = prop.reviews || [];
      const totalReviews = reviews.length;
      const ratingPromedio =
        totalReviews > 0
          ? Math.round((reviews.reduce((s, r) => s + r.calificacion, 0) / totalReviews) * 10) / 10
          : 0;
      if (ratingPromedio >= 4.5) {
        score += 8;
        motivos.push(`Calificación excelente (${ratingPromedio}/5)`);
      } else if (ratingPromedio >= 4) {
        score += 5;
        motivos.push(`Bien calificado (${ratingPromedio}/5)`);
      }
      if (totalReviews >= 3) score += 2;
      if ((prop.estrellas || 0) >= 4) score += 2;

      if (input.presupuestoMax && prop.precioNoche <= input.presupuestoMax * 0.7) {
        score += 3;
        motivos.push('Precio por debajo de tu presupuesto');
      }

      return {
        propiedad: prop,
        compatibilidad: Math.min(100, Math.round(score)),
        motivos: motivos.slice(0, 6),
        ratingPromedio,
        totalReviews,
      };
    });

    results.sort((a, b) => b.compatibilidad - a.compatibilidad);
    const out = { total: results.length, results: results.slice(0, 12) };
    await this.redis.set(cacheKey, out, 300);
    return out;
  }
}

/** ¿El texto (nombre+descripción+ubicación) contiene alguna variante del descriptor? */
function matchesAnyKeyword(prop: any, keywords: string[]): boolean {
  const text = normalize(
    `${prop.nombre || ''} ${prop.descripcion || ''} ${prop.ubicacion || ''}`,
  );
  return keywords.some((kw) =>
    accentVariants(kw).some((v) => text.includes(normalize(v))),
  );
}

const PRETTY: Record<string, string> = {
  campestre: 'campestre',
  cabana: 'tipo cabaña',
  independiente: 'independiente y privado',
  vista: 'de gran vista',
  familiar: 'familiar',
  romantico: 'romántico',
  tranquilo: 'tranquilo',
  piscina: 'con piscina',
  chimenea: 'con chimenea',
  jacuzzi: 'con jacuzzi',
  bosque: 'rodeado de bosque',
  ecologica: 'ecológico',
  boutique: 'boutique',
  lujo: 'de lujo',
  mochilero: 'mochilero',
  aventura: 'de aventura',
  rio: 'junto al río',
  cafetal: 'cafetalero',
  desayuno: 'con desayuno incluido',
};

function prettyKeywords(kws: string[]): string {
  return kws.map((k) => PRETTY[k] || k).join(', ');
}
