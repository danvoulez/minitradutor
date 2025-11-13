/**
 * Módulo de assinatura Ed25519 para contratos de tradução
 * Parte do projeto minitradutor - LogLine Foundation
 */

import { encode as hexEncode } from "https://deno.land/std@0.208.0/encoding/hex.ts";
import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import type { TranslationContract } from "./contract.ts";

// ============================================================================
// TIPOS
// ============================================================================

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface SignedContract extends TranslationContract {
  provenance: {
    timestamp: string;
    tenant_id: string;
    signature: string;
  };
}

// ============================================================================
// GERAÇÃO DE CHAVES
// ============================================================================

/**
 * Gera um par de chaves Ed25519 (pública e privada)
 * @returns Par de chaves para assinatura
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "Ed25519",
      namedCurve: "Ed25519",
    } as any, // Type assertion necessária pois Ed25519 pode não estar na type definition
    true, // extractable
    ["sign", "verify"]
  );

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

/**
 * Exporta uma chave privada em formato hexadecimal
 * @param privateKey - Chave privada a ser exportada
 * @returns String hexadecimal da chave
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("pkcs8", privateKey);
  const hexString = Array.from(new Uint8Array(exported))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hexString;
}

/**
 * Exporta uma chave pública em formato hexadecimal
 * @param publicKey - Chave pública a ser exportada
 * @returns String hexadecimal da chave
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  const hexString = Array.from(new Uint8Array(exported))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hexString;
}

/**
 * Importa uma chave privada de formato hexadecimal
 * @param hexKey - String hexadecimal da chave
 * @returns Chave privada importada
 */
export async function importPrivateKey(hexKey: string): Promise<CryptoKey> {
  const bytes = new Uint8Array(hexKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  return await crypto.subtle.importKey(
    "pkcs8",
    bytes,
    {
      name: "Ed25519",
      namedCurve: "Ed25519",
    } as any,
    true,
    ["sign"]
  );
}

/**
 * Importa uma chave pública de formato hexadecimal
 * @param hexKey - String hexadecimal da chave
 * @returns Chave pública importada
 */
export async function importPublicKey(hexKey: string): Promise<CryptoKey> {
  const bytes = new Uint8Array(hexKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  return await crypto.subtle.importKey(
    "spki",
    bytes,
    {
      name: "Ed25519",
      namedCurve: "Ed25519",
    } as any,
    true,
    ["verify"]
  );
}

// ============================================================================
// ASSINATURA
// ============================================================================

/**
 * Cria uma representação canônica do contrato para assinatura
 * Remove o campo signature antes de serializar
 * @param contract - Contrato a ser canonizado
 * @returns String JSON canônica
 */
function canonicalizeContract(contract: Partial<TranslationContract>): string {
  // Remove signature se existir
  const contractCopy = { ...contract };
  if (contractCopy.provenance) {
    contractCopy.provenance = { ...contractCopy.provenance, signature: "" };
  }

  // Serializa de forma ordenada
  return JSON.stringify(contractCopy, Object.keys(contractCopy).sort());
}

/**
 * Assina um contrato de tradução com uma chave privada Ed25519
 * @param contract - Contrato a ser assinado (sem signature)
 * @param privateKey - Chave privada para assinatura
 * @returns Assinatura em formato "ed25519:HEX"
 */
export async function signContract(
  contract: TranslationContract,
  privateKey: CryptoKey
): Promise<string> {
  // Cria representação canônica do contrato
  const canonical = canonicalizeContract(contract);
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);

  // Assina com Ed25519
  const signature = await crypto.subtle.sign(
    { name: "Ed25519" } as any,
    privateKey,
    data
  );

  // Converte para hexadecimal
  const signatureArray = new Uint8Array(signature);
  const signatureHex = Array.from(signatureArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `ed25519:${signatureHex}`;
}

/**
 * Verifica a assinatura de um contrato
 * @param contract - Contrato assinado
 * @param publicKey - Chave pública para verificação
 * @returns true se a assinatura é válida, false caso contrário
 */
export async function verifyContract(
  contract: SignedContract,
  publicKey: CryptoKey
): Promise<boolean> {
  try {
    // Extrai a assinatura
    const signatureStr = contract.provenance.signature;
    if (!signatureStr.startsWith("ed25519:")) {
      throw new Error("Invalid signature format");
    }

    const signatureHex = signatureStr.replace("ed25519:", "");
    const signatureBytes = new Uint8Array(
      signatureHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    // Cria representação canônica do contrato (sem signature)
    const canonical = canonicalizeContract(contract);
    const encoder = new TextEncoder();
    const data = encoder.encode(canonical);

    // Verifica a assinatura
    const valid = await crypto.subtle.verify(
      { name: "Ed25519" } as any,
      publicKey,
      signatureBytes,
      data
    );

    return valid;
  } catch (error) {
    console.error("Verification error:", error);
    return false;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verifica se a assinatura está habilitada na configuração
 * @returns true se habilitada, false caso contrário
 */
export function isSigningEnabled(): boolean {
  return Deno.env.get("ENABLE_SIGNING") === "true";
}

/**
 * Obtém a chave privada da configuração (se disponível)
 * @returns Chave privada ou null
 */
export async function getPrivateKeyFromEnv(): Promise<CryptoKey | null> {
  const keyHex = Deno.env.get("ED25519_PRIVATE_KEY");
  if (!keyHex) return null;

  try {
    return await importPrivateKey(keyHex);
  } catch (error) {
    console.error("Failed to import private key from environment:", error);
    return null;
  }
}
