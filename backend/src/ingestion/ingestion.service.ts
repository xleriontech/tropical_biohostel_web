import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

export type FormatoIngesta = 'json' | 'csv' | 'texto';

export interface DatoSitio {
  nombre?: string;
  tipo?: string;
  descripcion?: string;
  direccion?: string;
  ubicacion?: string;
  ciudad?: string;
  departamento?: string;
  telefono?: string;
  email?: string;
  whatsapp?: string;
  website?: string;
  precioNoche?: number;
  capacidadMaxima?: number;
  numeroHabitaciones?: number | null;
  numeroBanos?: number | null;
  admiteMascotas?: boolean;
  seguroDisponible?: boolean;
  actividades?: string[];
  coordenadas?: { lat: number; lng: number };
  imagenes?: string[];
  horario?: string;
  ratingGoogle?: number;
  resenasGoogle?: number;
  fuenteWeb?: string;
}

export interface FilaPreview {
  index: number;
  datos: DatoSitio;
  slug: string | null;
  accion: 'crear' | 'actualizar' | 'duplicado';
  existente: { id: string; nombre: string; slug: string } | null;
  errores: string[];
}

const TIPOS_VALIDOS = [
  'hotel', 'hostal', 'centro_turistico', 'glamping',
  'restaurante', 'bar', 'finca', 'actividad',
];

/** Sinónimos ES/EN → clave canónica. */
const KEYMAP: Record<string, keyof DatoSitio> = {
  nombre: 'nombre', name: 'nombre', titulo: 'nombre', título: 'nombre', establecimiento: 'nombre',
  tipo: 'tipo', type: 'tipo', categoria: 'tipo', categoría: 'tipo',
  descripcion: 'descripcion', descripción: 'descripcion', description: 'descripcion',
  direccion: 'direccion', dirección: 'direccion', address: 'direccion',
  ubicacion: 'ubicacion', ubicación: 'ubicacion', location: 'ubicacion', vereda: 'ubicacion', sector: 'ubicacion',
  ciudad: 'ciudad', city: 'ciudad', municipio: 'ciudad',
  departamento: 'departamento', department: 'departamento',
  telefono: 'telefono', teléfono: 'telefono', phone: 'telefono', tel: 'telefono', celular: 'telefono',
  email: 'email', correo: 'email', 'e-mail': 'email',
  whatsapp: 'whatsapp', website: 'website', sitio: 'website', web: 'website',
  precio: 'precioNoche', price: 'precioNoche', precionoche: 'precioNoche', tarifa: 'precioNoche', valor: 'precioNoche',
  capacidad: 'capacidadMaxima', capacity: 'capacidadMaxima', capacidadmaxima: 'capacidadMaxima', huespedes: 'capacidadMaxima', cupo: 'capacidadMaxima',
  habitaciones: 'numeroHabitaciones', rooms: 'numeroHabitaciones', cuartos: 'numeroHabitaciones', numerohabitaciones: 'numeroHabitaciones',
  banos: 'numeroBanos', baños: 'numeroBanos', bathrooms: 'numeroBanos', numerobanos: 'numeroBanos',
  mascotas: 'admiteMascotas', pets: 'admiteMascotas', admitemascotas: 'admiteMascotas', petfriendly: 'admiteMascotas',
  seguro: 'seguroDisponible', insurance: 'seguroDisponible', segurodisponible: 'seguroDisponible',
  actividades: 'actividades', activities: 'actividades',
};

const OSM_UA = 'TropicalBiohostelBot/1.0 (contacto: info@tropicalbiohostel.com)';

/** Clasifica la web del sitio: propia (extraíble) vs muros (redes/Airbnb). */
export function clasificarWeb(url: string): { tipo: 'propia' | 'google-sites' | 'muro'; etiqueta: string } {  const u = (url || '').toLowerCase();
  if (/sites\.google\.com/.test(u)) return { tipo: 'google-sites', etiqueta: 'Google Sites' };
  if (/facebook\.com|instagram\.com|tiktok\.com|twitter\.com|x\.com|airbnb\.com|booking\.com|tripadvisor/.test(u)) {
    const nombre = /airbnb/.test(u) ? 'Airbnb' : /booking/.test(u) ? 'Booking' : /instagram/.test(u) ? 'Instagram' : /tiktok/.test(u) ? 'TikTok' : /facebook/.test(u) ? 'Facebook' : 'Red social';
    return { tipo: 'muro', etiqueta: nombre };
  }
  return { tipo: 'propia', etiqueta: 'Web propia' };
}

