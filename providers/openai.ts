// providers/openai.ts

import {
  TranslationProvider,
} from "./types.ts";

export interface OpenAIProviderConfig {
  apiKey: string;
  baseUrl?: string;  // default https://api.openai.com
  model?: string;    // default gpt-4o-mini
}

/**
 * Implementação de TranslationProvider usando OpenAI.
 * Aqui é a ÚNICA camada que sabe que existe um "LLM".
 */
export class OpenAIProvider implements TranslationProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(config: OpenAIProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.openai.com";
    this.model = config.model ?? "gpt-4o-mini";
  }

  async translate(params: {
    source_language: string;
    target_language: string;
    text: string;
  }): Promise<{ translatedText: string; confidence: number }> {
    const prompt = [
      "You are a precise translation engine.",
      `Source language: ${params.source_language}`,
      `Target language: ${params.target_language}`,
      "",
      "Text to translate:",
      params.text,
      "",
      "Return ONLY the translated text, with no explanations."
    ].join("\n");

    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI error: ${res.status} ${res.statusText} - ${errText}`);
    }

    const data = await res.json();
    const translatedText: string =
      data.choices?.[0]?.message?.content?.trim?.() ?? "";

    if (!translatedText) {
      throw new Error("Empty translation from OpenAI");
    }

    // Heurística simples de confiança (pode ficar mais sofisticada depois)
    const confidence = 0.9;

    return { translatedText, confidence };
  }
}
