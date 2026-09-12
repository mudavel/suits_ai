# Contrato de integração — backend B2

Verificação de 12/09/2026, com leitura dos commits remotos abaixo. Este documento
registra o contrato implementado pela B2 e as pendências que exigem alinhamento
com as outras frentes; não representa um acordo já aprovado por todos.

| Frente | Referência inspecionada | Resultado |
|---|---|---|
| Base | `origin/master` — `bb43897` | PRs de B1/B2/B4 incorporados e estrutura unificada |
| B1 | `src/policy/` no master `bb43897` | Regras e score preservados; loader aponta para `artefacts/suits_docs/` |
| B2 | `feature/backend-api-copilot`, base `bb43897` | Fase 2 local em `src/backend/`, testes em `tests/`, dependências na raiz |
| B3 | `origin/frontend` — `43fe8e0` | Branch publicada; serviço HTTP inspecionado, execução conjunta ainda pendente |
| B4 | `src/monitor/` no master `bb43897` | Módulo e testes incorporados; contrato operacional ainda pendente |

## Fontes do contrato

- O contrato HTTP executável está em [`schemas.py`](schemas.py), nos routers e
  no [`openapi.json`](openapi.json), gerado pela própria aplicação.
- A B1 é responsável por [`CaseData`, `PolicyResult` e regras](../policy/schemas.py).
- A B4 é responsável pelos [DTOs de governança](../monitor/schemas.py).
- O [SPEC do master](../../SPEC.md)
  define os campos iniciais. As diferenças efetivas estão descritas aqui para
  impedir que mocks ou exemplos sejam confundidos com o contrato final.

## B1 → B2: motor de política

O endpoint real recebe `POST /api/analyze` com `{"case_id": 1}`. A B2 carrega o
caso persistido e chama `src.policy.engine.evaluate_case` fora do event loop.
O script `scripts/simulate_api_integration.py` da B1 cria uma aplicação de
exemplo que recebe `CaseData` diretamente e devolve `PolicyResult` sem envelope.
Essa aplicação de exemplo tem contrato HTTP diferente do backend B2.

[`services/policy_adapter.py`](services/policy_adapter.py) traduz a entrada:

| B2 | Entrada enviada à B1 |
|---|---|
| `case_number` | `numero_processo` |
| `cause_value` | `valor_causa`, positivo, sem substituir por valor padrão |
| `uf`, `sub_issue` | `uf`, `sub_assunto` |
| assunto não disponível | `assunto: null` |
| `has_contract` | `subsidios.contrato` |
| `has_statement` | `subsidios.extrato` |
| `has_credit_receipt` | `subsidios.comprovante_credito` |
| `has_debt_evolution` | `subsidios.demonstrativo_divida` |
| `has_referenced_report` | `subsidios.laudo_referenciado` |
| fato `dossier_conformity` em documento `DOSSIE` | `CONFORMIDADE` → `CONFORME`; `NÃO CONFORMIDADE` → `NAO_CONFORME` |
| dossiê ausente | `subsidios.dossie: "AUSENTE"` |
| dossiê presente sem conclusão inequívoca | `subsidios.dossie: null` e aviso |
| ID, versão e origem do caso | `metadata.case_id`, `case_version`, `data_mode`, `is_simulated` |

Conclusões conflitantes impedem a chamada com 422. A presença do dossiê não
equivale a parecer conforme. A B1 atual trata `null` como ausência de conclusão
no cálculo; essa limitação fica explícita no aviso. Extração, normalização e
presença de PDF não autenticam o documento. A transformação logarítmica do
valor e a montagem das features pertencem ao motor.

Antes da correção, a B1 ignorava os campos em inglês: os dois casos documentais,
com valores de R$ 20.000 e R$ 25.000, eram normalizados como R$ 10.000 e todos os
subsídios ficavam falsos. O resultado `FALHA_PROBATORIA` ainda era rejeitado pela
B2. O adaptador corrigido preserva os dados e aceita todos os códigos do enum
publicado pela B1, mantendo `POWER_PAIR_AUSENTE` para dados antigos e mocks.

### Pendência: significado de confidence_score

O SPEC do master descreve `confidence_score` como P(derrota). No motor publicado:

| Caminho | Score devolvido | Interpretação observada no código |
|---|---|---|
| Cadeia completa | `0.95`, `DEFESA`, risco `BAIXO` | Confiança na defesa |
| Um documento crítico | `0.90`, `ACORDO` | Pricing usa P(derrota) `0.82` |
| Nenhum crítico | `0.97`, `ACORDO` | Pricing usa P(derrota) `0.98` |
| Zona cinzenta, defesa | `1 - P(derrota)`, arredondado | Confiança na defesa |
| Zona cinzenta, acordo | `P(derrota)`, arredondado | Probabilidade usada para recomendar acordo |

