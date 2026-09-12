import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { fetchDecisions, requestJson } from '../../services/api'
import { dateTime, money } from '../../services/workflow'
import { systemText } from '../../services/productLanguage'
import { useRemote } from '../../hooks/useRemote'
import { Busy, ErrorNotice, OffsetPager } from '../../components/Workspace/Shared'

const subsidyNames = { has_contract: 'Contrato', has_statement: 'Extrato bancário', has_credit_receipt: 'Comprovante de crédito', has_dossier: 'Dossiê', has_debt_evolution: 'Evolução da dívida', has_referenced_report: 'Laudo referenciado' }
const percent = value => value == null ? '—' : (value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'

export default function MonitoringPage() {
  const [offset, setOffset] = useState(0)
  const metrics = useRemote(useCallback(async signal => {
    const [overview, subsidies, adherence, effectiveness] = await Promise.all(['overview', 'subsidies', 'adherence', 'effectiveness'].map(name => requestJson('/api/monitoring/' + name, { signal })))
    return { overview, subsidies, adherence, effectiveness }
  }, []))
  const decisions = useRemote(useCallback(signal => fetchDecisions(undefined, offset, { signal }), [offset]))
  const { overview, subsidies, adherence, effectiveness } = metrics.data || {}
  const refresh = () => { metrics.reload(); decisions.reload() }
  const cards = [
    { label: 'Processos', value: overview?.total_cases?.toLocaleString('pt-BR') ?? '—', note: 'Casos cadastrados' },
    { label: 'Decisões registradas', value: decisions.data?.total?.toLocaleString('pt-BR') ?? '—', note: 'Decisões registradas nos processos' },
    { label: 'Economia estimada', value: money(overview?.total_cost_avoidance), note: 'Indicador financeiro' },
    { label: 'Taxa de aderência', value: percent(overview?.adherence_rate), note: 'Seguimento das recomendações' },
  ]
  return <div className="space-y-7">
    <p className="eyebrow">CONTENCIOSO / GOVERNANÇA</p>
    <div className="section-heading border-b border-line pb-7"><div><h1>Uma visão de toda a operação.</h1><p className="text-sm text-muted mt-3">Acompanhe o contencioso e os resultados de cada decisão.</p></div><button type="button" className="button-secondary" disabled={metrics.loading || decisions.loading} onClick={refresh}><RefreshCw size={14} />Atualizar governança</button></div>
    {metrics.loading && <Busy>Consultando indicadores...</Busy>}<ErrorNotice error={metrics.error} retry={metrics.reload} />
    {overview?.data_mode === 'mock' && <p className="notice">Indicadores de demonstração.</p>}
    <div className="grid grid-cols-2 lg:grid-cols-4 border border-line rounded-lg overflow-hidden">{cards.map(card => <div key={card.label} className="metric-cell"><p className="eyebrow">{card.label}</p><p className="metric-value">{card.value}</p><p className="text-[11px] text-muted">{card.note}</p></div>)}</div>
    <div className="flex flex-wrap gap-6 text-xs text-muted"><p>Advogados com decisões: <strong className="text-ink">{overview?.active_lawyers_count ?? '—'}</strong></p><p>Escritórios com decisões: <strong className="text-ink">{overview?.partner_law_firms_count ?? '—'}</strong></p><p>Tempo médio de negociação: <strong className="text-ink">{overview?.avg_negotiation_time_days == null ? '—' : overview.avg_negotiation_time_days + ' dias'}</strong></p></div>
    <div className="grid md:grid-cols-2 gap-6">
      <section className="panel space-y-5"><p className="eyebrow">DOCUMENTAÇÃO</p><h2 className="text-2xl">Disponibilidade dos subsídios</h2><p className="text-xs text-muted">Inventário de presença documental em {subsidies?.total_cases ?? '—'} processos. Presença não atesta autenticidade ou conformidade.</p><div className="divide-y divide-line">{Object.entries(subsidies?.missing_by_type || {}).map(([type, count]) => <div key={type} className="flex justify-between gap-4 py-3 text-xs"><span>{subsidyNames[type] || 'Outros documentos'}</span><span className="text-muted">{count} {count === 1 ? 'ausência' : 'ausências'}</span></div>)}</div></section>
      <section className="panel space-y-5"><p className="eyebrow">INDICADORES</p><h2 className="text-2xl">Aderência e efetividade</h2>{[['Aderência', adherence], ['Efetividade', effectiveness]].map(([title, data]) => <div key={title}><h3 className="text-sm font-semibold mb-2">{title}</h3><p className="text-xs text-muted leading-relaxed">{data?.status === 'pending_integration' ? 'Os indicadores validados ainda não estão disponíveis para esta operação.' : systemText(data?.message) || 'Aguardando informações para calcular os indicadores.'}</p>{data?.status === 'pending_integration' && <p className="text-[10px] text-accent-ink mt-2">Aguardando indicadores · {data.decision_count} {data.decision_count === 1 ? 'decisão disponível' : 'decisões disponíveis'} para cálculo</p>}</div>)}</section>
    </div>
    <section className="panel space-y-5"><div className="section-heading"><div><p className="eyebrow">HISTÓRICO DA OPERAÇÃO</p><h2>Decisões registradas</h2></div><span className="text-xs text-muted">{decisions.data?.total ?? '—'} {decisions.data?.total === 1 ? 'registro' : 'registros'}</span></div>
      <ErrorNotice error={decisions.error} retry={decisions.reload} />
      {decisions.loading ? <Busy>Carregando decisões...</Busy> : <div className="space-y-3">{decisions.data?.items.map(record => <article key={record.decision.decision_id} className="saved-item"><div className="flex flex-wrap justify-between gap-3"><Link to={'/workspace/' + record.decision.case_id} className="font-semibold underline underline-offset-4">Processo #{record.decision.case_id} · {record.decision.action}</Link><span>{record.decision.settlement_amount == null ? 'Defesa' : money(record.decision.settlement_amount)}</span></div><p className="text-xs text-muted">{record.registration.lawyer_id} · {record.registration.law_firm_id} · {dateTime(record.decision.created_at)}</p><p className="text-xs">{record.decision.is_override === null ? 'Sem política disponível no registro' : record.decision.is_override ? 'Divergência justificada' : 'Aderente à política'}</p>{record.registration.override_reason && <p className="response-text">{record.registration.override_reason}</p>}</article>)}{!decisions.data?.items.length && <p className="text-xs text-muted py-6">As decisões aparecerão aqui depois de registradas nos processos.</p>}</div>}
      <OffsetPager page={decisions.data} offset={offset} setOffset={setOffset} disabled={decisions.loading} />
    </section>
  </div>
}
