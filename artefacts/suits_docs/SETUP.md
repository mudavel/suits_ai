# Setup e Execução — Suits AI (EnterOS)

Guia para configuração do ambiente, execução de testes e inicialização da aplicação.
Execute os comandos a partir da raiz do repositório, salvo quando indicado outro diretório.

---

## 1. Pré-requisitos

- **Python 3.10+** (recomendado Python 3.11 ou 3.12)
- **uv** (ou gerenciador de ambientes virtuais de sua preferência)
- **Node.js 18+** e **npm** (para o módulo frontend)

---

## 2. Configuração do Ambiente

1. Clone o repositório e acesse a pasta raiz:
   ```bash
   git clone https://github.com/mudavel/suits_ai.git
   cd suits_ai
   ```

2. Crie e ative o ambiente virtual:
   ```bash
   uv venv .venv
   source .venv/bin/activate
   ```

3. Instale as dependências:
   ```bash
   uv pip install -r requirements.txt
   ```

4. Configure as variáveis de ambiente:
   ```bash
   # Crie somente se ainda não houver um .env:
   test -f .env || cp .env.example .env
   # Edite API_HOST, API_PORT, APP_ENV e as opções SUITS_* conforme necessário
   ```

---

No Windows (PowerShell), os mesmos passos podem ser executados sem `uv`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
.\.venv\Scripts\python.exe run.py
```

O `.env` fica na raiz e é carregado sem substituir variáveis do processo.
O padrão `SUITS_AI_MODE=local` permite testar sem chave. Para usar GPT-6 Astra,
preencha `OPENAI_API_KEY` e selecione `SUITS_AI_MODE=openai`; reinicie a API
depois de alterar a configuração. O PDF usa ReportLab, instalado pelo mesmo
`requirements.txt`, sem instalação de Pango ou WeasyPrint.

Com `SUITS_DATA_MODE=artifacts`, a inicialização cadastra os dois casos dos ZIPs
em um SQLite local. O arquivo padrão é `src/backend/.local/suits.sqlite3`.
Preserve `SUITS_DATABASE_PATH` de instalações existentes; caso usasse
`backend/.local/suits.sqlite3`, configure esse caminho explicitamente para
continuar usando o histórico. A planilha de 60 mil casos não é importada.

## 3. Execução dos Testes Automatizados

Para rodar a suíte completa de testes unitários e de integração (Policy Engine, Pricing, Monitoramento e API FastAPI):

```bash
python -B -m pytest -q
```

---

## 4. Inicialização da Aplicação

### Iniciar o Backend (FastAPI + Swagger)

Execute o orquestrador unificado na raiz do projeto:

```bash
python run.py
```

- **API REST / Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Iniciar o Frontend (React + Vite)

Em outro terminal, inicie a interface de usuário:

```bash
cd src/frontend
npm install
npm run dev
```

- **Aplicação Web:** [http://localhost:5173](http://localhost:5173)

---

Para testar pelo Swagger, execute primeiro `GET /api/cases` e escolha um ID.
`POST /api/analyze` recebe `{"case_id": 2}`; `GET /api/cases/2/analysis`
recupera o parecer salvo. `POST /api/chat` recebe `case_id` e `message`.
No modo `openai`, as rotas de geração fazem chamadas à API configurada.
Os demais corpos e respostas estão detalhados no Swagger e no
[README do backend](../../src/backend/README.md).

## 5. Estrutura do Projeto

```
suits_ai/
├── src/
│   ├── backend/         # Servidor FastAPI, Routers, Serviços e Schemas DTO
│   ├── policy/          # Motor de decisão jurimétrica, regras e pricing atuarial
│   ├── monitor/         # Métricas de governança (A01-A20, E01-E20) e contrafactual
│   └── frontend/        # Aplicação React 19 + Vite (UI do Advogado e Cockpit)
├── tests/               # Testes automatizados (API, Policy, Pricing, Monitor)
├── data/                # Bases de dados operacionais e amostras (.csv)
├── scripts/             # Pipelines de dados, treino do modelo e simulações
├── artefacts/           # Insumos brutos, documentações e modelos (.pkl, .json)
│   ├── Hackaton Unicamp/ # Planilhas, PDFs e ZIPs dos casos
│   └── suits_docs/      # Setup, especificações, apresentação e modelos
│       ├── SETUP.md     # Este guia de instalação e execução
│       ├── FILETREE.md  # Estrutura de referência
│       ├── SPEC.md      # Contratos técnicos
│       ├── ROADMAP.md   # Cronograma e divisões
│       ├── SOLUTION.md  # Arquitetura da solução
│       └── presentation.md # Apresentação executiva
├── requirements.txt     # Dependências unificadas do projeto
├── pytest.ini           # Configuração unificada do Pytest
├── run.py               # Orquestrador de execução da aplicação
└── README.md            # Visão geral e contextualização do desafio
```
