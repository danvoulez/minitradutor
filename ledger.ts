// ledger.ts

import { TranslationContractEnvelope } from "./providers/types.ts";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const LEDGER_PATH = "./output/contracts.ndjson";

let ajvInstance: Ajv | null = null;
let validateFunction: ((data: unknown) => boolean) | null = null;

/**
 * Inicializa o validador AJV com o schema
 */
async function getValidator() {
  if (ajvInstance && validateFunction) {
    return validateFunction;
  }

  // Carrega o schema
  const schemaPath = new URL("./schema.json", import.meta.url);
  const schemaContent = await Deno.readTextFile(schemaPath);
  const schema = JSON.parse(schemaContent);

  ajvInstance = new Ajv({ allErrors: true });
  addFormats(ajvInstance);
  validateFunction = ajvInstance.compile(schema);

  return validateFunction;
}

/**
 * Valida um envelope contra o JSON Schema
 * @param envelope - Envelope a ser validado
 * @throws Error se o envelope for inválido
 */
async function validateEnvelope(envelope: TranslationContractEnvelope): Promise<void> {
  const validate = await getValidator();
  const valid = validate(envelope);

  if (!valid) {
    const errors = validate.errors?.map(err =>
      `${err.instancePath} ${err.message}`
    ).join(", ");
    throw new Error(`Invalid translation contract envelope: ${errors}`);
  }

  // Validações adicionais de negócio
  const contract = envelope.contract;

  if ((contract.method === "human" || contract.method === "hybrid") && !contract.translator) {
    throw new Error("translator field is required when method is 'human' or 'hybrid'");
  }

  if (contract.confidence < 0 || contract.confidence > 1) {
    throw new Error("confidence must be between 0.0 and 1.0");
  }
}

/**
 * Salva um contrato no ledger NDJSON (append-only).
 * Cada linha é um JSON válido contendo o envelope completo { contract: {...} }
 *
 * IMPORTANTE: Valida o envelope contra schema.json antes de escrever.
 */
export async function saveLedgerEntry(envelope: TranslationContractEnvelope): Promise<void> {
  // Valida antes de escrever
  await validateEnvelope(envelope);

  const line = JSON.stringify(envelope) + "\n";

  try {
    // Garante que o diretório existe
    const dir = LEDGER_PATH.substring(0, LEDGER_PATH.lastIndexOf("/"));
    await Deno.mkdir(dir, { recursive: true });

    await Deno.writeTextFile(LEDGER_PATH, line, { append: true, create: true });
  } catch (error) {
    throw new Error(`Failed to write to ledger: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Lê todos os contratos do ledger
 * @param ledgerPath - Caminho do arquivo ledger (opcional, usa padrão se não fornecido)
 * @returns Array de envelopes
 */
export async function readLedger(
  ledgerPath: string = LEDGER_PATH
): Promise<TranslationContractEnvelope[]> {
  try {
    const content = await Deno.readTextFile(ledgerPath);
    const lines = content.trim().split("\n").filter(line => line.length > 0);
    return lines.map(line => JSON.parse(line) as TranslationContractEnvelope);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return [];
    }
    throw error;
  }
}
