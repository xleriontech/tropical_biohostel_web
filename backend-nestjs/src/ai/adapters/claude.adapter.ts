import { AIAdapter } from '../ai.interface';

export class ClaudeAdapter implements AIAdapter {
  constructor(
    private apiKey: string,
    private endpoint = 'https://api.anthropic.com/v1',
  ) {}

  async chat(systemPrompt: string, userMessage: string, opts?: { temperature?: number }): Promise<string> {
    const response = await fetch(`${this.endpoint}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        temperature: opts?.temperature ?? 0.1,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }
}
