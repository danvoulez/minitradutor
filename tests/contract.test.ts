/**
 * Testes para o módulo de contratos
 * Parte do projeto minitradutor - LogLine Foundation
 */

import { assertEquals, assertExists, assertRejects } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { buildContract, validateContract, saveLedgerEntry, readLedger } from "../contract.ts";

// ============================================================================
// TESTES DE CONSTRUÇÃO DE CONTRATO
// ============================================================================

Deno.test("buildContract - deve criar um contrato válido", async () => {
  const contract = await buildContract({
    workflow: "test_workflow",
    flow: "test_flow",
    source_language: "en",
    target_language: "pt",
    source_text: "Hello world",
    translated_text: "Olá mundo",
    method: "machine",
    confidence: 0.95,
    tenant_id: "test_tenant",
  });

  assertEquals(contract.workflow, "test_workflow");
  assertEquals(contract.flow, "test_flow");
  assertEquals(contract.source_language, "en");
  assertEquals(contract.target_language, "pt");
  assertEquals(contract.source_text, "Hello world");
  assertEquals(contract.translated_text, "Olá mundo");
  assertEquals(contract.method, "machine");
  assertEquals(contract.confidence, 0.95);
  assertEquals(contract.provenance.tenant_id, "test_tenant");
  assertExists(contract.id);
  assertExists(contract.provenance.timestamp);
});

Deno.test("buildContract - deve gerar ID com prefixo trans_", async () => {
  const contract = await buildContract({
    workflow: "test",
    flow: "test",
    source_language: "en",
    target_language: "pt",
    source_text: "test",
    translated_text: "teste",
    method: "machine",
    confidence: 0.9,
    tenant_id: "test",
  });

  assertEquals(contract.id.startsWith("trans_"), true);
});

// ============================================================================
// TESTES DE VALIDAÇÃO
// ============================================================================

Deno.test("validateContract - deve rejeitar confidence inválida", async () => {
  const contract = await buildContract({
    workflow: "test",
    flow: "test",
    source_language: "en",
    target_language: "pt",
    source_text: "test",
    translated_text: "teste",
    method: "machine",
    confidence: 1.5, // Inválido!
    tenant_id: "test",
  });

  await assertRejects(
    async () => await validateContract(contract),
    Error,
    "confidence must be between 0.0 and 1.0"
  );
});

Deno.test("validateContract - deve exigir translator quando method=human", async () => {
  const contract = await buildContract({
    workflow: "test",
    flow: "test",
    source_language: "en",
    target_language: "pt",
    source_text: "test",
    translated_text: "teste",
    method: "human",
    confidence: 0.9,
    tenant_id: "test",
    // translator NÃO fornecido!
  });

  await assertRejects(
    async () => await validateContract(contract),
    Error,
    "translator field is required"
  );
});

Deno.test("validateContract - deve aceitar translator quando method=human", async () => {
  const contract = await buildContract({
    workflow: "test",
    flow: "test",
    source_language: "en",
    target_language: "pt",
    source_text: "test",
    translated_text: "teste",
    method: "human",
    confidence: 0.95,
    tenant_id: "test",
    translator: "john.doe@example.com",
  });

  // Não deve lançar erro
  await validateContract(contract);
  assertEquals(contract.translator, "john.doe@example.com");
});

// ============================================================================
// TESTES DE PERSISTÊNCIA
// ============================================================================

Deno.test("saveLedgerEntry - deve salvar contrato em NDJSON", async () => {
  const testLedgerPath = "./tests/test_ledger.ndjson";

  // Remove arquivo de teste se existir
  try {
    await Deno.remove(testLedgerPath);
  } catch {
    // Ignora se não existir
  }

  const contract = await buildContract({
    workflow: "test",
    flow: "test",
    source_language: "en",
    target_language: "pt",
    source_text: "test",
    translated_text: "teste",
    method: "machine",
    confidence: 0.9,
    tenant_id: "test",
  });

  await saveLedgerEntry(contract, testLedgerPath);

  // Verifica se o arquivo foi criado
  const content = await Deno.readTextFile(testLedgerPath);
  assertEquals(content.trim().length > 0, true);
  assertEquals(content.includes('"id"'), true);
  assertEquals(content.includes('"workflow"'), true);

  // Limpa
  await Deno.remove(testLedgerPath);
});

Deno.test("readLedger - deve ler contratos do ledger", async () => {
  const testLedgerPath = "./tests/test_ledger_read.ndjson";

  // Remove arquivo de teste se existir
  try {
    await Deno.remove(testLedgerPath);
  } catch {
    // Ignora
  }

  // Cria dois contratos
  const contract1 = await buildContract({
    workflow: "test1",
    flow: "flow1",
    source_language: "en",
    target_language: "pt",
    source_text: "hello",
    translated_text: "olá",
    method: "machine",
    confidence: 0.9,
    tenant_id: "test",
  });

  const contract2 = await buildContract({
    workflow: "test2",
    flow: "flow2",
    source_language: "pt",
    target_language: "en",
    source_text: "olá",
    translated_text: "hello",
    method: "machine",
    confidence: 0.85,
    tenant_id: "test",
  });

  await saveLedgerEntry(contract1, testLedgerPath);
  await saveLedgerEntry(contract2, testLedgerPath);

  // Lê de volta
  const contracts = await readLedger(testLedgerPath);

  assertEquals(contracts.length, 2);
  assertEquals(contracts[0].workflow, "test1");
  assertEquals(contracts[1].workflow, "test2");

  // Limpa
  await Deno.remove(testLedgerPath);
});

Deno.test("readLedger - deve retornar array vazio se ledger não existir", async () => {
  const contracts = await readLedger("./tests/nonexistent.ndjson");
  assertEquals(contracts.length, 0);
});

console.log("\n✅ Todos os testes de contrato passaram!\n");
