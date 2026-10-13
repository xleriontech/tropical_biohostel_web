import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AIAdapter, AIProviderConfig } from './ai.interface';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { ClaudeAdapter } from './adapters/claude.adapter';
import * as crypto from 'crypto';

export const SEARCH_SYSTEM_PROMPT = `Eres un asistente especializado en turismo. Tu tarea es analizar la consulta del usuario, que describe lo que busca en un alojamiento o centro turístico, y extraer los parámetros de búsqueda relevantes.

Devuelve **exclusivamente** un objeto JSON válido, sin explicaciones ni texto adicional.

Estructura JSON requerida:
{
  "tipo": "hotel" | "hostal" | "centro_turistico" | "glamping" | "restaurante" | "bar" | "finca" | "actividad" | null,
  "admiteMascotas": true | false | null,
  "numeroHuespedesMin": número entero positivo o null,
  "numeroHabitacionesMin": número entero positivo o null,
  "seguroDisponible": true | false | null,
  "actividades": ["senderismo", "buceo", ...] o [],
  "presupuestoMaximo": número o null,
  "precioMinimo": número o null,
  "ubicacion": "ciudad o región" | null,
  "palabrasClave": ["campestre", "cabana", ...] o []
}

Reglas de interpretación:
- hotel/hostal/glamping/cabaña/centro turístico/finca de alojamiento → tipo correspondiente
- restaurante, comer, almuerzo, cena, menú, parrilla → tipo "restaurante"
- bar, pub, cervecería, cócteles, tomar algo → tipo "bar"
- finca (campestre/productiva/visitable, no solo hospedaje) → tipo "finca"
- tour, excursión, avistamiento guiado, ecoturismo, mariposario → tipo "actividad"
- Referencias a mascotas, perro, gato, animales → admiteMascotas: true
- Seguro de viaje o cobertura → seguroDisponible: true
- Actividades mencionadas textualmente (senderismo, spa, yoga, buceo, etc.)
- Presupuesto: "menos de 200", "hasta 150 dólares" → presupuestoMaximo
- "desde 100", "más de 50" → precioMinimo
- palabrasClave: descriptores libres que NO encajen en los campos anteriores
  (ej: "campestre", "cabana", "independiente", "vista", "panoramica",
  "familiar", "romantico", "tranquilo", "piscina", "chimenea", "jacuzzi",
  "bosque", "ecologico", "boutique", "lujo", "mochilero"). Normalízalos a
  minúsculas SIN tildes y sin espacios (usa un solo término por descriptor).
- Si no hay información suficiente para un campo, poner null.`;

