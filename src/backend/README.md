# Backend — branch 2

Primeira entrega de `feature/backend-api-copilot`, seguindo a fase 1 de
[`ROADMAP.md`](../artefacts/suits_docs/ROADMAP.md) e os contratos de
[`SPEC.md`](../artefacts/suits_docs/SPEC.md). O servidor FastAPI publica as quatro
rotas iniciais e o Swagger para a integração do frontend.

Os dois casos `DEMO-001` e `DEMO-002` são inteiramente fictícios. Toda resposta de
dados contém `data_mode: "mock"`. Esta etapa não lê a planilha, não extrai os ZIPs,
não chama a OpenAI e não persiste decisões. As probabilidades e faixas de acordo
são exemplos fixos para a interface; não representam um modelo validado.

## Executar

Python 3.10 ou superior; validado com CPython 3.12 no Windows. Execute a partir da
raiz do repositório, na cópia de trabalho desta branch.

PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Linux/macOS:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements-dev.txt
.venv/bin/python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

- Swagger: <http://localhost:8000/docs>
- Contrato OpenAPI: <http://localhost:8000/openapi.json>
- Contrato disponível no repositório: [`openapi.json`](openapi.json).
- Apenas dependências de execução: `backend/requirements.txt`.

O CORS libera por padrão `http://localhost:5173` e `http://127.0.0.1:5173`, as
origens de desenvolvimento do Vite. Para trocar as origens, defina a variável
antes de iniciar o servidor; cada origem é separada por vírgula:

```powershell
$env:SUITS_CORS_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
```

Nesta fase a configuração usa variáveis do processo; arquivos `.env` não são
carregados automaticamente. Nenhuma chave de API é necessária para os mocks.

## Contratos para a pessoa 3

| Método | Rota | Entrada | Resposta |
|---|---|---|---|
| GET | `/api/cases` | `page`, `page_size`, `status`, `uf` opcionais | `CaseListResponse` |
| GET | `/api/cases/{case_id}` | ID inteiro positivo | `CaseDetail` |
| POST | `/api/analyze` | JSON `{"case_id": 1}` | `AnalyzeResponse` |
| GET | `/api/monitoring/overview` | Sem parâmetros | `MonitoringOverviewResponse` |

O Swagger descreve os campos, tipos e exemplos. As rotas futuras não são
publicadas até que seus serviços estejam implementados.

**Lista:** `items`, `total`, `page`, `page_size`, `total_pages`, `data_mode`.
Paginação começa em 1, tamanho padrão 20 e máximo 100. `total` é a quantidade
após os filtros e antes da paginação. Uma página além do fim retorna `items: []`
com o total preservado; nenhum resultado retorna `total_pages: 0`.

Os filtros são combinados. `status` aceita `PENDENTE`, `EM_ANALISE` ou `CONCLUIDO`;
`uf` aceita somente as 27 UFs brasileiras, incluindo DF, sem diferenciar
maiúsculas e minúsculas. `ZZ` e `BR` retornam 422. O OpenAPI enumera as siglas.
A lista traz
identificação, UF, subassunto, valor da causa, status, recomendação, nível de risco
e as seis flags de subsídios. O detalhe acrescenta `claims` e `documents`.

**Documentos:** `category` distingue `AUTOS` de `SUBSIDIO`. `text_excerpt` contém
texto sintético. `download_url` é `null`: o frontend deve desabilitar downloads
sem URL. As flags indicam presença simulada; não atestam validade do documento.

**Análise:** `case_id`, `policy`, `policy_status`, `explanation`, `warnings`, `data_mode`. O objeto
`policy` preserva os nomes do contrato da branch 1:

```json
{
  "recommendation": "ACORDO",
  "reasoning_code": "POWER_PAIR_AUSENTE",
  "confidence_score": 0.8,
  "confidence_score_semantics": "loss_probability",
  "risk_level": "ALTO",
  "settlement_pricing": {
    "floor": 1500.0,
    "target": 2500.0,
    "ceiling": 4000.0,
    "expected_loss": 6000.0
  },
  "applied_rules": ["MOCK: exemplo de resposta com faixa de negociação."]
}
```

O SPEC do master define `confidence_score` como probabilidade de derrota, mas
o motor publicado pela B1 usa confiança na recomendação em alguns caminhos.
O contrato acrescenta `confidence_score_semantics`: somente `loss_probability`
autoriza o rótulo de probabilidade de derrota. `recommendation_confidence`
indica confiança na recomendação e `unspecified` indica significado não declarado.
Nunca inverter ou reinterpretar o score a partir de `recommendation`.
Os mocks marcam seus números fictícios com `loss_probability`; ainda não há
chamada ao motor. O enum de `reasoning_code` aceita os códigos publicados pela
B1, incluindo `FALHA_PROBATORIA` e `USUFRUTO_COMPROVADO`, e mantém os exemplos
do SPEC. Valores monetários estão em reais. O exemplo de defesa tem
`settlement_pricing: null`.
Solicitar uma análise não altera o status do caso.

