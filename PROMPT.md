Segue o prompt mais completo, organizado e pronto pra copiar e colar. Vou escrever como se você fosse entregar isso para um time de engenharia + um LLM builder.

⸻

📜 Prompt completo — Construir o minitradutor

🪪 Project: LogLine // minitradutor
🏷️ Version: v0.1-alpha
📅 Date: 2025-11-13
🔐 Owner: LogLine Foundation / VoulezVous
🌐 License: Apache 2.0 (ou dual com LogLineID)

⸻

1. Contexto e missão

Construa um serviço chamado minitradutor — uma API computável de tradução universal, capaz de receber qualquer linguagem escrita (natural ou computacional) como entrada e reexpressar seu conteúdo em outra linguagem, com mínima perda semântica.

Tudo que o minitradutor faz deve ser encapsulado em um objeto de contrato de tradução (translation_contract), que é:
	•	Computável (validado por schema, reexecutável, fácil de auditar)
	•	Traçável (tem workflow, flow, IDs, timestamps, assinatura opcional)
	•	Ledger-first (cada contrato é uma linha em NDJSON, estilo JSON✯Atomic)

Filosofia:

Nenhuma tradução é “só um texto”: tudo é span / contrato.

⸻

2. Objetivos funcionais

O sistema deve ser capaz de:
	1.	Receber um texto em uma linguagem de origem
	•	Pode ser linguagem natural (ex: ja, en, pt)
	•	Pode ser linguagem técnica (ex: "python", "typescript", "html")
	2.	Traduzir para uma linguagem de destino
	•	Também natural ou técnica
	3.	Produzir um objeto translation_contract completo, com:
	•	Textos (original + traduzido)
	•	Idiomas (origem + destino)
	•	Metadados (workflow, flow, tenant, método, confiança)
	•	Proveniência (timestamp, tenant_id, assinatura opcional)
	4.	Persistir o contrato em um ledger local NDJSON
	•	Arquivo: output/contracts.ndjson
	•	1 linha = 1 contrato JSON válido
	5.	Permitir verificação local
	•	Por hash (BLAKE3 ou similar)
	•	Por assinatura opcional (Ed25519)

⸻

3. Interfaces do sistema

3.1. HTTP API
	•	Endpoint principal: POST /translate

Request JSON (mínimo):

{
  "source_language": "python",
  "target_language": "pt",
  "source_text": "def greet(): print('Hello')",
  "method": "machine",
  "workflow": "docgen",
  "flow": "translate_fn",
  "tenant_id": "voulezvous"
}

Response (sucesso, HTTP 200):

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

Response (erro, por exemplo input inválido, HTTP 400):

{
  "error": "InvalidInput",
  "message": "source_language is required",
  "details": {
    "field": "source_language"
  }
}

3.2. CLI

Criar uma interface CLI:
	•	Comando principal:
minitradutor translate --from <src> --to <dst> --input <file_or_text> [--mode roundtrip]

Exemplos:

minitradutor translate --from ja --to en --input texto.txt
minitradutor translate --from python --to pt --input "def greet(): print('Hello')"
minitradutor translate --from pt --to en --input "O sistema é auditável." --mode roundtrip

A CLI deve:
	•	Aceitar input via arquivo ou texto literal
	•	Imprimir o translation_contract no stdout
	•	E sempre gravar o contrato no ledger output/contracts.ndjson

⸻

4. Gramática do translation_contract

Use a seguinte gramática como referência conceitual (adaptável para JSON schema):

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

4.1. Convenções de JSON
	•	Campos em snake_case
	•	Tipos consistentes:
	•	id, workflow, flow, tenant_id → string
	•	source_language, target_language → string
	•	source_text, translated_text → string
	•	translator → string (opcional, mas obrigatório se method = "human" ou "hybrid")
	•	confidence → number (0.0 a 1.0)

⸻

5. Requisitos de implementação

5.1. Stack
	•	Linguagem preferida: TypeScript
	•	Execução local preferencial: Deno (mas compatível com Node.js)

5.2. Arquitetura mínima sugerida

minitradutor/
├── api.ts                // Endpoint HTTP (POST /translate)
├── cli.ts                // Interface de linha de comando
├── translate.ts          // Função principal: input → translated_text
├── contract.ts           // Builder do translation_contract
├── schema.json           // JSON Schema do contrato
├── signer.ts             // Assinatura Ed25519 (opcional)
├── utils/
│   ├── hash.ts           // Gera trace_id / hash (BLAKE3 ou equivalente)
│   └── time.ts           // Gera timestamp ISO8601
├── config.ts             // Config (chaves, provider LLM, paths)
├── output/
│   └── contracts.ndjson  // Ledger local de contratos
└── tests/
    └── contract.test.ts  // Testes unitários e de contrato

5.3. Funções sugeridas (LLM-friendly)
	•	translateText(params): Promise<{ translatedText: string; confidence: number; }>
	•	buildContract(params): TranslationContract
	•	signContract(contract): SignedTranslationContract (opcional)
	•	saveLedgerEntry(contract): Promise<void>
	•	validateContract(contract): void (lança erro se inválido)

5.4. Integração com LLM
	•	Pode usar um LLM externo (OpenAI, Ollama etc.)
	•	Deve haver uma camada de abstração:
	•	provider.translate({ source_language, target_language, text }): Promise<{ text, confidence }>
	•	Permitir futura troca de provider sem quebrar o contrato.

⸻

