// providers/mock.ts

import { TranslationProvider } from "./types.ts";

export interface MockProviderConfig {
  // Mock sempre responde com sucesso, mas pode simular delays ou falhas
  simulateDelay?: number; // em ms
  shouldFail?: boolean;
  fixedConfidence?: number; // padrão 0.95
}

/**
 * Mock provider para testes.
 * Não faz chamadas reais de LLM, apenas simula traduções.
 */
export class MockProvider implements TranslationProvider {
  private config: MockProviderConfig;

  constructor(config: MockProviderConfig = {}) {
    this.config = {
      simulateDelay: config.simulateDelay ?? 0,
      shouldFail: config.shouldFail ?? false,
      fixedConfidence: config.fixedConfidence ?? 0.95,
    };
  }

  async translate(params: {
    source_language: string;
    target_language: string;
    text: string;
  }): Promise<{ translatedText: string; confidence: number }> {
    // Simula delay se configurado
    if (this.config.simulateDelay && this.config.simulateDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.simulateDelay));
    }

    // Simula falha se configurado
    if (this.config.shouldFail) {
      throw new Error("Mock translation failed (simulated)");
    }

    // Gera tradução mock simples
    const translatedText = this.mockTranslate(
      params.text,
      params.source_language,
      params.target_language
    );

    return {
      translatedText,
      confidence: this.config.fixedConfidence!,
    };
  }

  /**
   * Lógica simplificada de tradução mock.
   * Em um cenário real, isso seria substituído por um LLM.
   */
  private mockTranslate(text: string, from: string, to: string): string {
    // Regras simples para testes determinísticos
    const rules: Record<string, Record<string, Record<string, string>>> = {
      en: {
        pt: {
          "Hello world": "Olá mundo",
          "Hello": "Olá",
          "test": "teste",
          "The system is auditable.": "O sistema é auditável.",
        },
        ja: {
          "Hello world": "こんにちは世界",
          "Hello": "こんにちは",
        },
      },
      pt: {
        en: {
          "Olá mundo": "Hello world",
          "O sistema é auditável.": "The system is auditable.",
        },
      },
      python: {
        pt: {
          "def greet(): print('Hello')": "Uma função 'greet' que imprime 'Hello'.",
          "def hello(): return 'world'": "Uma função 'hello' que retorna 'world'.",
        },
        en: {
          "def greet(): print('Hello')": "A function 'greet' that prints 'Hello'.",
        },
      },
    };

    // Tenta encontrar tradução exata
    const translation = rules[from]?.[to]?.[text];
    if (translation) {
      return translation;
    }

    // Fallback: indica que é uma tradução mock
    return `[MOCK ${from}→${to}] ${text}`;
  }
}
