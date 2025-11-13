/**
 * Minitradutor - Universal Translation Contract Builder
 * LogLine Foundation
 *
 * Entry point para o módulo minitradutor
 */

// Exporta tipos e funções principais
export type {
  TranslationContract,
  TranslationMethod,
  ProvenanceBlock,
  BuildContractParams,
} from "./contract.ts";

export {
  buildContract,
  validateContract,
  saveLedgerEntry,
  readLedger,
} from "./contract.ts";

export type {
  TranslationParams,
  TranslationResult,
  TranslationProvider,
} from "./translate.ts";

export {
  translateText,
  createProvider,
} from "./translate.ts";

export type {
  MinitradutorConfig,
  LLMProvider,
} from "./config.ts";

export {
  getConfig,
  validateConfig,
  printConfig,
  createEnvExample,
} from "./config.ts";

export type {
  KeyPair,
  SignedContract,
} from "./signer.ts";

export {
  generateKeyPair,
  signContract,
  verifyContract,
  exportPrivateKey,
  exportPublicKey,
  importPrivateKey,
  importPublicKey,
  isSigningEnabled,
} from "./signer.ts";

export { generateTimestamp, isValidTimestamp } from "./utils/time.ts";
export { generateHash, generateContractId, generateTraceId } from "./utils/hash.ts";

// Exporta função para iniciar servidor
export { startServer } from "./api.ts";