6. Regras obrigatórias de operação
	1.	Nenhuma tradução é “só um texto”
	•	Sempre gerar um translation_contract completo ou um erro estruturado.
	2.	Idempotência por input
	•	Idealmente, se o mesmo input (source_text, source_language, target_language, workflow, flow, tenant_id) for enviado duas vezes, o contract.id pode ser repetido (determinístico por hash) ou carregar um campo replay_of.
	3.	Confiança quantificada
	•	Sempre preencher confidence com valor entre 0.0 e 1.0.
	•	Se for tradução humana sem score explícito, use valor default alto (ex: 0.95) e documente essa política.
	4.	Proveniência completa
	•	provenance.timestamp sempre em ISO8601 (UTC).
	•	provenance.tenant_id nunca vazio.
	•	provenance.signature pode ser string vazia se assinatura estiver desativada.
	5.	Ledger append-only
	•	output/contracts.ndjson não deve ser reescrito; apenas append de linhas novas.
	6.	Erros rastreáveis
	•	Em caso de erro, logar um objeto JSON com:
	•	error, message, timestamp, trace_id (opcional).

⸻

7. Ciclo de vida do contrato de tradução

Representação textual do fluxo:

Entrada → Tradução → Contrato → Assinatura → Ledger → Observabilidade

Explicando:
	1.	Entrada:
	•	Recebe source_language, target_language, source_text + metadados (workflow, flow, tenant_id, method).
	2.	Tradução:
	•	Executa via LLM / humano / híbrido.
	•	Retorna translated_text + estimativa de confidence.
	3.	Contrato:
	•	Monta o objeto translation_contract com todos os campos.
	4.	Assinatura (opcional):
	•	Aplica assinatura Ed25519 (ex: ed25519:<hex>).
	5.	Ledger:
	•	Escreve o contrato como uma linha no arquivo NDJSON.
	6.	Observabilidade:
	•	Permite auditoria posterior; cada contrato pode ser revalidado, reexecutado ou linkado a outros spans.

Se quiser, o time pode adicionar um diagrama em mermaid:

flowchart TD
  A[Input text + langs] --> B[LLM / Human / Hybrid Translation]
  B --> C[Build translation_contract]
  C --> D[Sign + Hash]
  D --> E[Store in NDJSON Ledger]
  E --> F[Available for audit / replay / policy]


⸻

8. Matriz de testes esperados

Teste	Exemplo	Esperado
T1	Japonês → Inglês	Tradução clara, confidence > 0.8
T2	Python → Português	Tradução descritiva correta do código
T3	Entrada inválida	HTTP 400 + JSON de erro com motivo claro
T4	method = "human"	Campo translator obrigatório e validado
T5	Replay com mesmo input/flow	Contrato idempotente ou marcado com replay_of
T6	Ledger NDJSON	Cada linha é JSON válido e revalidável pelo schema
T7	Assinatura desativada	Campo signature vazio, mas contrato ainda válido
T8	Modo roundtrip (mirror)	Calcula score de fidelidade semântica ida/volta


⸻

9. Modo opcional: “mirror” / roundtrip

Implementar um modo opcional para teste de fidelidade semântica:

9.1. Entrada de exemplo

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

9.2. Saída esperada (conceito)
	•	Contrato principal (pt → en)
	•	Tradução reversa (en → pt)
	•	Score de fidelidade semântica para o roundtrip (ex: 0.87)

Você pode modelar isso como:
	•	Um translation_contract principal + campos adicionais em provenance
ou
	•	Dois contratos linkados via register_trajectory no futuro.

⸻

10. Registro no ecossistema LogLine (futuro)

Quando o minitradutor estiver funcional, ele deve ser integrável ao ecossistema LogLine:
	1.	Emitir spans do tipo:
	•	register_app para registrar o app minitradutor
	•	register_contract para cada translation_contract relevante
	•	register_trajectory para sequências (ex.: roundtrip, múltiplas revisões)
	2.	Permitir que cada translation_contract seja linkável via link_entity a:
	•	Outros documentos (ex: contrato original de um cliente)
	•	Execuções de pipelines (ex: fluxo docgen)
	•	Usuários / pessoas (tradutores humanos)

Essa parte pode ser feita em uma segunda fase, mas o modelo de dados já deve prever esses campos (workflow, flow, tenant_id, translator, id estável).

⸻

11. Prompt LLM para reconstruir contratos de tradução

Inclua, na documentação do código ou em docs/llm_prompt.md, um prompt padrão para operar LLMs autonomamente com o minitradutor:

Prompt LLM (interno):
“Dado um texto de entrada, o idioma de origem e o idioma de destino, gere um objeto JSON válido do tipo translation_contract, obedecendo ao JSON Schema fornecido. Priorize mínima perda semântica, complete todos os campos obrigatórios, estime o campo confidence (0.0–1.0) e inclua um bloco de provenance com timestamp ISO8601 atual, tenant_id e signature (pode ser vazio se a assinatura estiver desativada).”

⸻

12. (Opcional) Compatibilidade com JSON✯Atomic

Se desejar alinhar desde o início com JSON✯Atomic:
	•	Mantenha:
	•	Tipos simples, sem aninhamento desnecessário
	•	Campos determinísticos e ordens previsíveis (na serialização NDJSON)
	•	Adapte:
	•	Uso de BLAKE3 como hash para o id ou trace_id
	•	Assinatura Ed25519 com prefixo próprio (ex: dv25: ou ed25519:)

Assim, o ledger contracts.ndjson pode ser verificado por ferramentas padrão do ecossistema LogLine.

⸻

Se você quiser, no próximo passo posso transformar isso num README.md pronto de repo ou num spec OpenAPI v3 pro POST /translate.
