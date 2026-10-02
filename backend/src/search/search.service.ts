import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService, SearchFilters } from '../ai/ai.service';
import { RedisService } from '../redis/redis.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SearchService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private redis: RedisService,
  ) {}

  async search(query: string) {
    const cacheKey = `search:${query.toLowerCase().trim()}`;
    const cached = await this.redis.get<SearchResult>(cacheKey);
    if (cached) return cached;

    let filters: SearchFilters;
    try {
      filters = await this.aiService.parseSearchQuery(query);
    } catch {
      filters = this.fallbackFilters(query);
    }

    const where: Prisma.PropiedadWhereInput = {
      estado: 'PUBLICADO',
    };

    if (filters.tipo) {
      where.tipo = filters.tipo;
    }

    if (filters.admiteMascotas === true) {
      where.admiteMascotas = true;
    }

    if (filters.seguroDisponible === true) {
      where.seguroDisponible = true;
    }

    if (filters.numeroHuespedesMin) {
      where.capacidadMaxima = { gte: filters.numeroHuespedesMin };
    }

    if (filters.numeroHabitacionesMin) {
      where.numeroHabitaciones = { gte: filters.numeroHabitacionesMin };
    }

    if (filters.presupuestoMaximo) {
      where.precioNoche = { lte: filters.presupuestoMaximo };
    }
    if (filters.precioMinimo) {
      where.precioNoche = { ...(where.precioNoche as any || {}), gte: filters.precioMinimo };
    }

    if (filters.actividades && filters.actividades.length > 0) {
      where.actividades = { hasSome: filters.actividades };
    }

    if (filters.ubicacion) {
      where.ubicacion = { contains: filters.ubicacion, mode: 'insensitive' };
    }

    // Descriptores libres: cada palabra clave debe aparecer en el nombre,
    // la descripción o la ubicación (AND entre descriptores). Se prueban
    // variantes con/sin tildes porque `insensitive` no las equipara.
    if (filters.palabrasClave && filters.palabrasClave.length > 0) {
      const andClauses = filters.palabrasClave.map((kw) => ({
        OR: accentVariants(kw).flatMap((v) => [
          { nombre: { contains: v, mode: 'insensitive' as const } },
          { descripcion: { contains: v, mode: 'insensitive' as const } },
          { ubicacion: { contains: v, mode: 'insensitive' as const } },
        ]),
      }));
      where.AND = [...((where.AND as any[]) || []), ...andClauses];
    }

    const orderBy: Prisma.PropiedadOrderByWithRelationInput = { precioNoche: 'asc' };

    const organicResults = await this.prisma.propiedad.findMany({
      where,
      include: {
        images: { where: { esPrincipal: true }, take: 1 },
      },
      orderBy,
      take: 20,
    });

    const sponsoredWhere: Prisma.SponsoredListingWhereInput = {
      activo: true,
      placement: 'SEARCH_RESULTS_TOP',
      fechaInicio: { lte: new Date() },
      fechaFin: { gte: new Date() },
      propiedad: { estado: 'PUBLICADO' },
    };

    if (filters.tipo) {
      sponsoredWhere.propiedad = {
        ...sponsoredWhere.propiedad as Prisma.PropiedadWhereInput,
        tipo: filters.tipo,
      };
    }

    const sponsored = await this.prisma.sponsoredListing.findMany({
      where: sponsoredWhere,
      include: {
        propiedad: { include: { images: { where: { esPrincipal: true }, take: 1 } } },
        sponsor: true,
      },
      orderBy: { prioridad: 'desc' },
      take: 5,
    });

    const sponsoredIds = sponsored.map((s) => s.propiedadId);
    const filteredOrganic = organicResults.filter(
      (r) => !sponsoredIds.includes(r.id),
    );

    const result: SearchResult = {
      filters,
      sponsored: sponsored.map((s) => ({
        ...s.propiedad,
        sponsorNombre: s.sponsor.nombre,
        isSponsored: true,
      })),
      results: filteredOrganic,
      total: filteredOrganic.length + sponsored.length,
    };

    await this.redis.set(cacheKey, result, 300);

    return result;
  }

  /**
   * Filtro algorítmico local (sin IA): extrae MÚLTIPLES descriptores de la
   * consulta en lenguaje natural —tipo, mascotas, seguro, huéspedes,
   * actividades, presupuesto, ubicación y palabras clave libres
   * (campestre, cabaña, independiente, vista, familiar...).
   */
  private fallbackFilters(query: string): SearchFilters {
    const q = normalize(query);

    return {
      tipo: parseTipo(q),
      admiteMascotas: parseMascotas(q),
      numeroHuespedesMin: parseHuespedes(q),
      numeroHabitacionesMin: parseHabitaciones(q),
      seguroDisponible: parseSeguro(q),
      actividades: parseActividades(q),
      presupuestoMaximo: parsePresupuestoMax(q),
      precioMinimo: parsePrecioMin(q),
      ubicacion: parseUbicacion(q),
      palabrasClave: parsePalabrasClave(q),
    };
  }
}