export function slugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function mapTipo(raw: unknown): string | null {
  const t = norm(String(raw || ''));
  if (!t) return null;
  if (/hotel/.test(t)) return 'hotel';
  if (/hostal|hostel|albergue/.test(t)) return 'hostal';
  if (/glamping|domo|tipi/.test(t)) return 'glamping';
  if (/cabana/.test(t)) return 'glamping';
  if (/restaurante|pizzeria|parrilla|comida|gastronom/.test(t)) return 'restaurante';
  if (/bar\b|bares|pub|cerveceria|coctel/.test(t)) return 'bar';
  if (/finca/.test(t)) return 'finca';
  if (/tour|actividad|excursion|avistamiento|mariposario|ecoturismo/.test(t)) return 'actividad';
  if (/centro/.test(t)) return 'centro_turistico';
  return null;
}

function toBool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  const s = norm(String(v || ''));
  if (['si', 'sí', 'true', '1', 'x', 'verdadero', 'incluido', 'permitido', 'permitidas'].includes(s)) return true;
  if (['no', 'false', '0', '', '-', 'n/a', 'ninguno'].includes(s)) return s === '' ? undefined : false;
  return undefined;
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && !isNaN(v)) return v;
  let s = String(v || '').trim().toLowerCase();
  if (!s) return undefined;
  let mult = 1;
  if (/millon/.test(s)) mult = 1000000;
  else if (/\bmil\b|\bk\b/.test(s)) mult = 1000;
  s = s.replace(/[$\s]/g, '').replace(/\bmil\b|\bk\b|millones?|pesos?/g, '');
  // "150.000" (miles con punto) o "150,000" → número entero
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) {
    return parseInt(s.replace(/[.,]/g, ''), 10) * mult;
  }
  const n = parseFloat(s.replace(',', '.'));
  if (isNaN(n)) return undefined;
  if (mult === 1 && n < 1000) return Math.round(n * 1000); // "150" → 150 mil
  return Math.round(n * mult);
}

