/**
 * Exemplo simples de uso do minitradutor
 */

import { buildContract, saveLedgerEntry } from "../contract.ts";
import { translateText } from "../translate.ts";
import { setConfig } from "../config.ts";

// Configura para usar mock provider (sem necessidade de API key)
setConfig({
  llmProvider: "mock",
  enableSigning: false,
  ledgerPath: "./output/contracts.ndjson",
  port: 8000,
  host: "0.0.0.0",
  defaultTenantId: "example",
  defaultWorkflow: "example",
  defaultFlow: "simple",
});

console.log("🌐 Minitradutor - Exemplo Simples\n");

// Exemplo 1: Tradução de texto natural
console.log("📝 Exemplo 1: Tradução de texto natural");
const result1 = await translateText({
  source_language: "en",
  target_language: "pt",
  source_text: "Hello, world! This is a test.",
});

console.log(`Original: "Hello, world! This is a test."`);
console.log(`Traduzido: "${result1.translated_text}"`);
console.log(`Confiança: ${(result1.confidence * 100).toFixed(1)}%\n`);

// Cria contrato
const contract1 = await buildContract({
  workflow: "example",
  flow: "simple",
  source_language: "en",
  target_language: "pt",
  source_text: "Hello, world! This is a test.",
  translated_text: result1.translated_text,
  method: "machine",
  confidence: result1.confidence,
  tenant_id: "example",
});

console.log("📜 Contrato criado:");
console.log(JSON.stringify(contract1, null, 2));
console.log();

// Salva no ledger
await saveLedgerEntry(contract1);
console.log("✅ Contrato salvo no ledger!\n");

// Exemplo 2: Tradução de código
console.log("💻 Exemplo 2: Tradução de código");
const result2 = await translateText({
  source_language: "python",
  target_language: "pt",
  source_text: "def greet(name): return f'Hello, {name}!'",
});

console.log(`Código: "def greet(name): return f'Hello, {name}!'"`);
console.log(`Explicação: "${result2.translated_text}"`);
console.log(`Confiança: ${(result2.confidence * 100).toFixed(1)}%\n`);

const contract2 = await buildContract({
  workflow: "example",
  flow: "code_explanation",
  source_language: "python",
  target_language: "pt",
  source_text: "def greet(name): return f'Hello, {name}!'",
  translated_text: result2.translated_text,
  method: "machine",
  confidence: result2.confidence,
  tenant_id: "example",
});

await saveLedgerEntry(contract2);
console.log("✅ Contrato de código salvo no ledger!\n");

console.log("🎉 Exemplo concluído! Verifique o arquivo output/contracts.ndjson\n");
