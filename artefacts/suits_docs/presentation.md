# Apresentação Executiva — EnterOS / Banco Unicamp
**Hackathon Unicamp 2026 — Política Inteligente de Acordos e Governança Jurídica**  
**Duração:** 15 Minutos | **Equipe:** Suits AI

---

## 📑 Índice da Apresentação (15 Slides)

```
[Slide 01] Capa & Tese de Impacto
[Slide 02] O Diagnóstico: A Dor dos 5.000 Casos/Mês
[Slide 03] A Revelação dos Dados: O "Power Pair" e a Inversão do Ônus
[Slide 04] A Política Inteligente de Acordos EnterOS
[Slide 05] Por que o Modelo Híbrido (Regras + Random Forest Calibrado)?
[Slide 06] Precificação Atuarial em Duas Partes: A Régua de Alçada
[Slide 07] Demonstração Financeira: Cost Avoidance de R$ 55M a R$ 68M/ano
[Slide 08] Análise de Sensibilidade & Retorno sobre Investimento (ROI)
[Slide 09] A Experiência do Advogado Externo (EnterOS Platform UX)
[Slide 10] O Workspace Split-View, War Room e Chat Copilot
[Slide 11] O Gerador de Minutas e Termos em 1 Clique (WeasyPrint)
[Slide 12] Cockpit de Governança do Banco: Monitoramento de Aderência (A01-A20)
[Slide 13] Diagnóstico da Esteira de Subsídios Internos do Banco
[Slide 14] Arquitetura Técnica, Engenharia e Conformidade
[Slide 15] Limitações Conhecidas e Próximos Passos (Roadmap de 1 Mês)
```

---

### [Slide 01] Capa & Tese de Impacto
- **Título:** EnterOS — Política Inteligente de Acordos e Governança Jurídica
- **Subtítulo:** Transformando contencioso de massa de R$ 190M em eficiência orientada por dados no Banco Unicamp.
- **Mensagem-Chave:** Solução autoral integrada que une jurimetria preditiva calibrada, copiloto do advogado e cockpit de governança com economia líquida anual de mais de R$ 55 milhões.

---

### [Slide 02] O Diagnóstico: A Dor dos 5.000 Casos/Mês
- **Volume:** ~15.000 novos processos judiciais cíveis/mês no Banco Unicamp.
- **Gargalo:** ~5.000 ações/mês alegam não reconhecimento de contratação de empréstimo.
- **Dilema Atual:** Falta de critério técnico nos escritórios terceirizados $\rightarrow$ apenas **0,47% de acordos** históricos e **R$ 192,98 milhões** desembolsados em condenações.

---

### [Slide 03] A Revelação dos Dados: O "Power Pair"
- **O Fator Crítico:** 
  - Sem Contrato E Sem Extrato $\rightarrow$ **97,3% de condenação** (R$ 10.430 de custo médio).
  - Com Contrato E Com Extrato $\rightarrow$ **6,9% de condenação** (caindo para **4,0%** com BACEN).
- **Concentração de Risco:** 36,0% dos processos concentram **85,3% de todo o desembolso financeiro** do banco.

---

### [Slide 04] A Política Inteligente de Acordos EnterOS
- **Árvore Estruturada de Decisão:**
  1. *Dossiê NÃO CONFORME (Fraude pericial)* $\rightarrow$ **Acordo Fast-Track** imediato (evita perícia e dano moral majorado).
  2. *0 Subsídios Críticos (Sem Contrato e Sem Extrato)* $\rightarrow$ **Acordo Proativo** (risco de 97,3%).
  3. *3 Subsídios Críticos (Contrato + TED + BACEN)* $\rightarrow$ **Defesa Robusta** (risco de 4,0%).
  4. *Zona Cinzenta (1 ou 2 subsídios)* $\rightarrow$ **Random Forest Calibrado** ponderando UF e Subassunto (Golpe vs Genérico).

---

### [Slide 05] Por que o Modelo Híbrido (Regras + Random Forest)?
- **AUC de 0,923 e Brier Score de 0,092:** O modelo supervisionado com `CalibratedClassifierCV` resolve com precisão matemática a zona cinzenta onde regras booleanas falham.
- **Ponderação Regional e Fática:** Casos com apenas extrato variam de 20,5% de risco no MA a 48,0% no AP/AM.
- **Estimativa Contínua de Probabilidade $P(\text{derrota})$:** Alimenta com rigor o motor atuarial de precificação.

---

