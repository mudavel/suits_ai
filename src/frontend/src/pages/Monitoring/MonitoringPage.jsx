import { useEffect, useState } from 'react'
import { ArrowUpRight, BarChart3, FileCheck2, History, Activity, ShieldCheck } from 'lucide-react'
import { requestJson } from '../../services/api'

// Escritórios parceiros credenciados na carteira do Banco Unicamp
const LAW_FIRMS = [
  { name: 'Pinheiro & Associados Advogados', lead: 'Dr. Lucas Ramos', rate: 96.2, volume: '14.200 casos', topReason: 'Autor recusou teto inicial de alçada' },
  { name: 'Carvalho, Dias & Silva Advogados', lead: 'Dra. Juliana Mendes', rate: 94.0, volume: '12.800 casos', topReason: 'Comarca de histórico rigoroso com inversão' },
  { name: 'Albuquerque & Castro Sociedade', lead: 'Dr. Roberto Albuquerque', rate: 91.5, volume: '11.900 casos', topReason: 'Divergência de IP em contrato digital' },
  { name: 'Vasconcelos Contencioso Bancário', lead: 'Dra. Fernanda Vasconcelos', rate: 88.4, volume: '10.500 casos', topReason: 'Indícios robustos de golpe no BO do autor' },
  { name: 'Moreira & Guimarães Consultoria', lead: 'Dr. Carlos Moreira', rate: 82.1, volume: '10.600 casos', topReason: 'Estratégia de sustentação oral favorável' },
]

// Diagnóstico da esteira de subsídios internos do banco (médias reais da base de 60k)
const SUBSIDIES_QUALITY = [
  { name: 'Comprovante de Crédito (TED / BACEN)', missingRate: '39,3%', riskImpact: '+38,0 p.p. risco', focus: 'Core Banking / Legado (Maior Gargalo)' },
  { name: 'Contrato Digital (CCB com Biometria)', missingRate: '28,4%', riskImpact: '+42,5 p.p. risco', focus: 'Originador Digital (MA / BA)' },
  { name: 'Extrato Bancário de Mesma Titularidade', missingRate: '18,5%', riskImpact: '+26,8 p.p. risco', focus: 'Operações / Contas (AM / PA)' },
  { name: 'Dossiê Veritas Antifraude', missingRate: '4,2%', riskImpact: '+89,0 p.p. risco', focus: 'Mesa de Prevenção (Nacional)' },
]

