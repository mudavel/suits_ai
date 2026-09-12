# FILETREE.md — Estrutura de Diretórios e Arquitetura Canônica

Este documento define a organização oficial e padronizada do projeto **Suits AI (EnterOS)**.

---

## 🌳 Árvore de Diretórios Oficial

```text
suits_ai/
│
├── src/                               # 📦 Todo o código-fonte Python da aplicação
│   ├── backend/                       # 🌐 API FastAPI (Rotas, Serviços e Mocks)
│   │   ├── routers/                   # Endpoints (/cases, /analysis, /monitoring)
│   │   │   ├── cases.py
│   │   │   ├── analysis.py
│   │   │   └── monitoring.py
│   │   ├── services/                  # Lógica de negócio, IA/GPT e mocks
│   │   │   ├── contracts.py
│   │   │   └── mocks.py
│   │   ├── config.py                  # Configurações e variáveis de ambiente
│   │   ├── dependencies.py            # Injeção de dependências do FastAPI
│   │   ├── schemas.py                 # Schemas DTO da API
│   │   ├── openapi.json               # Contrato OpenAPI exportado
│   │   └── main.py                    # Instância FastAPI e middlewares
│   │
│   ├── policy/                        # ⚖️ Motor de Decisão & Jurimetria (Branch 1)
│   │   ├── engine.py                  # Matriz híbrida (Regras + Random Forest)
│   │   ├── pricing.py                 # Pricing atuarial e régua de alçada
│   │   └── schemas.py                 # DTOs do policy engine
│   │
│   └── monitor/                       # 📊 Governança & Contrafactual (Branch 4)
│       ├── counterfactual.py          # Simulação de ROI e Cost Avoidance
│       ├── generator.py               # Enriquecimento sintético e métricas
│       └── schemas.py                 # DTOs de aderência e efetividade
│
├── frontend/                          # 💻 Aplicação Web React 19 + Vite (Branch 3)
│   ├── src/                           # Componentes, páginas e hooks
│   ├── public/
│   └── package.json
│
├── tests/                             # 🧪 Suíte única de testes automatizados
│   ├── test_policy.py                 # Testes do motor de regras/ML
│   ├── test_pricing.py                # Testes de cálculo de alçada
│   ├── test_monitor.py                # Testes de governança e contrafactual
│   └── test_api.py                    # Testes de integração da API FastAPI
│
├── scripts/                           # ⚙️ Scripts de pipeline e execução batch
│   ├── 01_prepare_data.py             # Limpeza inicial da base de 60k
│   ├── 01_prepare_governance_data.py  # Geração de CSVs de governança
│   ├── 02_train_model.py              # Treinamento do Random Forest
│   └── simulate_api_integration.py    # Simulação E2E
│
├── data/                              # 📁 Bases operacionais e amostras CSV
│   ├── cases_sample_120.csv           # Amostra de triagem
│   ├── governance_law_firms.csv       # Aderência por escritório
│   ├── governance_override_reasons.csv
│   └── governance_sensitivity_curve.csv
│
├── artefacts/                         # 🏛️ Insumos brutos, documentações e modelos
│   ├── Hackaton Unicamp/              # Planilhas, PDFs e ZIPs dos casos
│   └── suits_docs/                    # Documentos históricos, especificações e modelos
│       ├── FILETREE.md                # Este documento de referência
│       ├── ROADMAP.md                 # Cronograma de desenvolvimento
│       ├── SPEC.md                    # Especificações técnicas e contratos
│       ├── SOLUTION.md                # Solução arquitetural e matemática
│       ├── report.html                # Relatório exploratório
│       ├── ideas.txt                  # Backlog de ideias
│       ├── modelo_jurimetrico.pkl     # Modelo Random Forest calibrado
│       ├── features.json              # Metadados de features do modelo
│       └── baseline_stats.json        # Estatísticas de baseline histórico
│
├── docs/                              # 📑 Entregas executivas
│   ├── presentation.md                # Roteiro/Slides da apresentação (15 min)
│   └── README.md
│
├── .env.example                       # Modelo de variáveis de ambiente
├── pytest.ini                         # Configuração global de testes
├── requirements.txt                   # Dependências unificadas do projeto
├── run.py                             # 🚀 Orquestrador (python run.py sobe o FastAPI)
├── README.md                          # Visão geral da solução
├── SETUP.md                           # Guia de instalação e execução
├── SPEC.md                            # Especificação técnica dos contratos
├── ROADMAP.md                         # Cronograma e divisões
└── SOLUTION.md                        # Arquitetura e formulação matemática
```

---

## 📌 Diretrizes de Cada Módulo

1. **`src/` (Core Python)**:
   - Todo código executável em Python vive exclusivamente em `src/`.
   - `src/backend/`: API HTTP, roteamento e integrações externas (OpenAI).
   - `src/policy/`: Motor jurimétrico puro e determinístico.
   - `src/monitor/`: Cálculo de métricas e simulações executivas.

2. **`tests/` (Testes Unificados)**:
   - Todos os testes residem na raiz `tests/`, garantindo execução rápida com `pytest`.

3. **`artefacts/`**:
   - `artefacts/Hackaton Unicamp/`: Arquivos fornecidos pela organização do Hackathon.
   - `artefacts/suits_docs/`: Documentações de base, relatórios e modelos jurimétricos serializados (`.pkl`, `.json`).
