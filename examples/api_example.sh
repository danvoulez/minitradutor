#!/bin/bash

# Exemplo de uso da API HTTP do minitradutor
# Certifique-se de que o servidor está rodando: deno task start

echo "🌐 Minitradutor - Exemplos de API HTTP"
echo "======================================="
echo ""

# Verifica se o servidor está rodando
echo "📡 Verificando status do servidor..."
curl -s http://localhost:8000/health | jq '.'
echo ""

# Exemplo 1: Tradução simples
echo "📝 Exemplo 1: Tradução de inglês para português"
echo "POST /translate"
echo ""
curl -s -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d '{
    "source_language": "en",
    "target_language": "pt",
    "source_text": "The quick brown fox jumps over the lazy dog",
    "method": "machine",
    "workflow": "example",
    "flow": "en_to_pt",
    "tenant_id": "demo"
  }' | jq '.'
echo ""

# Exemplo 2: Tradução de código
echo "💻 Exemplo 2: Explicar código Python em português"
echo "POST /translate"
echo ""
curl -s -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d '{
    "source_language": "python",
    "target_language": "pt",
    "source_text": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
    "method": "machine",
    "workflow": "code-explanation",
    "flow": "python_to_pt",
    "tenant_id": "demo"
  }' | jq '.'
echo ""

# Exemplo 3: Teste de erro (entrada inválida)
echo "❌ Exemplo 3: Teste de validação de erro"
echo "POST /translate (sem source_text)"
echo ""
curl -s -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d '{
    "source_language": "en",
    "target_language": "pt"
  }' | jq '.'
echo ""

echo "✅ Exemplos concluídos!"
echo ""
echo "📊 Para ver o ledger de contratos:"
echo "   cat output/contracts.ndjson | jq '.'"
echo ""
