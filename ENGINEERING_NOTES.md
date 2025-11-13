# Engineering Notes — minitradutor v1.0-MVP

**Data:** 2025-11-13
**Versão:** 1.0-MVP (unificação completa)
**Status:** ✅ Produção

---

## 📐 Decisões de Arquitetura

### 1. Formato de Ledger: Envelope Pattern

**Decisão Final:** Todas as linhas em `output/contracts.ndjson` seguem o formato:

```json
{
  "contract": {
    "id": "trans_abc123",
    "workflow": "...",
    "flow": "...",
    ...
  }
}
```

**Justificativa:**
- ✅ Compatível com JSON Schema validation (schema.json)
- ✅ Permite extensões futuras (metadata, versioning) sem quebrar contratos
- ✅ Padrão alinhado com JSON✯Atomic e LogLine ecosystem
- ✅ Facilita parsing e agregação (cada linha é auto-contida)

**Migração de código legado:**
- `contract.ts` ainda existe para testes antigos, mas **não deve ser usado** em produção
- `ledger.ts` é a **única fonte de verdade** para escrita de contratos
- API e CLI usam exclusivamente `ledger.ts` via `translateRequest()`

---

### 2. Pipeline Unificado

**Componentes do Pipeline:**

```
┌─────────────┐
│   Client    │ (API ou CLI)
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  translateRequest(provider, input) │
└──────┬──────────────────────┬───┘
       │                      │
       ▼                      ▼
┌──────────────┐      ┌────────────────┐
│  Provider    │      │ buildContract  │
│  .translate()│      │ + provenance   │
└──────┬───────┘      └────────┬───────┘
       │                       │
       │                       ▼
       │              ┌─────────────────┐
       │              │ validateEnvelope│
       │              │  (schema.json)  │
       │              └────────┬────────┘
       │                       │
       └───────────────────────▼
                    ┌──────────────────┐
                    │ saveLedgerEntry  │
                    │  (ledger.ts)     │
                    └──────────────────┘
                              │
                              ▼
                    output/contracts.ndjson
```

**Pontos-chave:**
1. **Entrada única:** `translateRequest()` em `translate.ts:53`
2. **Provider isolation:** Apenas `providers/*.ts` conhecem LLMs
3. **Validation gate:** Schema validation **antes** de escrever no ledger
4. **Atomicidade:** Se validação falha, **nada** é escrito

---

### 3. Isolamento do LLM (Provider Pattern)

**Interface:**
```typescript
export interface TranslationProvider {
  translate(params: {
    source_language: string;
    target_language: string;
    text: string;
  }): Promise<{
    translatedText: string;
    confidence: number;
  }>;
}
```

**Implementações disponíveis:**
- `OpenAIProvider` (providers/openai.ts) — produção
- `MockProvider` (providers/mock.ts) — testes

**Como adicionar um novo provider:**

```typescript
// providers/anthropic.ts
import { TranslationProvider } from "./types.ts";

export class AnthropicProvider implements TranslationProvider {
  private apiKey: string;

  constructor(config: { apiKey: string }) {
    this.apiKey = config.apiKey;
  }

  async translate(params: {
    source_language: string;
    target_language: string;
    text: string;
  }): Promise<{ translatedText: string; confidence: number }> {
    // Sua lógica de chamada à API Anthropic aqui
    const response = await fetch("https://api.anthropic.com/v1/...", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024
      })
    });

    const data = await response.json();
    return {
      translatedText: data.content[0].text,
      confidence: 0.92
    };
  }
}
```

Depois, use no seu código:

```typescript
import { AnthropicProvider } from "./providers/anthropic.ts";

const provider = new AnthropicProvider({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")!
});

const envelope = await translateRequest(provider, input);
```

---

### 4. Modo Roundtrip

**Implementação atual (CLI):**

```bash
minitradutor translate \
  --from pt --to en \
  --input "O sistema é auditável" \
  --mode roundtrip
```

**Comportamento:**
1. Traduz pt → en (gera contrato A)
2. Traduz en → pt (gera contrato B com flow sufixado "_roundtrip")
3. Calcula fidelity score heurístico (0.0–1.0)
4. **Ambos contratos são salvos** no ledger

**Formato no ledger:**
```ndjson
{"contract":{"id":"trans_abc","flow":"translate",...}}
{"contract":{"id":"trans_def","flow":"translate_roundtrip",...}}
```

**Extensões futuras:**
- Adicionar campo `roundtrip_of: "trans_abc"` no contrato B
- Implementar roundtrip via API HTTP (POST /translate com mode=roundtrip)
- Calcular similaridade semântica via embeddings (não apenas char-level)

---

### 5. Validação de Schema

**Quando acontece:**
- **Antes de escrever no ledger** (ledger.ts:66–68)
- Usa AJV + schema.json

**O que valida:**
- Estrutura do envelope `{ contract: {...} }`
- Tipos de campos (string, number, enum)
- Campos obrigatórios (id, workflow, flow, etc.)
- Regras de negócio:
  - `method=human` ou `hybrid` → `translator` obrigatório
  - `confidence` entre 0.0 e 1.0

**Se falhar:**
- Lança `Error` com mensagem clara
- **Nada é escrito** no ledger
- API retorna HTTP 400
- CLI exibe erro e faz `Deno.exit(1)`

---

### 6. Assinatura Digital (Futuro)

**Estado atual:** Placeholders preparados, mas não implementado.

**Como ativar no futuro:**

