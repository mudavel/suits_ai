# Backend — branch 2

API FastAPI de `feature/backend-api-copilot`, seguindo o
[`ROADMAP.md`](../../artefacts/suits_docs/ROADMAP.md) e o
[`SPEC.md`](../../artefacts/suits_docs/SPEC.md). Esta versão acrescenta documentos,
conversas, minutas, exportação e persistência à fundação da fase 1.

O modelo padrão desta implementação foi atualizado para GPT-6 Astra. Essa
configuração substitui a previsão de GPT-4o nos documentos compartilhados acima.

O código desta frente fica em `src/backend/`, os testes em `tests/` e as
dependências no `requirements.txt` da raiz, conforme o filetree do master.
O motor de política pertence à branch 1; os indicadores A01–A20 e
E01–E20 pertencem à branch 4. Os serviços têm pontos de substituição em
`dependencies.py` e são inicializados no lifespan da aplicação.

O [contrato de integração](INTEGRATION.md) registra os formatos HTTP, as
diferenças encontradas nas branches remotas e o que falta alinhar entre frentes.
O [OpenAPI versionável](openapi.json) permite gerar o cliente sem subir a API.

## Executar

Python 3.10 ou superior; validado com CPython 3.12 no Windows. Na raiz do repo:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe run.py
```

Em Linux/macOS, use `.venv/bin/python` nos dois últimos comandos.
O modo padrão funciona sem chave de IA e sem bibliotecas nativas de PDF.

- Swagger: <http://localhost:8000/docs>
- OpenAPI: <http://localhost:8000/openapi.json>
- SQLite: `src/backend/.local/suits.sqlite3`, ignorado pelo Git.
- CORS: `http://localhost:5173` e `http://127.0.0.1:5173`.

O arquivo `.env` na raiz é carregado sem substituir variáveis do processo.
Use `.env.example` na raiz como referência, preservando um `.env` já existente.
Para alterar as origens, defina `SUITS_CORS_ORIGINS` com valores separados por
vírgula. `SUITS_DATABASE_PATH` e `SUITS_ARTIFACTS_DIR` aceitam caminhos explícitos.

## Modos de operação

| Configuração | Padrão | Alternativas |
|---|---|---|
| `SUITS_DATA_MODE` | `artifacts` | `mock` mantém os exemplos da fase 1 |
| `SUITS_AI_MODE` | `local` | `openai` habilita o GPT-6 Astra |
| `SUITS_POLICY_MODE` | `unavailable` | `engine` conecta B1; `mock` somente com dados mock |
| `OPENAI_MODEL` | `gpt-6-astra` | Outro ID compatível com Responses, raciocínio e saídas estruturadas |
| `OPENAI_REASONING_EFFORT` | `low` | `medium`, `high`, `xhigh`, `max` |
| `OPENAI_MAX_OUTPUT_TOKENS` | `25000` | Limite conjunto de raciocínio e texto, entre 1 e 128000 |
| `OPENAI_TIMEOUT_SECONDS` | `120` | Timeout do SDK em segundos, finito e positivo |

`data_mode: artifacts` significa leitura dos dois ZIPs fornecidos pelo evento.
Os próprios PDFs se identificam como simulações do hackathon; `is_simulated: true`
preserva essa informação. A planilha de 60 mil casos não é carregada. Os nomes
das partes são extraídos dos documentos: o Banco UFMG citado nos autos não é
renomeado para acompanhar a marca visual do frontend.

O modo `local` faz extração, comparação e busca de trechos. Minutas usam modelos
editáveis e cenários organizam alegações e verificações. Ele não simula respostas
de um LLM. O modo `openai` usa `AsyncOpenAI`, Responses API e saídas estruturadas
com Pydantic. Cada resposta identifica `generation_mode`.

Para habilitar a IA, configure no ambiente local:

```dotenv
SUITS_AI_MODE=openai
OPENAI_MODEL=gpt-6-astra
OPENAI_REASONING_EFFORT=low
OPENAI_MAX_OUTPUT_TOKENS=25000
OPENAI_TIMEOUT_SECONDS=120
OPENAI_API_KEY=sua-chave-local
```

A presença da chave sozinha não ativa chamadas. O modo OpenAI envia o contexto
selecionado do caso e o histórico recente para a API, com `store=false`, timeout
de 120 segundos por tentativa e até uma repetição de transporte; o tempo total
pode superar 120 segundos. Referências desconhecidas, respostas inválidas e
gerações incompletas geram HTTP 502; conteúdo parcial não é persistido como uma
resposta concluída e não há troca silenciosa para conteúdo local.

A chamada usa `reasoning.effort=low`, conforme a orientação de migração de um
modelo sem raciocínio. O Astra não aceita `none` nem `minimal`; a configuração
recusa esses valores antes de chamar a API. O limite inicial de 25000 tokens
inclui raciocínio e texto gerado e pode ser ajustado após medir os casos do piloto.
É um teto por resposta, não uma reserva cobrada integralmente. O backend não envia
`temperature`, `top_p` ou parâmetros de logprobs, incompatíveis com o Astra.

Na migração de uma instalação existente, atualize `OPENAI_MODEL` no `.env` ou no
ambiente do processo: uma configuração explícita continua tendo precedência
sobre o novo padrão. Reinicie o servidor depois de alterar as variáveis.

Os testes automatizados usam o SDK com transporte HTTP simulado, sem requisição
externa. Antes da demonstração, valide o acesso ao modelo com uma chave da API e
avalie os dois casos documentados: fidelidade às fontes, lacunas reconhecidas,
qualidade das minutas, tempo de resposta e consumo de tokens. Os testes locais
não medem a qualidade nem confirmam a disponibilidade do modelo na conta.

Ao alternar entre os datasets `mock` e `artifacts`, use outro arquivo SQLite.
A inicialização recusa misturar datasets, pois os IDs 1 e 2 têm significados distintos.

## Casos e documentos

| Método | Rota | Uso |
|---|---|---|
| GET | `/api/cases` | Lista com `page`, `page_size`, `status`, `uf` |
| POST | `/api/cases` | Cadastro manual sem documentos |
| GET | `/api/cases/{case_id}` | Detalhe, flags, fatos extraídos e verificações |
| GET | `/api/cases/{case_id}/documents/{document_id}` | Texto por página e campos com fonte |
| GET | `/api/cases/{case_id}/documents/{document_id}/download` | Bytes do PDF original |