`policy_status` identifica `mock`, `available` ou `unavailable`. O contrato
aceita `policy: null` para que a interface trate a indisponibilidade desde a
fundação. O serviço atual sempre devolve a política fictícia com status `mock`.

**Monitoramento:** mantém os seis campos definidos no `SPEC.md`, acrescentando
`data_mode` e `metrics_status`. `adherence_rate` é uma fração de 0 a 1. O total corresponde aos dois
casos fictícios; os demais indicadores permanecem zerados como placeholders,
pois ainda não há decisões registradas ou integração com a branch 4.
`metrics_status` é `mock` nesta fase; `partial` e `available` ficam previstos
para a integração. Aderência, economia e tempo médio aceitam `null` quando
indisponíveis: a interface deve diferenciar ausência de dados de zero medido.
O DTO já enumera os futuros modos `artifacts`, `manual` e `real`, mas esta
implementação usa exclusivamente `mock`.

**Erros:** caso inexistente retorna HTTP 404 com
`{"detail": "Caso não encontrado."}`. Entradas inválidas retornam HTTP 422 com
o formato padrão de validação do FastAPI. O corpo de `/api/analyze` aceita apenas
`case_id`; campos adicionais são rejeitados para detectar divergências de contrato.

Exemplo no frontend:

```javascript
const API = "http://localhost:8000";
const listResponse = await fetch(`${API}/api/cases?page=1&page_size=20`);
if (!listResponse.ok) throw new Error("Falha ao carregar casos");
const cases = await listResponse.json();

const analysisResponse = await fetch(`${API}/api/analyze`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ case_id: 2 }),
});
if (!analysisResponse.ok) throw new Error("Falha ao analisar caso");
const analysis = await analysisResponse.json();
```

## Integração com as outras branches

Toda a implementação desta frente está em `backend/`, inclusive os testes e as
dependências. Os serviços são assíncronos e substituíveis em `dependencies.py`;
suas interfaces estão em `services/contracts.py`.

- **Pessoa 1:** integrar `src/policy/engine.py::evaluate_case(case_data)` dentro do
  serviço de análise. O DTO HTTP `PolicyResult` preserva os campos centrais do
  `SPEC.md` e explicita a semântica do score. O motor publicado espera
  `numero_processo`, `valor_causa`, `uf`, `sub_assunto` e `subsidios` em português;
  será necessário um adaptador na integração. A inferência
  síncrona deve executar fora do event loop, e o parecer deve refletir o resultado
  do motor. Os mocks não implementam regras ou treinam modelos.
- **Pessoa 3:** consumir os contratos publicados em `/openapi.json`, mostrar o modo
  de demonstração e tratar erros 404/422. Os casos de demonstração exercitam uma
  defesa e um acordo, além de duas UFs e dois status.
- **Pessoa 4:** fornecer os resultados analíticos pelo serviço de monitoramento,
  preservando os campos e as unidades do DTO. Os indicadores atuais não medem
  economia ou aderência reais. O JSON publicado pela B4 inclui resultados de
  simulação e taxas como `85.8`; o HTTP da B2 usa fração, por exemplo `0.858`.
  A origem dos dados, os nomes dos campos e as unidades exigem alinhamento antes
  de substituir o mock.

A configuração atual instancia explicitamente os três serviços mock. Não há
troca automática de modo pela presença de módulos ou chaves: a integração real
deve ser feita em conjunto com seus testes e com a indicação correta de origem.

Referências verificadas: master `b18269a`, B1 `2529d7c` (mesmo código de motor
de `365e9a3`) e B4 `239bae6`. Esses alinhamentos registram divergências observadas;
a integração real com B1/B4 e os testes com o frontend serão entregues depois.

## Testes

Na raiz do repositório:

```powershell
.\.venv\Scripts\python.exe -m pytest -c backend/pytest.ini -q
```

Os testes cobrem paginação, filtros combinados, detalhes, erros 404/422,
contratos de análise e monitoramento, substituição dos serviços, CORS e OpenAPI.
Não precisam de acesso à rede, banco de dados, planilha ou chave da OpenAI.

Depois de alterar rotas ou schemas, regenere o arquivo OpenAPI antes dos testes:

```powershell
python -B -m backend.export_openapi
```

O teste compara o contrato salvo com o OpenAPI da aplicação e verifica que
somente as quatro rotas desta fase estão publicadas.

## Próxima entrega da branch 2

Seguir a fase 2 do roadmap: extração dos documentos dos casos 01 e 02,
persistência SQLite, cenários, chat jurídico, minutas, PDF e registro de decisões.
A integração com o motor da pessoa 1 e as métricas da pessoa 4 ocorre nos
checkpoints seguintes. O orquestrador compartilhado `run.py` ainda será integrado;
por enquanto o comando Uvicorn acima inicia este backend de forma independente.