@Injectable()
export class AiService {
  private activeAdapter: AIAdapter | null = null;
  private activeProvider: string | null = null;
  /** Adaptador propio de Nati (chat). Independiente del de búsqueda. */
  private chatAdapter: AIAdapter | null = null;
  private chatProvider: string | null = null;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.loadActiveProvider()
      .then(() => this.loadChatProvider())
      .catch(() =>
        console.warn('??  Failed to load AI provider on startup'),
      );
  }

  encrypt(text: string): string {
    const masterKey = this.config.get('AI_MASTER_KEY');
    const key = crypto.scryptSync(masterKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  decrypt(encryptedText: string): string {
    if (!encryptedText.includes(':')) return encryptedText;
    const masterKey = this.config.get('AI_MASTER_KEY');
    const key = crypto.scryptSync(masterKey, 'salt', 32);
    const [ivHex, encHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  private async loadActiveProvider() {
    const provider = await this.prisma.aIProvider.findFirst({
      where: { isActive: true, apiKeys: { some: { isActive: true } } },
      include: { apiKeys: { where: { isActive: true }, take: 1 } },
      orderBy: { createdAt: 'asc' },
    });

    if (!provider || provider.apiKeys.length === 0) {
      console.warn('⚠️  No active AI provider configured');
      return;
    }

    const apiKey = this.decrypt(provider.apiKeys[0].key);
    this.activeProvider = provider.name;
    this.activeAdapter = this.createAdapter(provider.name, apiKey, provider.apiEndpoint);
    console.log(`✅ Active AI provider: ${provider.name}`);
  }

  private createAdapter(name: string, apiKey: string, endpoint: string): AIAdapter {
    const n = name.toLowerCase();
    if (n.includes('gemini')) return new GeminiAdapter(apiKey, endpoint);
    if (n.includes('claude') || n.includes('anthropic')) return new ClaudeAdapter(apiKey, endpoint);
    // OpenAI y todos los compatibles con su API (DeepSeek, Groq, Together, Mistral, Grok, Perplexity)
    return new OpenAIAdapter(apiKey, endpoint);
  }

  async chat(userMessage: string): Promise<string> {
    if (!this.activeAdapter) {
      throw new Error('No active AI provider. Configure one in the admin panel.');
    }
    return this.activeAdapter.chat(SEARCH_SYSTEM_PROMPT, userMessage);
  }

  async parseSearchQuery(userMessage: string): Promise<SearchFilters> {
    const raw = await this.chat(userMessage);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI returned invalid JSON');
    }

    try {
      return JSON.parse(jsonMatch[0]) as SearchFilters;
    } catch {
      // Retry once
      const retry = await this.chat(userMessage);
      const retryMatch = retry.match(/\{[\s\S]*\}/);
      if (!retryMatch) throw new Error('AI returned invalid JSON on retry');
      return JSON.parse(retryMatch[0]) as SearchFilters;
    }
  }

  async reloadProvider() {
    await this.loadActiveProvider();
  }

  getActiveProviderName(): string | null {
    return this.activeProvider;
  }

  /** true si hay un proveedor LLM configurado y listo. */
  isAvailable(): boolean {
    return !!this.activeAdapter;
  }

  /** true si Nati tiene su propio proveedor de IA con key. */
  isChatAvailable(): boolean {
    return !!this.chatAdapter;
  }

  /** Traduce errores técnicos de los proveedores a español claro. */
  private traducirErrorIA(e: Error): string {
    const m = e.message || '';
    if (/401/.test(m)) return 'Key inválida o sin permiso (401). Genera una nueva en la web del proveedor.';
    if (/402/.test(m)) return 'Sin saldo en el proveedor (402). Recarga en su página.';
    if (/403/.test(m)) return 'Acceso denegado (403) para esa key.';
    if (/429/.test(m)) return 'Límite de uso excedido (429). Espera un rato o sube de plan.';
    if (/404/.test(m)) return 'Modelo o ruta no disponible (404) en este proveedor.';
    if (/fetch failed|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|Failed to fetch/.test(m))
      return 'Sin conexión con el proveedor. Revisa tu internet.';
    if (/abort|timeout|timed out|TimeoutError/.test(m))
      return 'El proveedor tardó demasiado en responder (timeout).';
    return m.slice(0, 220);
  }

  /**
   * Prueba real contra el proveedor: un chat mínimo y un embedding.
   * Si no se indica proveedor, prueba el motor efectivo del RAG
   * (configurado en rag-config, o Nati/activo).
   */
  async probarProveedor(providerId?: string | null): Promise<{
    proveedor: string;
    chat: { ok: boolean; ms?: number; error?: string };
    embeddings: { ok: boolean; dimensiones?: number; modelo?: string; error?: string };
  }> {
    let adapter: AIAdapter;
    let name: string;
    let apiKey = '';
    let endpoint = '';
    if (providerId) {
      ({ adapter, name, apiKey, endpoint } = await this.adapterPara(providerId));
    } else {
      const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'rag-config' } });
      const conf = ((cfg?.value || {}) as unknown as { providerId?: string | null }) || {};
      if (conf.providerId) {
        ({ adapter, name } = await this.adapterPara(conf.providerId));
      } else if (this.chatAdapter && this.chatProvider) {
        adapter = this.chatAdapter;
        name = this.chatProvider;
      } else if (this.activeAdapter && this.activeProvider) {
        adapter = this.activeAdapter;
        name = this.activeProvider;
      } else {
        throw new Error('No hay ningún proveedor con key. Agrega una API key primero.');
      }
    }

    const chat: { ok: boolean; ms?: number; error?: string } = { ok: false };
    const t0 = Date.now();
    try {
      const r = await adapter.chat('Responde con exactamente: OK', 'hola');
      chat.ok = true;
      chat.ms = Date.now() - t0;
      if (!/ok/i.test(r)) chat.ms = Date.now() - t0;
    } catch (e) {
      chat.error = this.traducirErrorIA(e as Error);
    }

    const embeddings: { ok: boolean; dimensiones?: number; modelo?: string; error?: string } = { ok: false };
    try {
      if (!adapter.embed) {
        embeddings.error = `"${name}" no ofrece API de embeddings (usa búsqueda de texto).`;
      } else {
        const r = await adapter.embed(['prueba de embeddings']);
        if (r.vectors[0]?.length) {
          embeddings.ok = true;
          embeddings.dimensiones = r.vectors[0].length;
          embeddings.modelo = r.modelo;
        } else {
          embeddings.error = 'Respuesta vacía del servicio de embeddings.';
        }
      }
    } catch (e) {
      embeddings.error = this.traducirErrorIA(e as Error);
    }

    // Diagnóstico extra para Gemini: ¿la key vale y qué modelos ve?
    // (cuota/transitorios se reportan tal cual, sin culpar al modelo)
    if (!chat.ok && /gemini/i.test(name) && apiKey && !/Límite|tardó|demasiado|429|50[023]|conexión/i.test(chat.error || '')) {
      try {
        const r = await fetch(`${endpoint}/models?key=${apiKey}`);
        if (r.ok) {
          const data = await r.json();
          const modelos: string[] = (data.models || [])
            .map((m: any) => String(m.name || '').replace(/^models\//, ''))
            .filter(Boolean)
            .slice(0, 10);
          chat.error =
            `La key SÍ es válida, pero el modelo de chat no está disponible para ella.` +
            (modelos.length ? ` Modelos visibles: ${modelos.join(', ')}.` : '');
        } else if (r.status === 400) {
          chat.error = 'Key inválida (Google la rechaza). Genera una nueva en AI Studio.';
        }
      } catch {}
    }

    return { proveedor: name, chat, embeddings };
  }

  /**
   * ¿El proveedor en uso ofrece API de embeddings? DeepSeek, Groq y Claude
   * no la tienen: con ellos Nati genera respuestas por IA pero el RAG
   * recupera por texto (FTS). Gemini y OpenAI sí tienen embeddings.
   */
  isEmbeddingAvailable(): boolean {
    const nombre = (this.chatProvider || this.activeProvider || '').toLowerCase();
    if (!nombre) return false;
    return !['deepseek', 'groq', 'anthropic', 'claude'].some((s) => nombre.includes(s));
  }

  getChatProviderName(): string | null {
    return this.chatProvider;
  }

  /** Conversación libre con system prompt propio (historial ya incluido en el mensaje). */
  async chatWith(systemPrompt: string, userMessage: string): Promise<string> {
    const adapter = this.chatAdapter || this.activeAdapter;
    if (!adapter) {
      throw new Error('No active AI provider. Configure one in the admin panel.');
    }
    return adapter.chat(systemPrompt, userMessage, { temperature: 0.7 });
  }

  /**
   * Adaptador de un proveedor específico (para el motor del RAG).
   * Lanza error si no existe o no tiene key activa.
   */
  async adapterPara(providerId: string): Promise<{ adapter: AIAdapter; name: string; apiKey: string; endpoint: string }> {
    const provider = await this.prisma.aIProvider.findUnique({
      where: { id: providerId },
      include: { apiKeys: { where: { isActive: true }, take: 1 } },
    });
    if (!provider) throw new Error('Proveedor no encontrado.');
    if (!provider.apiKeys.length) throw new Error(`"${provider.name}" no tiene API key activa.`);
    const apiKey = this.decrypt(provider.apiKeys[0].key).trim();
    return {
      adapter: this.createAdapter(provider.name, apiKey, provider.apiEndpoint),
      name: provider.name,
      apiKey,
      endpoint: provider.apiEndpoint,
    };
  }

  /**
   * Embeddings para el RAG con el proveedor de Nati (o el activo).
   * Devuelve null si no hay proveedor o no soporta embeddings:
   * en ese caso el RAG usa búsqueda de texto (FTS en español).
   */
  async embedTexts(texts: string[]): Promise<{ vectors: number[][]; modelo: string } | null> {
    const adapter = this.chatAdapter || this.activeAdapter;
    if (!adapter || !adapter.embed) return null;
    try {
      const r = await adapter.embed(texts);
      if (!r.vectors.length || !r.vectors[0]?.length) return null;
      return r;
    } catch (e) {
      console.warn('⚠️  Embeddings no disponibles:', (e as Error).message);
      return null;
    }
  }

  /**
   * Embeddings con un proveedor elegido explícitamente (motor del RAG).
   * Devuelve null si el proveedor no soporta embeddings o falla.
   */
  async embedConProveedor(
    providerId: string,
    texts: string[],
  ): Promise<{ vectors: number[][]; modelo: string; proveedor: string } | null> {
    try {
      const { adapter, name } = await this.adapterPara(providerId);
      if (!adapter.embed) return null;
      const r = await adapter.embed(texts);
      if (!r.vectors.length || !r.vectors[0]?.length) return null;
      return { ...r, proveedor: name };
    } catch (e) {
      console.warn('⚠️  Embeddings no disponibles:', (e as Error).message);
      return null;
    }
  }

  /** (Re)carga el proveedor propio de Nati: marcado paraChat + activo + con key. */
  async loadChatProvider() {
    try {
      const provider = await this.prisma.aIProvider.findFirst({
        where: { isActive: true, paraChat: true, apiKeys: { some: { isActive: true } } },
        include: { apiKeys: { where: { isActive: true }, take: 1 } },
        orderBy: { createdAt: 'asc' },
      });
      if (!provider || provider.apiKeys.length === 0) {
        this.chatAdapter = null;
        this.chatProvider = null;
        return;
      }
      const apiKey = this.decrypt(provider.apiKeys[0].key);
      this.chatProvider = provider.name;
      this.chatAdapter = this.createAdapter(provider.name, apiKey, provider.apiEndpoint);
      console.log(`✅ Active chat AI provider (Nati): ${provider.name}`);
    } catch (e) {
      console.warn('⚠️  Failed to load chat AI provider:', (e as Error).message);
    }
  }

  async reloadChatProvider() {
    await this.loadChatProvider();
  }
}

export interface SearchFilters {
  tipo: 'hotel' | 'hostal' | 'centro_turistico' | 'glamping' | 'restaurante' | 'bar' | 'finca' | 'actividad' | null;
  admiteMascotas: boolean | null;
  numeroHuespedesMin: number | null;
  numeroHabitacionesMin: number | null;
  seguroDisponible: boolean | null;
  actividades: string[];
  presupuestoMaximo: number | null;
  precioMinimo: number | null;
  ubicacion: string | null;
  /** Descriptores libres (minúsculas, sin tildes) que se buscan en
   *  nombre/descripción/ubicación. Ej: ["campestre","cabana","vista"] */
  palabrasClave: string[];
}
