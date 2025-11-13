/**
 * API HTTP do minitradutor - POST /translate
 * Parte do projeto minitradutor - LogLine Foundation
 */

import { getConfig, validateConfig, printConfig } from "./config.ts";
import { translateText } from "./translate.ts";
import { buildContract, saveLedgerEntry } from "./contract.ts";
import { signContract, getPrivateKeyFromEnv } from "./signer.ts";

// ============================================================================
// TIPOS
// ============================================================================

interface TranslateRequest {
  source_language: string;
  target_language: string;
  source_text: string;
  method?: "human" | "machine" | "hybrid";
  workflow?: string;
  flow?: string;
  tenant_id?: string;
  translator?: string;
}

interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// VALIDAÇÃO DE REQUEST
// ============================================================================

function validateTranslateRequest(body: unknown): body is TranslateRequest {
  if (typeof body !== "object" || body === null) {
    throw new Error("Request body must be a JSON object");
  }

  const req = body as Record<string, unknown>;

  if (!req.source_language || typeof req.source_language !== "string") {
    throw new Error("source_language is required and must be a string");
  }

  if (!req.target_language || typeof req.target_language !== "string") {
    throw new Error("target_language is required and must be a string");
  }

  if (!req.source_text || typeof req.source_text !== "string") {
    throw new Error("source_text is required and must be a string");
  }

  if (req.method && !["human", "machine", "hybrid"].includes(req.method as string)) {
    throw new Error("method must be 'human', 'machine', or 'hybrid'");
  }

  if ((req.method === "human" || req.method === "hybrid") && !req.translator) {
    throw new Error("translator is required when method is 'human' or 'hybrid'");
  }

  return true;
}

// ============================================================================
// HANDLERS
// ============================================================================

async function handleTranslate(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await request.json();

    // Valida request
    validateTranslateRequest(body);
    const req = body as TranslateRequest;

    // Pega configuração
    const config = getConfig();

    // Traduz
    const { translated_text, confidence } = await translateText({
      source_language: req.source_language,
      target_language: req.target_language,
      source_text: req.source_text,
    });

    // Constrói contrato
    const contract = await buildContract({
      workflow: req.workflow || config.defaultWorkflow,
      flow: req.flow || config.defaultFlow,
      source_language: req.source_language,
      target_language: req.target_language,
      source_text: req.source_text,
      translated_text,
      method: req.method || "machine",
      confidence,
      tenant_id: req.tenant_id || config.defaultTenantId,
      translator: req.translator,
    });

    // Assina se habilitado
    if (config.enableSigning) {
      const privateKey = await getPrivateKeyFromEnv();
      if (privateKey) {
        const signature = await signContract(contract, privateKey);
        contract.provenance.signature = signature;
      }
    }

    // Salva no ledger
    await saveLedgerEntry(contract, config.ledgerPath);

    // Retorna resposta
    return new Response(
      JSON.stringify({ contract }, null, 2),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Translation error:", error);

    const errorResponse: ErrorResponse = {
      error: error.name || "TranslationError",
      message: error.message || "An error occurred during translation",
    };

    return new Response(
      JSON.stringify(errorResponse, null, 2),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function handleHealth(_request: Request): Promise<Response> {
  return new Response(
    JSON.stringify({
      status: "ok",
      service: "minitradutor",
      version: "0.1.0-alpha",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

async function handleNotFound(_request: Request): Promise<Response> {
  return new Response(
    JSON.stringify({
      error: "NotFound",
      message: "Endpoint not found. Available endpoints: POST /translate, GET /health",
    }),
    {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// ============================================================================
// ROUTER
// ============================================================================

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let response: Response;

  // Route handling
  if (path === "/translate" && method === "POST") {
    response = await handleTranslate(request);
  } else if (path === "/health" && method === "GET") {
    response = await handleHealth(request);
  } else if (path === "/" && method === "GET") {
    response = new Response(
      JSON.stringify({
        service: "minitradutor",
        version: "0.1.0-alpha",
        endpoints: {
          "POST /translate": "Translate text between languages",
          "GET /health": "Health check",
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } else {
    response = await handleNotFound(request);
  }

  // Add CORS headers to response
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ============================================================================
// SERVIDOR
// ============================================================================

/**
 * Inicia o servidor HTTP
 */
export async function startServer(): Promise<void> {
  // Valida configuração
  try {
    validateConfig();
  } catch (error) {
    console.error("Configuration error:", error.message);
    Deno.exit(1);
  }

  const config = getConfig();

  console.log("\n🌐 Starting minitradutor API server...\n");
  printConfig();

  const server = Deno.serve(
    {
      port: config.port,
      hostname: config.host,
      onListen: ({ port, hostname }) => {
        console.log(`\n✅ Server running at http://${hostname}:${port}`);
        console.log(`\nEndpoints:`);
        console.log(`  POST http://${hostname}:${port}/translate - Translate text`);
        console.log(`  GET  http://${hostname}:${port}/health   - Health check`);
        console.log(`\nPress Ctrl+C to stop\n`);
      },
    },
    handleRequest
  );

  await server.finished;
}

// ============================================================================
// MAIN (se executado diretamente)
// ============================================================================

if (import.meta.main) {
  await startServer();
}
