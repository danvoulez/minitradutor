/**
 * Utilitário para geração de hashes e IDs
 * Parte do projeto minitradutor - LogLine Foundation
 */

/**
 * Gera um hash hexadecimal a partir de uma string
 * Usa SHA-256 para compatibilidade universal (Deno/Node.js)
 * @param input - String de entrada
 * @returns Hash em formato hexadecimal
 */
export async function generateHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  // Usar Web Crypto API (disponível em Deno e Node.js moderno)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Gera um ID de contrato único com prefixo "trans_"
 * Baseado no hash do conteúdo + timestamp para unicidade
 * @param content - Conteúdo a ser hashado
 * @returns ID no formato "trans_XXXXXX" (primeiros 6 caracteres do hash)
 */
export async function generateContractId(content: string): Promise<string> {
  const timestamp = Date.now().toString();
  const combined = `${content}_${timestamp}`;
  const hash = await generateHash(combined);

  // Usa os primeiros 6 caracteres do hash
  return `trans_${hash.substring(0, 6)}`;
}

/**
 * Gera um trace_id único para rastreamento
 * @returns UUID-like string
 */
export function generateTraceId(): string {
  // Gera um ID simples baseado em timestamp e random
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}_${random}`;
}
