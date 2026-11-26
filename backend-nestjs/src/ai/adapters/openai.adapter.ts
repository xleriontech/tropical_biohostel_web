import { AIAdapter } from '../ai.interface';

export class OpenAIAdapter implements AIAdapter {
  constructor(
    private apiKey: string,
    private endpoint = 'https://api.openai.com/v1',
  ) {}

  async chat(systemPrompt: string, userMessage: string, opts?: { temperature?: number }): Promise<string> {
    // Modelo según proveedor (override con AI_CHAT_MODEL). DeepSeek no tiene gpt-4o.
    const model =
      process.env.AI_CHAT_MODEL ||
      (this.endpoint.includes('deepseek') ? 'deepseek-chat' : 'gpt-4o');
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: opts?.temperature ?? 0.1,
        max_tokens: 1024,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async embed(texts: string[]): Promise<{ vectors: number[][]; modelo: string }> {
    const modelo = process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small';
    const response = await fetch(`${this.endpoint}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: modelo,
        input: texts.map((t) => t.slice(0, 8000)),
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Embedding error: ${response.status} - ${err}`);
    }
    const data = await response.json();
    const vectors = (data.data || [])
      .sort((a: any, b: any) => a.index - b.index)
      .map((d: any) => d.embedding || []);
    return { vectors, modelo };
  }
}
