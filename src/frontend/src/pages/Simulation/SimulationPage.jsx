import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Cpu,
  History,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'

// Escritórios parceiros credenciados na carteira do Banco Unicamp (Base Histórica 60k)
const LAW_FIRMS = [
  {
    name: 'Pinheiro & Associados Advogados',
    lead: 'Dr. Lucas Ramos',
    rate: 96.2,
    volume: '14.200 casos',
    topReason: 'Autor recusou teto inicial de alçada',
  },
  {
    name: 'Carvalho, Dias & Silva Advogados',
    lead: 'Dra. Juliana Mendes',
    rate: 94.0,
    volume: '12.800 casos',
    topReason: 'Comarca de histórico rigoroso com inversão',
  },
  {
    name: 'Albuquerque & Castro Sociedade',
    lead: 'Dr. Roberto Albuquerque',
    rate: 91.5,
    volume: '11.900 casos',
    topReason: 'Divergência de IP em contrato digital',
  },
  {
    name: 'Vasconcelos Contencioso Bancário',
    lead: 'Dra. Fernanda Vasconcelos',
    rate: 88.4,
    volume: '10.500 casos',
    topReason: 'Indícios robustos de golpe no BO do autor',
  },
  {
    name: 'Moreira & Guimarães Consultoria',
    lead: 'Dr. Carlos Moreira',
    rate: 82.1,
    volume: '10.600 casos',
    topReason: 'Estratégia de sustentação oral favorável',
  },
]

// Diagnóstico da esteira de subsídios internos do banco (Médias da base de 60k)
const SUBSIDIES_QUALITY = [
  {
    name: 'Comprovante de Crédito (TED / BACEN)',
    missingRate: '39,3%',
    riskImpact: '+38,0 p.p. risco',
    focus: 'Core Banking / Legado (Maior Gargalo)',
  },
  {
    name: 'Contrato Digital (CCB com Biometria)',
    missingRate: '28,4%',
    riskImpact: '+42,5 p.p. risco',
    focus: 'Originador Digital (MA / BA)',
  },
  {
    name: 'Extrato Bancário de Mesma Titularidade',
    missingRate: '18,5%',
    riskImpact: '+26,8 p.p. risco',
    focus: 'Operações / Contas (AM / PA)',
  },
  {
    name: 'Dossiê Veritas Antifraude',
    missingRate: '4,2%',
    riskImpact: '+89,0 p.p. risco',
    focus: 'Mesa de Prevenção (Nacional)',
  },
]

