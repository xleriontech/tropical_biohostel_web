import { AIAdapter } from '../ai.interface';

export class GeminiAdapter implements AIAdapter {
  constructor(
    private apiKey: string,
    private endpoint = 'https://generativelanguage.googleapis.com/v1beta',
  ) {}

  async chat(systemPrompt: string, userMessage: string, opts?: { temperature?: number }): Promise<string> {
    // Google retira modelos a cuentas nuevas y la cuota free limita otros: se intenta en orden.
    const modelos = [
      process.env.AI_CHAT_MODEL,
      'gemini-flash-lite-latest',
      'gemma-4-26b-a4b-it',
      'gemini-2.5-flash',
      'gemini-3.8-flash',
    ].filter(Boolean) as string[];
    let ultimoError = '';
    for (const model of modelos) {
      try {
        return await this.generar(model, systemPrompt, userMessage, opts?.temperature ?? 0.1);
      } catch (e) {
        ultimoError = (e as Error).message;
        // 404 = modelo retirado (probar siguiente); 429/5xx = transitorio (reintentar siguiente)
        if (!/404|429|500|502|503/.test(ultimoError)) throw e;
      }
    }
    throw new Error(ultimoError || 'Gemini chat error');
  }

  private async generar(model: string, systemPrompt: string, userMessage: string, temperature: number): Promise<string> {
    const url = `${this.endpoint}/models/${model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userMessage }] },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: 1024,
        },
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async embed(texts: string[]): Promise<{ vectors: number[][]; modelo: string }> {
    const modelos = [process.env.AI_EMBEDDING_MODEL || 'gemini-embedding-001', 'text-embedding-004'];
    let ultimoError = '';
    for (const modelo of modelos) {
      try {
        const vectors: number[][] = [];
        for (const text of texts) {
          const url = `${this.endpoint}/models/${modelo}:embedContent?key=${this.apiKey}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: { parts: [{ text: text.slice(0, 8000) }] } }),
            signal: AbortSignal.timeout(20000),
          });
          if (!response.ok) throw new Error(`${response.status} - ${await response.text()}`);
          const data = await response.json();
          vectors.push(data.embedding?.values || []);
        }
        if (vectoresValidos(vectors)) return { vectors, modelo };
        ultimoError = 'respuesta vacía';
      } catch (e) {
        ultimoError = (e as Error).message;
      }
    }
    throw new Error(`Gemini embedding error: ${ultimoError}`);
  }
}

function vectoresValidos(v: number[][]): boolean {
  return v.length > 0 && v.every((x) => x.length > 0);
}
