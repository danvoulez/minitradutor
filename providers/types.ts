// providers/types.ts

export type TranslationMethod = "human" | "machine" | "hybrid";

export interface ProvenanceBlock {
  timestamp: string;   // ISO8601
  tenant_id: string;
  signature: string;   // hex ou vazio se desativado
}

export interface TranslationContract {
  id: string;
  workflow: string;
  flow: string;
  source_language: string;
  target_language: string;
  source_text: string;
  translated_text: string;
  translator?: string;
  method: TranslationMethod;
  confidence: number;
  provenance: ProvenanceBlock;
}

export interface TranslationContractEnvelope {
  contract: TranslationContract;
}

/**
 * Input "negócio" do sistema minitradutor.
 * É o que a API/CLI passam para o pipeline de tradução.
 */
export interface TranslationRequestInput {
  source_language: string;
  target_language: string;
  source_text: string;
  workflow: string;
  flow: string;
  tenant_id: string;
  method: TranslationMethod;
  translator?: string;
}

/**
 * Interface que define onde o LLM entra.
 * Qualquer implementação (OpenAI, Ollama, mock, humano via painel) precisa seguir isso.
 */
export interface TranslationProvider {
  translate(params: {
    source_language: string;
    target_language: string;
    text: string;
  }): Promise<{
    translatedText: string;
    confidence: number;
  }>;
}
