/**
 * Módulo de configuração do minitradutor
 * Parte do projeto minitradutor - LogLine Foundation
 */

// ============================================================================
// TIPOS
// ============================================================================

export type LLMProvider = "anthropic" | "openai" | "mock";

export interface MinitradutorConfig {
  // Provider LLM
  llmProvider: LLMProvider;

  // API Keys
  anthropicApiKey?: string;
  openaiApiKey?: string;

  // Configurações de assinatura
  enableSigning: boolean;
  ed25519PrivateKey?: string;
  ed25519PublicKey?: string;

  // Configurações de paths
  ledgerPath: string;

  // Configurações de servidor
  port: number;
  host: string;

  // Tenant padrão
  defaultTenantId: string;

  // Workflow padrão
  defaultWorkflow: string;

  // Flow padrão
  defaultFlow: string;
}

// ============================================================================
// CONFIGURAÇÃO PADRÃO
// ============================================================================

const DEFAULT_CONFIG: MinitradutorConfig = {
  llmProvider: "mock",
  enableSigning: false,
  ledgerPath: "./output/contracts.ndjson",
  port: 8000,
  host: "0.0.0.0",
  defaultTenantId: "default",
  defaultWorkflow: "translation",
  defaultFlow: "default",
};

// ============================================================================
// SINGLETON DE CONFIGURAÇÃO
// ============================================================================

let configInstance: MinitradutorConfig | null = null;

/**
 * Carrega a configuração das variáveis de ambiente
 */
function loadConfig(): MinitradutorConfig {
  const config: MinitradutorConfig = { ...DEFAULT_CONFIG };

  // LLM Provider
  const provider = Deno.env.get("LLM_PROVIDER");
  if (provider && ["anthropic", "openai", "mock"].includes(provider)) {
    config.llmProvider = provider as LLMProvider;
  }

  // API Keys
  config.anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  config.openaiApiKey = Deno.env.get("OPENAI_API_KEY");

  // Assinatura
  config.enableSigning = Deno.env.get("ENABLE_SIGNING") === "true";
  config.ed25519PrivateKey = Deno.env.get("ED25519_PRIVATE_KEY");
  config.ed25519PublicKey = Deno.env.get("ED25519_PUBLIC_KEY");

  // Paths
  const ledgerPath = Deno.env.get("LEDGER_PATH");
  if (ledgerPath) {
    config.ledgerPath = ledgerPath;
  }

  // Server
  const port = Deno.env.get("PORT");
  if (port) {
    config.port = parseInt(port, 10);
  }

  const host = Deno.env.get("HOST");
  if (host) {
    config.host = host;
  }

  // Defaults
  const tenantId = Deno.env.get("DEFAULT_TENANT_ID");
  if (tenantId) {
    config.defaultTenantId = tenantId;
  }

  const workflow = Deno.env.get("DEFAULT_WORKFLOW");
  if (workflow) {
    config.defaultWorkflow = workflow;
  }

  const flow = Deno.env.get("DEFAULT_FLOW");
  if (flow) {
    config.defaultFlow = flow;
  }

  return config;
}

/**
 * Obtém a configuração atual (singleton)
 * @returns Configuração do minitradutor
 */
export function getConfig(): MinitradutorConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * Recarrega a configuração (útil para testes)
 */
export function reloadConfig(): MinitradutorConfig {
  configInstance = loadConfig();
  return configInstance;
}

/**
 * Define uma configuração customizada (útil para testes)
 * @param config - Configuração customizada
 */
export function setConfig(config: Partial<MinitradutorConfig>): void {
  configInstance = { ...DEFAULT_CONFIG, ...config };
}

// ============================================================================
// VALIDAÇÃO
// ============================================================================

/**
 * Valida a configuração atual
 * @throws Error se a configuração for inválida
 */
export function validateConfig(): void {
  const config = getConfig();

  // Valida provider e API keys
  if (config.llmProvider === "anthropic" && !config.anthropicApiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic. " +
      "Set the environment variable or change the provider."
    );
  }

  if (config.llmProvider === "openai" && !config.openaiApiKey) {
    throw new Error(
      "OPENAI_API_KEY is required when LLM_PROVIDER=openai. " +
      "Set the environment variable or change the provider."
    );
  }

  // Valida assinatura
  if (config.enableSigning && !config.ed25519PrivateKey) {
    console.warn(
      "WARNING: Signing is enabled but ED25519_PRIVATE_KEY is not set. " +
      "Signatures will be empty."
    );
  }

  // Valida porta
  if (config.port < 1 || config.port > 65535) {
    throw new Error(`Invalid port: ${config.port}. Must be between 1 and 65535.`);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Imprime a configuração atual (mascarando valores sensíveis)
 */
export function printConfig(): void {
  const config = getConfig();

  console.log("=== Minitradutor Configuration ===");
  console.log(`LLM Provider: ${config.llmProvider}`);
  console.log(`Anthropic API Key: ${config.anthropicApiKey ? "***set***" : "not set"}`);
  console.log(`OpenAI API Key: ${config.openaiApiKey ? "***set***" : "not set"}`);
  console.log(`Signing Enabled: ${config.enableSigning}`);
  console.log(`Ledger Path: ${config.ledgerPath}`);
  console.log(`Server: ${config.host}:${config.port}`);
  console.log(`Default Tenant: ${config.defaultTenantId}`);
  console.log(`Default Workflow: ${config.defaultWorkflow}`);
  console.log(`Default Flow: ${config.defaultFlow}`);
  console.log("==================================");
}

/**
 * Cria um arquivo .env de exemplo
 */
export async function createEnvExample(): Promise<void> {
  const example = `# Minitradutor Configuration
# Copie este arquivo para .env e configure as variáveis

# LLM Provider: anthropic, openai, ou mock
LLM_PROVIDER=mock

# API Keys (configure apenas a que você vai usar)
# ANTHROPIC_API_KEY=your_key_here
# OPENAI_API_KEY=your_key_here

# Assinatura digital (opcional)
ENABLE_SIGNING=false
# ED25519_PRIVATE_KEY=hex_encoded_private_key
# ED25519_PUBLIC_KEY=hex_encoded_public_key

# Caminhos
LEDGER_PATH=./output/contracts.ndjson

# Servidor HTTP
PORT=8000
HOST=0.0.0.0

# Valores padrão
DEFAULT_TENANT_ID=voulezvous
DEFAULT_WORKFLOW=translation
DEFAULT_FLOW=default
`;

  await Deno.writeTextFile(".env.example", example);
  console.log("Created .env.example file");
}
