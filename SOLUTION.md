# SOLUTION.md — Arquitetura Autoral da Política Inteligente de Acordos e Governança Jurídica (EnterOS / Banco Unicamp)

**Projeto:** Enter Hackathon Unicamp — EnterOS  
**Escopo:** Política de Acordos, Jurimetria Preditiva, Copiloto do Advogado e Cockpit de Governança para o Banco Unicamp  
**Desenvolvimento:** Solução 100% original e desenvolvida do zero  
**Stack Principal:** Python 3.10+, **FastAPI** (com validação Pydantic), **Random Forest / Jurimetria Calibrada**, OpenAI API (GPT-4o), React 19 + Vite, SQLite / Pandas / PyArrow.

---

## 1. Contexto e Desafio de Negócio

O **Banco Unicamp** enfrenta um volume de **~15.000 novos processos judiciais cíveis por mês**, dos quais cerca de **~5.000 casos** tratam de **não reconhecimento de contratação de empréstimo** (o consumidor alega descontos indevidos referentes a contratos que afirma não ter firmado).

Historicamente, a taxa de acordos do banco foi inferior a **0,5%**, resultando em desembolsos massivos com condenações judiciais (danos materiais, danos morais e sucumbência). Diante de cada processo, o banco precisa decidir estrategicamente: **Contestar (Defesa Judicial)** ou **Propor Acordo (Encerramento Imediato)**.

Nossa solução foi projetada do zero como uma plataforma nativa para o ecossistema **EnterOS**, unindo auditoria probatória automatizada, jurimetria preditiva com **Random Forest**, precificação atuarial, geração de peças e governança contínua de aderência e efetividade.

---

## 2. Princípios de Design e Inovações Próprias

Nossa arquitetura foi desenhada a partir dos seguintes pilares autorais:

```mermaid
flowchart TD
    subgraph P1["1. Auditoria Probatória Semântica & Antifraude"]
        A["Autos Processuais + Subsídios do Banco"] --> B{"Dossiê Pericial:\nNÃO CONFORME?"}
        B -- "SIM (Fraude confirmada)" --> DEC_AC1["Acordo Fast-Track\n(Estancar Danos Morais & Custas)"]
        B -- "NÃO / AUSENTE" --> C{"Cadeia Probatória:\nContrato + TED + BACEN?"}
        C -- "3 Críticos + Usufruto" --> DEC_DEF["Defesa Robusta\n(Improcedência > 85%)"]
        C -- "0 ou 1 Crítico" --> DEC_AC2["Acordo Estratégico\n(Inversão Ônus CDC)"]
        C -- "2 Críticos" --> D["Modelo Jurimétrico (Random Forest)\n(Probabilidade de Perda Real Calibrada)"]
        D --> DEC_ZONA{"Risco da Comarca"}
        DEC_ZONA -- "Alto" --> DEC_AC3["Acordo"]
        DEC_ZONA -- "Baixo" --> DEC_DEF2["Defesa"]
    end

    subgraph P2["2. Precificação Atuarial (Pricing de Acordo)"]
        DEC_AC1 & DEC_AC2 & DEC_AC3 --> E["Cálculo do Custo Esperado de Perda E(Perda)\nE(Perda) = P(derrota) x (Débito + Dano Moral Comarca + Custas)"]
        E --> F["Régua de Alçada de Negociação:\n- Piso de Abertura\n- Valor Alvo\n- Teto Autorizado"]
    end

    subgraph P3["3. Copiloto do Advogado (EnterOS Workflow)"]
        DEC_DEF & DEC_DEF2 --> G["Geração de Minuta de Contestação Judicial (1 Clique)"]
        F --> H["Geração de Minuta de Termo de Acordo / WhatsApp (1 Clique)\n+ Copiloto Interativo de Contrapropostas"]
    end

    subgraph P4["4. Cockpit Gerencial do Banco Unicamp"]
        G & H --> I["Métricas de Aderência dos Escritórios (A01-A20)\n+ Métricas de Efetividade Financeira & ROI (E01-E20)"]
    end
```

---

## 3. Por que Random Forest na Modelagem Jurimétrica?

Para a classificação de risco e probabilidade de perda em processos judiciais cíveis massificados, o **Random Forest** apresenta vantagens estruturais decisivas:

1. **Robustez a Ruídos Tabulares:** Processos judiciais contêm variações abruptas de valores da causa e jurisprudência regional. O ensemble de árvores do Random Forest reduz variância e evita o risco de overfitting inerente a modelos com boosting excessivamente agressivo.
2. **Explicabilidade e Transparência Jurídica:** As decisões do Random Forest são decomponíveis em caminhos de decisão (*decision paths*) auditáveis, essencial para justificar pareceres a comitês jurídicos e órgãos reguladores.
3. **Calibração Probabilística Estável:** Combinado com CalibratedClassifierCV, entrega probabilidades confiáveis de perda ($P(\text{derrota})$) sem distorções nos extremos.

---

## 4. O Papel dos Subsídios e a Matriz de Decisão Jurídica

Os **Subsídios** são os documentos de defesa que os sistemas internos do Banco Unicamp conseguem localizar e disponibilizar para municiar o advogado:

1. **Contrato (Cédula de Crédito Bancário):** Prova formal de consentimento e termos da operação.
2. **Extrato Bancário (Comprovante de Depósito/TED):** Prova de que os recursos foram transferidos para a conta de titularidade do autor.
3. **Comprovante BACEN:** Registro regulatório formal da operação junto ao Banco Central.
4. **Dossiê Antifraude (Empresa Pericial Terceirizada):**
   - **CONFORME:** Atesta autenticidade da assinatura e biometria facial do autor.
   - **NÃO CONFORME:** Atesta que a assinatura/biometria é divergente (fraude ocorrida no passado).
