/**
 * Builder e validador de Translation Contracts
 * Parte do projeto minitradutor - LogLine Foundation
 */

import { generateTimestamp } from "./utils/time.ts";
import { generateContractId } from "./utils/hash.ts";
import Ajv from "npm:ajv@8.12.0";
import addFormats from "npm:ajv-formats@2.1.1";

// ============================================================================
// TIPOS
// ============================================================================

export type TranslationMethod = "human" | "machine" | "hybrid";

export interface ProvenanceBlock {
  timestamp: string;
  tenant_id: string;
  signature: string;
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

export interface BuildContractParams {
  workflow: string;
  flow: string;
  source_language: string;
  target_language: string;
  source_text: string;
  translated_text: string;
  method: TranslationMethod;
  confidence: number;
  tenant_id: string;
  translator?: string;
  signature?: string;
}

// ============================================================================
// VALIDAÇÃO
// ============================================================================

let ajvInstance: Ajv | null = null;

/**
 * Inicializa o validador AJV com o schema
 */
async function getValidator() {
  if (ajvInstance) return ajvInstance;

  // Carrega o schema
  const schemaPath = new URL("./schema.json", import.meta.url);
  const schemaContent = await Deno.readTextFile(schemaPath);
  const schema = JSON.parse(schemaContent);

  ajvInstance = new Ajv({ allErrors: true });
  addFormats(ajvInstance);
  ajvInstance.compile(schema);

  return ajvInstance;
}

/**
 * Valida um contrato contra o JSON Schema
 * @param contract - Contrato a ser validado
 * @throws Error se o contrato for inválido
 */
export async function validateContract(contract: TranslationContract): Promise<void> {
  const ajv = await getValidator();
  const schemaPath = new URL("./schema.json", import.meta.url);
  const schemaContent = await Deno.readTextFile(schemaPath);
  const schema = JSON.parse(schemaContent);

  const validate = ajv.compile(schema);
  const valid = validate(contract);

  if (!valid) {
    const errors = validate.errors?.map(err =>
      `${err.instancePath} ${err.message}`
    ).join(", ");
    throw new Error(`Invalid translation contract: ${errors}`);
  }

  // Validações adicionais de negócio
  if ((contract.method === "human" || contract.method === "hybrid") && !contract.translator) {
    throw new Error("translator field is required when method is 'human' or 'hybrid'");
  }

  if (contract.confidence < 0 || contract.confidence > 1) {
    throw new Error("confidence must be between 0.0 and 1.0");
  }
}

// ============================================================================
// BUILDER
// ============================================================================

/**
 * Constrói um Translation Contract completo
 * @param params - Parâmetros do contrato
 * @returns Translation Contract válido
 */
export async function buildContract(params: BuildContractParams): Promise<TranslationContract> {
  // Gera ID único baseado no conteúdo
  const contentForId = `${params.source_text}_${params.target_language}_${params.workflow}_${params.flow}`;
  const id = await generateContractId(contentForId);

  // Constrói o contrato
  const contract: TranslationContract = {
    id,
    workflow: params.workflow,
    flow: params.flow,
    source_language: params.source_language,
    target_language: params.target_language,
    source_text: params.source_text,
    translated_text: params.translated_text,
    method: params.method,
    confidence: params.confidence,
    provenance: {
      timestamp: generateTimestamp(),
      tenant_id: params.tenant_id,
      signature: params.signature || "",
    },
  };

  // Adiciona translator se fornecido
  if (params.translator) {
    contract.translator = params.translator;
  }

  // Valida antes de retornar
  await validateContract(contract);

  return contract;
}

// ============================================================================
// PERSISTÊNCIA
// ============================================================================

/**
 * Salva um contrato no ledger NDJSON
 * @param contract - Contrato a ser salvo
 * @param ledgerPath - Caminho do arquivo ledger (padrão: output/contracts.ndjson)
 */
export async function saveLedgerEntry(
  contract: TranslationContract,
  ledgerPath: string = "./output/contracts.ndjson"
): Promise<void> {
  // Garante que o diretório existe
  const dir = ledgerPath.substring(0, ledgerPath.lastIndexOf("/"));
  await Deno.mkdir(dir, { recursive: true });

  // Serializa o contrato como uma linha NDJSON
  const line = JSON.stringify(contract) + "\n";

  // Append no arquivo (append-only ledger)
  await Deno.writeTextFile(ledgerPath, line, { append: true });
}

/**
 * Lê todos os contratos do ledger
 * @param ledgerPath - Caminho do arquivo ledger
 * @returns Array de contratos
 */
export async function readLedger(
  ledgerPath: string = "./output/contracts.ndjson"
): Promise<TranslationContract[]> {
  try {
    const content = await Deno.readTextFile(ledgerPath);
    const lines = content.trim().split("\n").filter(line => line.length > 0);
    return lines.map(line => JSON.parse(line) as TranslationContract);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return [];
    }
    throw error;
  }
}
