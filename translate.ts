// translate.ts

import {
  TranslationProvider,
  TranslationRequestInput,
  TranslationContractEnvelope,
  TranslationContract,
  ProvenanceBlock
} from "./providers/types.ts";
import { saveLedgerEntry } from "./ledger.ts";
import { generateTimestamp } from "./utils/time.ts";
import { generateContractId } from "./utils/hash.ts";

const ENABLE_SIGNING = false; // placeholder

function buildProvenance(tenant_id: string): ProvenanceBlock {
  return {
    timestamp: generateTimestamp(),
    tenant_id,
    signature: ENABLE_SIGNING ? "<todo-signature>" : ""
  };
}

async function buildContract(
  input: TranslationRequestInput,
  translatedText: string,
  confidence: number
): Promise<TranslationContract> {
  // Gera ID baseado no hash do payload
  const id = await generateContractId(
    `${input.source_language}_${input.target_language}_${input.source_text}`
  );

  return {
    id,
    workflow: input.workflow,
    flow: input.flow,
    source_language: input.source_language,
    target_language: input.target_language,
    source_text: input.source_text,
    translated_text: translatedText,
    translator: input.translator,
    method: input.method,
    confidence,
    provenance: buildProvenance(input.tenant_id)
  };
}

/**
 * Função central: entra um pedido de tradução + provider,
 * sai um TranslationContractEnvelope já salvo no ledger.
 */
export async function translateRequest(
  provider: TranslationProvider,
  input: TranslationRequestInput
): Promise<TranslationContractEnvelope> {
  const { translatedText, confidence } = await provider.translate({
    source_language: input.source_language,
    target_language: input.target_language,
    text: input.source_text
  });

  const contract = await buildContract(input, translatedText, confidence);

  // Aqui dá pra plugar validação JSON Schema se quiser
  // validateAgainstSchema({ contract });

  const envelope: TranslationContractEnvelope = { contract };

  await saveLedgerEntry(envelope);

  return envelope;
}
