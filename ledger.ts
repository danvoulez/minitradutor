// ledger.ts

import { TranslationContractEnvelope } from "./providers/types.ts";

const LEDGER_PATH = "./output/contracts.ndjson";

/**
 * Salva um contrato no ledger NDJSON (append-only).
 * Cada linha é um JSON válido contendo o envelope completo { contract: {...} }
 */
export async function saveLedgerEntry(envelope: TranslationContractEnvelope): Promise<void> {
  const line = JSON.stringify(envelope) + "\n";

  try {
    await Deno.writeTextFile(LEDGER_PATH, line, { append: true, create: true });
  } catch (error) {
    throw new Error(`Failed to write to ledger: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