function splitList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v || '')
    .split(/[,;|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

@Injectable()
export class IngestionService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  /** Punto de entrada: parsea según formato y cruza con la BD. */
  async preview(formato: FormatoIngesta, contenido: string, municipio?: string) {
    let crudos: Record<string, unknown>[];
    if (formato === 'json') crudos = this.parseJson(contenido);
    else if (formato === 'csv') crudos = this.parseCsv(contenido);
    else crudos = await this.parseTexto(contenido);

    return this.cruzar(crudos, municipio);
  }

  /** Scrapea sitios reales del municipio vía OpenStreetMap (sin API key). */
  async scrapeMunicipio(municipio: string, departamento = 'Cundinamarca', tipos?: string[]) {
    if (!municipio || !municipio.trim()) {
      throw new BadRequestException('Indica el municipio a buscar.');
    }
    const geo = await this.geocodeMunicipio(municipio, departamento);
    const elementos = await this.fetchOsm(geo.lat, geo.lon, tipos);
    const crudos = elementos.map((e) => this.osmToDato(e, municipio, departamento));
    const { rows } = await this.cruzar(crudos, municipio);
    return {
      total: rows.length,
      rows,
      centro: { lat: geo.lat, lon: geo.lon, nombre: geo.nombre },
      fuente: 'OpenStreetMap',
    };
  }

  private async cruzar(crudos: Record<string, unknown>[], municipio?: string) {
    const rows: FilaPreview[] = [];
    for (let i = 0; i < crudos.length; i++) {
      rows.push(await this.normalizar(i, crudos[i], municipio));
    }
    return { total: rows.length, rows };
  }

  private parseJson(contenido: string): Record<string, unknown>[] {
    let data: unknown;
    try {
      data = JSON.parse(contenido);
    } catch {
      throw new BadRequestException('JSON inválido. Revisa comas, comillas y corchetes.');
    }
    const arr = Array.isArray(data)
      ? data
      : (data as any)?.sitios || (data as any)?.sites || (data as any)?.lugares || [data];
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new BadRequestException('No se encontraron sitios en el JSON (se esperaba un arreglo).');
    }
    return arr as Record<string, unknown>[];
  }

  private parseCsv(contenido: string): Record<string, unknown>[] {
    const lines = contenido.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      throw new BadRequestException('El CSV necesita una fila de encabezados y al menos una de datos.');
    }
    const delim = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
    const headers = lines[0].split(delim).map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cells = line.split(delim).map((c) => c.trim());
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        if (h) obj[h] = cells[i] || '';
      });
      return obj;
    });
  }

  /** Texto libre: requiere proveedor IA activo para extraer sitios estructurados. */
  private async parseTexto(contenido: string): Promise<Record<string, unknown>[]> {
    if (!contenido || contenido.trim().length < 20) {
      throw new BadRequestException('Pega un texto con la información de al menos un sitio.');
    }
    let raw: string;
    try {
      raw = await this.aiService.chat(
        `Extrae CADA sitio turístico, hotel, restaurante, bar o actividad mencionado en el texto y devuélvelos como arreglo JSON. Cada objeto: {"nombre","tipo","descripcion","direccion","telefono","email","ciudad","precio","capacidad","actividades"}. Tipos válidos: hotel, hostal, glamping, centro_turistico, restaurante, bar, finca, actividad. Solo JSON, sin explicaciones.\n\nTEXTO:\n${contenido.slice(0, 6000)}`,
      );
    } catch {
      throw new BadRequestException(
        'El texto libre necesita un proveedor de IA activo. Configura una API key en Proveedores IA, o usa formato JSON/CSV.',
      );
    }
    const m = raw.match(/\[[\s\S]*\]/);
    if (!m) throw new BadRequestException('La IA no devolvió sitios estructurados. Intenta con JSON o CSV.');
    try {
      const arr = JSON.parse(m[0]);
      if (!Array.isArray(arr) || arr.length === 0) throw new Error();
      return arr;
    } catch {
      throw new BadRequestException('La IA no devolvió sitios estructurados. Intenta con JSON o CSV.');
    }
  }

  /** Normaliza claves, valida y cruza con sitios existentes. */
  private async normalizar(index: number, crudo: Record<string, unknown>, municipio?: string): Promise<FilaPreview> {
    const datos: DatoSitio = {};
    const errores: string[] = [];

    // Campos estructurados que no pasan por el mapa de claves
    const c = crudo as any;
    if (c.coordenadas && typeof c.coordenadas.lat === 'number' && typeof c.coordenadas.lng === 'number') {
      datos.coordenadas = { lat: c.coordenadas.lat, lng: c.coordenadas.lng };
    }
    if (typeof c.website === 'string' && c.website.trim()) {
      datos.website = c.website.trim();
      datos.fuenteWeb = clasificarWeb(datos.website as string).etiqueta;
    }

    for (const [k, v] of Object.entries(crudo)) {
      const canon = KEYMAP[norm(k).replace(/\s+/g, '')] || KEYMAP[norm(k)];
      if (!canon) continue;
      if (canon === 'tipo') datos.tipo = String(v || '');
      else if (canon === 'precioNoche') {
        const n = toNumber(v);
        if (n !== undefined) datos.precioNoche = n;
      } else if (canon === 'capacidadMaxima' || canon === 'numeroHabitaciones' || canon === 'numeroBanos') {
        const n = toNumber(v);
        (datos as any)[canon] = n === undefined ? undefined : Math.round(n > 10000 ? n / 1000 : n);
      } else if (canon === 'admiteMascotas' || canon === 'seguroDisponible') {
        const b = toBool(v);
        if (b !== undefined) (datos as any)[canon] = b;
      } else if (canon === 'actividades') {
        datos.actividades = splitList(v);
      } else {
        (datos as any)[canon] = String(v || '').trim() || undefined;
      }
    }

    if (!datos.nombre) errores.push('Falta el nombre del sitio.');
    const tipoFinal = mapTipo(datos.tipo);
    if (!tipoFinal) errores.push(`Tipo no reconocido: "${datos.tipo || '(vacío)'}". Usa: hotel, hostal, glamping, restaurante, bar, finca, centro_turistico o actividad.`);
    else datos.tipo = tipoFinal;

    if (municipio && !datos.ciudad) datos.ciudad = municipio;
    if (datos.ciudad && !datos.ubicacion) datos.ubicacion = datos.ciudad;
    if (!datos.capacidadMaxima) datos.capacidadMaxima = 4;
    if (datos.precioNoche === undefined) errores.push('Falta el precio (se importará en 0, ajústalo luego).');

    const slug = datos.nombre ? slugify(datos.nombre) : null;
    let existente: FilaPreview['existente'] = null;
    let accion: FilaPreview['accion'] = 'crear';

    if (slug) {
      const bySlug = await this.prisma.propiedad.findUnique({
        where: { slug },
        select: { id: true, nombre: true, slug: true },
      });
      if (bySlug) {
        existente = bySlug;
        accion = 'actualizar';
      } else {
        // Posible duplicado por nombre parecido
        const nombreN = norm(datos.nombre!);
        const candidatos = await this.prisma.propiedad.findMany({
          select: { id: true, nombre: true, slug: true },
          take: 100,
        });
        const parecido = candidatos.find((c) => {
          const cn = norm(c.nombre);
          return cn && (cn.includes(nombreN) || nombreN.includes(cn)) && Math.min(cn.length, nombreN.length) > 4;
        });
        if (parecido) {
          existente = parecido;
          accion = 'duplicado';
        }
      }
    }

    return { index, datos, slug, accion, existente, errores };
  }

  // ---------------- Scraping OpenStreetMap ----------------

  private async geocodeMunicipio(municipio: string, departamento: string) {
    const q = encodeURIComponent(`${municipio}, ${departamento}, Colombia`);
    let res: Response;
    try {
      res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`, {
        headers: { 'User-Agent': OSM_UA },
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new BadRequestException('No se pudo contactar el geocodificador. Revisa tu conexión.');
    }
    const data = (await res.json().catch(() => [])) as any[];
    if (!res.ok || !data || data.length === 0) {
      throw new BadRequestException(`No se encontró el municipio "${municipio}". Verifica el nombre.`);
    }
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), nombre: data[0].display_name as string };
  }

  private osmFiltro(tipos: string[] | undefined, lat: number, lon: number): string {
    const RADIO = 12000;
    const t = new Set((tipos || []).map((x) => String(x)));
    const all = t.size === 0;
    const filtros: string[] = [];
    if (all || t.has('hotel')) filtros.push(`["tourism"="hotel"]`);
    if (all || t.has('hostal')) filtros.push(`["tourism"~"^(hostel|guest_house|apartment)$"]`);
    if (all || t.has('glamping')) filtros.push(`["tourism"~"^(camp_site|caravan_site)$"]`);
    if (all || t.has('restaurante')) filtros.push(`["amenity"~"^(restaurant|fast_food|food_court)$"]`);
    if (all || t.has('bar')) filtros.push(`["amenity"~"^(bar|pub|biergarten|cafe)$"]`);
    if (all || t.has('finca')) filtros.push(`["tourism"="farm"]`);
    if (all || t.has('centro_turistico')) filtros.push(`["leisure"~"^(park|nature_reserve|water_park|resort)$"]`);
    if (all || t.has('actividad')) filtros.push(`["tourism"~"^(attraction|museum|viewpoint|gallery)$"]`);
    // Cada sentencia completa con su área y su punto y coma
    return filtros.map((f) => `  nwr${f}(around:${RADIO},${lat},${lon});`).join('\n');
  }

  private async fetchOsm(lat: number, lon: number, tipos?: string[]) {
    const query = `[out:json][timeout:60];(\n${this.osmFiltro(tipos, lat, lon)}\n);out center tags;`;
    const endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.private.coffee/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ];
    let lastError = '';
    for (const url of endpoints) {
      // Reintentos con espera: 429/5xx/timeout son transitorios (carga del servidor)
      for (const espera of [0, 5000, 15000]) {
        if (espera > 0) await new Promise((r) => setTimeout(r, espera));
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'User-Agent': OSM_UA, 'Content-Type': 'text/plain' },
            body: query,
            signal: AbortSignal.timeout(90000),
          });
          if (res.status === 400) {
            lastError = 'consulta rechazada (HTTP 400)';
            break; // error real, no reintentar este mirror
          }
          if (!res.ok) {
            lastError = `HTTP ${res.status}`;
            continue; // reintentar / siguiente mirror
          }
          const data = (await res.json().catch(() => null)) as any;
          if (!data?.elements) {
            lastError = 'respuesta vacía';
            continue;
          }
          const elements = data.elements;
          // Solo con nombre, sin duplicados por nombre+coordenadas
          const vistos = new Set<string>();
          return elements
            .filter((e: any) => {
              const tags = e?.tags || {};
              if (!tags.name) return false;
              const la = e.lat ?? e.center?.lat;
              const lo = e.lon ?? e.center?.lon;
              if (la === undefined || lo === undefined) return false;
              const key = `${norm(tags.name)}|${Number(la).toFixed(4)}|${Number(lo).toFixed(4)}`;
              if (vistos.has(key)) return false;
              vistos.add(key);
              return true;
            })
            .slice(0, 120);
        } catch {
          lastError = 'sin respuesta';
          continue;
        }
      }
    }
    throw new BadRequestException(
      `Los servicios de mapas están saturados (${lastError}). Espera unos minutos e intenta de nuevo.`,
    );
  }

  private osmToDato(e: any, municipio: string, departamento: string): Record<string, unknown> {
    const tags = e.tags || {};
    const la = e.lat ?? e.center?.lat;
    const lo = e.lon ?? e.center?.lon;
    const dir = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
    const acts: string[] = [];
    if (tags.leisure === 'nature_reserve' || /bosque|reserva|natural/i.test(tags.name)) acts.push('senderismo');
    if (/piscina|pool/i.test(JSON.stringify(tags))) acts.push('natación');
    const website = tags.website || tags['contact:website'] || undefined;
    return {
      nombre: tags.name,
      tipo: this.osmTipo(tags),
      descripcion: `${tags.name} — sitio registrado en ${municipio} (${this.osmCategoria(tags)}).`,
      direccion: dir || undefined,
      ciudad: tags['addr:city'] || municipio,
      departamento,
      telefono: tags.phone || tags['contact:phone'] || undefined,
      website: website || undefined,
      fuenteWeb: website ? clasificarWeb(website).etiqueta : undefined,
      coordenadas: { lat: Number(la), lng: Number(lo) },
      actividades: acts,
    };
  }

  private osmTipo(tags: any): string {
    const tourism = norm(tags.tourism || '');
    const amenity = norm(tags.amenity || '');
    const leisure = norm(tags.leisure || '');
    if (tourism === 'hotel') return 'hotel';
    if (['hostel', 'guest_house', 'apartment'].includes(tourism)) return 'hostal';
    if (['camp_site', 'caravan_site'].includes(tourism)) return 'glamping';
    if (tourism === 'farm') return 'finca';
    if (['restaurant', 'fast_food', 'food_court'].includes(amenity)) return 'restaurante';
    if (['bar', 'pub', 'biergarten', 'cafe'].includes(amenity)) return 'bar';
    if (['attraction', 'museum', 'viewpoint', 'gallery'].includes(tourism)) return 'actividad';
    if (['park', 'nature_reserve', 'water_park', 'resort'].includes(leisure)) return 'centro_turistico';
    return 'actividad';
  }

  private osmCategoria(tags: any): string {
    return tags.tourism ? `turismo: ${tags.tourism}` : tags.amenity ? `servicio: ${tags.amenity}` : 'sitio de interés';
  }

  // ---------------- Enriquecimiento profundo ----------------

  /**
   * Visita la web de cada sitio y extrae datos reales (descripción,
   * precios, email, teléfono, imágenes). Solo rellena campos vacíos,
   * nunca inventa ni sobrescribe lo que ya hay.
   */
  async enriquecer(rows: Array<{ datos: DatoSitio }>) {
    const out: Array<{ datos: DatoSitio; agregado: string[] }> = [];
    let enriquecidos = 0;
    for (const row of rows || []) {
      const datos = { ...(row?.datos || {}) } as DatoSitio;
      if (!datos.website) {
        out.push({ datos, agregado: [] });
        continue;
      }
      if (!datos.fuenteWeb) datos.fuenteWeb = clasificarWeb(datos.website).etiqueta;
      const ext = await this.extraerDeWeb(datos.website);
      const agregado: string[] = [];
      if (ext.descripcion && (!datos.descripcion || /sitio registrado en/i.test(datos.descripcion))) {
        datos.descripcion = ext.descripcion;
        agregado.push('descripción');
      }
      if (ext.precio !== undefined && !datos.precioNoche) {
        datos.precioNoche = ext.precio;
        agregado.push('precio');
      }
      if (ext.email && !datos.email) {
        datos.email = ext.email;
        agregado.push('email');
      }
      if (ext.telefono && !datos.telefono) {
        datos.telefono = ext.telefono;
        agregado.push('teléfono');
      }
      if (ext.imagenes.length > 0 && !(datos.imagenes || []).length) {
        const validas = await this.filtrarImagenesValidas(ext.imagenes.slice(0, 6));
        if (validas.length > 0) {
          datos.imagenes = validas.slice(0, 4);
          agregado.push(`${datos.imagenes.length} fotos`);
        }
      }
      if (agregado.length > 0) enriquecidos++;
      out.push({ datos, agregado });
    }
    return { total: rows?.length || 0, enriquecidos, rows: out };
  }

  private async extraerDeWeb(url: string) {
    const found: { descripcion?: string; precio?: number; email?: string; telefono?: string; imagenes: string[] } = {
      imagenes: [],
    };
    let base = (url || '').trim();
    if (!base) return found;
    // Muros (redes/Airbnb): no gastar tiempo, piden login o bloquean bots
    if (clasificarWeb(base).tipo === 'muro') return found;
    if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
    let html = '';
    try {
      const res = await fetch(base, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TROPICAL BIOHOSTEL-Turismo/1.0' },
        signal: AbortSignal.timeout(12000),
        redirect: 'follow',
      });
      if (!res.ok) return found;
      const ct = res.headers.get('content-type') || '';
      if (!/html/i.test(ct)) return found;
      html = (await res.text()).slice(0, 1500000);
    } catch {
      return found;
    }
    const origin = (() => {
      try {
        return new URL(base).origin;
      } catch {
        return '';
      }
    })();

    // 1. JSON-LD (schema.org): la fuente más fiable
    const ldBlocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const b of ldBlocks) {
      try {
        const graphs = Array.isArray(JSON.parse(b[1])) ? JSON.parse(b[1]) : [JSON.parse(b[1])];
        for (const g of graphs.flatMap((x: any) => (x?.['@graph'] && Array.isArray(x['@graph']) ? x['@graph'] : [x]))) {
          if (!g || typeof g !== 'object') continue;
          const tel = g.telephone || g?.contactPoint?.telephone;
          if (tel && !found.telefono) found.telefono = String(tel).trim().slice(0, 30);
          const em = g.email;
          if (em && !found.email && /@/.test(String(em))) found.email = String(em).trim().slice(0, 80);
          const desc = g.description;
          if (desc && !found.descripcion && String(desc).trim().length > 40) {
            found.descripcion = String(desc).trim().slice(0, 600);
          }
          const pr = g.priceRange;
          if (pr && found.precio === undefined) {
            const n = this.precioDeTexto(String(pr));
            if (n !== undefined) found.precio = n;
          }
          const img = g.image;
          const imgs = Array.isArray(img) ? img : img ? [img] : [];
          for (const im of imgs) {
            const u = typeof im === 'string' ? im : im?.url;
            const abs = this.absUrl(u, origin);
            if (abs && found.imagenes.length < 6) found.imagenes.push(abs);
          }
        }
      } catch {
        // bloque JSON-LD inválido, seguir
      }
    }

    // 2. Meta descriptions / Open Graph / título + encabezados
    // (esto último rescata contenido de Google Sites y páginas simples)
    if (!found.descripcion) {
      const meta =
        html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']{40,600})["']/i) ||
        html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']{40,600})["']/i);
      if (meta) {
        found.descripcion = meta[1].trim();
      } else {
        const h1 = html.match(/<h1[^>]*>([^<]{10,200})<\/h1>/i);
        const firstP = html.match(/<p[^>]*>([^<]{60,600})<\/p>/i);
        const title = html.match(/<title[^>]*>([^<]{10,160})<\/title>/i);
        const partes = [h1?.[1].trim(), firstP?.[1].trim()].filter((x) => x && !/[{}$]/.test(x));
        if (partes.length > 0) {
          found.descripcion = partes.join('. ').slice(0, 600);
        } else if (title && !/inicio|home|bienvenido/i.test(title[1])) {
          found.descripcion = title[1].trim().slice(0, 200);
        }
      }
    }
    const ogImg = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogImg) {
      const abs = this.absUrl(ogImg[1], origin);
      if (abs && !found.imagenes.includes(abs)) found.imagenes.unshift(abs);
    }

    // 3. mailto: y tel:
    if (!found.email) {
      const m = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      if (m && !/example|test|noreply|no-reply/i.test(m[1])) found.email = m[1].slice(0, 80);
    }
    if (!found.telefono) {
      const t =
        html.match(/tel:(\+?57[\d\s-]{7,15})/) ||
        html.match(/(?:tel|cel|whatsapp|ll[aá]manos?)[^0-9+]{0,20}(\+?57[\d\s-]{7,15}|\b3\d{2}[\s-]?\d{3}[\s-]?\d{4}|\b601[\s-]?\d{3}[\s-]?\d{4})/i);
      if (t) found.telefono = t[1].trim().slice(0, 30);
    }

    // 4. Precios en el texto ("desde $150.000", "tarifa: $...", "habitaciones desde...")
    if (found.precio === undefined) {
      const texto = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ');
      const ctx = texto.match(
        /(?:desde|tarifa|tarifas|precio|precios|valor|noche|persona|habitaci[oó]n|menu|alojamiento|costo)[^$]{0,60}\$\s?[\d.,]+/i,
      );
      if (ctx) {
        const n = this.precioDeTexto(ctx[0]);
        if (n !== undefined && n >= 5000 && n <= 5000000) found.precio = n;
      }
    }

    // 5. Imágenes de contenido (si aún no hay)
    if (found.imagenes.length === 0) {
      const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
        .map((m) => this.absUrl(m[1], origin))
        .filter(
          (u): u is string =>
            !!u && /\.(jpe?g|png|webp)(\?|$)/i.test(u) && !/logo|icon|sprite|pixel|banner|svg/i.test(u),
        );
      found.imagenes = [...new Set(imgs)].slice(0, 4);
    }

    return found;
  }

  /** Solo conserva URLs que responden 2xx con contenido de imagen. */
  private async filtrarImagenesValidas(urls: string[]): Promise<string[]> {
    const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TROPICAL BIOHOSTEL-Turismo/1.0' };
    const esImagen = async (u: string): Promise<boolean> => {
      // HEAD primero (barato); si el servidor no lo soporta (405/501), GET parcial
      for (const metodo of ['HEAD', 'GET'] as const) {
        try {
          const res = await fetch(u, {
            method: metodo,
            headers: UA,
            signal: AbortSignal.timeout(8000),
            redirect: 'follow',
          });
          if (res.status === 405 || res.status === 501) continue;
          if (!res.ok) return false;
          const ct = res.headers.get('content-type') || '';
          try {
            await res.body?.cancel();
          } catch {}
          return /image\//i.test(ct);
        } catch {
          return false;
        }
      }
      return false;
    };
    const checks = await Promise.all(
      urls.map(async (u) => ((await esImagen(u)) ? u : null)),
    );
    return [...new Set(checks.filter((x): x is string => !!x))];
  }

  private absUrl(u: string | undefined, origin: string): string | null {
    if (!u) return null;
    const s = u.trim();
    if (/^data:/i.test(s)) return null;
    try {
      return new URL(s, origin || undefined).toString();
    } catch {
      return null;
    }
  }

  private precioDeTexto(s: string): number | undefined {
    const m = String(s).match(/\$?\s?(\d[\d.,]*)/);
    if (!m) return undefined;
    let num = m[1];
    // "150.000" o "150,000" → miles
    if (/^\d{1,3}([.,]\d{3})+$/.test(num)) return parseInt(num.replace(/[.,]/g, ''), 10);
    const n = parseFloat(num.replace(',', '.'));
    if (isNaN(n)) return undefined;
    if (n < 1000) return Math.round(n * 1000);
    return Math.round(n);
  }

  /** Ejecuta la importación según las acciones elegidas en el panel. */
  async execute(
    items: Array<{ datos: DatoSitio; accion: 'crear' | 'actualizar' | 'omitir'; slugObjetivo?: string }>,
    publicarNuevos: boolean,
  ) {    let creados = 0;
    let actualizados = 0;
    let omitidos = 0;
    const errores: string[] = [];

    for (const [i, item] of items.entries()) {
      try {
        if (item.accion === 'omitir') {
          omitidos++;
          continue;
        }
        if (!item.datos?.nombre || !mapTipo(item.datos.tipo)) {
          omitidos++;
          errores.push(`Fila ${i + 1}: sin nombre o tipo válido, omitida.`);
          continue;
        }
        const base: any = {
          nombre: item.datos.nombre,
          tipo: mapTipo(item.datos.tipo),
          descripcion: item.datos.descripcion || null,
          direccion: item.datos.direccion || null,
          ubicacion: item.datos.ubicacion || item.datos.ciudad || null,
          ciudad: item.datos.ciudad || null,
          departamento: item.datos.departamento || 'Cundinamarca',
          telefono: item.datos.telefono || null,
          email: item.datos.email || null,
          whatsapp: item.datos.whatsapp || null,
          precioNoche: item.datos.precioNoche ?? 0,
          capacidadMaxima: item.datos.capacidadMaxima || 4,
          numeroHabitaciones: item.datos.numeroHabitaciones ?? null,
          numeroBanos: item.datos.numeroBanos ?? null,
          admiteMascotas: !!item.datos.admiteMascotas,
          seguroDisponible: !!item.datos.seguroDisponible,
          actividades: item.datos.actividades || [],
          coordenadas: item.datos.coordenadas || undefined,
          redesSociales: item.datos.website ? { sitio_web: item.datos.website } : undefined,
          servicioImagenes: (item.datos.imagenes || []).slice(0, 6),
          horarioTexto: item.datos.horario || null,
          ratingExterno: item.datos.ratingGoogle ?? null,
          resenasExternas: item.datos.resenasGoogle ?? 0,
          fuenteDatos: 'admin',
          ultimaVerificacion: new Date(),
          verificado: true,
        };
        if (item.accion === 'actualizar' && item.slugObjetivo) {
          const target = await this.prisma.propiedad.findUnique({ where: { slug: item.slugObjetivo } });
          if (!target) {
            errores.push(`Fila ${i + 1}: no existe "${item.slugObjetivo}", se omite.`);
            omitidos++;
            continue;
          }
          // Solo pisa campos que vengan con valor (no borra lo existente)
          const patch: any = {};
          for (const [k, v] of Object.entries(base)) {
            if (v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)) patch[k] = v;
          }
          await this.prisma.propiedad.update({ where: { slug: item.slugObjetivo }, data: patch });
          actualizados++;
        } else {
          let slug = slugify(item.datos.nombre);
          let n = 2;
          while (await this.prisma.propiedad.findUnique({ where: { slug } })) {
            slug = `${slugify(item.datos.nombre)}-${n++}`;
          }
          await this.prisma.propiedad.create({
            data: { ...base, slug, estado: publicarNuevos ? 'PUBLICADO' : 'BORRADOR' },
          });
          creados++;
        }
      } catch (e: any) {
        omitidos++;
        errores.push(`Fila ${i + 1}: ${e?.message || 'error desconocido'}`);
      }
    }

    return { creados, actualizados, omitidos, errores };
  }
}
