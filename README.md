# minitradutor — tradução universal com contrato computável

🪪 **Project:** LogLine // minitradutor
🏷️ **Version:** v0.1-alpha
🔐 **Owner:** LogLine Foundation / VoulezVous
🌐 **License:** Apache 2.0 (ou dual com LogLineID)

O **minitradutor** é uma API computável de tradução universal.
Ele recebe qualquer linguagem escrita (natural ou computacional) como entrada e produz:

1. Um texto traduzido com **mínima perda semântica**
2. Um **translation_contract** completo, pronto para auditoria, replay e verificação local
3. Um registro append-only em `contracts.ndjson`, no estilo JSON✯Atomic

> No minitradutor, nenhuma tradução é "só um texto": **tudo é contrato**.

---

## ✨ Funcionalidades

- `POST /translate` — endpoint HTTP principal
- CLI: `minitradutor translate ...`
- Suporte a tradução:
  - Linguagens naturais (ex: `en`, `pt`, `ja`, `es`)
  - Linguagens técnicas (ex: `"python"`, `"typescript"`, `"html"`)
- Emissão de **translation_contract** com:
  - `source_language`, `target_language`
  - `source_text`, `translated_text`
  - `workflow`, `flow`, `tenant_id`
  - `method` (`human`, `machine`, `hybrid`)
  - `confidence` (0.0–1.0)
  - `provenance` (timestamp, tenant_id, assinatura opcional)
- Ledger local em `output/contracts.ndjson` (1 linha JSON por contrato)
- Assinatura opcional com Ed25519 (compatível com paradigma JSON✯Atomic)
- Modo opcional **roundtrip** para testes de fidelidade semântica (ida e volta)

---

## 🧩 Modelo de dados: `translation_contract`

### Gramática conceitual (BNF simplificada)

```bnf
translation_contract   ::= "contract" "{"
                              "id" ":" LogLineID ","
                              "workflow" ":" WorkflowID ","
                              "flow" ":" FlowID ","
                              "source_language" ":" LanguageCode ","
                              "target_language" ":" LanguageCode ","
                              "source_text" ":" QuotedText ","
                              "translated_text" ":" QuotedText ","
                              [ "translator" ":" LogLineID "," ]
                              [ "method" ":" TranslationMethod "," ]
                              [ "confidence" ":" ConfidenceScore "," ]
                              "provenance" ":" ProvenanceBlock
                           "}"

LanguageCode           ::= ISO639_1 | ISO639_3 | linguagem técnica ("python", "typescript", "html", etc.)

QuotedText             ::= '"' { any_char } '"'

TranslationMethod      ::= "human" | "machine" | "hybrid"

ConfidenceScore        ::= Float (0.0 – 1.0)

ProvenanceBlock        ::= "{"
                              "timestamp" ":" ISO8601 ","
                              "tenant_id" ":" String ","
                              "signature" ":" HexString
                           "}"
```

### Exemplo de saída

```json
{
  "contract": {
    "id": "trans_f2a7c8",
    "workflow": "docgen",
    "flow": "translate_fn",
    "source_language": "python",
    "target_language": "pt",
    "source_text": "def greet(): print('Hello')",
    "translated_text": "A função 'greet' imprime 'Hello'.",
    "translator": "logline.model",
    "method": "machine",
    "confidence": 0.92,
    "provenance": {
      "timestamp": "2025-11-13T18:44:00Z",
      "tenant_id": "voulezvous",
      "signature": "ed25519:abc123..."
    }
  }
}
```

---

## 🏗 Arquitetura

Estrutura sugerida do projeto (pode variar de acordo com a implementação):

