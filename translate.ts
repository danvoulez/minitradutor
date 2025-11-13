/**
 * Módulo de tradução com abstração para múltiplos provedores LLM
 * Parte do projeto minitradutor - LogLine Foundation
 */

import { getConfig } from "./config.ts";

// ============================================================================
// TIPOS
// ============================================================================

export interface TranslationParams {
  source_language: string;
  target_language: string;
  source_text: string;
}

export interface TranslationResult {
  translated_text: string;
  confidence: number;
}

export interface TranslationProvider {
  translate(params: TranslationParams): Promise<TranslationResult>;
}

// ============================================================================
// PROVIDER: ANTHROPIC CLAUDE
// ============================================================================

class AnthropicProvider implements TranslationProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async translate(params: TranslationParams): Promise<TranslationResult> {
    const prompt = this.buildPrompt(params);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const translated_text = data.content[0].text.trim();

      // Estima confiança baseado na completude da resposta
      const confidence = this.estimateConfidence(params.source_text, translated_text);

      return { translated_text, confidence };
    } catch (error) {
      throw new Error(`Translation failed with Anthropic: ${error.message}`);
    }
  }

  private buildPrompt(params: TranslationParams): string {
    const isCode = this.isCodeLanguage(params.source_language);
    const isTargetCode = this.isCodeLanguage(params.target_language);

    if (isCode && !isTargetCode) {
      // Traduzindo código para linguagem natural
      return `Translate the following ${params.source_language} code to ${params.target_language}, providing a clear explanation of what it does. Focus on semantic meaning, not literal translation.

Code:
${params.source_text}

Provide ONLY the translation, no additional commentary.`;
    } else if (!isCode && isTargetCode) {
      // Traduzindo linguagem natural para código
      return `Convert the following ${params.source_language} text into ${params.target_language} code:

Text:
${params.source_text}

Provide ONLY the code, no explanations or commentary.`;
    } else if (isCode && isTargetCode) {
      // Traduzindo entre linguagens de programação
      return `Convert the following ${params.source_language} code to ${params.target_language}, maintaining the same functionality:

Source code:
${params.source_text}

Provide ONLY the converted code, no explanations.`;
    } else {
      // Traduzindo entre linguagens naturais
      return `Translate the following text from ${params.source_language} to ${params.target_language}. Maintain the semantic meaning with minimal loss. Provide ONLY the translation, no additional commentary.

Text:
${params.source_text}`;
    }
  }

  private isCodeLanguage(lang: string): boolean {
    const codeLangs = [
      "python", "javascript", "typescript", "java", "c", "cpp", "c++",
      "rust", "go", "ruby", "php", "swift", "kotlin", "html", "css",
      "sql", "bash", "shell", "json", "xml", "yaml",
    ];
    return codeLangs.includes(lang.toLowerCase());
  }

  private estimateConfidence(source: string, translated: string): number {
    // Heurística simples: confiança baseada na completude
    if (!translated || translated.length === 0) return 0.0;
    if (translated.length < source.length * 0.3) return 0.6;
    if (translated.includes("I cannot") || translated.includes("I can't")) return 0.5;
    return 0.85; // Confiança padrão para traduções bem-sucedidas
  }
}

// ============================================================================
// PROVIDER: OPENAI
// ============================================================================

class OpenAIProvider implements TranslationProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async translate(params: TranslationParams): Promise<TranslationResult> {
    const prompt = this.buildPrompt(params);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "You are a professional translator. Provide accurate translations with minimal semantic loss.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const translated_text = data.choices[0].message.content.trim();

      const confidence = this.estimateConfidence(params.source_text, translated_text);

      return { translated_text, confidence };
    } catch (error) {
      throw new Error(`Translation failed with OpenAI: ${error.message}`);
    }
  }

  private buildPrompt(params: TranslationParams): string {
    return `Translate from ${params.source_language} to ${params.target_language}:\n\n${params.source_text}`;
  }

  private estimateConfidence(source: string, translated: string): number {
    if (!translated || translated.length === 0) return 0.0;
    if (translated.length < source.length * 0.3) return 0.6;
    return 0.85;
  }
}

// ============================================================================
// PROVIDER: MOCK (para testes)
// ============================================================================

class MockProvider implements TranslationProvider {
  async translate(params: TranslationParams): Promise<TranslationResult> {
    // Tradução mock para testes
    const translated_text = `[MOCK TRANSLATION from ${params.source_language} to ${params.target_language}]: ${params.source_text}`;
    return {
      translated_text,
      confidence: 0.95,
    };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Cria um provider de tradução baseado na configuração
 */
export function createProvider(): TranslationProvider {
  const config = getConfig();

  switch (config.llmProvider) {
    case "anthropic":
      if (!config.anthropicApiKey) {
        throw new Error("ANTHROPIC_API_KEY not configured");
      }
      return new AnthropicProvider(config.anthropicApiKey);

    case "openai":
      if (!config.openaiApiKey) {
        throw new Error("OPENAI_API_KEY not configured");
      }
      return new OpenAIProvider(config.openaiApiKey);

    case "mock":
      return new MockProvider();

    default:
      throw new Error(`Unknown LLM provider: ${config.llmProvider}`);
  }
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * Traduz um texto de uma linguagem para outra
 * @param params - Parâmetros da tradução
 * @returns Resultado da tradução com confiança
 */
export async function translateText(params: TranslationParams): Promise<TranslationResult> {
  const provider = createProvider();
  return await provider.translate(params);
}