/** Minúsculas + sin tildes para comparar descriptores. */
export function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Variantes con/sin tildes de una palabra clave, porque PostgreSQL
 * `contains ... mode: insensitive` NO equipara á↔a ni ñ↔n.
 */
export function accentVariants(kw: string): string[] {
  const out = new Set<string>([kw]);
  const plain = normalize(kw);
  out.add(plain);
  // Variantes probables con tilde/ñ para las palabras del catálogo
  const ACCENTED: Record<string, string> = {
    cabana: 'cabaña',
    panoramica: 'panorámica',
    ecologica: 'ecológica',
    agroecologica: 'agroecológica',
    romantico: 'romántico',
    rio: 'río',
    montana: 'montaña',
    laguna: 'laguna',
    petfriendly: 'pet-friendly',
  };
  if (ACCENTED[plain]) out.add(ACCENTED[plain]);
  if (plain.includes('n')) out.add(plain.replace(/n/g, 'ñ'));
  return [...out];
}

function parseTipo(q: string): SearchFilters['tipo'] {
  if (/\bhotel(es)?\b/.test(q)) return 'hotel';
  if (/\bhostal(es)?\b|\bhostel(s)?\b|\balbergue/.test(q)) return 'hostal';
  if (/\bglamping\b|\bdomo(s)?\b|\btipi\b/.test(q)) return 'glamping';
  if (/\bcabana(s)?\b/.test(q)) return 'glamping'; // las cabañas están como glamping
  if (/\brestaurante(s)?\b|\bpizzeria|\bparrilla|\bmenu del dia|\bcarta\b/.test(q)) return 'restaurante';
  if (/\bbar(es)?\b|\bpub(s)?\b|\bcerveceria|\bcocteleria|\btomar algo/.test(q)) return 'bar';
  if (/\bfinca(s)?\b/.test(q)) return 'finca';
  if (/\bactividad(es)?\b|\btour(es)?\b|\bexcursion(es)?\b|\boperador turistico|\bmariposario/.test(q)) return 'actividad';
  if (/centro turistico|centro de recreo|parque acuatico/.test(q)) return 'centro_turistico';
  if (/\bcentro\b/.test(q)) return 'centro_turistico';
  return null;
}

function parseMascotas(q: string): boolean | null {
  if (/sin mascotas|no (se |)(admiten|aceptan|permiten)( las)? mascotas|prohibido (el ingreso de )?mascotas/.test(q)) return false;
  if (/mascota|pet|perro|gato|pelud|huella/.test(q)) return true;
  return null;
}

function parseSeguro(q: string): boolean | null {
  if (/sin seguro/.test(q)) return false;
  if (/seguro|asegura|proteccion|cobertura|p[oó]liza/.test(q)) return true;
  return null;
}