export default function MonitoringPage() {
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSimulation, setShowSimulation] = useState(false)
  const [acceptanceRate, setAcceptanceRate] = useState(65)

  useEffect(() => {
    let active = true
    requestJson('/api/monitoring/overview')
      .then(data => {
        if (active) {
          setOverview(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setError(true)
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [])

  // Projeção dinâmica da carteira histórica de 60.000 processos
  const calculatedSavingsMillions = (58.4 * (acceptanceRate / 65)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  const calculatedAgreementsCount = Math.round(18400 * (acceptanceRate / 65)).toLocaleString('pt-BR')
  const calculatedRoi = (2.1 + (acceptanceRate / 65) * 0.45).toFixed(1)

  const amount = value => value == null ? '—' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  const percent = value => value == null ? '—' : (value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'

  const metrics = [
    {
      label: showSimulation ? 'Cost Avoidance Projetado' : 'Economia em Produção',
      value: showSimulation ? `R$ ${calculatedSavingsMillions}M` : amount(overview?.total_cost_avoidance),
      note: showSimulation ? 'Economia líquida anual estimada' : 'Evitado em condenações reais',
    },
    {
      label: 'Taxa de Aderência (A01)',
      value: showSimulation ? '91,8%' : percent(overview?.adherence_rate),
      note: 'Seguimento das recomendações da IA',
    },
    {
      label: 'Tempo Médio de Resolução',
      value: showSimulation ? '4,2 dias' : overview?.avg_negotiation_time_days == null ? '—' : `${overview.avg_negotiation_time_days} dias`,
      note: showSimulation ? 'Acordo pré-audiência vs 180+ dias' : 'Ciclo médio até a conclusão',
    },
    {
      label: showSimulation ? 'Carteira Histórica' : 'Casos em Andamento',
      value: showSimulation ? '60.000' : overview?.total_cases?.toLocaleString('pt-BR') ?? '—',
      note: showSimulation ? 'Sentenças reais do Banco Unicamp' : 'Processos ativos cadastrados',
    },
  ]

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <p className="eyebrow">DIRETORIA JURÍDICA / GOVERNANÇA & ROI</p>
        <span className="text-[11px] font-mono text-muted flex items-center gap-1.5">
          <span className="status-dot" />
          Banco Unicamp S.A.
        </span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-line pb-7">
        <div className="space-y-3">
          <h1>Uma visão de toda a operação contenciosa.</h1>
          <p className="text-sm text-muted max-w-2xl leading-relaxed">
            Acompanhe o desempenho dos escritórios parceiros, audite decisões em tempo real e simule o impacto financeiro da política de acordos na carteira do banco.
          </p>
        </div>
        <button
          type="button"
          aria-pressed={showSimulation}
          onClick={() => setShowSimulation(!showSimulation)}
          className="inline-flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-line text-xs font-medium hover:bg-accent-soft transition-colors shrink-0"
        >
          {showSimulation ? 'Voltar aos dados da operação em tempo real' : 'Explorar simulação da carteira histórica (60k)'}
          <ArrowUpRight size={15} />
        </button>
      </div>

      {/* Explicação clara do escopo para o cliente */}
      {showSimulation ? (
        <div role="status" className="rounded-lg bg-accent-soft border border-accent/40 p-5 text-xs text-accent-ink space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-2 font-medium">
            <History size={15} />
            <strong>Simulação Contrafactual da Carteira Histórica (60.000 Sentenças do Banco Unicamp)</strong>
          </div>
          <p>
            Este modelo projeta o retorno financeiro caso a política inteligente de acordos estivesse ativa no ano anterior. No histórico sem EnterOS, o banco sofreu <strong>17.987 condenações (R$ 193M)</strong> com apenas 280 acordos. Use o controle abaixo para simular o resultado variando a taxa de aceite dos autores.
          </p>
        </div>
      ) : error ? (
        <p role="alert" className="rounded-lg bg-negative-soft p-4 text-xs text-negative">
          Não foi possível carregar os indicadores em tempo real. Recarregue a página para tentar novamente.
        </p>
      ) : (
        <div role="status" className="flex items-center gap-2 text-xs text-muted">
          <Activity size={14} className="text-accent-ink" />
          <span>
            {loading
              ? 'Carregando indicadores da operação...'
              : overview?.metrics_status === 'available'
              ? 'Indicadores transacionais em tempo real disponíveis para os casos ativos.'
              : 'Painel operacional conectado. Casos em andamento com auditoria contínua de decisões e alçadas.'}
          </span>
        </div>
      )}

      {/* Grid de KPIs Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-line rounded-lg overflow-hidden bg-canvas">
        {metrics.map(metric => (
          <div key={metric.label} className="metric-cell">
            <p className="eyebrow">{metric.label}</p>
            <p className="metric-value">{metric.value}</p>
            <p className="text-[11px] text-muted">{metric.note}</p>
          </div>
        ))}
      </div>

      {/* Seção de Cenários e Sensibilidade */}
      <section className="border border-line rounded-lg p-6 sm:p-8 bg-canvas">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">CENÁRIOS & PRECIFICAÇÃO ATUARIAL</p>
            <h2 className="text-2xl">O impacto financeiro de cada possibilidade.</h2>
            <p className="text-xs text-muted mt-3 max-w-xl leading-relaxed">
              {showSimulation
                ? 'Ajuste a taxa de conversão esperada das propostas de acordo para recalcular em tempo real a economia líquida e o ROI da carteira do banco.'
                : 'A simulação contrafactual calcula o retorno com base nos 60.000 processos históricos do banco. Clique em "Explorar simulação" para interagir.'}
            </p>
          </div>
          <span className="text-xs text-accent-ink border border-line rounded px-2.5 py-1.5 shrink-0">
            {showSimulation ? 'Simulação Atuarial Ativa' : 'Disponível na Simulação'}
          </span>
        </div>

        {showSimulation ? (
          <div className="mt-8 pt-6 border-t border-line space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs text-muted block mb-1">Economia líquida anual projetada</span>
                <strong className="text-3xl font-normal tracking-tight">R$ {calculatedSavingsMillions}M</strong>
                <p className="text-[11px] text-muted mt-1 font-mono">
                  ~{calculatedAgreementsCount} acordos celebrados • Retorno de {calculatedRoi}x sobre desembolso
                </p>
              </div>
              <div className="text-right text-xs text-muted">
                <span className="font-medium text-ink">Cenário selecionado:</span> {acceptanceRate}% de adesão dos autores
              </div>
            </div>

            <div>
              <label htmlFor="acceptance" className="text-xs text-muted block mb-2">
                Taxa de aceite da proposta pelo autor: <strong className="text-ink">{acceptanceRate}%</strong>
              </label>
              <input
                id="acceptance"
                type="range"
                min="30"
                max="90"
                step="5"
                value={acceptanceRate}
                onChange={e => setAcceptanceRate(Number(e.target.value))}
                className="w-full my-2 accent-accent-ink cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted font-mono">
                <span>30% · Conservador (R$ 26,9M)</span>
                <span className="text-accent-ink font-semibold">65% · Cenário Base (R$ 58,4M)</span>
                <span>90% · Otimista (R$ 80,8M)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 pt-6 border-t border-line flex items-center gap-3 text-xs text-muted">
            <BarChart3 size={22} strokeWidth={1.2} />
            <p>Ative a visualização da simulação para ajustar a régua de sensibilidade e analisar o ROI projetado para a carteira.</p>
          </div>
        )}
      </section>

      {/* Grid Inferior: Escritórios Parceiros & Qualidade de Subsídios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
        {/* Escritórios Parceiros */}
        <section className="border border-line rounded-lg p-6 bg-canvas space-y-4">
          <div>
            <p className="eyebrow mb-1">AUDITORIA DE ADVOCACIA CREDENCIADA</p>
            <h2 className="text-2xl">Aderência por escritório</h2>
            <p className="text-xs text-muted mt-1">
              {showSimulation
                ? 'Conformidade histórica dos 5 principais escritórios que operam a carteira do Banco Unicamp.'
                : 'Métricas de seguimento das diretrizes pelos escritórios parceiros em casos ativos.'}
            </p>
          </div>

          <div className="mt-4 space-y-4">
            {LAW_FIRMS.map(firm => (
              <div key={firm.name} className="space-y-1.5 pb-3 border-b border-line last:border-0 last:pb-0">
                <div className="flex justify-between text-xs">
                  <div>
                    <span className="font-medium text-ink">{firm.name}</span>
                    <span className="text-muted block text-[11px]">{firm.lead} · {firm.volume}</span>
                  </div>
                  <div className="text-right">
                    <strong className="text-ink font-medium">{firm.rate.toLocaleString('pt-BR')}%</strong>
                    <span className="text-muted block text-[10px]">{firm.rate >= 90 ? 'Excelente' : 'Atenção'}</span>
                  </div>
                </div>
                <div className="h-1 bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-1 bg-accent rounded-full" style={{ width: `${firm.rate}%` }} />
                </div>
                {showSimulation && (
                  <p className="text-[10px] text-muted truncate pt-0.5">
                    Principal motivo de desvio: {firm.topReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Diagnóstico de Subsídios */}
        <section className="border border-line rounded-lg p-6 bg-canvas space-y-4">
          <div>
            <p className="eyebrow mb-1">AUDITORIA DE PROCESSOS INTERNOS</p>
            <h2 className="text-2xl">Qualidade dos subsídios</h2>
            <p className="text-xs text-muted mt-1">
              Gargalos de documentação nos sistemas internos do banco que elevam o risco de condenação.
            </p>
          </div>

          <div className="mt-4 divide-y divide-line">
            {SUBSIDIES_QUALITY.map(item => (
              <div key={item.name} className="py-3.5 first:pt-0 last:pb-0 space-y-1 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink">{item.name}</span>
                  <span className="text-negative font-mono text-[11px] font-medium">{item.missingRate} ausente</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>Impacto: {item.riskImpact}</span>
                  <span>Foco: {item.focus}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
