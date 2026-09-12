// API Service para integração com o FastAPI (backend/main.py)
// Com fallback automático para os Casos Oficiais do Hackathon Unicamp (Casos 01, 02 e base 60k)

export const MOCK_CASES = [
  {
    id: 1,
    caseNumber: '0801234-56.2024.8.10.0001',
    claimant: 'Carlos Eduardo da Silva',
    claimantCpf: '***.452.891-**',
    court: '1ª Vara Cível de São Luís / MA',
    state: 'MA',
    claimValue: 18500.0,
    expectedLoss: 1850.0,
    lossProbability: 0.10,
    riskLevel: 'BAIXO',
    recommendation: 'DEFESA',
    reasoningCode: 'CADEIA_COMPLETA',
    reasoningTitle: 'Cadeia Probatória Conforme (3/3 Subsídios)',
    reasoningDescription: 'Contrato com biometria facial + TED com mesma titularidade confirmada + BACEN sem contestações prévias.',
    subsidiesStatus: 'Cadeia Completa (3/3)',
    subsidiesScore: 3,
    subsidies: {
      contract: { ok: true, detail: 'Contrato nº 502348719 assinado com biometria e geolocalização' },
      bankStatement: { ok: true, detail: 'TED creditada em conta corrente da mesma titularidade do autor' },
      bacen: { ok: true, detail: 'Comprovante de crédito BACEN sem anotações de fraude' },
      veritas: { ok: true, detail: 'Dossiê Veritas validado com score de conformidade 98/100' }
    },
    settlementPricing: {
      floor: 1500.0,
      target: 2500.0,
      ceiling: 3500.0,
    },
    hearingDate: '2024-10-15',
    daysToHearing: 12,
    priority: 'NORMAL',
  },
  {
    id: 2,
    caseNumber: '0654321-09.2024.8.04.0001',
    claimant: 'Mariana de Oliveira Santos',
    claimantCpf: '***.819.342-**',
    court: '3ª Vara Cível de Manaus / AM',
    state: 'AM',
    claimValue: 24000.0,
    expectedLoss: 19200.0,
    lossProbability: 0.80,
    riskLevel: 'CRITICO',
    recommendation: 'ACORDO URGENTE',
    reasoningCode: 'DOSSIE_NAO_CONFORME',
    reasoningTitle: 'Dossiê Não Conforme — Falha Probatória Grave',
    reasoningDescription: 'Ausência de instrumento contratual e TED creditada em conta de terceiro sem procuração ou autorização nos autos.',
    subsidiesStatus: 'Dossiê Não Conforme (0/3)',
    subsidiesScore: 0,
    subsidies: {
      contract: { ok: false, detail: 'Contrato ausente nos sistemas internos' },
      bankStatement: { ok: false, detail: 'Crédito transferido para terceiro sem vínculo comprovado' },
      bacen: { ok: true, detail: 'Comprovante BACEN presente mas inconclusivo' },
      veritas: { ok: false, detail: 'Dossiê Veritas rejeitado por inconsistência de titularidade' }
    },
    settlementPricing: {
      floor: 5000.0,
      target: 8500.0,
      ceiling: 12000.0,
    },
    hearingDate: '2024-09-28',
    daysToHearing: 3,
    priority: 'URGENTE',
  },
  {
    id: 3,
    caseNumber: '1044521-44.2024.8.26.0001',
    claimant: 'Roberto Almeida Ramos',
    claimantCpf: '***.193.774-**',
    court: '2ª Vara Cível de Campinas / SP',
    state: 'SP',
    claimValue: 12000.0,
    expectedLoss: 7440.0,
    lossProbability: 0.62,
    riskLevel: 'MEDIO',
    recommendation: 'ACORDO',
    reasoningCode: 'ML_ZONA_CINZENTA',
    reasoningTitle: 'Zona Cinzenta — Modelo Jurimétrico Random Forest',
    reasoningDescription: 'Contrato físico anexado com divergência grafotécnica frente ao RG; jurisprudência local favorável à inversão do ônus.',
    subsidiesStatus: 'Parcialmente Conforme (2/3)',
    subsidiesScore: 2,
    subsidies: {
      contract: { ok: true, detail: 'Contrato físico anexado com divergência de assinatura' },
      bankStatement: { ok: true, detail: 'TED comprovada na conta do autor' },
      bacen: { ok: false, detail: 'Sem registro de validação no sistema central' },
      veritas: { ok: true, detail: 'Dossiê Veritas intermediário (score 64/100)' }
    },
    settlementPricing: {
      floor: 3000.0,
      target: 5000.0,
      ceiling: 7000.0,
    },
    hearingDate: '2024-10-04',
    daysToHearing: 7,
    priority: 'ALTA',
  },
  {
    id: 4,
    caseNumber: '1008742-33.2024.8.26.0100',
    claimant: 'Juliana Beatriz Silveira',
    claimantCpf: '***.664.120-**',
    court: '14ª Vara Cível Central de São Paulo / SP',
    state: 'SP',
    claimValue: 35000.0,
    expectedLoss: 3500.0,
    lossProbability: 0.10,
    riskLevel: 'BAIXO',
    recommendation: 'DEFESA',
    reasoningCode: 'CADEIA_COMPLETA',
    reasoningTitle: 'Subsídios Robustos com Prova Pericial Prévia',
    reasoningDescription: 'Validação biométrica Liveness com IP compatível com a residência da autora e extrato com utilização integral dos valores.',
    subsidiesStatus: 'Cadeia Completa (3/3)',
    subsidiesScore: 3,
    subsidies: {
      contract: { ok: true, detail: 'Contrato digital formalizado com biometria facial Liveness' },
      bankStatement: { ok: true, detail: 'TED conferida na titularidade e histórico de saques' },
      bacen: { ok: true, detail: 'Histórico limpo no SCR Bacen' },
      veritas: { ok: true, detail: 'Dossiê Veritas 100% conforme' }
    },
    settlementPricing: {
      floor: 2000.0,
      target: 4000.0,
      ceiling: 6000.0,
    },
    hearingDate: '2024-11-20',
    daysToHearing: 35,
    priority: 'NORMAL',
  },
  {
    id: 5,
    caseNumber: '0021984-77.2024.8.19.0001',
    claimant: 'Antônio Ferreira Mendes',
    claimantCpf: '***.908.312-**',
    court: '5ª Vara Cível do Rio de Janeiro / RJ',
    state: 'RJ',
    claimValue: 15800.0,
    expectedLoss: 12640.0,
    lossProbability: 0.80,
    riskLevel: 'ALTO',
    recommendation: 'ACORDO URGENTE',
    reasoningCode: 'FALHA_PROBATORIA',
    reasoningTitle: 'Falha Probatória — Ausência de Comprovante de Pagamento',
    reasoningDescription: 'Não há comprovante bancário da liquidação da TED nos extratos contábeis; elevado risco de condenação em repetição do indébito em dobro.',
    subsidiesStatus: 'Falha Probatória (1/3)',
    subsidiesScore: 1,
    subsidies: {
      contract: { ok: true, detail: 'Contrato existe porém sem registro de desembolso' },
      bankStatement: { ok: false, detail: 'TED estornada ou não localizada' },
      bacen: { ok: false, detail: 'Pendência no sistema BACEN' },
      veritas: { ok: false, detail: 'Dossiê Veritas rejeitado' }
    },
    settlementPricing: {
      floor: 4500.0,
      target: 7000.0,
      ceiling: 9500.0,
    },
    hearingDate: '2024-10-02',
    daysToHearing: 5,
    priority: 'URGENTE',
  }
]

/**
 * Busca a lista de casos tentando o endpoint FastAPI `/api/cases`.
 * Se o backend estiver indisponível, faz fallback automático para os dados mockados oficiais.
 */
export async function fetchCases() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)

    const response = await fetch('/api/cases', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`)
    }

    const data = await response.json()
    return { data, isMock: false }
  } catch {
    // Retorna os dados mockados enriquecidos para garantir continuidade imediata
    return { data: MOCK_CASES, isMock: true }
  }
}

/**
 * Busca os detalhes de um caso específico por ID.
 */
export async function fetchCaseById(id) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)

    const response = await fetch(`/api/cases/${id}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`)
    }

    const data = await response.json()
    return { data, isMock: false }
  } catch {
    const found = MOCK_CASES.find((c) => String(c.id) === String(id)) || MOCK_CASES[0]
    return { data: found, isMock: true }
  }
}

