/**
 * CLI do minitradutor
 * Parte do projeto minitradutor - LogLine Foundation
 */

import { parse } from "https://deno.land/std@0.208.0/flags/mod.ts";
import { getConfig, validateConfig, printConfig, createEnvExample } from "./config.ts";
import { translateText } from "./translate.ts";
import { buildContract, saveLedgerEntry } from "./contract.ts";
import { signContract, getPrivateKeyFromEnv, generateKeyPair, exportPrivateKey, exportPublicKey } from "./signer.ts";

// ============================================================================
// TIPOS
// ============================================================================

interface CliArgs {
  _: string[];
  from?: string;
  to?: string;
  input?: string;
  file?: string;
  mode?: string;
  workflow?: string;
  flow?: string;
  tenant?: string;
  method?: string;
  translator?: string;
  help?: boolean;
  version?: boolean;
  config?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function printHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     MINITRADUTOR CLI                         ║
║           Universal Translation Contract Builder              ║
║                  LogLine Foundation v0.1.0                   ║
╚══════════════════════════════════════════════════════════════╝

USAGE:
  minitradutor <command> [options]

COMMANDS:
  translate         Translate text between languages
  keygen           Generate Ed25519 key pair for signing
  config           Show current configuration
  init             Create .env.example file
  help             Show this help message

TRANSLATE OPTIONS:
  --from <lang>    Source language (required)
  --to <lang>      Target language (required)
  --input <text>   Text to translate (required if --file not provided)
  --file <path>    File to translate (required if --input not provided)
  --mode <mode>    Translation mode: simple | roundtrip (default: simple)
  --workflow <id>  Workflow identifier (default: translation)
  --flow <id>      Flow identifier (default: default)
  --tenant <id>    Tenant identifier (default: from config)
  --method <type>  Translation method: human | machine | hybrid (default: machine)
  --translator <id> Translator identifier (required if method=human or hybrid)

EXAMPLES:
  # Translate Japanese to English from text
  minitradutor translate --from ja --to en --input "こんにちは"

  # Translate Python to Portuguese from text
  minitradutor translate --from python --to pt --input "def greet(): print('Hello')"

  # Translate from file
  minitradutor translate --from en --to pt --file input.txt

  # Roundtrip translation to test fidelity
  minitradutor translate --from pt --to en --input "O sistema é auditável" --mode roundtrip

  # Generate signing keys
  minitradutor keygen

