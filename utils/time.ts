/**
 * Utilitário para geração de timestamps ISO8601 em UTC
 * Parte do projeto minitradutor - LogLine Foundation
 */

/**
 * Gera um timestamp ISO8601 em UTC
 * @returns String no formato ISO8601 (ex: "2025-11-13T18:44:00.123Z")
 */
export function generateTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Valida se uma string é um timestamp ISO8601 válido
 * @param timestamp - String a ser validada
 * @returns true se válido, false caso contrário
 */
export function isValidTimestamp(timestamp: string): boolean {
  const date = new Date(timestamp);
  return !isNaN(date.getTime()) && date.toISOString() === timestamp;
}