Não existe conversão universal segura de `confidence_score` para P(derrota).
A B2 preserva score, recomendação, regras e pricing recebidos. O campo adicional
`confidence_score_semantics` usa `loss_probability`, `recommendation_confidence`
ou `unspecified`. Quando o produtor não envia a semântica, inclusive em análises
antigas, fica `unspecified`; o copiloto e a UI não devem rotular esse número como
probabilidade de derrota. Os mocks identificam explicitamente valores fictícios.

**Checkpoint B1/B2/B3:** definir uma probabilidade de derrota consistente e
declarada pelo motor, ou concordar em exibir confiança na recomendação como outro
conceito. Não ajustar números, pricing ou regras na camada HTTP para esconder
essa divergência. A B1 permanece desativada por padrão (`SUITS_POLICY_MODE=unavailable`).
`policy_status: available` significa que uma chamada retornou um DTO válido;
não significa que o score foi validado como probabilidade ou que o ML foi usado.
O motor pode executar regras determinísticas ou seu fallback interno.

As justificativas em `applied_rules` são declarações do motor. Algumas afirmam
autenticidade, fraude ou taxas históricas; não são verificações documentais da B2.
O copiloto deve atribuí-las ao motor. A revisão dessas justificativas e a
comprovação das estatísticas cabem à frente responsável antes da apresentação.

## B2 → B3: contrato HTTP

Todas as rotas previstas para a B2 no SPEC existem. A lista abaixo destaca os
pontos que o frontend precisa respeitar; tipos completos estão no OpenAPI.

Em `origin/frontend` (`43fe8e0`), `frontend/src/services/api.js` consulta as rotas
`/api/cases` e `/api/cases/{id}`, preservadas por esta migração. O serviço retorna
o JSON bruto em `data`; a lista da B2 contém `items` e os campos usam snake_case,
enquanto os mocks da UI usam array e camelCase. A B3 precisa mapear o contrato
e distinguir o fallback de demonstração dos dados da API. Esta revisão não
altera a branch do frontend nem comprova o funcionamento conjunto da interface.

| Operação | Contrato implementado |
|---|---|
| `GET /api/cases` | Envelope `items`, `total`, `page`, `page_size`, `total_pages`, `data_mode`; não é um array direto |
| `GET /api/cases/{case_id}` | Detalhe com `version`, documentos, fontes, flags e `is_simulated` |
| `POST /api/analyze` | Entrada `{case_id}`; saída `AnalyzeResponse` com política aninhada, ID e versão da análise |
| `GET /api/cases/{case_id}/analysis` | Último parecer salvo; envelope `case_id`, `case_version`, `status` (`available`, `stale`, `not_found`) e `analysis` anulável |
| `POST /api/scenarios` | Entrada `{case_id}`; `author_arguments`, `defense_arguments`, `judicial_outlook`, `limitations`; sem histórico de juízes disponível |
| `POST /api/chat` | `case_id`, `message`, `session_id` opcional; resposta JSON única com `answer`, `sources`, `session_id` |
| Histórico do chat | Últimas 20 mensagens ordenadas da mais antiga para a mais recente; conversa vinculada ao caso |
| `GET /api/cases/{case_id}/chats` | Lista paginada dos IDs e resumos das conversas, ordenada pela última atualização |
| `POST /api/generate-draft` | `case_id`, `action`, `settlement_amount` se acordo; `format` opcional `formal` ou `whatsapp`; sucesso 201 |
| `POST /api/export-pdf` | `draft_id`, `format` opcional `pdf`/`html`, `content_markdown` opcional; resposta binária PDF ou HTML |
| `GET /api/cases/{case_id}/drafts` | Lista paginada de resumos; recuperar o conteúdo pelo `GET /api/drafts/{draft_id}` |
| `POST /api/negotiation-copilot` | `case_id`, `proposed_amount`; ausência de política/faixa retorna `SEM_POLITICA`/`SEM_FAIXA` |
| `POST /api/decisions` | Registro com advogado, escritório, versão esperada e chave de idempotência; sucesso 201 |

Campos centrais de `DraftRequest`, `DraftResponse` e `MonitoringOverviewResponse`
do SPEC foram preservados. As seguintes validações/extensões precisam chegar à UI:

- IDs de casos são inteiros positivos; IDs de documentos são strings; IDs de
  conversa, minuta, análise e decisão são UUIDs. Datas usam ISO 8601 com fuso.
- UF aceita as 27 siglas brasileiras, incluindo DF; minúsculas são normalizadas.
  `ZZ` e `BR` retornam 422. Valores monetários são números em reais. Acordos e
  contrapropostas aceitam até duas casas decimais; acordos exigem valor positivo.
- `recommendation`, `risk_level`, `policy` e `settlement_pricing` podem ser `null`.
  Aderência, economia e tempo médio também são anuláveis enquanto indisponíveis.
  A UI deve exibir ausência de dados e considerar `metrics_status` e `policy_status`.
- Taxas do overview HTTP são frações entre 0 e 1; a UI multiplica por 100 apenas
  para exibição. `confidence_score` exige a semântica descrita na seção anterior.
- `data_mode` identifica `mock`, `artifacts`, `manual` ou `real` no DTO; esta
  inicialização suporta `mock`/`artifacts`, com cadastro manual separado. O XLSX
  não é carregado. Os PDFs de demonstração preservam `is_simulated: true`.
- Minutas retornam `status: review_required`. `attached_subsidies` contém IDs,
  não bytes incorporados. PDFs originais usam `download_url` relativa à base da
  API. Exportação retorna um arquivo, e não JSON com uma URL.
- Use `version` do caso como `expected_case_version`. Gere uma chave UUID por
  decisão lógica e reutilize-a em retries. Versão desatualizada, novo envio para
  caso concluído ou reaproveitamento indevido de chave retornam 409. Sem política,
  `is_override` é `null`; divergência ou valor acima do teto exige justificativa.
- Erros usam `detail`: texto nos erros de negócio e lista na validação FastAPI.
  Trate 404, 409, 422, 502 e 503; verifique status e Content-Type antes de ler
  exportação como blob.
- CORS autoriza `localhost:5173` e `127.0.0.1:5173` por padrão. Os cabeçalhos
  `Content-Disposition` e `X-PDF-Engine` são expostos. Portas diferentes exigem
  configurar `SUITS_CORS_ORIGINS`.

Ao reabrir o workspace, recupere o parecer e as listas pelo ID do caso. Essas
rotas não geram conteúdo nem chamam IA. Para conversas/minutas, o envelope é
`items`, `total`, `limit`, `offset`, `has_more`; limite padrão 20 e máximo 100.
Um caso existente sem histórico retorna lista vazia ou `status: not_found` para
o parecer; caso inexistente retorna 404. Parecer `stale` é histórico e não deve
definir a alçada atual. `status: available` indica a versão do parecer, sem
substituir `policy_status`, que identifica se existe política nele.

O seletor de perfil da interface não implementa autenticação/autorização no
backend. O chat não usa SSE/streaming. O motor OpenAI foi atualizado para Astra,
e o PDF usa somente ReportLab, mantendo a resposta HTTP e os cabeçalhos expostos
por CORS. Pango e WeasyPrint foram retirados da instalação da segunda fase.

## B2 ↔ B4: decisões e indicadores

`GET /api/decisions?limit=200&offset=0&case_id=2` é o feed de decisões; `case_id`
é opcional, `limit` vai de 1 a 200 e `offset` começa em zero. O retorno inclui
`items`, `total`, `limit`, `offset`, `has_more`. Cada item preserva `decision`,
`registration` e o snapshot `analysis`, que pode ser `null`. A B4 deve excluir
decisões sem recomendação do denominador de aderência, conforme a regra acordada
pela equipe, e não tratá-las automaticamente como aderentes ou overrides.

A ordem é decrescente por data com desempate estável. A leitura de uma página
e seu total usa a mesma transação, mas várias requisições não formam um snapshot
único: com novas decisões simultâneas, o consumidor precisa deduplicar por
`decision_id` e repetir a coleta, ou definir um corte de extração com a B2.

As rotas têm métodos de serviço separados: `overview`, `adherence`,
`effectiveness` e `subsidies`, substituíveis por `get_monitoring_service`.
No estado atual, overview traz contagens do SQLite; aderência/efetividade trazem
`status: pending_integration`; subsídios trazem inventário documental tipado.
Esses placeholders ainda não são os DTOs completos A01–A20/E01–E20.

O snapshot `data/governance_metrics.json` inspecionado em `239bae6` apresentou as
divergências abaixo. Em `db0ad69`, a B4 removeu os JSONs versionados e passou a
publicar CSVs de escritórios, motivos de override, sensibilidade e subsídios.
O gerador mantém as unidades e o summary anteriores; mudar o formato de arquivo
não resolve essas diferenças de contrato:

| Divergência observada | Alinhamento necessário |
|---|---|
| JSON tem `overview`, `counterfactual_simulation`, `law_firms_adherence`, `override_reasons`, `subsidies_diagnostic` | Escolher DTO final e adaptar ou corrigir o produtor; o JSON não valida como `GovernanceOverview` da própria B4 |
| `overview.global_adherence_rate = 85.8` | Mapear para `adherence_rate = 0.858` no HTTP da B2 |
| Várias taxas estão em 0–100; `acceptance_rate` usa 0–1 | Declarar a unidade de cada campo; não dividir todos os números indiscriminadamente |
| Ausência de `avg_negotiation_time_days` | Manter `null` até existir fonte e definição; não preencher com zero |
| Campos de diagnóstico com nomes distintos dos schemas B4 | Alinhar `fully_documented_cases_rate`/`fully_documented_rate` e `missing_both_power_pair_rate`/`zero_critical_docs_rate`, que também podem ter definições diferentes |
| Advogados, escritórios, overrides e aceite atribuídos pelo gerador | Identificar como simulação; não misturar com decisões operacionais do SQLite |
| Agregado de 60 mil linhas versus os casos efetivamente carregados na API | Declarar dataset, origem, período e denominador por indicador |

**Checkpoint B4/B2/B3:** publicar funções/DTOs operacionais para cada indicador,
unidades e proveniência dos dados. A B2 adapta o transporte após esse acordo.
O JSON de simulação não é servido como métrica operacional; a análise do XLSX
permanece em standby. Não foi executado o gerador da B4 nesta verificação nem
carregado o novo CSV bruto dos 60 mil casos.

Na revisão `db0ad69`, o script ainda passa `data/governance_metrics.json` como
argumento ao gerador, enquanto o gerador escolhe diretório com `os.path.isfile`.
Como o arquivo foi removido, uma execução limpa passa a tratar esse caminho como
diretório e pode gravar os CSVs dentro de `data/governance_metrics.json/`, em vez
de `data/`. A B4 precisa alinhar esse argumento; `governance_overview.csv` também
não está entre os arquivos publicados nessa revisão. Não é possível conectar
o overview operacional somente lendo os arquivos atuais.

## Reproduzir a verificação

Na raiz do projeto, com o ambiente virtual ativo:

```powershell
python -m pip install -r requirements.txt
python -B -m src.backend.export_openapi
python -B -m pytest -q
```

A suíte unificada encontra os testes em `tests/`. Os testes de contrato da B2
usam `src.policy` do próprio repositório, sem exigir uma cópia da B1 nem uma
variável de ambiente extra. Para executar somente esse grupo:

```powershell
python -B -m pytest -q tests/test_contracts.py
```

Esse grupo usa normalização, regras e pricing da B1 nos casos documentados e
num dossiê não conforme. Nos caminhos de zona cinzenta, substitui somente o
predictor por probabilidades controladas para conferir o vetor e o resultado;
esses testes de contrato não carregam o pickle. A suíte própria de B1, incluída
na execução completa, também exercita o loader do modelo publicado. Nenhum
desses testes treina o modelo ou avalia sua acurácia na base de 60 mil casos.

Os testes da B2 usam bancos temporários e transporte OpenAI simulado. A
configuração `SUITS_TEST_ARTIFACTS_DIR` permite apontar para os dois ZIPs quando
os documentos estão em outro diretório. Os testes não fazem chamadas pagas.

## Estrutura e sincronização

A base desta branch foi avançada para `bb43897` do master. A segunda fase foi
reaplicada em `src/backend/`, com os testes em `tests/`, OpenAPI em
`src/backend/openapi.json` e dependências no `requirements.txt` unificado.
`python run.py` inicia a API; o `.env` permanece na raiz. Instalações existentes
devem preservar seu `SUITS_DATABASE_PATH`. Se usavam o caminho padrão antigo,
configure-o explicitamente antes de iniciar para manter o histórico existente.

As alterações compartilhadas desta migração abrangem `requirements.txt`,
`.env.example`, `.gitignore`, `SETUP.md` e o carregamento de configuração no
`run.py`. Regras da B1, indicadores da B4, scripts de dados e código do frontend
continuam nas frentes responsáveis. O PR #3 incorporou apenas a fase 1; as
alterações da segunda fase continuam locais até sua publicação.
