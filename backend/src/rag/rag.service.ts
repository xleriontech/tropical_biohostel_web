import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

export interface FragmentoRag {
  documentoId: string;
  documentoTitulo: string;
  contenido: string;
  score: number;
  metodo: 'vector' | 'texto';
}

export interface MotorRag {
  providerId: string | null; // null = automático (proveedor de Nati / activo)
  modelo?: string | null;    // override del modelo de embeddings (OpenAI-compatibles)
}

const TAM_CHUNK = 900;
const SOLAPE = 120;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private prisma: PrismaService,
    private ai: AiService,
  ) {}

  // ---------- motor de embeddings (configurable) ----------

  async getMotor(): Promise<MotorRag> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'rag-config' } });
    const v = ((cfg?.value || {}) as unknown) as MotorRag;
    return { providerId: v.providerId ?? null, modelo: v.modelo ?? null };
  }

  async setMotor(motor: MotorRag): Promise<MotorRag> {
    if (motor.providerId) {
      // valida que exista (adapterPara valida la key al usarlo)
      const p = await this.prisma.aIProvider.findUnique({ where: { id: motor.providerId } });
      if (!p) throw new Error('Proveedor no encontrado.');
    }
    await this.prisma.siteConfig.upsert({
      where: { key: 'rag-config' },
      update: { value: { providerId: motor.providerId, modelo: motor.modelo || null } },
      create: { key: 'rag-config', value: { providerId: motor.providerId, modelo: motor.modelo || null } },
    });
    return this.getMotor();
  }

  async listarProveedores() {
    const provs = await this.prisma.aIProvider.findMany({
      orderBy: { createdAt: 'asc' },
      include: { apiKeys: { where: { isActive: true }, select: { id: true } } },
    });
    return provs.map((p) => ({
      id: p.id,
      name: p.name,
      isActive: p.isActive,
      paraChat: p.paraChat,
      tieneKey: p.apiKeys.length > 0,
      soportaEmbeddings: !['deepseek', 'groq', 'anthropic', 'claude'].some((s) =>
        p.name.toLowerCase().includes(s),
      ),
    }));
  }

  /** Embeddings con el motor configurado (o el automático si es null). */
  private async embedMotor(texts: string[]): Promise<{ vectors: number[][]; modelo: string } | null> {
    const motor = await this.getMotor();
    const modeloOverride = motor.modelo?.trim();
    if (modeloOverride) process.env.AI_EMBEDDING_MODEL = modeloOverride;
    if (motor.providerId) {
      return this.ai.embedConProveedor(motor.providerId, texts);
    }
    return this.ai.embedTexts(texts);
  }

  // ---------- ingesta ----------

  /** Parte el texto en fragmentos con solape, por párrafos y frases. */
  dividir(texto: string): string[] {
    const limpio = texto.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
    if (!limpio) return [];
    const paras = limpio.split(/\n\s*\n/);
    const chunks: string[] = [];
    let actual = '';
    const volcar = () => {
      const t = actual.trim();
      if (t) chunks.push(t);
      actual = '';
    };
    for (const p of paras) {
      const par = p.trim();
      if (!par) continue;
      if ((actual + '\n\n' + par).length <= TAM_CHUNK) {
        actual = actual ? actual + '\n\n' + par : par;
      } else {
        if (actual) {
          // solape: arrastra la cola del chunk anterior
          const cola = actual.slice(-SOLAPE);
          volcar();
          actual = cola;
        }
        if (par.length <= TAM_CHUNK) {
          actual = actual ? actual + '\n\n' + par : par;
        } else {
          // párrafo gigante: corta por frases
          const frases = par.split(/(?<=[.!?])\s+/);
          for (const f of frases) {
            if ((actual + ' ' + f).length <= TAM_CHUNK) {
              actual = actual ? actual + ' ' + f : f;
            } else {
              volcar();
              actual = f.slice(-TAM_CHUNK);
              if (f.length > TAM_CHUNK) {
                // frase larguísima: corte duro en pedazos
                for (let i = 0; i < f.length; i += TAM_CHUNK - SOLAPE) {
                  chunks.push(f.slice(i, i + TAM_CHUNK).trim());
                }
                actual = '';
              }
            }
          }
        }
      }
    }
    volcar();
    return chunks.filter((c) => c.length > 40);
  }

  private limpiarHtml(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }

  async crearDocumento(input: {
    titulo: string;
    contenido: string;
    fuente?: string;
    tipo?: string;
  }) {
    const doc = await this.prisma.documento.create({
      data: {
        titulo: input.titulo,
        fuente: input.fuente || 'manual',
        tipo: input.tipo || 'md',
        estado: 'PROCESANDO',
        contenido: input.contenido,
      },
    });
    try {
      await this.indexarContenido(doc.id, input.contenido);
      return this.obtener(doc.id);
    } catch (e) {
      await this.prisma.documento.update({
        where: { id: doc.id },
        data: { estado: 'ERROR', error: (e as Error).message.slice(0, 500) },
      });
      throw e;
    }
  }

  /** (Re)genera los chunks de un documento y sus embeddings si hay proveedor. */
  async indexarContenido(documentoId: string, contenido: string) {
    const texto = contenido.trim();
    if (!texto) throw new Error('El documento está vacío.');
    const partes = this.dividir(texto);
    if (!partes.length) throw new Error('No se pudo extraer texto útil.');

    // Embeddings con el motor configurado (si soporta); si no, solo FTS.
    let vectores: number[][] | null = null;
    let modelo: string | null = null;
    try {
      const r = await this.embedMotor(partes);
      if (r) {
        vectores = r.vectors;
        modelo = r.modelo;
      }
    } catch (e) {
      this.logger.warn(`Embeddings fallaron, se indexa solo texto: ${(e as Error).message}`);
    }

    await this.prisma.$transaction([
      this.prisma.chunkDocumento.deleteMany({ where: { documentoId } }),
      this.prisma.chunkDocumento.createMany({
        data: partes.map((contenido, orden) => ({
          documentoId,
          orden,
          contenido,
          embedding: vectores?.[orden]?.length ? vectores[orden] : [],
        })),
      }),
      this.prisma.documento.update({
        where: { id: documentoId },
        data: {
          estado: 'LISTO',
          error: null,
          totalChunks: partes.length,
          modeloEmb: modelo,
        },
      }),
    ]);
  }

  /** Edita título y/o contenido y reindexa. */
  async editar(documentoId: string, cambios: { titulo?: string; contenido?: string }) {
    const doc = await this.prisma.documento.findUnique({ where: { id: documentoId } });
    if (!doc) throw new Error('Documento no encontrado.');
    const titulo = (cambios.titulo || '').trim();
    const contenido = cambios.contenido;
    if (titulo) {
      await this.prisma.documento.update({ where: { id: documentoId }, data: { titulo } });
    }
    if (contenido !== undefined) {
      if (!contenido.trim()) throw new Error('El contenido no puede quedar vacío.');
      await this.prisma.documento.update({
        where: { id: documentoId },
        data: { contenido, estado: 'PROCESANDO', error: null },
      });
    }
    return this.reindexar(documentoId);
  }

  async reindexar(documentoId: string) {    const doc = await this.prisma.documento.findUnique({ where: { id: documentoId } });
    if (!doc) throw new Error('Documento no encontrado.');
    if (!doc.contenido) throw new Error('Sin texto fuente para reindexar.');
    await this.prisma.documento.update({
      where: { id: documentoId },
      data: { estado: 'PROCESANDO', error: null },
    });
    try {
      await this.indexarContenido(documentoId, doc.contenido);
      return this.obtener(documentoId);
    } catch (e) {
      await this.prisma.documento.update({
        where: { id: documentoId },
        data: { estado: 'ERROR', error: (e as Error).message.slice(0, 500) },
      });
      throw e;
    }
  }

  /** Importa los .md/.txt/.html de la carpeta docs/ del proyecto. */
  async importarDocsCarpeta() {
    const candidatos = [
      process.env.RAG_DOCS_DIR,
      join(process.cwd(), '..', 'docs'),
      join(__dirname, '..', '..', '..', 'docs'),
    ].filter(Boolean) as string[];
    let dir: string | null = null;
    for (const c of candidatos) {
      try {
        const st = await fs.stat(c);
        if (st.isDirectory()) {
          dir = c;
          break;
        }
      } catch {}
    }
    if (!dir) throw new Error('No se encontró la carpeta docs/ (define RAG_DOCS_DIR).');

    const archivos = (await fs.readdir(dir)).filter((f) =>
      /\.(md|txt|html?)$/i.test(f),
    );
    const resumen: { titulo: string; estado: string; chunks?: number }[] = [];
    for (const archivo of archivos) {
      const ruta = join(dir, archivo);
      const crudo = await fs.readFile(ruta, 'utf8');
      const esHtml = /\.html?$/i.test(archivo);
      const contenido = esHtml ? this.limpiarHtml(crudo) : crudo;
      if (contenido.trim().length < 100) {
        resumen.push({ titulo: archivo, estado: 'omitido (muy corto)' });
        continue;
      }
      const titulo = archivo.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
      const existente = await this.prisma.documento.findFirst({
        where: { titulo, fuente: 'docs' },
      });
      if (existente) {
        await this.prisma.documento.update({
          where: { id: existente.id },
          data: { estado: 'PROCESANDO', error: null, contenido },
        });
        try {
          await this.indexarContenido(existente.id, contenido);
          resumen.push({ titulo, estado: 'reindexado' });
        } catch (e) {
          await this.prisma.documento.update({
            where: { id: existente.id },
            data: { estado: 'ERROR', error: (e as Error).message.slice(0, 500) },
          });
          resumen.push({ titulo, estado: 'error' });
        }
      } else {
        try {
          const doc = await this.crearDocumento({
            titulo,
            contenido,
            fuente: 'docs',
            tipo: esHtml ? 'html' : archivo.toLowerCase().endsWith('.txt') ? 'txt' : 'md',
          });
          resumen.push({ titulo, estado: 'importado', chunks: doc?.totalChunks });
        } catch {
          resumen.push({ titulo, estado: 'error' });
        }
      }
    }
    return { carpeta: dir, archivos: resumen };
  }

  // ---------- consulta ----------

  /** URL pública del sitio (para el token {{baseUrl}} en documentos). */
  async sitioUrl(): Promise<string> {
    if (process.env.SITIO_URL) return process.env.SITIO_URL.replace(/\/$/, '');
    try {
      const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'sitio-url' } });
      const v = ((cfg?.value || {}) as unknown as { url?: string }) || {};
      if (v.url) return String(v.url).replace(/\/$/, '');
    } catch {}
    return '';
  }

  /** Resuelve tokens de documento: {{baseUrl}} → URL pública (o '' si no hay). */
  async resolverTokens(contenido: string): Promise<string> {
    if (!contenido.includes('{{')) return contenido;
    const base = await this.sitioUrl();
    return contenido
      .replace(/\{\{\s*baseUrl\s*\}\}/gi, base)
      .replace(/\{\{\s*sitio\s*\}\}/gi, base);
  }

  private coseno(a: number[], b: number[]): number {
    let dot = 0;
    let na = 0;
    let nb = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (!na || !nb) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  /** Palabras significativas para búsqueda OR (sin stopwords ni tildes). */
  private terminos(texto: string): string[] {
    const stop = new Set([
      'que', 'con', 'para', 'como', 'porque', 'donde', 'cuando', 'cuanto',
      'cuanta', 'cuantos', 'cuantas', 'cual', 'cuales', 'quien', 'quienes',
      'tiene', 'tienen', 'hay', 'esta', 'este', 'estos', 'estas', 'son',
      'hace', 'hacen', 'puede', 'pueden', 'algo', 'alla', 'aqui', 'alla',
      'cada', 'cual', 'entre', 'desde', 'hasta', 'sobre', 'tambien',
    ]);
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .split(/[^a-z]+/)
      .filter((w) => w.length > 3 && !stop.has(w))
      .slice(0, 8);
  }

  async buscar(query: string, k = 4): Promise<FragmentoRag[]> {
    const q = query.trim().slice(0, 500);
    if (!q) return [];
    const topK = Math.max(1, Math.min(8, k));
    const mapear = async (
      filas: { documentoId: string; documentoTitulo: string; contenido: string; score: number; metodo: 'vector' | 'texto' }[],
    ): Promise<FragmentoRag[]> =>
      Promise.all(
        filas.map(async (f) => ({ ...f, contenido: await this.resolverTokens(f.contenido) })),
      );

    // 1) Similitud vectorial con el motor configurado (si hay embeddings)
    try {
      const emb = await this.embedMotor([q]);
      if (emb) {
        const chunks = await this.prisma.chunkDocumento.findMany({
          where: { documento: { estado: 'LISTO' } },
          include: { documento: { select: { id: true, titulo: true } } },
        });
        const rank = chunks
          .filter((c) => c.embedding.length === emb.vectors[0].length)
          .map((c) => ({
            documentoId: c.documentoId,
            documentoTitulo: c.documento.titulo,
            contenido: c.contenido,
            score: this.coseno(emb.vectors[0], c.embedding),
            metodo: 'vector' as const,
          }))
          .filter((r) => r.score > 0.25)
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);
        if (rank.length) return mapear(rank);
      }
    } catch (e) {
      this.logger.warn(`Búsqueda vectorial falló, uso FTS: ${(e as Error).message}`);
    }

    // 2) Búsqueda de texto en español (siempre disponible, semántica OR)
    const terms = this.terminos(q);
    if (!terms.length) return [];
    const tsq = terms.join(' | ');
    const filas = await this.prisma.$queryRaw<
      { id: string; documentoId: string; titulo: string; contenido: string; rank: number }[]
    >`
      SELECT c.id, c."documentoId", d.titulo,
             left(c.contenido, 1200) AS contenido,
             ts_rank(to_tsvector('spanish', c.contenido), to_tsquery('spanish', ${tsq})) AS rank
      FROM "ChunkDocumento" c
      JOIN "Documento" d ON d.id = c."documentoId"
      WHERE d.estado = 'LISTO'
        AND to_tsvector('spanish', c.contenido) @@ to_tsquery('spanish', ${tsq})
      ORDER BY rank DESC
      LIMIT ${topK};
    `;
    return mapear(
      filas.map((f) => ({
        documentoId: f.documentoId,
        documentoTitulo: f.titulo,
        contenido: f.contenido,
        score: Number(f.rank),
        metodo: 'texto' as const,
      })),
    );
  }

  // ---------- admin ----------

  async listar() {
    return this.prisma.documento.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        titulo: true,
        fuente: true,
        tipo: true,
        estado: true,
        error: true,
        totalChunks: true,
        modeloEmb: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async obtener(id: string) {
    return this.prisma.documento.findUnique({
      where: { id },
      include: { _count: { select: { chunks: true } } },
    });
  }

  async eliminar(id: string) {
    await this.prisma.chunkDocumento.deleteMany({ where: { documentoId: id } });
    return this.prisma.documento.delete({ where: { id } });
  }

  async estado() {
    const [docs, chunks, conEmb, modelos, motor, proveedores] = await Promise.all([
      this.prisma.documento.count(),
      this.prisma.chunkDocumento.count(),
      this.prisma.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(*)::bigint AS n FROM "ChunkDocumento" WHERE cardinality(embedding) > 0;
      `,
      this.prisma.documento.findMany({
        where: { modeloEmb: { not: null } },
        select: { modeloEmb: true },
        distinct: ['modeloEmb'],
      }),
      this.getMotor(),
      this.listarProveedores(),
    ]);
    const motorNombre =
      proveedores.find((p) => p.id === motor.providerId)?.name || null;
    return {
      documentos: docs,
      chunks,
      chunksConEmbedding: Number(conEmb[0]?.n || 0),
      modelos: modelos.map((m) => m.modeloEmb),
      embeddingsDisponibles: this.ai.isEmbeddingAvailable(),
      proveedorChat: this.ai.getChatProviderName() || this.ai.getActiveProviderName(),
      motor,
      motorNombre,
    };
  }
}