function parseHuespedes(q: string): number | null {
  const m =
    q.match(/para (\d+)\s*(persona(s)?|huesped(es)?)/) ||
    q.match(/(\d+)\s*(persona(s)?|huesped(es)?)/) ||
    q.match(/capacidad[^0-9]{0,10}(\d+)/) ||
    q.match(/grupo de (\d+)/) ||
    q.match(/somos (\d+)/);
  return m ? parseInt(m[1] || m[2] || m[3] || m[4] || m[5], 10) : null;
}

function parseHabitaciones(q: string): number | null {
  const m = q.match(/(\d+)\s*(habitacion(es)?|cuarto(s)?|dormitorio(s)?)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Sinónimos → actividad canónica (debe existir así en los datos). */
const ACTIVIDADES: Array<{ canon: string; re: RegExp }> = [
  { canon: 'senderismo', re: /senderismo|caminata|trekking|sendero/ },
  { canon: 'natación', re: /natacion|piscina|alberca|chapuzon/ },
  { canon: 'canopy', re: /canopy|tirolesa|tirolina|zip.?line/ },
  { canon: 'rappel', re: /rappel|rapel|escalada/ },
  { canon: 'fogata', re: /fogata|fogon|fogata nocturna|noche de fogata/ },
  { canon: 'yoga', re: /\byoga\b/ },
  { canon: 'meditación', re: /meditacion|mindfulness/ },
  { canon: 'avistamiento de aves', re: /avistamiento|aves|pajaros|birdwatch/ },
  { canon: 'avistamiento de insectos', re: /insectos|mariposas|entomologia|luciernagas|mariposario/ },
  { canon: 'gastronomía rural', re: /gastronom|comida tipica|cocina local|caf[eé] tour|tour del cafe/ },
  { canon: 'ciclismo', re: /ciclismo|bicicleta|bici|mtb/ },
  { canon: 'pesca', re: /pesca|pescar/ },
  { canon: 'permacultura', re: /permacultura|huerta|agroecolog/ },
  { canon: 'observación astronómica', re: /astronom|estrellas|stargazing|observacion del cielo/ },
  { canon: 'lectura', re: /lectura|leer|libros|biblioteca/ },
  { canon: 'spa', re: /\bspa\b|masaje|jacuzzi|termal|sauna/ },
  { canon: 'camping', re: /camping|acampar|carpa/ },
];

function parseActividades(q: string): string[] {
  return ACTIVIDADES.filter((a) => a.re.test(q)).map((a) => a.canon);
}

/** "menos de 200", "hasta $150", "presupuesto 100", "200 mil" → pesos COP.
 *  Números sueltos menores a 1000 se interpretan como miles ("150" → 150.000). */
function parseMoneyNumber(q: string): number | null {
  const m =
    q.match(/(?:menos de|hasta|m[aá]ximo(?: de)?|presupuesto(?: de)?|de hasta)\s*\$?\s*(\d+(?:[.,]\d+)?)\s*(mil|millones?|millon|k|\$|pesos?)?/) ||
    q.match(/\$?\s*(\d+(?:[.,]\d+)?)\s*(mil|millones?|millon|k|\$|pesos?)?\s*(?:por noche|maximo)/) ||
    q.match(/\$(\d[\d.,]*)/);
  if (!m) return null;
  let n = parseFloat(m[1].replace(',', '.'));
  const mult = (m[2] || '').toLowerCase();
  if (mult === 'millones' || mult === 'millon') n *= 1000000;
  else if (mult === 'mil' || mult === 'k') n *= 1000;
  else if (n < 1000) n *= 1000; // "150" → 150 mil pesos
  return Math.round(n);
}

function parsePresupuestoMax(q: string): number | null {
  const explicit = parseMoneyNumber(q);
  if (explicit) return explicit;
  if (/economico|barato|asequible|mochilero|bajo costo|bueno bonito y barato/.test(q)) return 120000;
  return null;
}

function parsePrecioMin(q: string): number | null {
  const m = q.match(/(?:desde|mas de|m[ií]nimo(?: de)?)\s*\$?\s*(\d+(?:[.,]\d+)?)/);
  if (m) {
    let n = parseFloat(m[1].replace(',', '.'));
    if (n < 1000) n *= 1000;
    return Math.round(n);
  }
  if (/lujo|lujoso|premium|exclusivo|5 estrellas|alta gama/.test(q)) return 300000;
  return null;
}

/** Veredas/sectores conocidos + patrones "en X" / "cerca de X". */
const LUGARES = [
  'rodeo', 'san luis', 'porvenir', 'arrayanes', 'tobos', 'panelazo',
  'san pablo', 'la vega', 'nocaima', 'cundinamarca',
];

function parseUbicacion(q: string): string | null {
  const vereda = q.match(/vereda\s+([a-z ]{2,30}?)(?:,|\s+y\s+|\s+con\s+|\s+para\s+|$)/);
  if (vereda) return vereda[1].trim();
  for (const lugar of LUGARES) {
    if (q.includes(lugar)) return lugar;
  }
  const cerca = q.match(/(?:cerca de|en|ubicado en|zona de)\s+([a-z ]{2,25}?)(?:,|\s+y\s+|\s+con\s+|\s+para\s+|$)/);
  if (cerca) {
    const cand = cerca[1].trim();
    if (cand && !/^(el|la|los|las|un|una|mi|este|ese)\b/.test(cand)) return cand;
  }
  return null;
}

/**
 * Descriptores libres → palabra clave canónica (sin tildes).
 * Cada descriptor suma un filtro AND sobre nombre/descripción/ubicación.
 */
const PALABRAS_CLAVE: Array<{ canon: string; re: RegExp }> = [
  { canon: 'campestre', re: /campestre|rural|campo|hacienda/ },
  { canon: 'cabana', re: /cabana/ },
  { canon: 'independiente', re: /independiente|privad[oa]|solo para (mi|nosotros)|exclusiva? para/ },
  { canon: 'vista', re: /vista|mirador|panoramica|balcon con vista/ },
  { canon: 'familiar', re: /familiar|familia|ninos|hijos|infantil/ },
  { canon: 'romantico', re: /romantic|luna de miel|pareja|aniversario|escapada romantica/ },
  { canon: 'tranquilo', re: /tranquil|silencio|descanso|relaj|retiro|paz/ },
  { canon: 'piscina', re: /piscina|alberca/ },
  { canon: 'chimenea', re: /chimenea|fogon interior/ },
  { canon: 'jacuzzi', re: /jacuzzi|hidromasaje|tina caliente/ },
  { canon: 'bosque', re: /bosque|arboles|naturaleza|montana|cerro/ },
  { canon: 'ecologica', re: /ecolog|sostenible|organica|permacultura|agroecolog|amigable con el ambiente|ecoturismo/ },
  { canon: 'boutique', re: /boutique|diseno|con encanto/ },
  { canon: 'lujo', re: /lujo|lujoso|premium|glamour|5 estrellas/ },
  { canon: 'mochilero', re: /mochilero|backpacker|hostel vibe|joven/ },
  { canon: 'aventura', re: /aventura|adrenalina|extremo|deporte extremo|canopy/ },
  { canon: 'rio', re: /\brio\b|ribera|cascada|quebrada|lago|laguna/ },
  { canon: 'cafetal', re: /cafetal|cafe|cafetero|finca cafetera/ },
  { canon: 'desayuno', re: /desayuno incluido|desayuno gratis/ },
  { canon: 'parqueadero', re: /parqueadero|parqueo|garaje|carro/ },
  { canon: 'wifi', re: /wifi|wi-fi|internet|conexion/ },
  { canon: 'cocina', re: /cocina|autocontenido|apartamento|cocina equipada/ },
];

function parsePalabrasClave(q: string): string[] {
  return PALABRAS_CLAVE.filter((p) => p.re.test(q)).map((p) => p.canon);
}

export interface SearchResult {
  filters: SearchFilters;
  sponsored: any[];
  results: any[];
  total: number;
}