export default function SimulationPage() {
  const [acceptanceRate, setAcceptanceRate] = useState(65)

  // Projeção dinâmica da carteira histórica de 60.000 processos
  const calculatedSavingsMillions = (58.4 * (acceptanceRate / 65)).toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
  })
  const calculatedAgreementsCount = Math.round(18400 * (acceptanceRate / 65)).toLocaleString('pt-BR')
  const calculatedRoi = (2.1 + (acceptanceRate / 65) * 0.45).toFixed(1)

  const metrics = [
    {
      label: 'Cost Avoidance Projetado',
      value: `R$ ${calculatedSavingsMillions}M`,
      note: 'Economia líquida anual estimada',
    },
    {
      label: 'Taxa de Aderência Estimada',
      value: '91,8%',
      note: 'Seguimento da política inteligente A01',
    },
    {
      label: 'Tempo Médio de Resolução',
      value: '4,2 dias',
      note: 'Acordo pré-audiência vs 180+ dias no fórum',
    },
    {
      label: 'Carteira Histórica Analisada',
      value: '60.000',
      note: 'Sentenças reais do Banco Unicamp S.A.',
    },
  ]

  return (
    <div className="space-y-7">
      {/* Cabeçalho FDE */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-accent-soft text-accent-ink border border-accent/30">
            <Cpu size={14} />
          </span>
          <p className="eyebrow">FORWARD DEPLOYED ENGINEERING · ENTER AI SOLUTIONS</p>
        </div>
        <span className="text-[11px] font-mono text-muted flex items-center gap-1.5">
          <span className="status-dot" />
          Estudo Atuarial · Banco Unicamp
        </span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-line pb-6">
        <div className="space-y-2">
          <h1>Simulação da carteira e impacto financeiro (60k).</h1>
          <p className="text-sm text-muted max-w-3xl leading-relaxed">
            Estudo contrafactual elaborado pela engenharia de implantação da Enter. Demonstração do retorno financeiro obtido ao aplicar a política inteligente de acordos em todo o histórico de contencioso do banco.
          </p>
        </div>
        <Link to="/monitoramento" className="button-secondary shrink-0">
          <ArrowLeft size={14} />
          Voltar à Governança ao Vivo
        </Link>
      </div>

      {/* Banner Explicativo do Estudo Contrafactual */}
      <div
        role="status"
        className="rounded-lg bg-accent-soft border border-accent/40 p-5 text-xs text-accent-ink space-y-2 leading-relaxed"
      >
        <div className="flex items-center gap-2 font-medium">
          <History size={16} />
          <strong className="text-sm">
            Diagnóstico Contrafactual da Carteira Histórica (60.000 Processos do Banco Unicamp)
          </strong>
        </div>
        <p>
          No cenário histórico sem a inteligência do Suits AI, o banco sofreu{' '}
          <strong>17.987 condenações judiciais (totalizando R$ 193 milhões em perdas)</strong> com apenas 280 acordos celebrados. Este modelo atuarial projeta o resultado financeiro caso a política inteligente estivesse em vigor. Ajuste o slider abaixo para simular diferentes taxas de aceite dos autores.
        </p>
      </div>

      {/* Grid de KPIs Projetados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-line rounded-lg overflow-hidden bg-canvas">
        {metrics.map(metric => (
          <div key={metric.label} className="metric-cell">
            <p className="eyebrow">{metric.label}</p>
            <p className="metric-value">{metric.value}</p>
            <p className="text-[11px] text-muted">{metric.note}</p>
          </div>
        ))}
      </div>

      {/* Painel de Cenários e Sensibilidade Atuarial */}
      <section className="border border-line rounded-lg p-6 sm:p-8 bg-canvas space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">CENÁRIOS & PRECIFICAÇÃO ATUARIAL</p>
            <h2 className="text-2xl">O impacto financeiro de cada possibilidade.</h2>
            <p className="text-xs text-muted mt-2 max-w-xl leading-relaxed">
              Ajuste a taxa de conversão esperada das propostas de acordo para recalcular em tempo real a economia líquida e o ROI da carteira do banco.
            </p>
          </div>
          <span className="text-xs text-accent-ink border border-accent/40 bg-accent-soft rounded px-3 py-1.5 shrink-0 font-medium">
            Simulação Atuarial Ativa
          </span>
        </div>

        <div className="pt-6 border-t border-line space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs text-muted block mb-1">Economia líquida anual projetada</span>
              <strong className="text-3xl font-normal tracking-tight text-ink">
                R$ {calculatedSavingsMillions}M
              </strong>
              <p className="text-[11px] text-muted mt-1 font-mono">
                ~{calculatedAgreementsCount} acordos celebrados • Retorno de {calculatedRoi}x sobre desembolso
              </p>
            </div>
            <div className="text-right text-xs text-muted">
              <span className="font-medium text-ink">Cenário selecionado:</span>{' '}
              <strong className="text-accent-ink">{acceptanceRate}%</strong> de adesão dos autores
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
      </section>

      {/* Grid Inferior: Auditoria de Escritórios Credenciados & Qualidade de Subsídios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
        {/* Auditoria de Escritórios Credenciados */}
        <section className="border border-line rounded-lg p-6 bg-canvas space-y-4">
          <div>
            <p className="eyebrow mb-1">AUDITORIA DE ADVOCACIA CREDENCIADA</p>
            <h2 className="text-2xl">Aderência por escritório</h2>
            <p className="text-xs text-muted mt-1">
              Conformidade e taxa de convergência dos 5 principais escritórios credenciados na carteira histórica do Banco Unicamp.
            </p>
          </div>

          <div className="mt-4 space-y-4">
            {LAW_FIRMS.map(firm => (
              <div key={firm.name} className="space-y-1.5 pb-3 border-b border-line last:border-0 last:pb-0">
                <div className="flex justify-between text-xs">
                  <div>
                    <span className="font-medium text-ink">{firm.name}</span>
                    <span className="text-muted block text-[11px]">
                      {firm.lead} · {firm.volume}
                    </span>
                  </div>
                  <div className="text-right">
                    <strong className="text-ink font-medium">
                      {firm.rate.toLocaleString('pt-BR')}%
                    </strong>
                    <span
                      className={`block text-[10px] ${
                        firm.rate >= 90 ? 'text-accent-ink font-medium' : 'text-muted'
                      }`}
                    >
                      {firm.rate >= 90 ? 'Excelente' : 'Atenção'}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${firm.rate}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted truncate pt-0.5">
                  <strong>Principal motivo de desvio:</strong> {firm.topReason}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Diagnóstico de Subsídios Internos */}
        <section className="border border-line rounded-lg p-6 bg-canvas space-y-4">
          <div>
            <p className="eyebrow mb-1">AUDITORIA DE PROCESSOS INTERNOS</p>
            <h2 className="text-2xl">Qualidade dos subsídios</h2>
            <p className="text-xs text-muted mt-1">
              Gargalos de documentação nos sistemas legados do banco que elevam o risco de condenação.
            </p>
          </div>

          <div className="mt-4 divide-y divide-line">
            {SUBSIDIES_QUALITY.map(item => (
              <div key={item.name} className="py-3.5 first:pt-0 last:pb-0 space-y-1 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink">{item.name}</span>
                  <span className="text-negative font-mono text-[11px] font-medium">
                    {item.missingRate} ausente
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>Impacto: {item.riskImpact}</span>
                  <span className="font-medium text-ink/80">Foco: {item.focus}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
