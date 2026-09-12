import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowUpRight,
  Cpu,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { fetchDecisions, requestJson } from '../../services/api'
import { dateTime, money } from '../../services/workflow'
import { systemText } from '../../services/productLanguage'
import { useRemote } from '../../hooks/useRemote'
import { Busy, ErrorNotice, OffsetPager } from '../../components/Workspace/Shared'

const subsidyNames = {
  has_contract: 'Contrato',
  has_statement: 'Extrato bancário',
  has_credit_receipt: 'Comprovante de crédito',
  has_dossier: 'Dossiê',
  has_debt_evolution: 'Evolução da dívida',
  has_referenced_report: 'Laudo referenciado',
}

const percent = value =>
  value == null
    ? '—'
    : (value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'

// Escritórios credenciados na carteira do Banco Unicamp (estrutura de governança corporativa)
const PARTNER_FIRMS_ROSTER = [
  { name: 'Pinheiro & Associados Advogados', lead: 'Dr. Lucas Ramos', quota: '35% da carteira' },
  { name: 'Carvalho, Dias & Silva Advogados', lead: 'Dra. Juliana Mendes', quota: '25% da carteira' },
  { name: 'Albuquerque & Castro Sociedade', lead: 'Dr. Roberto Albuquerque', quota: '20% da carteira' },
  { name: 'Vasconcelos Contencioso Bancário', lead: 'Dra. Fernanda Vasconcelos', quota: '12% da carteira' },
  { name: 'Moreira & Guimarães Consultoria', lead: 'Dr. Carlos Moreira', quota: '8% da carteira' },
]

export default function MonitoringPage() {
  const [offset, setOffset] = useState(0)

  // Consulta em tempo real à API do backend
  const metrics = useRemote(
    useCallback(async signal => {
      const [overview, subsidies, adherence, effectiveness] = await Promise.all(
        ['overview', 'subsidies', 'adherence', 'effectiveness'].map(name =>
          requestJson('/api/monitoring/' + name, { signal })
        )
      )
      return { overview, subsidies, adherence, effectiveness }
    }, [])
  )

  const decisions = useRemote(
    useCallback(signal => fetchDecisions(undefined, offset, { signal }), [offset])
  )

  const { overview, subsidies, adherence, effectiveness } = metrics.data || {}
  const refresh = () => {
    metrics.reload()
    decisions.reload()
  }

  const cards = [
    {
      label: 'Processos',
      value: overview?.total_cases?.toLocaleString('pt-BR') ?? '—',
      note: 'Casos ativos no contencioso',
    },
    {
      label: 'Decisões registradas',
      value: decisions.data?.total?.toLocaleString('pt-BR') ?? '—',
      note: 'Decisões registradas nos processos',
    },
    {
      label: 'Economia estimada',
      value: overview?.total_cost_avoidance ? money(overview.total_cost_avoidance) : '—',
      note: overview?.total_cost_avoidance ? 'Condenações evitadas' : 'Aguardando consolidação de volume',
    },
    {
      label: 'Taxa de aderência',
      value: overview?.adherence_rate ? percent(overview.adherence_rate) : '—',
      note: overview?.adherence_rate ? 'Seguimento das recomendações' : 'Aguardando amostragem mínima',
    },
  ]

  return (
    <div className="space-y-7">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <p className="eyebrow">DIRETORIA JURÍDICA / GOVERNANÇA OPERACIONAL</p>
        <span className="text-[11px] font-mono text-muted flex items-center gap-1.5">
          <span className="status-dot" />
          Banco Unicamp S.A.
        </span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-line pb-6">
        <div className="space-y-2">
          <h1>Uma visão de toda a operação contenciosa.</h1>
          <p className="text-sm text-muted max-w-2xl leading-relaxed">
            Acompanhe o contencioso ativo, audite decisões de alçada em tempo real e monitore a esteira de governança da carteira jurídica.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/simulacao" className="button-secondary">
            <Cpu size={14} />
            Simulação 60k (FDE)
          </Link>
          <button
            type="button"
            className="button-secondary"
            disabled={metrics.loading || decisions.loading}
            onClick={refresh}
          >
            <RefreshCw size={14} className={metrics.loading ? 'animate-spin' : ''} />
            Atualizar governança
          </button>
        </div>
      </div>

      {metrics.loading && <Busy>Consultando indicadores da operação...</Busy>}
      <ErrorNotice error={metrics.error} retry={metrics.reload} />
      {overview?.data_mode === 'mock' && (
        <p className="notice">Indicadores de demonstração.</p>
      )}

      {/* Grid de KPIs Principais da Operação Real */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-line rounded-lg overflow-hidden bg-canvas">
        {cards.map(card => (
          <div key={card.label} className="metric-cell">
            <p className="eyebrow">{card.label}</p>
            <p className="metric-value">{card.value}</p>
            <p className="text-[11px] text-muted">{card.note}</p>
          </div>
        ))}
      </div>

      {/* Linha de Indicadores Operacionais */}
      <div className="flex flex-wrap gap-6 text-xs text-muted">
        <p>
          Advogados com decisões: <strong className="text-ink">{overview?.active_lawyers_count ?? '—'}</strong>
        </p>
        <p>
          Escritórios com decisões: <strong className="text-ink">{overview?.partner_law_firms_count ?? '—'}</strong>
        </p>
        <p>
          Tempo médio de negociação:{' '}
          <strong className="text-ink">
            {overview?.avg_negotiation_time_days == null
              ? '—'
              : overview.avg_negotiation_time_days + ' dias'}
          </strong>
        </p>
      </div>

      {/* Grid Central: Disponibilidade de Subsídios & Convergência de Escritórios */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Disponibilidade de Subsídios (Real + Módulo Avançado) */}
        <section className="panel space-y-5">
          <div>
            <p className="eyebrow">DOCUMENTAÇÃO</p>
            <h2 className="text-2xl">Disponibilidade dos subsídios</h2>
            <p className="text-xs text-muted mt-1">
              Inventário de presença documental em {subsidies?.total_cases ?? '—'} processos ativos no sistema.
            </p>
          </div>

          <div className="divide-y divide-line">
            {Object.entries(subsidies?.missing_by_type || {}).map(([type, count]) => {
              const total = subsidies?.total_cases || 0
              const rate = total > 0 ? ((count / total) * 100).toFixed(1) : null
              return (
                <div key={type} className="flex items-center justify-between gap-4 py-3 text-xs">
                  <span className="font-medium text-ink">{subsidyNames[type] || 'Outros documentos'}</span>
                  <div className="text-right">
                    <span className="text-muted">
                      {count} {count === 1 ? 'ausência' : 'ausências'}
                    </span>
                    {rate !== null && (
                      <span className="text-[11px] text-negative block font-mono">
                        {rate}% faltante
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-3.5 rounded-lg bg-surface border border-line text-[11px] text-muted space-y-1">
            <span className="font-medium text-ink flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-accent-ink" />
              Diagnóstico Preditivo de Gargalos
            </span>
            <p>
              O cálculo de impacto no risco processual (+p.p.) e mapeamento de sistemas legados (Core Banking e originadores) são ativados com a esteira corporativa integrada.
            </p>
          </div>
        </section>

        {/* Convergência dos Escritórios Credenciados */}
        <section className="panel space-y-5">
          <div>
            <p className="eyebrow">AUDITORIA DE ADVOCACIA CREDENCIADA</p>
            <h2 className="text-2xl">Aderência por escritório</h2>
            <p className="text-xs text-muted mt-1">
              Estrutura de monitoramento dos 5 principais escritórios parceiros da carteira do Banco Unicamp.
            </p>
          </div>

          <div className="space-y-4">
            {PARTNER_FIRMS_ROSTER.map(firm => (
              <div key={firm.name} className="space-y-1.5 pb-3 border-b border-line last:border-0 last:pb-0">
                <div className="flex justify-between text-xs">
                  <div>
                    <span className="font-medium text-ink">{firm.name}</span>
                    <span className="text-muted block text-[11px]">{firm.lead} · {firm.quota}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono text-muted">Aguardando volume</span>
                    <span className="text-muted block text-[10px]">Em calibração</span>
                  </div>
                </div>
                <div className="h-1 bg-surface-hover rounded-full overflow-hidden">
                  <div className="h-1 bg-muted/40 rounded-full w-1/4" />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-lg bg-surface border border-line text-[11px] text-muted space-y-1">
            <span className="font-medium text-ink flex items-center gap-1.5">
              <Activity size={13} className="text-accent-ink" />
              Monitoramento Contínuo de Alçadas
            </span>
            <p>
              Os percentuais de convergência e motivos de divergência individuais serão calculados conforme o volume de decisões distribuído na carteira credenciada.
            </p>
          </div>
        </section>
      </div>

      {/* Seção: Aderência à Política & Efetividade Financeira */}
      <section className="panel space-y-5">
        <div>
          <p className="eyebrow">INDICADORES ANALÍTICOS</p>
          <h2 className="text-2xl">Aderência e efetividade</h2>
          <p className="text-xs text-muted mt-1">
            Métricas de conformidade de alçada (A01) e efetividade financeira da política de acordos.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {[
            ['Aderência às Recomendações', adherence],
            ['Efetividade Financeira', effectiveness],
          ].map(([title, data]) => (
            <div key={title} className="p-4 rounded-lg border border-line bg-surface/40 space-y-2">
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="text-xs text-muted leading-relaxed">
                {data?.status === 'pending_integration'
                  ? 'Os indicadores validados ainda não estão disponíveis para esta operação.'
                  : systemText(data?.message) || 'Aguardando informações para calcular os indicadores.'}
              </p>
              {data?.status === 'pending_integration' && (
                <p className="text-[10px] text-accent-ink font-medium">
                  Aguardando indicadores · {data.decision_count}{' '}
                  {data.decision_count === 1 ? 'decisão disponível' : 'decisões disponíveis'} para cálculo
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Histórico da Operação: Decisões Registradas (100% Real) */}
      <section className="panel space-y-5">
        <div className="section-heading">
          <div>
            <p className="eyebrow">AUDITORIA DE DECISÕES EM TEMPO REAL</p>
            <h2>Histórico da operação</h2>
          </div>
          <span className="text-xs text-muted">
            {decisions.data?.total ?? '—'} {decisions.data?.total === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        <ErrorNotice error={decisions.error} retry={decisions.reload} />

        {decisions.loading ? (
          <Busy>Carregando decisões salvas...</Busy>
        ) : (
          <div className="space-y-3">
            {decisions.data?.items.map(record => (
              <article key={record.decision.decision_id} className="saved-item">
                <div className="flex flex-wrap justify-between gap-3">
                  <Link
                    to={'/workspace/' + record.decision.case_id}
                    className="font-semibold underline underline-offset-4 hover:text-accent"
                  >
                    Processo #{record.decision.case_id} · {record.decision.action}
                  </Link>
                  <span className="font-mono text-sm">
                    {record.decision.settlement_amount == null
                      ? 'Defesa'
                      : money(record.decision.settlement_amount)}
                  </span>
                </div>

                <p className="text-xs text-muted">
                  {record.registration.lawyer_id} · {record.registration.law_firm_id} ·{' '}
                  {dateTime(record.decision.created_at)}
                </p>

                <div className="flex items-center gap-2 text-xs pt-1">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      record.decision.is_override
                        ? 'bg-negative'
                        : record.decision.is_override === false
                        ? 'bg-accent'
                        : 'bg-muted'
                    }`}
                  />
                  <span>
                    {record.decision.is_override === null
                      ? 'Sem política vinculada no registro'
                      : record.decision.is_override
                      ? 'Divergência justificada de alçada'
                      : 'Aderente à recomendação da política'}
                  </span>
                </div>

                {record.registration.override_reason && (
                  <p className="response-text text-xs bg-surface p-2.5 rounded border border-line mt-2">
                    <strong>Motivo registrado:</strong> {record.registration.override_reason}
                  </p>
                )}
              </article>
            ))}

            {!decisions.data?.items.length && (
              <p className="text-xs text-muted py-6 text-center">
                As decisões aparecerão aqui depois de registradas nos processos.
              </p>
            )}
          </div>
        )}

        <OffsetPager
          page={decisions.data}
          offset={offset}
          setOffset={setOffset}
          disabled={decisions.loading}
        />
      </section>
    </div>
  )
}
