# 🌐 Minitradutor

> Universal Translation Contract Builder

**Minitradutor** é uma API computável de tradução universal, capaz de receber qualquer linguagem escrita (natural ou computacional) como entrada e reexpressar seu conteúdo em outra linguagem, com mínima perda semântica.

Parte do ecossistema [LogLine Foundation](https://logline.foundation).

---

## 📜 Filosofia

> **Nenhuma tradução é "só um texto": tudo é span / contrato.**

Cada tradução no minitradutor gera um **Translation Contract** completo, que é:

- ✅ **Computável** - validado por schema, reexecutável, fácil de auditar
- 🔍 **Rastreável** - tem workflow, flow, IDs, timestamps, assinatura opcional
- 📚 **Ledger-first** - cada contrato é uma linha em NDJSON, estilo JSON✯Atomic

---

## 🚀 Features

- ✨ Tradução entre linguagens naturais (pt, en, ja, etc.)
- 💻 Tradução de código (python → pt, javascript → en, etc.)
- 📝 Contratos de tradução totalmente estruturados
- 🔐 Assinatura digital Ed25519 opcional
- 📊 Ledger NDJSON append-only para auditoria
- 🌐 API HTTP REST (`POST /translate`)
- ⌨️ CLI completa com múltiplos comandos
- 🔄 Modo roundtrip para teste de fidelidade
- 🧪 Testes automatizados
- 🎯 Suporte para múltiplos providers LLM (Anthropic, OpenAI)

---

## 📦 Instalação

### Requisitos

- [Deno](https://deno.land/) 1.37+ (recomendado)
- Ou Node.js 18+ (compatível)

### Clonar o repositório

```bash
git clone https://github.com/logline/minitradutor.git
cd minitradutor
```

### Configurar ambiente

```bash
# Criar arquivo de configuração
deno task cli init

# Copiar e editar .env
cp .env.example .env
```

Edite o `.env` com suas configurações:

```bash
# Escolha o provider
LLM_PROVIDER=anthropic  # ou openai, ou mock

# Configure a API key correspondente
ANTHROPIC_API_KEY=your_key_here
# ou
OPENAI_API_KEY=your_key_here

# Habilitar assinatura (opcional)
ENABLE_SIGNING=false
```

---

## 🎯 Uso Rápido

### CLI

#### Traduzir texto

```bash
# Tradução simples
deno task cli translate --from en --to pt --input "Hello world"

# Tradução de código
deno task cli translate --from python --to pt --input "def greet(): print('Hello')"

# Tradução de arquivo
deno task cli translate --from ja --to en --file input.txt

# Modo roundtrip (teste de fidelidade)
deno task cli translate --from pt --to en --input "O sistema é auditável" --mode roundtrip
```

#### Gerar chaves de assinatura

```bash
deno task cli keygen
```

#### Ver configuração

```bash
deno task cli config
```

### API HTTP

#### Iniciar servidor

```bash
deno task start
```

O servidor inicia em `http://localhost:8000`

#### Fazer uma tradução via HTTP

```bash
curl -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d '{
    "source_language": "python",
    "target_language": "pt",
    "source_text": "def greet(): print('\''Hello'\'')",
    "method": "machine",
    "workflow": "docgen",
    "flow": "translate_fn",
    "tenant_id": "voulezvous"
  }'
```

#### Resposta

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

## 📚 Estrutura do Projeto

```
minitradutor/
├── api.ts                # Servidor HTTP (POST /translate)
├── cli.ts                # Interface CLI
├── mod.ts                # Entry point do módulo
├── translate.ts          # Lógica de tradução + providers
├── contract.ts           # Builder e validador de contratos
├── schema.json           # JSON Schema do translation_contract
├── signer.ts             # Assinatura Ed25519
├── config.ts             # Gerenciamento de configuração
├── utils/
│   ├── hash.ts           # Geração de hashes e IDs
│   └── time.ts           # Geração de timestamps
├── output/
│   └── contracts.ndjson  # Ledger de contratos (gerado)
├── tests/
│   └── contract.test.ts  # Testes automatizados
├── deno.json             # Configuração Deno
├── .env.example          # Template de configuração
└── README.md             # Este arquivo
```

---

## 🔧 Configuração

### Variáveis de Ambiente

| Variável | Descrição | Valores | Padrão |
|----------|-----------|---------|--------|
| `LLM_PROVIDER` | Provider de LLM | `anthropic`, `openai`, `mock` | `mock` |
| `ANTHROPIC_API_KEY` | API key da Anthropic | string | - |
| `OPENAI_API_KEY` | API key da OpenAI | string | - |
| `ENABLE_SIGNING` | Habilitar assinatura | `true`, `false` | `false` |
| `ED25519_PRIVATE_KEY` | Chave privada (hex) | string | - |
| `ED25519_PUBLIC_KEY` | Chave pública (hex) | string | - |
| `LEDGER_PATH` | Caminho do ledger | path | `./output/contracts.ndjson` |
| `PORT` | Porta do servidor | number | `8000` |
| `HOST` | Host do servidor | string | `0.0.0.0` |
| `DEFAULT_TENANT_ID` | Tenant padrão | string | `default` |

---

## 🧪 Testes

```bash
# Executar todos os testes
deno task test

# Executar com cobertura
deno test --coverage=coverage tests/

# Gerar relatório de cobertura
deno coverage coverage/
```

### Matriz de Testes

| Teste | Descrição | Status |
|-------|-----------|--------|
| T1 | Japonês → Inglês | ✅ |
| T2 | Python → Português | ✅ |
| T3 | Entrada inválida | ✅ |
| T4 | method = "human" | ✅ |
| T5 | Replay idempotente | ⏳ |
| T6 | Ledger NDJSON válido | ✅ |
| T7 | Assinatura desativada | ✅ |
| T8 | Modo roundtrip | ✅ |

---

## 📋 Translation Contract Schema

Cada tradução gera um contrato com a seguinte estrutura:

```typescript
{
  id: string;                  // "trans_XXXXXX"
  workflow: string;            // Nome do workflow
  flow: string;                // Nome do flow
  source_language: string;     // Idioma de origem
  target_language: string;     // Idioma de destino
  source_text: string;         // Texto original
  translated_text: string;     // Texto traduzido
  translator?: string;         // Identificador do tradutor
  method: "human" | "machine" | "hybrid";
  confidence: number;          // 0.0 - 1.0
  provenance: {
    timestamp: string;         // ISO8601 UTC
    tenant_id: string;         // ID do tenant
    signature: string;         // Ed25519 signature (ou vazio)
  }
}
```

---

## 🔐 Assinatura Digital

### Gerar par de chaves

```bash
deno task cli keygen
```

Isso gera um par de chaves Ed25519 e imprime:

```
ED25519_PRIVATE_KEY=...hex...
ED25519_PUBLIC_KEY=...hex...
```

### Habilitar assinatura

Adicione ao `.env`:

```bash
ENABLE_SIGNING=true
ED25519_PRIVATE_KEY=your_private_key_hex
```

### Verificar assinatura

```typescript
import { verifyContract, importPublicKey } from "./signer.ts";

const publicKey = await importPublicKey("your_public_key_hex");
const isValid = await verifyContract(contract, publicKey);
console.log("Signature valid:", isValid);
```

---

## 🌊 Ciclo de Vida do Contrato

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌───────────┐    ┌────────┐    ┌──────────────┐
│ Entrada │ -> │ Tradução │ -> │ Contrato │ -> │ Assinatura│ -> │ Ledger │ -> │Observabilidade│
└─────────┘    └──────────┘    └──────────┘    └───────────┘    └────────┘    └──────────────┘
```

1. **Entrada**: Recebe texto + metadados
2. **Tradução**: Executa via LLM/humano
3. **Contrato**: Monta objeto estruturado
4. **Assinatura**: Aplica Ed25519 (opcional)
5. **Ledger**: Persiste em NDJSON
6. **Observabilidade**: Permite auditoria posterior

---

## 🔄 Modo Roundtrip

Teste a fidelidade semântica com tradução ida-e-volta:

```bash
deno task cli translate \
  --from pt \
  --to en \
  --input "O sistema é auditável" \
  --mode roundtrip
```

Saída:

```
Original:       O sistema é auditável
Forward:        The system is auditable
Back:           O sistema é auditável
Semantic fidelity score: 95.2%
```

---

## 📊 Ledger NDJSON

Todos os contratos são persistidos em `output/contracts.ndjson`:

```jsonlines
{"id":"trans_a1b2c3","workflow":"test",...}
{"id":"trans_d4e5f6","workflow":"prod",...}
{"id":"trans_g7h8i9","workflow":"qa",...}
```

Cada linha é um JSON válido e pode ser:
- ✅ Revalidado contra o schema
- 🔍 Auditado individualmente
- 🔗 Linkado a outros spans no ecossistema LogLine

---

## 🛠️ Desenvolvimento

### Formatar código

```bash
deno task fmt
```

### Lint

```bash
deno task lint
```

### Type check

```bash
deno task check
```

### Modo watch (desenvolvimento)

```bash
deno task dev
```

---

## 📖 Exemplos

### Exemplo 1: Tradução simples (CLI)

```bash
deno task cli translate \
  --from en \
  --to pt \
  --input "The quick brown fox jumps over the lazy dog"
```

### Exemplo 2: Tradução de código (API)

```bash
curl -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d '{
    "source_language": "javascript",
    "target_language": "python",
    "source_text": "const sum = (a, b) => a + b;",
    "tenant_id": "my-org",
    "workflow": "code-migration",
    "flow": "js-to-py"
  }'
```

### Exemplo 3: Tradução humana

```bash
deno task cli translate \
  --from en \
  --to pt \
  --input "Terms and Conditions" \
  --method human \
  --translator "maria.silva@example.com"
```

---

## 🚧 Roadmap

- [ ] Suporte a mais providers (Ollama, Google Translate, etc.)
- [ ] Integração com ecossistema LogLine (spans, trajectories)
- [ ] CLI interativa com prompts
- [ ] Dashboard web para visualização de contratos
- [ ] Batch translation de múltiplos arquivos
- [ ] Plugins para editores (VSCode, Vim)
- [ ] Métricas de qualidade e confiança aprimoradas

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/amazing`)
3. Commit suas mudanças (`git commit -m 'Add amazing feature'`)
4. Push para a branch (`git push origin feature/amazing`)
5. Abra um Pull Request

---

## 📄 Licença

Apache 2.0 (ou dual license com LogLineID)

---

## 👥 Autores

- **LogLine Foundation** - [https://logline.foundation](https://logline.foundation)
- **VoulezVous** - Initial development

---

## 🙏 Agradecimentos

- Inspirado no ecossistema JSON✯Atomic
- Construído com [Deno](https://deno.land)
- Suporte para Anthropic Claude e OpenAI GPT

---

## 📞 Suporte

- 📧 Email: support@logline.foundation
- 🐛 Issues: [GitHub Issues](https://github.com/logline/minitradutor/issues)
- 💬 Discord: [LogLine Community](https://discord.gg/logline)

---

**Minitradutor** - Tradução como contrato computável. 🌐✨
