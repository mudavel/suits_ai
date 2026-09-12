# Setup e Execução — Suits AI (EnterOS)

Guia completo para configuração do ambiente, execução de testes e inicialização da aplicação.

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
   cp .env.example .env
   # Edite o .env se desejar customizar porta, host ou chave da OpenAI
   ```

---

## 3. Execução dos Testes Automatizados

Para rodar a suíte completa de testes unitários e de integração (Policy Engine, Pricing, Monitoramento e API FastAPI):

```bash
pytest
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
│   ├── Hackaton Unicamp/# Planilhas, PDFs e ZIPs dos casos
│   └── suits_docs/      # Documentação oficial, especificações e FILETREE.md
├── docs/                # Slides executivos, apresentação e pitch
├── requirements.txt     # Dependências unificadas do projeto
├── pytest.ini           # Configuração unificada do Pytest
├── run.py               # Orquestrador de execução da aplicação
└── README.md            # Visão geral e contextualização do desafio
```