1. Gere chaves:
```bash
deno task cli keygen
```

2. Configure `.env`:
```bash
ENABLE_SIGNING=true
ED25519_PRIVATE_KEY=<hex_output>
```

3. Implemente a lógica em `translate.ts:14–21`:
```typescript
import { signContract } from "./signer.ts";

const ENABLE_SIGNING = Deno.env.get("ENABLE_SIGNING") === "true";

async function buildProvenance(tenant_id: string, contract: TranslationContract): Promise<ProvenanceBlock> {
  const provenance = {
    timestamp: generateTimestamp(),
    tenant_id,
    signature: ""
  };

  if (ENABLE_SIGNING) {
    const privateKey = await getPrivateKeyFromEnv();
    provenance.signature = await signContract(contract, privateKey);
  }

  return provenance;
}
```

---

## 🧪 Testes

### Estrutura de testes

```
tests/
├── contract.test.ts      # Testes legados (buildContract, validação)
├── pipeline.test.ts      # ⭐ Testes do pipeline completo (NOVO)
└── test_*_ledger.ndjson  # Ledgers temporários de teste
```

### Como rodar

```bash
# Todos os testes
deno task test

# Apenas pipeline
deno test tests/pipeline.test.ts

# Com coverage
deno test --coverage=coverage/
```

### Cobertura desejada

- ✅ Tradução simples (en→pt)
- ✅ Tradução de código (python→pt)
- ✅ Validação method=human requer translator
- ✅ Validação confidence entre 0 e 1
- ✅ Erro propagado do provider
- ✅ IDs únicos e determinísticos
- ✅ Schema validation antes de salvar

---

## 🔄 Fluxos de Dados

### Request HTTP → Ledger

```
1. POST /translate com JSON body
2. validateTranslateRequest() — valida campos obrigatórios
3. translateRequest(provider, input) — pipeline central
4. validateEnvelope() — valida contra schema.json
5. saveLedgerEntry() — append no NDJSON
6. Response 200 com { contract: {...} }
```

### CLI → Ledger

```
1. minitradutor translate --from en --to pt --input "..."
2. Parse args (flags)
3. Monta TranslationRequestInput
4. translateRequest(provider, input) — mesmo pipeline da API
5. validateEnvelope() — mesma validação
6. saveLedgerEntry() — mesmo ledger
7. Print resumo no terminal
```

**Resultado:** API e CLI geram contratos **idênticos** para o mesmo input.

---

## 📦 Estrutura de Arquivos (Atualizada)

```
minitradutor/
├── api.ts                  # ⭐ HTTP server (POST /translate)
├── cli.ts                  # ⭐ CLI interface (unificada com API)
├── translate.ts            # ⭐ Pipeline central (translateRequest)
├── ledger.ts               # ⭐ Única fonte de persistência
├── schema.json             # Validação JSON Schema
├── contract.ts             # ⚠️  Legacy (só para testes antigos)
├── signer.ts               # Assinatura Ed25519 (placeholder)
├── config.ts               # Configuração via env vars
├── mod.ts                  # Entry point (exports públicos)
├── providers/
│   ├── types.ts            # Interfaces (TranslationProvider, etc.)
│   ├── openai.ts           # ⭐ Provider OpenAI
│   └── mock.ts             # ⭐ Provider para testes (NOVO)
├── utils/
│   ├── time.ts             # generateTimestamp()
│   └── hash.ts             # generateContractId()
├── tests/
│   ├── contract.test.ts    # Testes legados
│   └── pipeline.test.ts    # ⭐ Testes do pipeline (NOVO)
├── output/
│   └── contracts.ndjson    # Ledger append-only
├── deno.json               # Tasks (dev, test, cli)
├── README.md               # Documentação de uso
├── PROMPT.md               # Especificação original
└── ENGINEERING_NOTES.md    # ⭐ Este arquivo
```

---

## 🚀 Checklist de Deploy

Antes de fazer deploy em produção:

- [ ] Configurar `OPENAI_API_KEY` ou outro provider
- [ ] Validar que `output/` tem permissões de escrita
- [ ] Testar POST /translate na API
- [ ] Testar CLI com diferentes idiomas
- [ ] Verificar que ledger está sendo populado
- [ ] Rodar `deno task test` e garantir 100% de aprovação
- [ ] Documentar endpoint em API Gateway / docs públicas
- [ ] Configurar monitoramento (logs, métricas)
- [ ] Opcional: habilitar assinatura digital

---

## 🔗 Próximos Passos (Post-MVP)

1. **Integração com LogLine:**
   - Emitir `register_contract` spans
   - Vincular contratos a trajectories

2. **Providers adicionais:**
   - AnthropicProvider (Claude)
   - OllamaProvider (local LLMs)
   - HumanProvider (tradutores via painel web)

3. **Roundtrip via API:**
   - POST /translate com `mode=roundtrip`
   - Retornar ambos contratos + fidelity score

4. **Replay e versionamento:**
   - Campo `replay_of: "trans_abc"`
   - Controle de versões de schema

5. **Observabilidade:**
   - Prometheus metrics (traduções/min, latency, confidence avg)
   - OpenTelemetry tracing

---

## 📞 Contato e Suporte

- **Repositório:** https://github.com/logline/minitradutor
- **Issues:** https://github.com/logline/minitradutor/issues
- **Docs LogLine:** https://logline.world

---

**✅ MVP v1.0 concluído em 2025-11-13.**
**Pronto para demo e produção.**
