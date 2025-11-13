// api.ts

import { OpenAIProvider } from "./providers/openai.ts";
import { translateRequest } from "./translate.ts";
import { TranslationRequestInput } from "./providers/types.ts";

// Inicializa o provider (pode ser configurado via env vars)
const provider = new OpenAIProvider({
  apiKey: Deno.env.get("OPENAI_API_KEY") ?? ""
});

interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// VALIDAÇÃO DE REQUEST
// ============================================================================

function validateTranslateRequest(body: unknown): body is TranslationRequestInput {
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

  if (!req.workflow || typeof req.workflow !== "string") {
    throw new Error("workflow is required and must be a string");
  }

  if (!req.flow || typeof req.flow !== "string") {
    throw new Error("flow is required and must be a string");
  }

  if (!req.tenant_id || typeof req.tenant_id !== "string") {
    throw new Error("tenant_id is required and must be a string");
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
    const body = await request.json();

    // Valida request
    validateTranslateRequest(body);
    const input = body as TranslationRequestInput;

    // Define defaults se não fornecidos
    if (!input.method) {
      input.method = "machine";
    }

    // Traduz via pipeline
    const envelope = await translateRequest(provider, input);

    return new Response(
      JSON.stringify(envelope, null, 2),
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
    response = new Response(
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

if (import.meta.main) {
  const port = parseInt(Deno.env.get("PORT") ?? "8000");
  const host = Deno.env.get("HOST") ?? "0.0.0.0";

  console.log("\n🌐 Starting minitradutor API server...\n");

  Deno.serve(
    {
      port,
      hostname: host,
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
}