5. **Demonstrativo de Evolução da Dívida:** Histórico de pagamentos mensais (comprova consentimento tácito e usufruto).
6. **Laudo Referenciado:** Síntese do canal de contratação (digital, agência, correspondente).

### Matriz de Decisão Estratégica

| Cenário | Conjunto Probatório | Decisão Recomendada | Fundamentação Jurídica & Econômica |
| :--- | :--- | :---: | :--- |
| **Fraude Confirmada** | Dossiê **NÃO CONFORME** | 🤝 **ACORDO FAST-TRACK** | A perícia interna atesta falsidade da assinatura. Contestar gerará condenação por dano moral majorado, perícia judicial cara e risco de multa por má-fé (Súmula 479/STJ). |
| **Força Probatória Plena** | **3 Críticos** (Contrato + TED + BACEN) + Dossiê Conforme | 🛡️ **DEFESA** | Cadeia probatória atende integralmente aos requisitos do CDC/CPC. Alta probabilidade de improcedência. |
| **Falha Probatória Severa** | **0 a 1 Crítico** localizado | 🤝 **ACORDO** | Com a inversão do ônus da prova (art. 6º, VIII, CDC), a falta de contrato e TED leva à condenação quase certa do banco. |
| **Usufruto Comprovado** | Extrato com histórico de uso do crédito e pagamentos de parcelas | 🛡️ **DEFESA** | Demonstra que o autor usufruiu do dinheiro antes de ajuizar a ação, afastando a alegação de desconhecimento. |
| **Zona Cinzenta** | **2 Críticos** (ex: TED + BACEN sem a imagem da CCB) | 🧠 **JURIMETRIA (RANDOM FOREST)** | Modelo Random Forest calibrado pondera a taxa de êxito da comarca e o risco financeiro do caso. |

---

## 5. Motor de Precificação Atuarial (Pricing Dinâmico)

Para superar abordagens ingênuas (como percentuais fixos sobre o valor da causa), nosso motor de precificação adota a métrica atuarial de **Custo Esperado de Perda ($\mathbb{E}[\text{Perda}]$)**:

$$\mathbb{E}[\text{Perda}] = P(\text{derrota}) \times \left( \text{Valor do Débito Declarado} + \text{Dano Moral Histórico da Vara/UF} + \text{Custas e Honorários} \right)$$

$$\text{Valor Alvo do Acordo} = \mathbb{E}[\text{Perda}] \times (1 - \text{Margem de Vantagem Financeira})$$

### Régua de Alçada de Negociação

* 🟢 **Piso de Abertura:** Proposta inicial econômica (~60% do valor alvo), garantindo margem para negociação.
* 🟡 **Valor Alvo:** Ponto ótimo de conversão que garante economia média $\ge 45\%$ em relação à condenação provável.
* 🔴 **Teto de Alçada:** Limite máximo que o advogado tem autorização para fechar antes de exigir aprovação da diretoria.

---

## 6. Experiência do Advogado (EnterOS Workflow)

Nossa plataforma entrega valor real do início ao fim do processo de trabalho do advogado:

1. **Triagem Rápida:** Listagem de casos priorizados por risco, valor e completude de subsídios.
2. **Workspace Analítico (Split-View):** Visualização lado a lado da Petição Inicial / Documentos do Autor e dos Subsídios do Banco.
3. **Parecer Explicável por IA:** Resumo jurídico automático detalhando exatamente por que a estratégia foi recomendada.
4. **Gerador de Minutas em 1 Clique (HTML/CSS via WeasyPrint):**
   - **Caso DEFESA:** Gera a minuta formal da **Contestação Judicial** em PDF timbrado, com fundamentação fática, citação expressa dos subsídios probatórios válidos anexados (CCB, TED, BACEN) e pedidos de improcedência.
   - **Caso ACORDO:** Gera a minuta do **Termo de Transação / Acordo Judicial** em PDF timbrado (com cláusulas de quitação plena, estorno e extinção pelo art. 487, III, 'b', CPC) + **Script padronizado de proposta para WhatsApp/E-mail**.
   - Ambas as minutas podem ser editadas diretamente na interface antes do download em PDF oficial ou exportação em Word/texto.
5. **Copiloto de Negociação:** Simulador em tempo real que avalia contrapropostas do autor contra a alçada do banco.

---

## 7. Governança e Monitoramento Gerencial (Banco Unicamp)

* **Monitoramento de Aderência:**
  - Taxa de seguimento global das recomendações pelos escritórios parceiros.
  - Auditoria de *overrides* (desvios) com motivos registrados e rankings de compliance.
* **Monitoramento de Efetividade & ROI:**
  - *Cost Avoidance* acumulado (economia líquida em R$ gerada pela política de acordos).
  - Taxa de conversão de acordos e análise de sensibilidade da negociação.
* **Diagnóstico da Esteira de Subsídios:**
  - Relatório de causas-raiz apontando em quais canais ou regiões o próprio banco enfrenta maior dificuldade de localização de contratos e documentos.

---

## 8. Impacto Financeiro Estimado

Com base no volume histórico de 60.000 sentenças e 5.000 novos casos/mês:
* **Gasto Histórico do Banco em Condenações:** ~R$ 190 milhões anuais.
* **Economia Anual Estimada (*Cost Avoidance*):** **R$ 55M a R$ 68M por ano** (redução de 30% a 35% no custo contencioso).
* **Eficiência Operacional:** Redução de mais de 60% no tempo de tramitação dos processos e alívio da sobrecarga dos escritórios parceiros.
