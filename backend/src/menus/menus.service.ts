import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../rag/rag.service';

export interface PlatoInput {
  nombre: string;
  descripcion?: string | null;
  categoria?: string | null;
  precio?: number | null;
  etiquetas?: string[];
  orden?: number;
}

export interface ComidaInput {
  titulo: string;
  slug?: string;
  tipo?: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  horario?: string | null;
  activo?: boolean;
  orden?: number;
  platos?: PlatoInput[];
}

/** slug amigable: "Menú del Finquero" -> "menu-del-finquero" */
function slugify(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

const includePlatos = {
  platos: { orderBy: [{ orden: 'asc' as const }, { createdAt: 'asc' as const }] },
};

@Injectable()
export class MenusService {
  private readonly logger = new Logger(MenusService.name);
  private cache: { data: unknown; at: number } | null = null;

  constructor(
    private prisma: PrismaService,
    private rag: RagService,
  ) {}

  // ---------- públicos ----------

  /** Menús activos con sus platos (cache 60s para la home y el chat). */
  async listarActivos() {
    if (this.cache && Date.now() - this.cache.at < 60_000) return this.cache.data;
    const data = await this.prisma.comida.findMany({
      where: { activo: true },
      include: includePlatos,
      orderBy: [{ orden: 'asc' }, { createdAt: 'desc' }],
    });
    this.cache = { data, at: Date.now() };
    return data;
  }

  async porSlug(slug: string) {
    const comida = await this.prisma.comida.findUnique({ where: { slug }, include: includePlatos });
    if (!comida || !comidoActivo(comida)) throw new NotFoundException('Menú no encontrado');
    return comida;
  }

  /** Texto plano de todos los menús activos, para inyectar en el prompt de Nati. */
  async contextoParaChat(maxCaracteres = 4000): Promise<string> {
    try {
      const menus = (await this.listarActivos()) as Array<{
        titulo: string;
        slug: string;
        tipo: string;
        horario: string | null;
        descripcion: string | null;
        platos: Array<{
          nombre: string;
          descripcion: string | null;
          categoria: string | null;
          precio: number | null;
          etiquetas: string[];
        }>;
      }>;
      if (!menus.length) return '';
      const partes = menus.map((m) => {
        const platos = m.platos
          .map((p) => {
            const etq = p.etiquetas?.length ? ` [${p.etiquetas.join(', ')}]` : '';
            const cat = p.categoria ? `${p.categoria}: ` : '';
            const precio =
              typeof p.precio === 'number' ? ` — $${p.precio.toLocaleString('es-CO')}` : '';
            return `- ${cat}${p.nombre}${etq}${precio}${p.descripcion ? ` (${p.descripcion})` : ''}`;
          })
          .join('\n');
        const horario = m.horario ? ` · ${m.horario}` : '';
        return `### ${m.tipo} — ${m.titulo}${horario}\n${m.descripcion ? m.descripcion + '\n' : ''}${platos || '(sin platos registrados)'}`;
      });
      const bloque = `MENÚS Y COMIDAS DISPONIBLES (en /comidas):\n\n${partes.join('\n\n')}`;
      return bloque.slice(0, maxCaracteres);
    } catch (e) {
      this.logger.warn(`No se pudo armar contexto de menús: ${(e as Error).message}`);
      return '';
    }
  }

  // ---------- admin ----------

  async listarTodos() {
    return this.prisma.comida.findMany({
      include: includePlatos,
      orderBy: [{ orden: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async crear(data: ComidaInput) {
    this.validar(data);
    const base = data.slug?.trim() ? slugify(data.slug) : slugify(data.titulo);
    let slug = base || `menu-${Date.now().toString(36)}`;
    const existe = await this.prisma.comida.findUnique({ where: { slug } });
    if (existe) slug = `${slug}-${Date.now().toString(36)}`;

    const comida = await this.prisma.comida.create({
      data: {
        titulo: data.titulo.trim(),
        slug,
        tipo: (data.tipo as any) || 'OTRO',
        descripcion: data.descripcion || null,
        imagenUrl: data.imagenUrl || null,
        horario: data.horario || null,
        activo: data.activo ?? true,
        orden: data.orden ?? 0,
        platos: data.platos?.length
          ? { create: data.platos.map((p, i) => this.platoData(p, i)) }
          : undefined,
      },
      include: includePlatos,
    });
    await this.reindexar(comida.id);
    return comida;
  }

  async actualizar(id: string, data: ComidaInput) {
    const previa = await this.prisma.comida.findUnique({ where: { id } });
    if (!previa) throw new NotFoundException('Menú no encontrado');
    if (data.titulo) this.validar(data);

    const comida = await this.prisma.comida.update({
      where: { id },
      data: {
        titulo: data.titulo?.trim(),
        tipo: data.tipo ? (data.tipo as any) : undefined,
        descripcion: data.descripcion === undefined ? undefined : data.descripcion || null,
        imagenUrl: data.imagenUrl === undefined ? undefined : data.imagenUrl || null,
        horario: data.horario === undefined ? undefined : data.horario || null,
        activo: data.activo,
        orden: data.orden,
      },
      include: includePlatos,
    });
    await this.reindexar(id);
    return comida;
  }

  async eliminar(id: string) {
    const previa = await this.prisma.comida.findUnique({ where: { id } });
    if (!previa) throw new NotFoundException('Menú no encontrado');
    await this.prisma.comida.delete({ where: { id } });
    await this.eliminarDocRag(id);
    return { ok: true };
  }

  async agregarPlato(comidaId: string, data: PlatoInput) {
    if (!data?.nombre?.trim()) throw new BadRequestException('El plato necesita nombre');
    await this.exigirComida(comidaId);
    const plato = await this.prisma.plato.create({
      data: { ...this.platoData(data, 0), comidaId },
    });
    await this.reindexar(comidaId);
    return plato;
  }

  async actualizarPlato(comidaId: string, platoId: string, data: PlatoInput) {
    await this.exigirComida(comidaId);
    const plato = await this.prisma.plato.update({
      where: { id: platoId },
      data: {
        nombre: data.nombre?.trim(),
        descripcion: data.descripcion === undefined ? undefined : data.descripcion || null,
        categoria: data.categoria === undefined ? undefined : data.categoria || null,
        precio: data.precio === undefined ? undefined : data.precio,
        etiquetas: data.etiquetas,
        orden: data.orden,
      },
    });
    await this.reindexar(comidaId);
    return plato;
  }

  async eliminarPlato(comidaId: string, platoId: string) {
    await this.exigirComida(comidaId);
    await this.prisma.plato.delete({ where: { id: platoId } }).catch(() => undefined);
    await this.reindexar(comidaId);
    return { ok: true };
  }

  // ---------- utilidades ----------

  private validar(data: ComidaInput) {
    if (!data?.titulo?.trim()) throw new BadRequestException('El menú necesita un título');
    if (data.platos) {
      for (const p of data.platos) {
        if (!p.nombre?.trim()) throw new BadRequestException('Cada plato necesita un nombre');
        if (typeof p.precio === 'number' && p.precio < 0) {
          throw new BadRequestException('El precio no puede ser negativo');
        }
      }
    }
  }

  private async exigirComida(id: string) {
    const c = await this.prisma.comida.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Menú no encontrado');
    return c;
  }

  private platoData(p: PlatoInput, i: number) {
    return {
      nombre: p.nombre.trim(),
      descripcion: p.descripcion || null,
      categoria: p.categoria || null,
      precio: typeof p.precio === 'number' ? p.precio : null,
      etiquetas: Array.isArray(p.etiquetas) ? p.etiquetas.filter(Boolean) : [],
      orden: typeof p.orden === 'number' ? p.orden : i,
    };
  }

  /** Mantiene el documento RAG del menú al día (lo consume Nati y la búsqueda factual). */
  private async reindexar(comidaId: string) {
    this.cache = null;
    try {
      const comida = await this.prisma.comida.findUnique({
        where: { id: comidaId },
        include: includePlatos,
      });
      if (!comida || !comida.activo) {
        await this.eliminarDocRag(comidaId);
        return;
      }
      const contenido = this.contenidoDocumento(comida as any);
      const titulo = `Menús Tropical Biohostel: ${comida.titulo}`;
      const doc = await this.prisma.documento.findFirst({ where: { fuente: `menu:${comidaId}` } });
      if (doc) {
        await this.rag.editar(doc.id, { titulo, contenido });
      } else {
        await this.rag.crearDocumento({ titulo, contenido, fuente: `menu:${comidaId}`, tipo: 'md' });
      }
    } catch (e) {
      this.logger.warn(`No se pudo indexar menú en RAG: ${(e as Error).message}`);
    }
  }

  private async eliminarDocRag(comidaId: string) {
    this.cache = null;
    try {
      const doc = await this.prisma.documento.findFirst({ where: { fuente: `menu:${comidaId}` } });
      if (doc) await this.rag.eliminar(doc.id);
    } catch {}
  }

  private contenidoDocumento(c: {
    titulo: string;
    tipo: string;
    horario: string | null;
    descripcion: string | null;
    platos: Array<{
      nombre: string;
      descripcion: string | null;
      categoria: string | null;
      precio: number | null;
      etiquetas: string[];
    }>;
  }): string {
    const lineas = [
      `# ${c.titulo}`,
      '',
      `**Tipo:** ${c.tipo.toLowerCase()}${c.horario ? ` · **Horario:** ${c.horario}` : ''}`,
      c.descripcion ? `\n${c.descripcion}` : '',
      '',
      '## Platos',
      '',
      ...c.platos.map((p) => {
        const etq = p.etiquetas?.length ? ` _(${p.etiquetas.join(', ')})_` : '';
        const precio = typeof p.precio === 'number' ? ` — $${p.precio.toLocaleString('es-CO')}` : '';
        const cat = p.categoria ? `**${p.categoria}:** ` : '';
        const desc = p.descripcion ? ` — ${p.descripcion}` : '';
        return `- ${cat}${p.nombre}${etq}${precio}${desc}`;
      }),
      '',
      `Disponible en la página /comidas del sitio.`,
    ];
    return lineas.filter((l) => l !== undefined).join('\n').trim();
  }
}

function comidoActivo(c: { activo: boolean }) {
  return c.activo;
}