### [Slide 06] Precificação Atuarial em Duas Partes
- **Fórmula de Custo Esperado:**
  $$\mathbb{E}[\text{Perda}] = P(\text{derrota}) \times \left( \text{Valor do Débito} + \text{Dano Moral Regional} + \text{Custas/Honorários} \right)$$
- **Régua de Alçada Dinâmica:**
  - 🟢 **Piso de Abertura (~60% do Alvo):** Ponto de partida da negociação.
  - 🟡 **Valor Alvo (Economia $\ge$ 45%):** Ponto de máxima conversão.
  - 🔴 **Teto de Alçada:** Limite máximo pré-autorizado ao advogado externo.

---

### [Slide 07] Demonstração Financeira: Cost Avoidance
- **Gasto Histórico Anual:** ~R$ 192,98 Milhões.
- **Economia Líquida Anual (*Cost Avoidance*):** **R$ 55.400.000 a R$ 68.200.000** por ano.
- **Redução Percentual:** Redução de **28,7% a 35,3%** no custo total do contencioso cível do banco.

---

### [Slide 08] Análise de Sensibilidade & ROI
- **Curva de Sensibilidade por Taxa de Aceite:**
  - 40% de aceite $\rightarrow$ Economia de **R$ 38,2M/ano**
  - 60% de aceite $\rightarrow$ Economia de **R$ 57,3M/ano**
  - 75% de aceite $\rightarrow$ Economia de **R$ 71,6M/ano**
- **Múltiplo de ROI:** Cada R$ 1,00 desembolsado em acordos evita **R$ 2,05** em condenações judiciais e custas processuais.

---

### [Slide 09] A Experiência do Advogado Externo (EnterOS UX)
- **Dual-Role Switcher:** Alternância instantânea no Header entre Advogado Parceiro (*Dr. Lucas Ramos*) e Diretoria do Banco (*Dra. Mariana Souza*).
- **Fila Inteligente de Triagem:** Processos priorizados por semáforo de risco e prazo fatal.

---

### [Slide 10] Workspace Split-View, War Room e Chat Copilot
- **Split-View Nativo:** Petição Inicial / Autos à esquerda e Subsídios Bancários à direita.
- **War Room Judicial:** Cartões com Teses do Atacante (Autor) vs Tendências do Juiz vs Estratégia de Neutralização.
- **Chat Copilot com GPT-4o:** Assistente que responde perguntas jurídicas complexas com base nos documentos do caso em tempo real.

---

### [Slide 11] Gerador de Minutas em 1 Clique (WeasyPrint)
- **Defesa:** Geração imediata de Contestação estruturada com anexação automática dos subsídios e jurisprudência consolidada.
- **Acordo:** Geração do Termo de Acordo Judicial oficial e Script de Negociação via WhatsApp.
- **Exportação:** PDF timbrado institucional de alta fidelidade visual compilado via WeasyPrint.

---

### [Slide 12] Cockpit de Governança do Banco (Aderência)
- **Acompanhamento de Aderência (A01–A20):**
  - Taxa global de seguimento da política pelos escritórios parceiros (ex.: Pinheiro & Associados: 92%).
  - Gestão de *Overrides* (divergências): Registro obrigatório e auditoria dos motivos de recusa.

---

### [Slide 13] Diagnóstico da Esteira de Subsídios Internos
- **Raio-X dos Gargalos do Banco:**
  - Identificação de falhas de localização de contratos em UFs críticas (ex.: AP e AM com maior índice de extravio).
  - Alerta de melhoria operacional para a esteira de custódia documental do Banco Unicamp.

---

### [Slide 14] Arquitetura Técnica & Stack
- **Backend:** FastAPI assíncrono com validação Pydantic e OpenAPI `/docs`.
- **Inteligência:** Scikit-Learn (Random Forest com CalibratedClassifierCV) + OpenAI GPT-4o.
- **Frontend:** React 19 + Vite + Tailwind CSS + Lucide Icons.
- **Relatórios:** WeasyPrint (HTML/CSS Forense $\rightarrow$ PDF).

---

### [Slide 15] Limitações Conhecidas & Roadmap de 1 Mês [WORK IN PROGRESS]
- **Limitações Atuais:**
  - Base histórica não possui carimbo de tempo da juntada de subsídios.
  - OCR básico para documentos manuscritos.
- **Roadmap de 1 Mês:**
  - Integração direta com tribunais via Crawler / PJe-Push.
  - Calibração bayesiana dinâmica por vara/juiz específico.
