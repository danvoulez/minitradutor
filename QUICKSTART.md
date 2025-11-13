# 🚀 Quickstart - Minitradutor

Guia rápido para começar a usar o minitradutor em 5 minutos!

## 1. Instalação

```bash
# Clone o repositório
git clone https://github.com/logline/minitradutor.git
cd minitradutor
```

## 2. Configuração Inicial

```bash
# Crie o arquivo de configuração
deno task cli init

# Copie e edite o .env
cp .env.example .env
```

Para começar rapidamente, use o provider `mock` (sem necessidade de API key):

```bash
# .env
LLM_PROVIDER=mock
ENABLE_SIGNING=false
```

## 3. Teste a CLI

```bash
# Tradução simples
deno task cli translate \
  --from en \
  --to pt \
  --input "Hello, world!"
```

Saída esperada:
```
🔄 Translating...

✅ Translation completed with confidence: 95.0%

💾 Contract saved to: ./output/contracts.ndjson

📜 TRANSLATION CONTRACT:
────────────────────────────────────────────────────────────
{
  "id": "trans_abc123",
  "workflow": "translation",
  "flow": "default",
  "source_language": "en",
  "target_language": "pt",
  "source_text": "Hello, world!",
  "translated_text": "[MOCK TRANSLATION from en to pt]: Hello, world!",
  ...
}
────────────────────────────────────────────────────────────
```

## 4. Teste o Servidor HTTP

Terminal 1 - Iniciar servidor:
```bash
deno task start
```

Terminal 2 - Fazer uma requisição:
```bash
curl -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d '{
    "source_language": "en",
    "target_language": "pt",
    "source_text": "Hello world",
    "tenant_id": "demo"
  }'
```

## 5. Usando um LLM Real (Opcional)

### Com Anthropic Claude

```bash
# No .env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_key_here
```

### Com OpenAI

```bash
# No .env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_key_here
```

Agora faça a mesma tradução e veja a diferença:

```bash
deno task cli translate \
  --from python \
  --to pt \
  --input "def greet(): print('Hello')"
```

## 6. Explorar Exemplos

```bash
# Exemplo programático
deno run --allow-read --allow-write --allow-env examples/simple_translation.ts

# Exemplos de API (requer servidor rodando)
./examples/api_example.sh
```

## 7. Verificar o Ledger

```bash
# Ver todos os contratos salvos
cat output/contracts.ndjson | jq '.'

# Contar contratos
wc -l output/contracts.ndjson
```

## 8. Modo Roundtrip

Teste a fidelidade semântica:

```bash
deno task cli translate \
  --from pt \
  --to en \
  --input "O sistema é auditável" \
  --mode roundtrip
```

## 9. Gerar Chaves de Assinatura (Opcional)

```bash
# Gerar par de chaves Ed25519
deno task cli keygen

# Copiar as chaves para .env
# Habilitar assinatura
ENABLE_SIGNING=true
```

## 10. Executar Testes

```bash
# Rodar todos os testes
deno task test

# Ver configuração atual
deno task cli config
```

---

## Comandos Úteis

```bash
# CLI
deno task cli help              # Ver ajuda completa
deno task cli config            # Ver configuração atual
deno task cli keygen            # Gerar chaves de assinatura

# Servidor
deno task start                 # Iniciar servidor (porta 8000)
deno task dev                   # Modo watch (desenvolvimento)

# Desenvolvimento
deno task test                  # Executar testes
deno task fmt                   # Formatar código
deno task lint                  # Lint código
deno task check                 # Type check

# Tradução
deno task cli translate --from <lang> --to <lang> --input <text>
deno task cli translate --from <lang> --to <lang> --file <path>
```

---

## Próximos Passos

1. Leia o [README.md](README.md) completo
2. Explore os [exemplos](examples/)
3. Configure um LLM real (Anthropic ou OpenAI)
4. Integre com seu fluxo de trabalho
5. Configure assinatura digital para produção

---

## Problemas Comuns

### "ANTHROPIC_API_KEY is required"

Configure a variável de ambiente corretamente ou use `LLM_PROVIDER=mock`

### "Permission denied"

Adicione as permissões necessárias ao Deno:
```bash
deno run --allow-net --allow-read --allow-write --allow-env seu_script.ts
```

### Servidor não inicia

Verifique se a porta 8000 está livre:
```bash
lsof -i :8000
# ou use outra porta
PORT=3000 deno task start
```

---

**Pronto!** Você está usando o minitradutor! 🎉

Para mais informações, consulte o [README.md](README.md) completo.