A paginação começa em 1, com tamanho padrão 20 e máximo 100. `total` conta os
resultados após filtros, antes da paginação. Status: `PENDENTE`, `EM_ANALISE`,
`CONCLUIDO`. UF aceita somente as 27 siglas brasileiras, incluindo `DF`, nos
filtros e no cadastro. Entradas em minúsculas são normalizadas para maiúsculas;
siglas inexistentes, como `ZZ` ou `BR`, retornam 422. O OpenAPI enumera os valores
válidos, conforme as [unidades da Federação do IBGE](https://www.ibge.gov.br/explica/codigos-dos-municipios.php).
Os documentos usam URLs relativas à API; o frontend deve prefixar sua base URL.

Os casos 1 e 2 têm, respectivamente, sete e quatro PDFs, somando 35 páginas.
Os arquivos são lidos dentro dos ZIPs, sem extrair caminhos no disco. Cada PDF
tem ID estável, SHA-256, número de páginas e status de extração. IDs de documento
são vinculados ao caso; um ID de outro caso retorna 404.

`facts` contém campos encontrados, valores e referências com documento, página
e trecho. `checks` compara CPF, nome do titular, número de contrato e valor
liberado, além de registrar lacunas documentais e a contestação de titularidade.
Uma comparação `consistent` significa concordância textual, sem atestar
autenticidade. Um campo não extraído permanece uma lacuna; PDFs sem texto
recebem status parcial e não passam por OCR nesta versão.

O cadastro manual retorna `data_mode: manual`, com flags de documentos falsas.
O valor da causa deve ser positivo, conforme o contrato de entrada do motor B1.
Importação de arquivos enviados pelo usuário não está implementada nesta etapa.

## Parecer, cenários e conversa

| Método | Rota | Corpo / finalidade |
|---|---|---|
| POST | `/api/analyze` | `{"case_id": 2}` |
| GET | `/api/cases/{case_id}/analysis` | Recuperar o último parecer salvo, sem gerar novamente |
| POST | `/api/scenarios` | `{"case_id": 2}` |
| POST | `/api/chat` | `case_id`, `message`, `session_id` opcional |
| GET | `/api/cases/{case_id}/chat/{session_id}` | Últimas 20 mensagens da conversa |
| GET | `/api/cases/{case_id}/chats` | Conversas salvas do caso, com `limit` e `offset` |
| POST | `/api/negotiation-copilot` | `case_id`, `proposed_amount` |

A análise retorna `analysis_id`, `case_version`, `policy`, `policy_status`,
`explanation`, `sources`, `document_checks`, `warnings`, `data_mode` e
`generation_mode`. Sem B1, `policy` é `null` e `policy_status` é `unavailable`.
Esse é um ajuste em relação ao mock da fase 1: a interface precisa tratar a
ausência de recomendação e de valores. `confidence_score`, quando disponível,
preserva o score original entre 0 e 1. O SPEC do master o define como probabilidade
de derrota, mas a B1 publicada usa confiança na recomendação em alguns caminhos.
O campo adicional `confidence_score_semantics` declara o significado: somente
`loss_probability` autoriza esse rótulo. Se o produtor não declarar o significado,
o retorno é `unspecified`, com aviso em `warnings`; não se calcula `1 - score`.

Ao reabrir um caso, consulte `GET /api/cases/{case_id}/analysis`. O envelope traz
`case_id`, `case_version`, `status` e `analysis`. `status: not_found` com
`analysis: null` significa que ainda não existe parecer; `available` indica um
parecer da versão atual; `stale` preserva um parecer histórico de outra versão.
Um parecer histórico não define a alçada atual. Essa consulta não chama IA nem
cria uma nova análise. `available` descreve a atualidade do parecer; a presença
de política continua indicada pelo `policy_status` dentro dele.

Com `SUITS_POLICY_MODE=engine`, o adaptador chama
`src.policy.engine.evaluate_case(case_data)` fora do event loop, enviando os
campos em português esperados por `CaseData`: `numero_processo`, `valor_causa`,
`sub_assunto`, `uf` e `subsidios` aninhados. A B1 calcula as features do modelo.
O adaptador traduz conclusões do dossiê para `CONFORME` ou `NAO_CONFORME`,
preservando a distinção entre ausência e documento sem conclusão extraída.
Conclusões conflitantes ou valor da causa não positivo geram 422; módulo ausente
ou resultado incompatível gera 503. O motor e suas dependências já estão
incorporados ao master; sua ativação continua explícita pela configuração.

O copiloto recebe somente trechos do caso, com documento e página. As mensagens
de uma conversa não podem ser consultadas usando outro caso. O histórico fica
no SQLite e sobrevive a reinícios; a resposta de chat é JSON, sem streaming.
`GET /api/cases/{case_id}/chats` permite recuperar os IDs das conversas mesmo
após recarregar a interface. A lista traz título extraído da primeira mensagem,
quantidade de mensagens, data de criação e última atualização; a conversa mais
recentemente atualizada vem primeiro. A busca do histórico continua vinculada
ao caso e ao `session_id`.
Os cenários deixam explícita a ausência de histórico validado de magistrados.

O prompt em `services/copilot.py` define o papel do copiloto jurídico do Enter OS.
Ele distingue a solicitação do usuário de instruções inseridas nos documentos,
separa alegações, registros e inferências e exige fontes que sustentem o texto.
Lacunas e divergências devem ser explicadas, sem transformar documento presente
em prova de autenticidade ou ausência de evidência em irregularidade. A política
fornecida é preservada e as minutas mantêm pendências para revisão do advogado.

O escopo do atendimento é delimitado no system prompt: o copiloto atende tarefas
jurídicas relacionadas ao processo e orientações sobre essas funções da plataforma.
Pedidos alheios recebem uma resposta breve de redirecionamento, sem desenvolver
o conteúdo solicitado nem associar fontes documentais à recusa. Pedidos mistos
recebem somente a parte pertinente; dúvidas ambíguas podem gerar uma pergunta
de esclarecimento. Falta de evidência em uma pergunta jurídica não é tratada
como assunto fora do escopo. O limite vale mesmo se o histórico já contiver
uma resposta inadequada ou houver uma tentativa de mudar as instruções.

Essa camada orienta o modelo; não é um bloqueio determinístico nem um classificador
separado. A cobertura automatizada verifica a entrega e a prioridade das instruções
e a preservação do histórico, com transporte simulado e sem chamadas pagas.
Antes de uso em produção, avaliar as respostas reais para pedidos alheios, mistos,
ambiguidades e tentativas de contorno, além de perguntas jurídicas legítimas.

A negociação compara o valor proposto com a última análise da versão atual do
caso. Sem política retorna `SEM_POLITICA`; sem faixa, `SEM_FAIXA`. A comparação
não cria acordo, aceite ou aprovação institucional.

## Minutas e exportação

| Método | Rota | Uso |
|---|---|---|
| POST | `/api/generate-draft` | `case_id`, `action`, `settlement_amount` para acordo |
| GET | `/api/drafts/{draft_id}` | Recuperar a minuta persistida |
| GET | `/api/cases/{case_id}/drafts` | Listar minutas salvas do caso, com `limit` e `offset` |
| POST | `/api/export-pdf` | `draft_id`, `format` opcional (`pdf` ou `html`) |

`action` aceita `DEFESA` ou `ACORDO`. Acordos exigem valor positivo com até duas
casas decimais. `format: whatsapp` na geração prepara uma mensagem de proposta
de acordo. O retorno preserva os campos de `DraftResponse` do SPEC e acrescenta
ID, fontes, modo e data. `attached_subsidies` contém os IDs dos subsídios de
referência; os PDFs originais são servidos separadamente.

Toda minuta tem status `review_required`; assinatura, concordância, termos
pendentes e teses não verificadas ficam para revisão. A exportação também
aceita `content_markdown` para gerar o arquivo com o texto editado pelo frontend,
preservando a versão original no SQLite. HTML bruto é escapado e imagens
externas não são carregadas.

As listas de conversas e minutas usam `items`, `total`, `limit`, `offset` e
`has_more`. O limite padrão é 20 e o máximo 100. Minutas vêm da mais recente
para a mais antiga; a lista contém resumos, e o conteúdo completo é recuperado
pelo `draft_id`. Casos existentes sem histórico retornam listas vazias; casos
inexistentes retornam 404. A paginação não constitui um snapshot entre requisições:
ao atualizar a lista durante novos registros, deduplique pelos IDs.

O exportador usa ReportLab, já incluído nas dependências normais, com fonte
incorporada, cabeçalho e paginação. Não exige WeasyPrint, Pango ou instalação
adicional do sistema. `X-PDF-Engine` retorna `reportlab`. Ambos os cabeçalhos
`X-PDF-Engine` e `Content-Disposition` ficam expostos ao frontend por CORS.
O formato HTML continua disponível para impressão. Para a interface, o fluxo é
uma requisição a `/api/export-pdf` e o download do arquivo retornado, sem
biblioteca adicional de geração de PDF no frontend.

## Decisões, concorrência e integração com B4

`POST /api/decisions` registra a decisão e conclui o caso numa transação:

```json
{
  "case_id": 2,
  "action": "ACORDO",
  "settlement_amount": 2500.00,
  "lawyer_id": "adv-demo",
  "law_firm_id": "escritorio-demo",
  "expected_case_version": 0,
  "analysis_id": null,
  "override_reason": null,
  "idempotency_key": "7cf332af-5447-4a03-8cba-1c5ea584f74b"
}
```

Use a `version` retornada pelo detalhe e gere uma chave por tentativa lógica
(`crypto.randomUUID()` no navegador), reutilizando-a somente em repetições do
mesmo envio. Duas decisões concorrentes não se sobrescrevem: a segunda recebe
409. Repetir a mesma chave e os mesmos dados retorna o registro existente.

Se houver uma análise, a decisão registra sua cópia. Divergir da recomendação
ou exceder o teto requer `override_reason`. Sem política, `is_override` fica
`null`; uma decisão manual não entra implicitamente como aderente. Registros
fechados não são reabertos ou substituídos por esta API.

`GET /api/decisions?case_id=2&limit=200&offset=0` fornece registros paginados,
com decisão, dados informados pelo advogado e snapshot da análise para B4.
O envelope mantém `items` e `limit` e acrescenta `total`, `offset` e `has_more`.
Use a paginação até `has_more: false`; a ordem é da decisão mais recente para a
mais antiga. Consulte as limitações de atualização concorrente no contrato.

- `/api/monitoring/overview`: contagens operacionais do SQLite. Aderência, economia
  e tempo médio ficam `null`, com `metrics_status: partial`, até a integração.
- `/api/monitoring/adherence` e `/effectiveness`: contrato pendente explícito,
  com `status: pending_integration`; não preenchem métricas A/E fictícias.
- `/api/monitoring/subsidies`: inventário de documentos ausentes por tipo.

O seletor Advogado/Banco definido no commit `b18269a` pertence ao frontend.
Esta execução local do hackathon ainda não implementa autenticação e autorização
de produção; `lawyer_id` e `law_firm_id` são identificadores informados na requisição.

## Erros e testes

404 indica recurso inexistente; 409, duplicidade ou versão desatualizada;
422, entrada inválida ou justificativa necessária; 502, falha da IA;
503, indisponibilidade do motor. `detail` pode ser texto para erros de negócio
ou lista de campos para erros de validação do FastAPI.

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

Os testes cobrem os mocks originais, PDFs dos ZIPs, fontes, histórico após
reinício, isolamento por caso, idempotência, decisões concorrentes, negociação,
exportação segura e contrato do SDK OpenAI por transporte simulado.
Também cobrem a recuperação do parecer e das listas ao reabrir casos, pareceres
desatualizados e execução do PDF sem WeasyPrint, Pango ou importação de B1/B4.
O contrato inclui os parâmetros do Astra, saídas com itens de raciocínio,
recusa de respostas incompletas e validação das configurações de geração.
Eles usam bancos temporários e não precisam de chave ou rede.

A integração OpenAI segue a documentação de
[saídas estruturadas](https://developers.openai.com/api/docs/guides/structured-outputs)
e o [guia de migração do GPT-6 Astra](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6-astra#migration-quickstart).
O orçamento inicial de tokens segue a orientação de
[espaço para raciocínio](https://developers.openai.com/api/docs/guides/reasoning#allocating-space-for-reasoning).
O `run.py` compartilhado já inicia `src.backend.main:app` e carrega o `.env`
da raiz antes de ler `API_HOST`, `API_PORT` e `APP_ENV`. Variáveis do processo
têm precedência. O próximo checkpoint alinha a semântica do score da B1,
os indicadores operacionais da B4 e o frontend B3.

Ao alterar um DTO ou rota, regenere `src/backend/openapi.json` na raiz do repositório:

```powershell
python -B -m src.backend.export_openapi
```

O teste de contrato detecta diferenças entre o arquivo e o OpenAPI da aplicação.
Os testes de contrato com o código de B1 do próprio repositório estão descritos em
[INTEGRATION.md](INTEGRATION.md#reproduzir-a-verificacao).
