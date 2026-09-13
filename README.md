# Enter OS — Suits AI

HACKATHON UNICAMP 2026 · Enter AI Challenge · Grupo 9 · 12 de setembro de 2026

Assistente de operação jurídica para apoiar a escolha entre **defesa e acordo** em processos de não reconhecimento de contratação de empréstimos. A solução reúne documentos, política de decisão, faixa de negociação, copiloto jurídico e revisão de minutas, com registro da decisão do advogado e uma área de governança para o banco.

## Apresentação

- [Slides da apresentação](https://canva.link/nutqxnvmze1lbc1)
- [Roteiro do vídeo](artefacts/suits_docs/video_script.md) — link da gravação ainda não informado.
- [Arquitetura da solução e diagramas](docs/architecture.md)
- [Relatório exploratório da base histórica](artefacts/suits_docs/report.html) — abra o HTML no navegador após clonar o repositório.

## Contexto e problema

O desafio da Enter propõe uma operação jurídica assistida por IA para processos cíveis massificados. No cenário do Banco Unicamp, cerca de um terço das ações recebidas mensalmente envolve autores que alegam não reconhecer a contratação de um empréstimo.

O banco precisa decidir quando se defender e quando propor acordo, definir valores de negociação e acompanhar tanto a aderência dos escritórios à política quanto seus resultados. O projeto combina a base histórica fornecida pelo evento, com 60 mil processos, e dois casos documentados para demonstrar esse fluxo.

## A solução

O trabalho do advogado segue **Processos → Parecer → Encaminhamento e minuta → Conclusão**, com consulta a documentos e copiloto durante a análise.

1. **Consultar o processo:** visualizar autos e subsídios, texto por página, fatos extraídos e divergências documentais.
2. **Gerar o parecer:** reunir o resumo do processo, os argumentos das partes e a fundamentação da política, mantendo referências aos documentos.
3. **Definir o encaminhamento:** escolher defesa ou acordo e, quando houver faixa calculada, consultar piso, alvo, teto e perda esperada. Divergências da política e valores acima do teto exigem justificativa.
4. **Revisar a minuta:** gerar a peça a partir do parecer e do encaminhamento, editar o conteúdo e exportar em PDF.
5. **Concluir:** registrar a decisão, o advogado, o escritório e o texto exato revisado, preservando o histórico.

Na área do banco, a **Governança** oferece consulta paginada à base histórica, diagnóstico de disponibilidade de subsídios e uma visão demonstrativa de aderência por advogado e escritório.

### Política de decisão

O [motor de política](src/policy/engine.py) aplica regras em ordem:

| Condição | Encaminhamento calculado |
|---|---|
| Dossiê classificado como `NAO_CONFORME` | Acordo, com prioridade sobre as demais regras |
| Três documentos críticos presentes: contrato, extrato e comprovante de crédito | Defesa |
| Zero ou um documento crítico presente | Acordo |
| Dois documentos críticos presentes | Random Forest calibrado; acordo quando a probabilidade estimada de derrota é igual ou superior a 40% |

Para recomendações de acordo, o [módulo de precificação](src/policy/pricing.py) calcula a perda esperada e os valores de negociação com parâmetros de valor da causa, risco e UF. São estimativas da política implementada. O campo `confidence_score_semantics` distingue confiança na recomendação de probabilidade de derrota; os dois conceitos não são intercambiáveis.

O artefato do modelo está versionado em `artefacts/suits_docs/modelo_jurimetrico.pkl`. Se não puder ser carregado ou a predição falhar, o motor usa uma estimativa de contingência e registra isso na fundamentação. O copiloto recebe a política calculada como contexto para a redação.

## Como executar

### Pré-requisitos

- Python **3.12**, versão usada na validação local registrada na documentação do backend.
- Node.js **22.12 ou superior** e npm, atendendo aos requisitos das ferramentas do frontend no lockfile.
- Git e os arquivos de `artefacts/Hackaton Unicamp/`, incluídos no repositório.
- Para geração com OpenAI: chave configurada no backend e acesso ao modelo definido no ambiente. A execução local dispensa chave.

Os comandos abaixo partem da raiz do repositório `suits_ai`.

### 1. Obter o código e instalar as dependências

```bash
git clone https://github.com/mudavel/suits_ai.git
cd suits_ai
python -m venv .venv
```

No Windows/PowerShell:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm --prefix src/frontend ci
```

No Linux/macOS:

```bash
.venv/bin/python -m pip install -r requirements.txt
test -f .env || cp .env.example .env
npm --prefix src/frontend ci
```

### 2. Configurar a demonstração

O [`.env.example`](.env.example) usa documentos do evento e geração local, com a política desativada. Para demonstrar também a recomendação e a precificação, ajuste estas linhas no `.env`:

```dotenv
SUITS_DATA_MODE=artifacts
SUITS_AI_MODE=local
SUITS_POLICY_MODE=engine
```

O modo `local` usa extração de texto, busca de trechos e modelos editáveis de minuta. Para habilitar a geração por IA, altere `SUITS_AI_MODE=openai` e preencha `OPENAI_API_KEY` no `.env`. `OPENAI_MODEL`, `OPENAI_REASONING_EFFORT`, `OPENAI_MAX_OUTPUT_TOKENS` e `OPENAI_TIMEOUT_SECONDS` controlam a chamada; seus valores iniciais estão no arquivo de exemplo. A chave é usada somente no backend, e a sua presença sozinha não ativa chamadas.

| Variável | Valor padrão no exemplo | Finalidade |
|---|---|---|
| `SUITS_DATA_MODE` | `artifacts` | Ler os casos dos ZIPs; `mock` usa exemplos sintéticos |
| `SUITS_AI_MODE` | `local` | Geração local ou `openai` |
| `SUITS_POLICY_MODE` | `unavailable` | `engine` ativa a política; `mock` só é aceito com dados mock |
| `SUITS_DATABASE_PATH` | `src/backend/.local/suits.sqlite3` quando omitida | Arquivo de persistência operacional |
| `SUITS_ARTIFACTS_DIR` | `artefacts/Hackaton Unicamp` quando omitida | Diretório dos ZIPs e da planilha histórica |
| `SUITS_CORS_ORIGINS` | Origens locais na porta 5173 quando omitida | Origens permitidas para acesso direto à API |
| `API_HOST` / `API_PORT` | `127.0.0.1` / `8000` | Endereço usado por `run.py` |
| `APP_ENV` | `development` | Habilitar recarga de código em `run.py` |

Variáveis já definidas no processo têm precedência sobre o `.env`. Ao alternar entre `artifacts` e `mock`, escolha outro arquivo SQLite: a API recusa misturar datasets no mesmo banco. Alterar `SUITS_ARTIFACTS_DIR` não muda o caminho do modelo `.pkl`, procurado em `artefacts/suits_docs/` e, como alternativa, em `artefacts/`.

### 3. Iniciar a API e a interface

No Windows/PowerShell:

```powershell
.\.venv\Scripts\python.exe scripts/dev.py --env-file .env
```

No Linux/macOS:

```bash
.venv/bin/python scripts/dev.py --env-file .env
```

- Interface: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- Estado da API e modos ativos: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- Swagger: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

O script inicia ambos os servidores, recarrega a API quando Python ou `.env` mudam e mantém o HMR do Vite. `Ctrl+C` encerra os dois. As opções `--api-port`, `--web-port` e `--database` permitem escolher portas e banco; esse iniciador usa loopback e suas próprias opções de porta, independentemente de `API_HOST`/`API_PORT`.

Para iniciar separadamente, use o Python do ambiente virtual com `run.py` na raiz e, em outro terminal, `npm --prefix src/frontend run dev -- --host 127.0.0.1`. O Vite encaminha `/api` para a porta 8000; `SUITS_API_PROXY_TARGET` permite alterar esse destino no processo do frontend.

### 4. Explorar o fluxo

Abra a interface, selecione o perfil **Advogado** e um dos processos. Gere o parecer, confira os documentos citados, escolha o encaminhamento, gere e revise a minuta e registre a conclusão. No perfil **Banco**, consulte Governança e Base histórica. O seletor de perfis é demonstrativo.

Para incluir os cinco advogados demonstrativos em um banco já existente, execute com o Python do ambiente virtual:

```bash
python scripts/seed_governance_demo.py --database src/backend/.local/suits.sqlite3
```

O script cria backup e atualiza os registros demonstrativos de advogados e escritórios, preservando os processos e as decisões existentes.

## Estrutura do repositório

```text
suits_ai/
├── README.md
├── .env.example                 # Configuração de referência
├── requirements.txt             # Dependências Python e testes
├── run.py                       # Inicialização isolada da API
├── docs/
│   └── architecture.md          # Componentes, fluxos e limites da arquitetura
├── src/
│   ├── frontend/                # React: processos, minutas, copiloto e governança
│   ├── backend/                 # FastAPI: rotas, serviços, contratos e SQLite
│   ├── policy/                  # Regras, inferência do modelo e precificação
│   └── monitor/                 # Métricas e simulações de governança offline
├── scripts/                     # Desenvolvimento, dados, treinamento e validação
├── tests/                       # Testes Python e contratos de integração
├── data/                        # Amostra e agregados de governança
└── artefacts/
    ├── Hackaton Unicamp/        # ZIPs dos casos, base Excel e materiais do evento
    └── suits_docs/              # Especificação, relatório, baseline e modelo treinado
```

## Stack

| Camada | Tecnologias |
|---|---|
| Interface | React 19, JavaScript/JSX, Vite 8, Tailwind CSS 4, React Router 7, Lucide |
| API e contratos | Python, FastAPI, Pydantic, Uvicorn |
| Persistência | SQLite e aiosqlite; índice histórico SQLite em memória |
| Documentos e exportação | pypdf, ReportLab, Markdown |
| Copiloto | Geração local ou SDK OpenAI com respostas estruturadas |
| Política e dados | pandas, NumPy, scikit-learn, SciPy, joblib, openpyxl, PyArrow |
| Validação | pytest, testes nativos de Node.js, Oxlint e build Vite |

## Requisitos do desafio

| # | Requisito | Implementação e estado atual |
|---|---|---|
| 1 | **Regra de decisão** | [Motor híbrido](src/policy/engine.py), integrado à análise com `SUITS_POLICY_MODE=engine` |
| 2 | **Sugestão de valor** | [Precificação](src/policy/pricing.py): piso, alvo, teto e perda esperada para acordos |
| 3 | **Acesso à recomendação** | [Workspace do processo](src/frontend/src/pages/Workspace/WorkspacePage.jsx), parecer persistido, fundamentos e encaminhamento |
| 4 | **Monitoramento de aderência** | [Governança na interface](src/frontend/src/pages/Monitoring/MonitoringPage.jsx), registros de decisão e [métricas offline](src/monitor/metrics_adherence.py); aderência por advogado usa dados demonstrativos |
| 5 | **Monitoramento de efetividade** | [Métricas offline](src/monitor/metrics_effectiveness.py) e [simulação contrafactual](src/monitor/counterfactual.py); indicadores financeiros operacionais ainda pendentes de integração |

## Validação e reprodução

Na raiz, com o ambiente virtual ativado ou usando o caminho explícito de seu Python:

```bash
python -m pytest -q
npm --prefix src/frontend test
npm --prefix src/frontend run lint
npm --prefix src/frontend run build
python scripts/check_frontend_integration.py
```

O teste de integração inicia uma API temporária, usa SQLite temporário e geração local, exercita o cliente JavaScript e confere o PDF exportado. Os testes de OpenAI usam transporte simulado; não validam acesso ao modelo nem qualidade de respostas reais.

O modelo já está incluído para execução. Para reproduzir a preparação e o treinamento, execute na raiz, com as dependências instaladas:

```bash
python scripts/01_prepare_data.py
python scripts/02_train_model.py
```

Esses scripts gravam datasets processados, estatísticas e o artefato do modelo, podendo substituir arquivos gerados anteriormente. Para reproduzir o relatório exploratório, consulte [scripts/README.md](scripts/README.md). O comando `python scripts/summarize_historical_subsidies.py` imprime o JSON de lacunas documentais calculado a partir do Excel original, permitindo conferir ou atualizar o snapshot em `src/frontend/src/data/historicalSubsidies.json`.

## Escopo e limitações da demonstração

- Os dois casos documentados são simulações do evento. A planilha de 60 mil processos é consultada separadamente e não vira automaticamente uma carteira de casos operacionais.
- Aderência por advogado/escritório e eventos da linha do tempo são demonstrativos e identificados como tal. Os endpoints operacionais de aderência e efetividade retornam `pending_integration`; a presença de cálculos em `src/monitor/` não significa que estejam conectados à API.
- A disponibilidade de um documento ou a concordância textual de campos não atesta autenticidade. PDFs sem texto extraível ficam parciais; esta versão não executa OCR nem oferece upload de novos anexos.
- Minutas exigem revisão humana. A conclusão registra a escolha no sistema; não protocola peças nem confirma aceite de acordo com terceiros.
- O seletor de perfis não implementa autenticação ou autorização de produção. No modo OpenAI, trechos selecionados e contexto do caso são enviados ao provedor para geração.
- O build do frontend precisa ser servido com encaminhamento de `/api` ao FastAPI e suporte às rotas da SPA. `vite preview` serve à conferência local do build.

## Documentação complementar

- [Arquitetura implementada](docs/architecture.md)
- [API, configurações e contratos](src/backend/README.md)
- [Contrato de integração entre as frentes](src/backend/INTEGRATION.md)
- [OpenAPI versionado](src/backend/openapi.json)
- [Frontend e fluxos de interação](src/frontend/README.md)
- [Scripts de análise](scripts/README.md)
- [Especificação original](artefacts/suits_docs/SPEC.md) e [proposta da solução](artefacts/suits_docs/SOLUTION.md)

Os documentos em `artefacts/suits_docs/` preservam o planejamento do hackathon. Para o funcionamento integrado atual, use este README, o documento de arquitetura e o código dos módulos.