  # Show configuration
  minitradutor config

ENVIRONMENT VARIABLES:
  LLM_PROVIDER          LLM provider: anthropic | openai | mock
  ANTHROPIC_API_KEY     Anthropic API key
  OPENAI_API_KEY        OpenAI API key
  ENABLE_SIGNING        Enable contract signing: true | false
  ED25519_PRIVATE_KEY   Private key for signing (hex)
  DEFAULT_TENANT_ID     Default tenant identifier

For more information, visit: https://github.com/logline/minitradutor
`);
}

function printVersion(): void {
  console.log("minitradutor v0.1.0-alpha");
  console.log("LogLine Foundation");
  console.log("License: Apache 2.0");
}

// ============================================================================
// COMANDOS
// ============================================================================

async function commandTranslate(args: CliArgs): Promise<void> {
  // Valida argumentos obrigatórios
  if (!args.from) {
    console.error("❌ Error: --from is required");
    Deno.exit(1);
  }

  if (!args.to) {
    console.error("❌ Error: --to is required");
    Deno.exit(1);
  }

  if (!args.input && !args.file) {
    console.error("❌ Error: either --input or --file is required");
    Deno.exit(1);
  }

  // Lê input
  let sourceText: string;
  if (args.file) {
    try {
      sourceText = await Deno.readTextFile(args.file);
    } catch (error) {
      console.error(`❌ Error reading file: ${error.message}`);
      Deno.exit(1);
    }
  } else {
    sourceText = args.input!;
  }

  // Valida método e tradutor
  const method = (args.method || "machine") as "human" | "machine" | "hybrid";
  if (!["human", "machine", "hybrid"].includes(method)) {
    console.error("❌ Error: --method must be human, machine, or hybrid");
    Deno.exit(1);
  }

  if ((method === "human" || method === "hybrid") && !args.translator) {
    console.error("❌ Error: --translator is required when method is human or hybrid");
    Deno.exit(1);
  }

  const config = getConfig();

  console.log("\n🔄 Translating...\n");

  try {
    // Tradução simples
    const { translated_text, confidence } = await translateText({
      source_language: args.from,
      target_language: args.to,
      source_text: sourceText,
    });

    console.log(`✅ Translation completed with confidence: ${(confidence * 100).toFixed(1)}%\n`);

    // Constrói contrato
    const contract = await buildContract({
      workflow: args.workflow || config.defaultWorkflow,
      flow: args.flow || config.defaultFlow,
      source_language: args.from,
      target_language: args.to,
      source_text: sourceText,
      translated_text,
      method,
      confidence,
      tenant_id: args.tenant || config.defaultTenantId,
      translator: args.translator,
    });

    // Assina se habilitado
    if (config.enableSigning) {
      const privateKey = await getPrivateKeyFromEnv();
      if (privateKey) {
        const signature = await signContract(contract, privateKey);
        contract.provenance.signature = signature;
        console.log("🔐 Contract signed\n");
      }
    }

    // Salva no ledger
    await saveLedgerEntry(contract, config.ledgerPath);
    console.log(`💾 Contract saved to: ${config.ledgerPath}\n`);

    // Imprime contrato
    console.log("📜 TRANSLATION CONTRACT:");
    console.log("─".repeat(60));
    console.log(JSON.stringify(contract, null, 2));
    console.log("─".repeat(60));

    // Modo roundtrip
    if (args.mode === "roundtrip") {
      console.log("\n🔄 Performing roundtrip translation...\n");

      const { translated_text: backTranslated, confidence: backConfidence } = await translateText({
        source_language: args.to,
        target_language: args.from,
        source_text: translated_text,
      });

      console.log("🔙 ROUNDTRIP RESULT:");
      console.log("─".repeat(60));
      console.log(`Original:       ${sourceText}`);
      console.log(`Forward:        ${translated_text}`);
      console.log(`Back:           ${backTranslated}`);
      console.log(`Back confidence: ${(backConfidence * 100).toFixed(1)}%`);
      console.log("─".repeat(60));

      // Calcula fidelidade (heurística simples)
      const fidelity = calculateFidelity(sourceText, backTranslated);
      console.log(`\n📊 Semantic fidelity score: ${(fidelity * 100).toFixed(1)}%\n`);
    }
  } catch (error) {
    console.error(`\n❌ Translation failed: ${error.message}\n`);
    Deno.exit(1);
  }
}

async function commandKeygen(): Promise<void> {
  console.log("\n🔑 Generating Ed25519 key pair...\n");

  try {
    const { publicKey, privateKey } = await generateKeyPair();

    const privateKeyHex = await exportPrivateKey(privateKey);
    const publicKeyHex = await exportPublicKey(publicKey);

    console.log("✅ Key pair generated successfully!\n");
    console.log("Add these to your .env file:\n");
    console.log("ED25519_PRIVATE_KEY=" + privateKeyHex);
    console.log("ED25519_PUBLIC_KEY=" + publicKeyHex);
    console.log("\n⚠️  IMPORTANT: Keep your private key secret and secure!\n");
  } catch (error) {
    console.error(`❌ Key generation failed: ${error.message}`);
    Deno.exit(1);
  }
}

async function commandConfig(): Promise<void> {
  console.log("");
  printConfig();
  console.log("");
}

async function commandInit(): Promise<void> {
  console.log("\n📝 Creating .env.example file...\n");
  await createEnvExample();
  console.log("✅ Done! Copy .env.example to .env and configure your settings.\n");
}

// ============================================================================
// UTILS
// ============================================================================

function calculateFidelity(original: string, backTranslated: string): number {
  // Heurística simples baseada em similaridade de caracteres
  const orig = original.toLowerCase().trim();
  const back = backTranslated.toLowerCase().trim();

  if (orig === back) return 1.0;

  const maxLen = Math.max(orig.length, back.length);
  const minLen = Math.min(orig.length, back.length);

  // Penaliza diferença de tamanho
  const lengthScore = minLen / maxLen;

  // Calcula sobreposição de caracteres (simplificado)
  let matches = 0;
  const minChars = Math.min(orig.length, back.length);
  for (let i = 0; i < minChars; i++) {
    if (orig[i] === back[i]) matches++;
  }

  const charScore = matches / maxLen;

  // Média ponderada
  return (lengthScore * 0.3) + (charScore * 0.7);
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  const args = parse(Deno.args) as CliArgs;

  // Help
  if (args.help || args._.includes("help")) {
    printHelp();
    return;
  }

  // Version
  if (args.version) {
    printVersion();
    return;
  }

  // Valida configuração
  try {
    validateConfig();
  } catch (error) {
    console.error(`\n❌ Configuration error: ${error.message}`);
    console.error("Run 'minitradutor init' to create a configuration template.\n");
    Deno.exit(1);
  }

  // Comandos
  const command = args._[0] as string;

  switch (command) {
    case "translate":
      await commandTranslate(args);
      break;

    case "keygen":
      await commandKeygen();
      break;

    case "config":
      await commandConfig();
      break;

    case "init":
      await commandInit();
      break;

    default:
      console.error(`\n❌ Unknown command: ${command}`);
      console.error("Run 'minitradutor help' for usage information.\n");
      Deno.exit(1);
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

if (import.meta.main) {
  await main();
}
