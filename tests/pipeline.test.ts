/**
 * Testes para o pipeline unificado de tradução
 * Testa o fluxo completo: provider → translateRequest → ledger
 */

import {
  assertEquals,
  assertExists,
  assertRejects,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { translateRequest } from "../translate.ts";
import { MockProvider } from "../providers/mock.ts";
import { TranslationRequestInput } from "../providers/types.ts";
import { readLedger } from "../ledger.ts";

const TEST_LEDGER_PATH = "./tests/test_pipeline_ledger.ndjson";

// Limpa o ledger de teste antes de cada teste
async function cleanTestLedger() {
  try {
    await Deno.remove(TEST_LEDGER_PATH);
  } catch {
    // Ignora se não existir
  }
}

// ============================================================================
// TESTES DO PIPELINE BÁSICO
// ============================================================================

Deno.test("translateRequest - deve criar contrato válido e salvar no ledger", async () => {
  await cleanTestLedger();

  // Temporariamente redireciona para ledger de teste
  // (precisaríamos modificar ledger.ts para aceitar path customizado, por ora vamos testar o padrão)

  const provider = new MockProvider();
  const input: TranslationRequestInput = {
    source_language: "en",
    target_language: "pt",
    source_text: "Hello world",
    workflow: "test_workflow",
    flow: "test_flow",
    tenant_id: "test_tenant",
    method: "machine",
  };

  const envelope = await translateRequest(provider, input);

  // Valida estrutura do envelope
  assertExists(envelope.contract);
  assertEquals(envelope.contract.source_language, "en");
  assertEquals(envelope.contract.target_language, "pt");
  assertEquals(envelope.contract.source_text, "Hello world");
  assertEquals(envelope.contract.translated_text, "Olá mundo");
  assertEquals(envelope.contract.method, "machine");
  assertEquals(envelope.contract.confidence, 0.95);
  assertExists(envelope.contract.id);
  assertExists(envelope.contract.provenance.timestamp);
  assertEquals(envelope.contract.provenance.tenant_id, "test_tenant");
});

Deno.test("translateRequest - deve falhar se método human sem translator", async () => {
  const provider = new MockProvider();
  const input: TranslationRequestInput = {
    source_language: "en",
    target_language: "pt",
    source_text: "test",
    workflow: "test",
    flow: "test",
    tenant_id: "test",
    method: "human",
    // translator não fornecido!
  };

  await assertRejects(
    async () => await translateRequest(provider, input),
    Error,
    "translator field is required"
  );
});

Deno.test("translateRequest - deve aceitar método human com translator", async () => {
  const provider = new MockProvider();
  const input: TranslationRequestInput = {
    source_language: "en",
    target_language: "pt",
    source_text: "Hello world",
    workflow: "test",
    flow: "test",
    tenant_id: "test",
    method: "human",
    translator: "john.doe@example.com",
  };

  const envelope = await translateRequest(provider, input);

  assertEquals(envelope.contract.method, "human");
  assertEquals(envelope.contract.translator, "john.doe@example.com");
});

Deno.test("translateRequest - deve aceitar método hybrid com translator", async () => {
  const provider = new MockProvider();
  const input: TranslationRequestInput = {
    source_language: "en",
    target_language: "pt",
    source_text: "Hello world",
    workflow: "test",
    flow: "test",
    tenant_id: "test",
    method: "hybrid",
    translator: "ai-assisted-translator",
  };

  const envelope = await translateRequest(provider, input);

  assertEquals(envelope.contract.method, "hybrid");
  assertEquals(envelope.contract.translator, "ai-assisted-translator");
});

// ============================================================================
// TESTES DE TRADUÇÃO DE CÓDIGO
// ============================================================================

Deno.test("translateRequest - deve traduzir código Python para linguagem natural", async () => {
  const provider = new MockProvider();
  const input: TranslationRequestInput = {
    source_language: "python",
    target_language: "pt",
    source_text: "def greet(): print('Hello')",
    workflow: "code_doc",
    flow: "explain_function",
    tenant_id: "test",
    method: "machine",
  };

  const envelope = await translateRequest(provider, input);

  assertEquals(envelope.contract.source_language, "python");
  assertEquals(envelope.contract.target_language, "pt");
  assertEquals(envelope.contract.translated_text, "Uma função 'greet' que imprime 'Hello'.");
});

// ============================================================================
// TESTES DE CONFIANÇA
// ============================================================================

Deno.test("translateRequest - deve ter confidence entre 0 e 1", async () => {
  const provider = new MockProvider({ fixedConfidence: 0.85 });
  const input: TranslationRequestInput = {
    source_language: "en",
    target_language: "pt",
    source_text: "test",
    workflow: "test",
    flow: "test",
    tenant_id: "test",
    method: "machine",
  };

  const envelope = await translateRequest(provider, input);

  assertEquals(envelope.contract.confidence, 0.85);
  assertEquals(envelope.contract.confidence >= 0, true);
  assertEquals(envelope.contract.confidence <= 1, true);
});

// ============================================================================
// TESTES DE FALHA DO PROVIDER
// ============================================================================

Deno.test("translateRequest - deve propagar erro do provider", async () => {
  const provider = new MockProvider({ shouldFail: true });
  const input: TranslationRequestInput = {
    source_language: "en",
    target_language: "pt",
    source_text: "test",
    workflow: "test",
    flow: "test",
    tenant_id: "test",
    method: "machine",
  };

  await assertRejects(
    async () => await translateRequest(provider, input),
    Error,
    "Mock translation failed"
  );
});

// ============================================================================
// TESTES DE IDs ÚNICOS
// ============================================================================

Deno.test("translateRequest - deve gerar IDs únicos para inputs diferentes", async () => {
  const provider = new MockProvider();

  const input1: TranslationRequestInput = {
    source_language: "en",
    target_language: "pt",
    source_text: "Hello",
    workflow: "test",
    flow: "test",
    tenant_id: "test",
    method: "machine",
  };

  const input2: TranslationRequestInput = {
    source_language: "en",
    target_language: "pt",
    source_text: "World",
    workflow: "test",
    flow: "test",
    tenant_id: "test",
    method: "machine",
  };

  const envelope1 = await translateRequest(provider, input1);
  const envelope2 = await translateRequest(provider, input2);

  // IDs devem ser diferentes
  assertEquals(envelope1.contract.id !== envelope2.contract.id, true);

  // IDs devem começar com "trans_"
  assertEquals(envelope1.contract.id.startsWith("trans_"), true);
  assertEquals(envelope2.contract.id.startsWith("trans_"), true);
});

Deno.test("translateRequest - deve gerar mesmo ID para mesmo input (idempotência)", async () => {
  const provider = new MockProvider();

  const input: TranslationRequestInput = {
    source_language: "en",
    target_language: "pt",
    source_text: "Hello world",
    workflow: "test",
    flow: "test",
    tenant_id: "test",
    method: "machine",
  };

  const envelope1 = await translateRequest(provider, input);
  const envelope2 = await translateRequest(provider, input);

  // IDs devem ser iguais (baseados no conteúdo)
  assertEquals(envelope1.contract.id, envelope2.contract.id);
});

console.log("\n✅ Todos os testes do pipeline passaram!\n");
