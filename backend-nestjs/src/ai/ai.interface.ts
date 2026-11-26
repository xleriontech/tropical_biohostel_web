export interface AIAdapter {
  chat(systemPrompt: string, userMessage: string, opts?: { temperature?: number }): Promise<string>;
  /** Embeddings para el RAG. Opcional: si el proveedor no lo soporta, Nati usa búsqueda FTS. */
  embed?(texts: string[]): Promise<{ vectors: number[][]; modelo: string }>;
}

export interface AIProviderConfig {
  id: string;
  name: string;
  apiKey: string;
  apiEndpoint: string;
}