```
minitradutor/
├── api.ts                # Endpoint HTTP (POST /translate)
├── cli.ts                # Interface de linha de comando
├── translate.ts          # Função principal: input → translated_text
├── ledger.ts             # Persiste contratos no NDJSON
├── schema.json           # JSON Schema do contrato
├── signer.ts             # Assinatura Ed25519 (opcional)
├── providers/
│   ├── types.ts          # Interfaces TypeScript
│   └── openai.ts         # Provider LLM OpenAI
├── utils/
│   ├── hash.ts           # Gera trace_id / hash (ex: BLAKE3)
│   └── time.ts           # Gera timestamp ISO8601 em UTC
├── config.ts             # Config (providers, paths, flags)
├── output/
│   └── contracts.ndjson  # Ledger local (append-only)
└── tests/
    └── contract.test.ts  # Testes do contrato e fluxo
```

Stack recomendada:
- TypeScript
- Deno (execução local preferencial, compatível com Node.js se necessário)
- Provider de tradução:
  - LLM externo (OpenAI, Ollama, etc.) ou
  - Implementação mock / local

---

## 🚀 Como usar

### 1. HTTP API

#### Request

```http
POST /translate
Content-Type: application/json

{
  "source_language": "python",
  "target_language": "pt",
  "source_text": "def greet(): print('Hello')",
  "method": "machine",
  "workflow": "docgen",
  "flow": "translate_fn",
  "tenant_id": "voulezvous"
}
```

#### Response (200)

```json
{
  "contract": {
    "id": "trans_f2a7c8",
    "workflow": "docgen",
    "flow": "translate_fn",
    "source_language": "python",
    "target_language": "pt",
    "source_text": "def greet(): print('Hello')",
    "translated_text": "A função 'greet' imprime 'Hello'.",
    "translator": "logline.model",
    "method": "machine",
    "confidence": 0.92,
    "provenance": {
      "timestamp": "2025-11-13T18:44:00Z",
      "tenant_id": "voulezvous",
      "signature": "ed25519:abc123..."
    }
  }
}
```

#### Response (erro, 400)

```json
{
  "error": "InvalidInput",
  "message": "source_language is required",
  "details": {
    "field": "source_language"
  }
}
```

---

### 2. CLI

A CLI expõe o mesmo fluxo da API, mas via terminal:

```bash
# Tradução simples
minitradutor translate --from ja --to en --input texto.txt

# De código para linguagem natural
minitradutor translate --from python --to pt --input "def greet(): print('Hello')"

# Modo roundtrip (ida e volta, para teste de fidelidade)
minitradutor translate \
  --from pt --to en \
  --input "O sistema é auditável." \
  --mode roundtrip
```

Saída:
- Imprime o translation_contract no stdout
- Sempre registra o contrato em output/contracts.ndjson

---

## 🔄 Fluxo computável

Fluxo conceitual do minitradutor:

```
Entrada → Tradução → Contrato → Assinatura → Ledger → Observabilidade
```

1. **Entrada**
   - Recebe source_language, target_language, source_text, workflow, flow, tenant_id, method.
2. **Tradução**
   - Provider (LLM / humano / híbrido) gera translated_text + confidence.
3. **Contrato**
   - Montagem de um translation_contract com todos os campos.
4. **Assinatura (opcional)**
   - Assinatura Ed25519, ex: ed25519:<hex>.
5. **Ledger**
   - Append em output/contracts.ndjson (uma linha JSON por contrato).
6. **Observabilidade**
   - Cada contrato pode ser revalidado, reexecutado ou vinculado a outros spans.

---

## 🚦 Fluxo de Demo (Quick Start)

### 1. Configurar ambiente

```bash
# Clone o repositório
git clone <repo-url>
cd minitradutor

# Crie o arquivo .env com suas credenciais
cp .env.example .env

# Edite .env e adicione sua API key
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-...
```

### 2. Testar via API HTTP

```bash
# Inicie o servidor
deno task dev

# Em outro terminal, faça uma tradução
curl -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d '{
    "source_language": "en",
    "target_language": "pt",
    "source_text": "Hello world",
    "workflow": "demo",
    "flow": "test_translation",
    "tenant_id": "demo_user",
    "method": "machine"
  }'

# Verifique o contrato salvo
cat output/contracts.ndjson
```

### 3. Testar via CLI

