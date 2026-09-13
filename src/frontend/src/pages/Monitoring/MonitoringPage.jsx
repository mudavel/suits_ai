import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { fetchDecisions, requestJson } from '../../services/api'
import { dateTime, money } from '../../services/workflow'
import { useRemote } from '../../hooks/useRemote'
import { Busy, ErrorNotice, OffsetPager } from '../../components/Workspace/Shared'
import historicalSubsidies from '../../data/historicalSubsidies.json'

const subsidyNames = { has_contract: 'Contrato', has_statement: 'Extrato bancário', has_credit_receipt: 'Comprovante de crédito', has_dossier: 'Dossiê', has_debt_evolution: 'Evolução da dívida', has_referenced_report: 'Laudo referenciado' }
const percent = value => value == null ? 'Indisponível' : (value * 100).toLocaleString('pt-BR', { maximumFractionDigits: value < .01 ? 2 : 1 }) + '%'
const historical = {
  cases: 60000,
  agreements: 280,
  agreementShare: 280 / 60000,
  averageAgreement: 4539.6761292857,
  condemnations: 17987,
  averageCondemnation: 10658.35,
  ticketDifference: 1 - (4539.6761292857 / 10658.35),
  outcomes: [
    ['Improcedência', 27935], ['Extinção', 13798], ['Parcial procedência', 12248], ['Procedência', 5739], ['Acordo', 280],
  ],
}
export default function MonitoringPage() {
  const [offset, setOffset] = useState(0)
  const metrics = useRemote(useCallback(async signal => {
    const [overview, decisionInventory] = await Promise.all([
      requestJson('/api/monitoring/overview', { signal }),
      requestJson('/api/decisions?limit=1', { signal }),
    ])
    return { overview, decisionInventory }
  }, []))
  const decisions = useRemote(useCallback(signal => fetchDecisions(undefined, offset, { signal }), [offset]))
  const lawyers = useRemote(useCallback(signal => requestJson('/api/monitoring/lawyers', { signal }), []))
  const { overview, decisionInventory } = metrics.data || {}
  const lawyerRows = lawyers.data?.items || []
  const refresh = () => { metrics.reload(); decisions.reload(); lawyers.reload() }
  const operationCards = [
    { label: 'Processos na operação', value: overview?.total_cases?.toLocaleString('pt-BR') ?? '—' },
    { label: 'Decisões registradas', value: decisionInventory?.total?.toLocaleString('pt-BR') ?? '—' },
    { label: 'Advogados ativos', value: overview?.active_lawyers_count?.toLocaleString('pt-BR') ?? '—' },
    { label: 'Escritórios ativos', value: overview?.partner_law_firms_count?.toLocaleString('pt-BR') ?? '—' },
  ]
  return <div className="space-y-7">
    <div className="section-heading border-b border-line pb-7"><div><h1>Governança</h1><p className="text-sm text-muted mt-3 max-w-3xl">Acompanhe a aderência por advogado e a efetividade da política de acordos, separando a base histórica da operação atual.</p></div><button type="button" className="button-secondary" disabled={metrics.loading || decisions.loading} onClick={refresh}><RefreshCw size={14} />Atualizar governança</button></div>
    {metrics.loading && <Busy>Consultando indicadores...</Busy>}<ErrorNotice error={metrics.error} retry={metrics.reload} />

    <section className="space-y-4" aria-labelledby="historical-title">
      <div><p className="eyebrow">BASE HISTÓRICA · 60 MIL LINHAS</p><h2 id="historical-title" className="text-2xl mt-1">Referência observada da carteira</h2><p className="text-xs text-muted mt-2">Resultados descritivos da planilha fornecida. Eles não representam, por si só, o efeito causal da nova política.</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-line rounded-lg overflow-hidden">
        <div className="metric-cell"><p className="eyebrow">PROCESSOS ANALISADOS</p><p className="metric-value">{historical.cases.toLocaleString('pt-BR')}</p><p className="text-[11px] text-muted">Identificadores únicos com subsídios vinculados</p></div>
        <div className="metric-cell"><p className="eyebrow">ACORDOS REGISTRADOS</p><p className="metric-value">{historical.agreements.toLocaleString('pt-BR')}</p><p className="text-[11px] text-muted">{percent(historical.agreementShare)} dos desfechos históricos</p></div>
        <div className="metric-cell"><p className="eyebrow">TICKET MÉDIO DO ACORDO</p><p className="metric-value metric-value--money">{money(historical.averageAgreement)}</p><p className="text-[11px] text-muted">Média dos 280 acordos da base</p></div>
        <div className="metric-cell"><p className="eyebrow">TICKET MÉDIO DA CONDENAÇÃO</p><p className="metric-value metric-value--money">{money(historical.averageCondemnation)}</p><p className="text-[11px] text-muted">Procedências e procedências parciais</p></div>
      </div>
    </section>

    <section className="panel space-y-5" aria-labelledby="effectiveness-title">
      <div><p className="eyebrow">MONITORAMENTO DE EFETIVIDADE</p><h2 id="effectiveness-title" className="text-2xl">A política está gerando os resultados esperados?</h2><p className="text-xs text-muted mt-2 max-w-4xl">Esta visão permite ao Banco Unicamp acompanhar taxa de aceitação dos acordos, economia em relação às condenações judiciais e outros resultados. Onde a base não contém o evento necessário, o indicador permanece explicitamente indisponível.</p></div>
      <div className="effectiveness-grid">
        <article><span>Participação histórica de acordos</span><strong>{percent(historical.agreementShare)}</strong><p>É a proporção de acordos entre os 60 mil resultados; não equivale à taxa de aceitação de ofertas.</p></article>
        <article><span>Diferença nominal entre tickets</span><strong>{percent(historical.ticketDifference)}</strong><p>O ticket médio de acordo é menor que o de condenação. Comparação descritiva, sem inferência causal de economia.</p></article>
        <article className="effectiveness-unavailable"><span>Taxa de aceitação das ofertas</span><strong>Indisponível</strong><p>A base não registra ofertas enviadas, recusas, tentativas ou contrapropostas.</p></article>
        <article className="effectiveness-unavailable"><span>Economia efetivamente gerada</span><strong>Indisponível</strong><p>Exige comparação prospectiva entre casos equivalentes, custos de defesa e valores finais negociados.</p></article>
      </div>
      <div><p className="field-label">Distribuição dos 60 mil desfechos</p><div className="outcome-list">{historical.outcomes.map(([label, count]) => <div key={label}><span>{label}</span><div className="outcome-track"><span style={{ width: `${count / historical.cases * 100}%` }} /></div><strong>{percent(count / historical.cases)}</strong></div>)}</div></div>
    </section>

    <div className="governance-detail-grid">
    <section className="panel space-y-5" aria-labelledby="lawyer-adherence-title">
      <div className="section-heading"><div><p className="eyebrow">ADERÊNCIA À POLÍTICA</p><h2 id="lawyer-adherence-title" className="text-2xl">Visão por advogado</h2></div><span className="text-[10px] rounded border border-line px-2 py-1 text-muted">Demonstração · dados persistidos</span></div>
      <p className="text-xs text-muted">Advogados, escritórios, volumes e aderência mockados e persistidos no banco. Não representam atribuições dos processos da base histórica.</p>
      <ErrorNotice error={lawyers.error} retry={lawyers.reload} />
      {lawyers.loading ? <Busy>Consultando advogados...</Busy> : <div className="lawyer-adherence-list">{lawyerRows.map(row => <article key={row.name}><div><strong>{row.name}</strong><span className="lawyer-firm">{row.law_firm || 'Escritório não informado'}</span><span>{row.decisions.toLocaleString('pt-BR')} decisões simuladas</span></div><div className="adherence-bar"><span style={{ width: `${row.adherence * 100}%` }} /></div><strong>{percent(row.adherence)}</strong></article>)}</div>}
      {!lawyers.loading && !lawyers.error && !lawyerRows.length && <p className="text-xs text-muted">Nenhum dado demonstrativo foi carregado no banco.</p>}
    </section>

    <section className="panel space-y-5" aria-labelledby="historical-subsidies-title">
      <div><p className="eyebrow">BASE HISTÓRICA · {historicalSubsidies.total_cases.toLocaleString('pt-BR')} PROCESSOS</p><h2 id="historical-subsidies-title" className="text-2xl">Lacunas documentais</h2></div>
      <p className="text-xs text-muted">Processos sem cada subsídio na base de 60 mil casos. Um processo pode ter mais de uma ausência; presença não atesta conformidade.</p>
      <div className="historical-subsidy-list">{Object.entries(historicalSubsidies.missing_by_type).map(([type, count]) => <div key={type}><span>{subsidyNames[type]}</span><div><strong>{count.toLocaleString('pt-BR')}</strong><span>{percent(count / historicalSubsidies.total_cases)} dos casos</span></div></div>)}</div>
      <p className="text-[10px] text-muted">Fonte: aba “{historicalSubsidies.sheet}” da planilha fornecida. Contagem de subsídios marcados como não fornecidos (0).</p>
    </section>
    </div>

    <section className="space-y-4" aria-labelledby="operation-title"><div><p className="eyebrow">OPERAÇÃO ATUAL</p><h2 id="operation-title" className="text-2xl mt-1">Acompanhamento da plataforma</h2></div><div className="grid grid-cols-2 lg:grid-cols-4 border border-line rounded-lg overflow-hidden">{operationCards.map(card => <div key={card.label} className="metric-cell"><p className="eyebrow">{card.label}</p><p className="metric-value">{card.value}</p></div>)}</div></section>

    <section className="panel space-y-5"><div className="section-heading"><h2>Histórico de decisões operacionais</h2></div>
      <ErrorNotice error={decisions.error} retry={decisions.reload} />
      {decisions.loading ? <Busy>Carregando decisões...</Busy> : <div className="space-y-3">{decisions.data?.items.map(record => <article key={record.decision.decision_id} className="saved-item"><div className="flex flex-wrap justify-between gap-3"><Link to={'/workspace/' + record.decision.case_id + '?aba=conclusao'} className="font-semibold underline underline-offset-4">Processo #{record.decision.case_id}</Link><span>{record.decision.action === 'ACORDO' ? 'Acordo · ' + money(record.decision.settlement_amount) : 'Defesa'}</span></div><p className="text-xs text-muted">{record.registration.lawyer_id} · {record.registration.law_firm_id} · {dateTime(record.decision.created_at)}</p><p className="text-xs">{record.decision.is_override === null ? 'Sem política disponível no registro' : record.decision.is_override ? 'Divergência justificada' : 'Aderente à política'}</p>{record.registration.override_reason && <p className="response-text">{record.registration.override_reason}</p>}</article>)}{!decisions.data?.items.length && <p className="text-xs text-muted py-6">As decisões aparecerão aqui depois de registradas nos processos.</p>}</div>}
      <OffsetPager page={decisions.data} offset={offset} setOffset={setOffset} disabled={decisions.loading} />
    </section>
  </div>
}
