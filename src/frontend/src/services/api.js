// Exemplos legados de apresentação. As consultas abaixo usam exclusivamente a API.

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

export async function requestJson(path) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(path, { signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!response.ok) {
      const error = new Error(response.status === 404 ? 'Caso não encontrado.' : 'Não foi possível carregar os dados. Tente novamente.')
      error.status = response.status
      throw error
    }
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

// A apresentação mantém os campos ausentes como null e usa os nomes da API.
export function mapCase(item) {
  const presence = item.subsidies || {}
  return {
    id: item.id,
    caseNumber: item.case_number,
    title: item.title,
    claimant: item.claimant_name || item.title,
    defendant: item.defendant_name ?? null,
    claimantCpf: null,
    court: item.court ?? null,
    state: item.uf,
    claimValue: item.cause_value,
    status: item.status,
    version: item.version,
    riskLevel: item.risk_level,
    recommendation: item.recommendation,
    expectedLoss: null,
    lossProbability: null,
    settlementPricing: null,
    reasoningCode: null,
    reasoningTitle: item.title,
    reasoningDescription: item.sub_issue,
    daysToHearing: null,
    isSimulated: item.is_simulated ?? null,
    dataMode: item.data_mode,
    documents: item.documents || [],
    claims: item.claims || [],
    checks: item.checks || [],
    subsidies: {
      contract: { ok: presence.has_contract },
      bankStatement: { ok: presence.has_statement },
      bacen: { ok: presence.has_credit_receipt },
    },
  }
}

export async function fetchCases() {
  const envelope = await requestJson('/api/cases')
  if (!Array.isArray(envelope.items)) throw new Error('Não foi possível ler a lista de processos.')
  return { data: envelope.items.map(mapCase), isMock: envelope.data_mode === 'mock', total: envelope.total, page: envelope.page, totalPages: envelope.total_pages }
}

export async function fetchCaseById(id) {
  if (!/^[1-9]\d*$/.test(String(id))) throw new Error('Caso não encontrado.')
  const item = await requestJson(`/api/cases/${id}`)
  return { data: mapCase(item), isMock: item.data_mode === 'mock' }
}