```bash
# Tradução simples
deno task cli translate \
  --from en \
  --to pt \
  --input "Hello world"

# Tradução de código
deno task cli translate \
  --from python \
  --to pt \
  --input "def greet(): print('Hello')"

# Modo roundtrip (ida e volta)
deno task cli translate \
  --from pt \
  --to en \
  --input "O sistema é auditável" \
  --mode roundtrip

# Ver contrato completo em JSON
MINITRADUTOR_VERBOSE=true deno task cli translate \
  --from en \
  --to pt \
  --input "test"
```

### 4. Verificar ledger

```bash
# Ver todos os contratos salvos
cat output/contracts.ndjson | jq '.'

# Contar contratos
wc -l output/contracts.ndjson

# Ver último contrato
tail -n 1 output/contracts.ndjson | jq '.'
```

### 5. Rodar testes

```bash
# Rodar suite de testes
deno task test

# Verificar tipos
deno check **/*.ts
```

---

## ✅ Regras obrigatórias

- Toda tradução gera:
  - Um translation_contract válido ou um erro JSON bem estruturado.
  - confidence sempre presente (0.0–1.0).
  - provenance.timestamp sempre em ISO8601 UTC.
  - provenance.tenant_id nunca vazio.
- output/contracts.ndjson é append-only.
- Erros devem ser logados em formato JSON com:
  - error, message, timestamp, trace_id (opcional).

---

## 🧪 Testes recomendados

| Teste | Cenário | Esperado |
|-------|---------|----------|
| T1 | Japonês → Inglês | Tradução clara, confidence > 0.8 |
| T2 | Python → Português | Tradução descritiva correta do código |
| T3 | Entrada inválida | HTTP 400 + JSON de erro com motivo claro |
| T4 | method = "human" | Campo translator obrigatório e validado |
| T5 | Replay com mesmo input/flow | Contrato idempotente ou marcado com replay_of |
| T6 | Ledger NDJSON | Cada linha é JSON válido, validável com schema.json |
| T7 | Assinatura desativada | signature vazio, contrato ainda válido |
| T8 | Modo roundtrip | Calcula score de fidelidade semântica ida/volta |

---

## 🔬 Modo opcional: roundtrip (mirror)

Modo para testar fidelidade semântica de ida e volta.

### Exemplo de request

```json
{
  "mode": "roundtrip",
  "source_language": "pt",
  "target_language": "en",
  "source_text": "O sistema é auditável.",
  "roundtrip_target": "pt",
  "workflow": "qa",
  "flow": "roundtrip_test",
  "tenant_id": "voulezvous",
  "method": "machine"
}
```

### Esperado
- Contrato da tradução direta (pt → en)
- Tradução reversa (en → pt)
- Campo de score de fidelidade (ex: roundtrip_score: 0.87), seja no contrato principal ou em metadados adicionais.

---

## 🌐 Integração futura com LogLine

O minitradutor foi pensado para plugar direto no ecossistema LogLine. Em versões futuras, ele deve:
- Emitir spans:
  - register_app para registrar minitradutor
  - register_contract para contracts de tradução
  - register_trajectory para sequências (roundtrip, revisões, etc.)
- Permitir link_entity entre:
  - Traduções e documentos de origem
  - Contratos e execuções de pipelines
  - Usuários / tradutores humanos

---

## 🧠 Uso com LLMs autônomos

Prompt recomendado para operar LLMs internamente:

> "Dado um texto de entrada, o idioma de origem e o idioma de destino, gere um objeto JSON válido do tipo translation_contract, obedecendo ao JSON Schema fornecido. Priorize mínima perda semântica, complete todos os campos obrigatórios, estime o campo confidence (0.0–1.0) e inclua provenance com timestamp ISO8601 atual, tenant_id e signature (pode ser vazia se a assinatura estiver desativada)."

---

## 📄 Licença

Este projeto é licenciado sob os termos da **Apache 2.0**, ou modelo dual definido pela LogLine Foundation.
